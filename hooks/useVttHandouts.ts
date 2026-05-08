"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";

export type HandoutKind = "pin" | "scene" | "bounty";

export type PinSnapshot = {
  kind: "pin";
  pin_id: string | null;
  scene_id: string | null;
  name: string;
  description: string | null;
  icon_type: string | null;
  background_shape: string | null;
  color: string;
  image_url: string | null;
};

/** Frozen-at-send-time copy of a pin so the handout still renders if the
 * source pin is later edited or deleted. Only the fields AtlasMap needs to
 * draw the marker are kept. */
export type EmbeddedMarker = {
  id: string;
  x: number;
  y: number;
  name: string | null;
  description: string | null;
  icon_type: string | null;
  background_shape: string | null;
  status_icon: string | null;
  color: string;
  size: "small" | "medium" | "large";
  visible: boolean;
};

export type SceneSnapshot = {
  kind: "scene";
  scene_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  pin_count: number;
  /** Snapshot of the visible pins on the scene at send time. */
  markers: EmbeddedMarker[];
};

export type BountySnapshot = {
  kind: "bounty";
  /** id from bounty_board, null if the source row was deleted later. */
  bounty_id: string | null;
  /** Display fields. `name` is the bounty title for inbox/header parity. */
  name: string;
  description: string | null;
  target_name: string;
  target_type: "npc" | "monster" | "other";
  reward: string | null;
  location: string | null;
  status: "available" | "claimed" | "completed";
  /** Carried for parity with the other snapshot variants — bounties don't
   * have their own image yet, so this is always null today. */
  image_url: string | null;
};

export type HandoutSnapshot = PinSnapshot | SceneSnapshot | BountySnapshot;

export interface Handout {
  id: string;
  campaign_id: string;
  sent_by: string;
  kind: HandoutKind;
  pin_id: string | null;
  scene_id: string | null;
  snapshot: HandoutSnapshot;
  created_at: string;
}

export interface HandoutRead {
  handout_id: string;
  user_id: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export function useVttHandouts(campaignId: string | null, userId: string | null) {
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [reads, setReads] = useState<Record<string, HandoutRead>>({});
  // All reads (DM only) — keyed by handout_id then user_id.
  const [allReads, setAllReads] = useState<Record<string, Record<string, HandoutRead>>>(
    {}
  );

  // Initial fetch + realtime subscribe.
  useEffect(() => {
    if (!campaignId) {
      setHandouts([]);
      setReads({});
      setAllReads({});
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data: hData, error: hErr } = await supabase
        .from("vtt_handouts")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (hErr) {
        console.error("Failed to load handouts:", hErr);
        return;
      }
      const list = (hData ?? []) as unknown as Handout[];
      setHandouts(list);

      // Read state: own row for players, ALL rows for DM.
      const ids = list.map((h) => h.id);
      if (ids.length === 0) return;
      const { data: rData } = await supabase
        .from("vtt_handout_reads")
        .select("*")
        .in("handout_id", ids);
      if (cancelled) return;
      if (rData) {
        const own: Record<string, HandoutRead> = {};
        const all: Record<string, Record<string, HandoutRead>> = {};
        for (const r of rData as unknown as HandoutRead[]) {
          if (r.user_id === userId) own[r.handout_id] = r;
          if (!all[r.handout_id]) all[r.handout_id] = {};
          all[r.handout_id][r.user_id] = r;
        }
        setReads(own);
        setAllReads(all);
      }
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`vtt_handouts:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_handouts",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as Handout;
            setHandouts((prev) =>
              prev.some((h) => h.id === row.id) ? prev : [row, ...prev]
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as { id: string };
            setHandouts((prev) => prev.filter((h) => h.id !== row.id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_handout_reads",
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const row = payload.new as unknown as HandoutRead;
            setAllReads((prev) => ({
              ...prev,
              [row.handout_id]: {
                ...(prev[row.handout_id] ?? {}),
                [row.user_id]: row,
              },
            }));
            if (row.user_id === userId) {
              setReads((prev) => ({ ...prev, [row.handout_id]: row }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId, userId]);

  const sendHandout = useCallback(
    async (input: {
      kind: HandoutKind;
      pinId?: string | null;
      sceneId?: string | null;
      snapshot: HandoutSnapshot;
    }) => {
      if (!campaignId || !userId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vtt_handouts")
        .insert({
          campaign_id: campaignId,
          sent_by: userId,
          kind: input.kind,
          pin_id: input.pinId ?? null,
          scene_id: input.sceneId ?? null,
          snapshot: input.snapshot as unknown as object,
        } as never)
        .select("*")
        .single();
      if (error) {
        console.error("Failed to send handout:", error);
        toast.error("Couldn't send handout");
        return null;
      }
      toast.success("Handout sent");
      return data as unknown as Handout;
    },
    [campaignId, userId]
  );

  const markRead = useCallback(
    async (handoutId: string) => {
      if (!userId) return;
      const supabase = createClient();
      const now = new Date().toISOString();
      // Optimistic
      setReads((prev) => ({
        ...prev,
        [handoutId]: {
          handout_id: handoutId,
          user_id: userId,
          read_at: prev[handoutId]?.read_at ?? now,
          dismissed_at: prev[handoutId]?.dismissed_at ?? null,
        },
      }));
      await supabase
        .from("vtt_handout_reads")
        .upsert(
          {
            handout_id: handoutId,
            user_id: userId,
            read_at: now,
          } as never,
          { onConflict: "handout_id,user_id" }
        );
    },
    [userId]
  );

  const markDismissed = useCallback(
    async (handoutId: string) => {
      if (!userId) return;
      const supabase = createClient();
      const now = new Date().toISOString();
      setReads((prev) => ({
        ...prev,
        [handoutId]: {
          handout_id: handoutId,
          user_id: userId,
          read_at: prev[handoutId]?.read_at ?? now,
          dismissed_at: now,
        },
      }));
      await supabase
        .from("vtt_handout_reads")
        .upsert(
          {
            handout_id: handoutId,
            user_id: userId,
            read_at: now,
            dismissed_at: now,
          } as never,
          { onConflict: "handout_id,user_id" }
        );
    },
    [userId]
  );

  /** DM-only: per-handout read counts. */
  const readCount = useCallback(
    (handoutId: string): { read: number } => {
      const rows = allReads[handoutId] ?? {};
      let read = 0;
      for (const r of Object.values(rows)) {
        if (r.read_at) read += 1;
      }
      return { read };
    },
    [allReads]
  );

  return {
    handouts,
    reads,
    sendHandout,
    markRead,
    markDismissed,
    readCount,
  };
}
