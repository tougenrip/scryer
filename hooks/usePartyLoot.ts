"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";
import type { RolledItem } from "@/lib/loot/roll-loot";

export interface PartyLootRow {
  id: string;
  campaign_id: string;
  item_source: "srd" | "homebrew";
  item_kind: "equipment" | "magic";
  item_index: string;
  item_name: string;
  quantity: number;
  rarity: string | null;
  claimed_by_character_id: string | null;
  claimed_at: string | null;
  pending_claim_by_character_id: string | null;
  pending_claim_at: string | null;
  challenge_until: string | null;
  source_encounter_id: string | null;
  created_at: string;
}

export function usePartyLoot(campaignId: string | null) {
  const [loot, setLoot] = useState<PartyLootRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setLoot([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase
        .from("party_loot")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setLoot((data ?? []) as PartyLootRow[]);
      setLoading(false);
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`party_loot:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_loot",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as PartyLootRow;
            setLoot((prev) =>
              prev.some((r) => r.id === row.id) ? prev : [row, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as PartyLootRow;
            setLoot((prev) => prev.map((r) => (r.id === row.id ? row : r)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: string };
            setLoot((prev) => prev.filter((r) => r.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  /** DM commits a list of rolled items to the party stash. */
  const insertItems = useCallback(
    async (
      items: RolledItem[],
      sourceEncounterId: string | null
    ) => {
      if (!campaignId || items.length === 0) return;
      const supabase = createClient();
      const rows = items.map((it) => ({
        campaign_id: campaignId,
        item_source: it.source,
        item_kind: it.kind,
        item_index: it.index,
        item_name: it.name,
        quantity: 1,
        rarity: it.rarity,
        source_encounter_id: sourceEncounterId,
      }));
      const { error } = await supabase
        .from("party_loot")
        .insert(rows as never);
      if (error) {
        console.error("Failed to insert party loot:", error);
        toast.error("Couldn't save loot");
      }
    },
    [campaignId]
  );

  /**
   * Phase 1: claim is direct + immediate. Phase 2 adds the 3-second
   * challenge window via an RPC.
   *
   * Also pushes the item into the character's own inventory JSONB so it
   * shows up on their sheet.
   */
  const claim = useCallback(
    async (lootId: string, characterId: string) => {
      const supabase = createClient();
      const target = loot.find((r) => r.id === lootId);
      if (!target) return;
      if (target.claimed_by_character_id) {
        toast.error("Already claimed.");
        return;
      }
      // Optimistic
      const now = new Date().toISOString();
      setLoot((prev) =>
        prev.map((r) =>
          r.id === lootId
            ? { ...r, claimed_by_character_id: characterId, claimed_at: now }
            : r
        )
      );

      const { error } = await supabase
        .from("party_loot")
        .update({
          claimed_by_character_id: characterId,
          claimed_at: now,
        } as never)
        .eq("id", lootId)
        .is("claimed_by_character_id", null);
      if (error) {
        console.error("Failed to claim loot:", error);
        toast.error("Couldn't claim — someone else may have got there first.");
        // Revert
        setLoot((prev) =>
          prev.map((r) =>
            r.id === lootId
              ? { ...r, claimed_by_character_id: null, claimed_at: null }
              : r
          )
        );
        return;
      }

      // Append to character.inventory JSONB (best-effort). Read-modify-write
      // pattern — fine for single-claimant. Phase 2's RPC will atomicize.
      const { data: character } = await supabase
        .from("characters")
        .select("inventory")
        .eq("id", characterId)
        .single();
      const cur = (character?.inventory as Array<Record<string, unknown>>) ?? [];
      const next = [
        ...cur,
        {
          source: target.item_source,
          index: target.item_index,
          quantity: target.quantity,
          equipped: false,
          attuned: false,
          notes: null,
        },
      ];
      await supabase
        .from("characters")
        .update({ inventory: next } as never)
        .eq("id", characterId);
    },
    [loot]
  );

  /** DM-only: remove a row from the stash entirely. */
  const removeRow = useCallback(async (lootId: string) => {
    const supabase = createClient();
    setLoot((prev) => prev.filter((r) => r.id !== lootId));
    const { error } = await supabase
      .from("party_loot")
      .delete()
      .eq("id", lootId);
    if (error) {
      console.error("Failed to delete loot row:", error);
      toast.error("Couldn't remove item");
    }
  }, []);

  return { loot, loading, insertItems, claim, removeRow };
}
