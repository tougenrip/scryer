"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";

export type DuelGame = "rps" | "coin";
export type DuelStatus = "choosing" | "revealing" | "done" | "tie_rematch";
export type RpsChoice = "rock" | "paper" | "scissors";
export type CoinChoice = "heads" | "tails";

export interface LootDuel {
  id: string;
  campaign_id: string;
  loot_id: string;
  game: DuelGame;
  defender_character_id: string;
  defender_user_id: string;
  defender_choice: string | null;
  defender_locked_at: string | null;
  challenger_character_id: string;
  challenger_user_id: string;
  challenger_choice: string | null;
  challenger_locked_at: string | null;
  status: DuelStatus;
  winner_character_id: string | null;
  reveal_at: string | null;
  created_at: string;
  resolved_at: string | null;
}

export function useLootDuels(campaignId: string | null) {
  const [duels, setDuels] = useState<LootDuel[]>([]);

  useEffect(() => {
    if (!campaignId) {
      setDuels([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      // Only care about active duels (status != 'done') + recent done ones
      // so we can show the "winner" reveal animation briefly.
      const since = new Date(Date.now() - 15_000).toISOString();
      const { data } = await supabase
        .from("loot_duels")
        .select("*")
        .eq("campaign_id", campaignId)
        .or(`status.neq.done,resolved_at.gte.${since}`)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setDuels((data ?? []) as LootDuel[]);
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`loot_duels:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "loot_duels",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as LootDuel;
            setDuels((prev) =>
              prev.some((d) => d.id === row.id) ? prev : [row, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as LootDuel;
            setDuels((prev) => prev.map((d) => (d.id === row.id ? row : d)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as { id: string };
            setDuels((prev) => prev.filter((d) => d.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  /** Lock in your choice for a duel. The DB trigger handles resolution. */
  const submitChoice = useCallback(
    async (duelId: string, asUserId: string, choice: string) => {
      const supabase = createClient();
      const duel = duels.find((d) => d.id === duelId);
      if (!duel) return;
      const isDefender = duel.defender_user_id === asUserId;
      const isChallenger = duel.challenger_user_id === asUserId;
      if (!isDefender && !isChallenger) return;

      const update: Record<string, unknown> = {};
      if (isDefender) {
        update.defender_choice = choice;
        update.defender_locked_at = new Date().toISOString();
      } else {
        update.challenger_choice = choice;
        update.challenger_locked_at = new Date().toISOString();
      }
      // Optimistic
      setDuels((prev) =>
        prev.map((d) => (d.id === duelId ? { ...d, ...update } : d))
      );
      await supabase
        .from("loot_duels")
        .update(update as never)
        .eq("id", duelId);
    },
    [duels]
  );

  return { duels, submitChoice };
}
