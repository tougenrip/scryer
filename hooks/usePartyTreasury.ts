"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";
import type { RolledCoins } from "@/lib/loot/roll-loot";

export interface PartyTreasury {
  campaign_id: string;
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
  updated_at: string;
}

const ZERO: RolledCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

export function usePartyTreasury(campaignId: string | null) {
  const [treasury, setTreasury] = useState<PartyTreasury | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setTreasury(null);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchOne = async () => {
      const { data } = await supabase
        .from("party_treasury")
        .select("*")
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (cancelled) return;
      setTreasury(data as PartyTreasury | null);
      setLoading(false);
    };
    void fetchOne();

    const channel = supabase
      .channel(uniqueChannelTopic(`party_treasury:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_treasury",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "DELETE") {
            setTreasury(null);
          } else {
            setTreasury(payload.new as PartyTreasury);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  /** DM-only: add coins to the pool. Used when the End-with-Loot modal
   *  commits, and when the DM uses the +/- buttons in the Loot tab. */
  const addCoins = useCallback(
    async (delta: Partial<RolledCoins>) => {
      if (!campaignId) return;
      const supabase = createClient();
      const cur = treasury ?? {
        campaign_id: campaignId,
        ...ZERO,
        updated_at: new Date().toISOString(),
      };
      const next = {
        campaign_id: campaignId,
        cp: Math.max(0, cur.cp + (delta.cp ?? 0)),
        sp: Math.max(0, cur.sp + (delta.sp ?? 0)),
        ep: Math.max(0, cur.ep + (delta.ep ?? 0)),
        gp: Math.max(0, cur.gp + (delta.gp ?? 0)),
        pp: Math.max(0, cur.pp + (delta.pp ?? 0)),
        updated_at: new Date().toISOString(),
      };
      // Optimistic
      setTreasury(next as PartyTreasury);
      const { error } = await supabase
        .from("party_treasury")
        .upsert(next as never, { onConflict: "campaign_id" });
      if (error) {
        console.error("Failed to update treasury:", error);
        toast.error("Couldn't update treasury");
      }
    },
    [campaignId, treasury]
  );

  return { treasury, loading, addCoins };
}
