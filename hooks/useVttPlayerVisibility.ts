"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Point } from "@/types/vtt-walls";
import {
  unionWithVisible,
  storedMemoryToKonvaPolys,
  type StoredMemory,
} from "@/lib/vtt/visibility-memory";

const DEBOUNCE_MS = 250;

/**
 * Loads the current user's accumulated memory polygon for (campaign, map).
 * Exposes a debounced `accumulate(visiblePolygon)` that unions and persists.
 */
export function useVttPlayerVisibility(
  campaignId: string | null,
  mapId: string | null,
  enabled: boolean
) {
  const [memory, setMemory] = useState<StoredMemory>([]);
  const memoryRef = useRef<StoredMemory>([]);
  const userIdRef = useRef<string | null>(null);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);

  useEffect(() => {
    if (!campaignId || !mapId || !enabled) {
      setMemory([]);
      memoryRef.current = [];
      userIdRef.current = null;
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      userIdRef.current = user.id;
      const { data, error } = await supabase
        .from("vtt_player_visibility")
        .select("seen_polygon")
        .eq("campaign_id", campaignId)
        .eq("map_id", mapId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Failed to load player visibility:", error);
        return;
      }
      const stored = (data?.seen_polygon as StoredMemory | null) ?? [];
      setMemory(stored);
      memoryRef.current = stored;
    };
    void run();
    return () => {
      cancelled = true;
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    };
  }, [campaignId, mapId, enabled]);

  const flush = useCallback(async () => {
    const userId = userIdRef.current;
    if (!campaignId || !mapId || !userId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("vtt_player_visibility")
      .upsert(
        {
          campaign_id: campaignId,
          map_id: mapId,
          user_id: userId,
          seen_polygon: memoryRef.current as unknown as object,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "campaign_id,map_id,user_id" }
      );
    if (error) console.error("Failed to persist player visibility:", error);
  }, [campaignId, mapId]);

  const accumulate = useCallback(
    (visible: Point[]) => {
      if (!enabled) return;
      const next = unionWithVisible(memoryRef.current, visible);
      memoryRef.current = next;
      setMemory(next);
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        void flush();
      }, DEBOUNCE_MS);
    },
    [enabled, flush]
  );

  /** Memory as Konva-ready outer ring polygons (flat [x,y,...]). */
  const memoryPolys = storedMemoryToKonvaPolys(memory);

  return { memoryPolys, accumulate };
}
