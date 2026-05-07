"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";

export type VttTrackedObjectiveSource = "party_objective" | "quest" | "quest_objective";

export type VttTrackedObjective = {
  id: string;
  campaign_id: string;
  source_type: VttTrackedObjectiveSource;
  source_id: string;
  created_by: string | null;
  created_at: string;
};

export function useVttTrackedObjectives(campaignId: string | null) {
  const [tracked, setTracked] = useState<VttTrackedObjective[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!campaignId) {
      setTracked([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("vtt_tracked_objectives")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    if (!error) {
      setTracked((data ?? []) as VttTrackedObjective[]);
    }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!campaignId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(uniqueChannelTopic(`vtt-tracked-objectives:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_tracked_objectives",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          void refetch();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [campaignId, refetch]);

  const trackedKeys = useMemo(() => {
    return new Set(tracked.map((item) => `${item.source_type}:${item.source_id}`));
  }, [tracked]);

  const isTracked = useCallback(
    (sourceType: VttTrackedObjectiveSource, sourceId: string) =>
      trackedKeys.has(`${sourceType}:${sourceId}`),
    [trackedKeys]
  );

  const track = useCallback(
    async (sourceType: VttTrackedObjectiveSource, sourceId: string) => {
      if (!campaignId) return { success: false };
      const response = await fetch("/api/vtt/tracked-objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          sourceType,
          sourceId,
          action: "track",
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        details?: string;
        hint?: string;
        code?: string;
      } | null;
      if (response.ok) {
        void refetch();
        return { success: true };
      }
      console.error("Failed to track HUD objective:", payload);
      return { success: false, error: payload };
    },
    [campaignId, refetch]
  );

  const untrack = useCallback(
    async (sourceType: VttTrackedObjectiveSource, sourceId: string) => {
      if (!campaignId) return { success: false };
      const response = await fetch("/api/vtt/tracked-objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          sourceType,
          sourceId,
          action: "untrack",
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        details?: string;
        hint?: string;
        code?: string;
      } | null;
      if (response.ok) {
        void refetch();
        return { success: true };
      }
      console.error("Failed to untrack HUD objective:", payload);
      return { success: false, error: payload };
    },
    [campaignId, refetch]
  );

  const toggle = useCallback(
    async (sourceType: VttTrackedObjectiveSource, sourceId: string) => {
      if (isTracked(sourceType, sourceId)) {
        return untrack(sourceType, sourceId);
      }
      return track(sourceType, sourceId);
    },
    [isTracked, track, untrack]
  );

  return { tracked, loading, isTracked, track, untrack, toggle, refetch };
}
