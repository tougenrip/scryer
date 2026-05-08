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
 * Module-level ref-counted channel cache. Supabase only allows one
 * channel per topic and presence requires a stable topic so users land
 * in the same room. React 18 StrictMode runs effects twice — without a
 * cache, the second mount tries to attach `.on()` callbacks to the
 * still-subscribing first mount and throws "cannot add presence
 * callbacks after subscribe()". With this cache, both mounts share the
 * same channel and the channel is only torn down when the last user
 * unmounts.
 */
type CachedChannel = {
  channel: RealtimeChannel;
  refs: number;
  /** Listeners that get notified on each presence event. */
  listeners: Set<(state: Record<string, PresencePayload[]>) => void>;
};
const presenceChannelCache = new Map<string, CachedChannel>();

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
    const topic = `vtt_presence:${campaignId}:${presenceMapKey}`;

    const supabase = createClient();
    let cancelled = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;
    let cached: CachedChannel | null = null;
    let listener: ((state: Record<string, PresencePayload[]>) => void) | null = null;

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

      const payload = (): PresencePayload => ({
        user_id: user.id,
        display_name: displayName,
        online_at: new Date().toISOString(),
      });

      // Get-or-create the cached channel for this topic.
      cached = presenceChannelCache.get(topic) ?? null;
      if (!cached) {
        const channel = supabase.channel(topic, {
          config: { presence: { key: user.id } },
        });
        const newCache: CachedChannel = {
          channel,
          refs: 0,
          listeners: new Set(),
        };
        const broadcast = () => {
          const state = channel.presenceState() as Record<
            string,
            PresencePayload[]
          >;
          for (const fn of newCache.listeners) fn(state);
        };
        channel
          .on("presence", { event: "sync" }, broadcast)
          .on("presence", { event: "join" }, broadcast)
          .on("presence", { event: "leave" }, broadcast)
          .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
              await channel.track(payload());
            }
          });
        cached = newCache;
        presenceChannelCache.set(topic, newCache);
      }
      cached.refs += 1;

      // Subscribe this mount to broadcasts from the cached channel.
      listener = (state) => {
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
            a.displayName.localeCompare(b.displayName, undefined, {
              sensitivity: "base",
            })
          )
        );
      };
      cached.listeners.add(listener);

      // Push our presence + start the heartbeat.
      void cached.channel.track(payload());
      heartbeat = setInterval(() => {
        if (cancelled || !cached) return;
        void cached.channel.track(payload());
      }, 25_000);

      // Bootstrap with whatever presence state already exists.
      flattenPresence(cached.channel);
    };

    void run();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      if (!cached) return;
      if (listener) cached.listeners.delete(listener);
      cached.refs -= 1;
      if (cached.refs <= 0) {
        // Last user leaving — release the channel.
        presenceChannelCache.delete(topic);
        supabase.removeChannel(cached.channel);
      }
    };
  }, [campaignId, mapId, flattenPresence]);

  return { peers };
}
