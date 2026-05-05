"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type VttPresencePeer = {
  userId: string;
  displayName: string;
  onlineAt: string;
};

type PresencePayload = {
  user_id: string;
  display_name: string;
  online_at: string;
};

/**
 * Tracks who is on this VTT scene (campaign + map) via Supabase Realtime Presence.
 */
export function useVttPresence(campaignId: string | null, mapId: string | null) {
  const [peers, setPeers] = useState<VttPresencePeer[]>([]);

  const flattenPresence = useCallback((ch: RealtimeChannel) => {
    const state = ch.presenceState() as Record<string, PresencePayload[]>;
    const byUser = new Map<string, VttPresencePeer>();
    for (const metas of Object.values(state)) {
      for (const meta of metas || []) {
        if (meta?.user_id) {
          byUser.set(meta.user_id, {
            userId: meta.user_id,
            displayName: meta.display_name || "Player",
            onlineAt: meta.online_at || "",
          });
        }
      }
    }
    setPeers(
      [...byUser.values()].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" })
      )
    );
  }, []);

  useEffect(() => {
    if (!campaignId) {
      setPeers([]);
      return;
    }

    const presenceMapKey = mapId ?? "__lobby__";

    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      let displayName = "Player";
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) displayName = profile.display_name;

      const topic = `vtt_presence:${campaignId}:${presenceMapKey}`;
      channel = supabase.channel(topic, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      const payload = (): PresencePayload => ({
        user_id: user.id,
        display_name: displayName,
        online_at: new Date().toISOString(),
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (channel) flattenPresence(channel);
        })
        .on("presence", { event: "join" }, () => {
          if (channel) flattenPresence(channel);
        })
        .on("presence", { event: "leave" }, () => {
          if (channel) flattenPresence(channel);
        });

      if (cancelled) {
        supabase.removeChannel(channel);
        return;
      }

      channel.subscribe(async (status) => {
        if (cancelled || !channel) return;
        if (status === "SUBSCRIBED") {
          await channel.track(payload());
          heartbeat = setInterval(() => {
            if (cancelled || !channel) return;
            void channel.track(payload());
          }, 25_000);
        }
      });
    };

    void run();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      if (channel) supabase.removeChannel(channel);
    };
  }, [campaignId, mapId, flattenPresence]);

  return { peers };
}
