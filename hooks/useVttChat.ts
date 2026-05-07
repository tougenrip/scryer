"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import type { RollResult } from "@/contexts/dice-roller-context";

export type VttMessage = {
  id: string;
  campaign_id: string;
  map_id: string | null;
  user_id: string;
  body: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  display_name?: string | null;
};

const PAGE = 80;

export function useVttChat(
  campaignId: string | null,
  mapId: string | null,
  enabled: boolean = true
) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<VttMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!campaignId || !enabled) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let q = supabase
        .from("vtt_messages")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(PAGE);

      if (mapId) {
        q = q.or(`map_id.is.null,map_id.eq.${mapId}`);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = (data || []) as VttMessage[];
      const userIds = [...new Set(rows.map((r) => r.user_id))];
      let names: Record<string, string> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        names = Object.fromEntries(
          (profiles || []).map((p: { id: string; display_name: string | null }) => [
            p.id,
            p.display_name || "Player",
          ])
        );
      }

      const enriched = rows.map((r) => ({
        ...r,
        display_name: names[r.user_id] || "Player",
      }));

      setMessages(enriched.reverse());
    } catch (e) {
      console.error(e);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId, enabled, mapId, supabase]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!campaignId || !enabled) return;

    const channel = supabase
      .channel(uniqueChannelTopic(`vtt-chat:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "vtt_messages",
          filter: `campaign_id=eq.${campaignId}`,
        },
        async (payload) => {
          const row = payload.new as VttMessage;
          if (mapId && row.map_id && row.map_id !== mapId) return;

          let display_name = "Player";
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", row.user_id)
            .maybeSingle();
          if (profile?.display_name) display_name = profile.display_name;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, display_name }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, enabled, mapId, supabase]);

  const sendMessage = useCallback(
    async (body: string, payload?: Record<string, unknown>) => {
      if (!campaignId || !body.trim()) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("vtt_messages").insert({
        campaign_id: campaignId,
        map_id: mapId,
        user_id: user.id,
        body: body.trim(),
        payload: payload ?? null,
      });
      if (error) console.error(error);
    },
    [campaignId, mapId, supabase]
  );

  const sendRollToChat = useCallback(
    async (roll: RollResult, displayName?: string) => {
      if (!campaignId) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const parts = roll.breakdown.rolls.join(", ");
      const mod =
        roll.breakdown.modifier === 0
          ? ""
          : roll.breakdown.modifier > 0
            ? ` + ${roll.breakdown.modifier}`
            : ` − ${Math.abs(roll.breakdown.modifier)}`;
      const body = `${roll.label ? `${roll.label}: ` : ""}${roll.expression} → [${parts}]${mod} = ${roll.result}`;

      const { error } = await supabase.from("vtt_messages").insert({
        campaign_id: campaignId,
        map_id: mapId,
        user_id: user.id,
        body,
        payload: {
          kind: "roll",
          roll: {
            expression: roll.expression,
            result: roll.result,
            breakdown: roll.breakdown,
            label: roll.label,
            advantage: roll.advantage,
            disadvantage: roll.disadvantage,
          },
          display_name: displayName,
        },
      });
      if (error) console.error(error);
    },
    [campaignId, mapId, supabase]
  );

  return { messages, loading, sendMessage, sendRollToChat, refetch: fetchMessages };
}
