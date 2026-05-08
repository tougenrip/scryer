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
   * Two-step claim:
   *   1. Set pending_claim + a 3-second challenge_until window so other
   *      players can fight for it.
   *   2. After the window expires (no challenge created), client finalizes
   *      the claim — moves the item into the character's inventory.
   *
   * If a challenge appears mid-window, we leave the pending fields in
   * place; the duel trigger eventually resolves and writes the final
   * claim.
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
      const now = new Date();
      const challengeUntil = new Date(now.getTime() + 3000);

      // Optimistic — set pending state.
      setLoot((prev) =>
        prev.map((r) =>
          r.id === lootId
            ? {
                ...r,
                pending_claim_by_character_id: characterId,
                pending_claim_at: now.toISOString(),
                challenge_until: challengeUntil.toISOString(),
              }
            : r
        )
      );

      const { error } = await supabase
        .from("party_loot")
        .update({
          pending_claim_by_character_id: characterId,
          pending_claim_at: now.toISOString(),
          challenge_until: challengeUntil.toISOString(),
        } as never)
        .eq("id", lootId)
        .is("claimed_by_character_id", null)
        .is("pending_claim_by_character_id", null);
      if (error) {
        console.error("Failed to claim loot:", error);
        toast.error("Couldn't claim — someone else may have got there first.");
        // Refresh from DB
        const { data } = await supabase
          .from("party_loot")
          .select("*")
          .eq("id", lootId)
          .single();
        if (data) {
          setLoot((prev) =>
            prev.map((r) => (r.id === lootId ? (data as PartyLootRow) : r))
          );
        }
        return;
      }

      // After the challenge window, if no duel was created, finalize.
      setTimeout(async () => {
        // Re-read state from DB to see if a duel exists / pending still set.
        const { data: cur } = await supabase
          .from("party_loot")
          .select("*")
          .eq("id", lootId)
          .single();
        const row = cur as PartyLootRow | null;
        if (!row || row.claimed_by_character_id) return;
        if (
          row.pending_claim_by_character_id !== characterId ||
          !row.challenge_until
        )
          return;

        // Was a duel created in the window? Look it up.
        const { data: duels } = await supabase
          .from("loot_duels")
          .select("id,status")
          .eq("loot_id", lootId)
          .neq("status", "done")
          .limit(1);
        if (duels && duels.length > 0) return; // duel pending — let trigger resolve

        // Finalize.
        await supabase
          .from("party_loot")
          .update({
            claimed_by_character_id: characterId,
            claimed_at: new Date().toISOString(),
            pending_claim_by_character_id: null,
            pending_claim_at: null,
            challenge_until: null,
          } as never)
          .eq("id", lootId)
          .is("claimed_by_character_id", null);

        // Append to inventory.
        const { data: character } = await supabase
          .from("characters")
          .select("inventory")
          .eq("id", characterId)
          .single();
        const curInv =
          (character?.inventory as Array<Record<string, unknown>>) ?? [];
        await supabase
          .from("characters")
          .update({
            inventory: [
              ...curInv,
              {
                source: row.item_source,
                index: row.item_index,
                quantity: row.quantity,
                equipped: false,
                attuned: false,
                notes: null,
              },
            ],
          } as never)
          .eq("id", characterId);
      }, 3100);
    },
    [loot]
  );

  /**
   * Open a duel on a pending-claimed loot row. Returns the new duel id, or
   * null on failure (e.g. window expired).
   */
  const challenge = useCallback(
    async (
      lootId: string,
      challengerCharacterId: string,
      challengerUserId: string,
      game: "rps" | "coin"
    ): Promise<string | null> => {
      const supabase = createClient();
      const target = loot.find((r) => r.id === lootId);
      if (!target) return null;
      if (
        !target.pending_claim_by_character_id ||
        !target.challenge_until ||
        new Date(target.challenge_until).getTime() < Date.now()
      ) {
        toast.error("Challenge window has closed.");
        return null;
      }

      // Need the defender's user_id for the duel row.
      const { data: defenderChar } = await supabase
        .from("characters")
        .select("user_id")
        .eq("id", target.pending_claim_by_character_id)
        .single();
      if (!defenderChar?.user_id) {
        toast.error("Couldn't find defender.");
        return null;
      }

      const { data, error } = await supabase
        .from("loot_duels")
        .insert({
          campaign_id: target.campaign_id,
          loot_id: lootId,
          game,
          defender_character_id: target.pending_claim_by_character_id,
          defender_user_id: defenderChar.user_id,
          challenger_character_id: challengerCharacterId,
          challenger_user_id: challengerUserId,
        } as never)
        .select("id")
        .single();
      if (error) {
        console.error("Failed to challenge:", error);
        toast.error("Couldn't challenge — try again.");
        return null;
      }
      const id = (data as { id: string }).id;
      // Auto-open the modal for the challenger; defender gets a toast.
      try {
        const { useDuelViewStore } = await import("@/lib/store/duel-view-store");
        useDuelViewStore.getState().open(id);
      } catch {
        /* store may not be available in all callers — ignore */
      }
      return id;
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

  return { loot, loading, insertItems, claim, challenge, removeRow };
}
