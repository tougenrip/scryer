"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { CampaignCalendar } from "./useForgeContent";

/**
 * Shared, ref-counted live subscription to a campaign's calendar row.
 * Multiple components in the VTT (time HUD, day-cycle emblem) need the
 * same data — sharing one channel + one in-memory copy avoids redundant
 * realtime traffic + avoids the StrictMode double-subscribe race.
 */
type Cache = {
  channel: RealtimeChannel;
  refs: number;
  data: CampaignCalendar | null;
  listeners: Set<(c: CampaignCalendar | null) => void>;
};

const cache = new Map<string, Cache>();

function notify(c: Cache) {
  for (const fn of c.listeners) fn(c.data);
}

export function useCampaignCalendarLive(campaignId: string | null) {
  const [calendar, setCalendar] = useState<CampaignCalendar | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setCalendar(null);
      return;
    }
    const supabase = createClient();
    const key = campaignId;
    let listener: ((c: CampaignCalendar | null) => void) | null = null;

    const start = async () => {
      let entry = cache.get(key);
      if (!entry) {
        const channel = supabase
          .channel(uniqueChannelTopic(`campaign_calendar:${key}`))
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "campaign_calendar",
              filter: `campaign_id=eq.${key}`,
            },
            (payload) => {
              const cur = cache.get(key);
              if (!cur) return;
              if (payload.eventType === "DELETE") cur.data = null;
              else cur.data = payload.new as CampaignCalendar;
              notify(cur);
            }
          )
          .subscribe();
        entry = { channel, refs: 0, data: null, listeners: new Set() };
        cache.set(key, entry);

        // Initial fetch.
        const { data } = await supabase
          .from("campaign_calendar")
          .select("*")
          .eq("campaign_id", key)
          .maybeSingle();
        const cur = cache.get(key);
        if (cur) {
          cur.data = (data as CampaignCalendar | null) ?? null;
          notify(cur);
        }
      }
      entry.refs += 1;
      listener = (c) => setCalendar(c);
      entry.listeners.add(listener);
      // Bootstrap from current cached value if we joined late.
      setCalendar(entry.data);
    };
    void start();

    return () => {
      const entry = cache.get(key);
      if (!entry) return;
      if (listener) entry.listeners.delete(listener);
      entry.refs -= 1;
      if (entry.refs <= 0) {
        cache.delete(key);
        supabase.removeChannel(entry.channel);
      }
    };
  }, [campaignId]);

  /** Push a value into the shared cache so other consumers see optimistic
   *  updates without waiting for the realtime round-trip. */
  const setShared = (next: CampaignCalendar | null) => {
    if (!campaignId) return;
    const entry = cache.get(campaignId);
    if (!entry) return;
    entry.data = next;
    notify(entry);
  };

  return { calendar, setCalendar: setShared };
}
