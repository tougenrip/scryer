"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Point, Wall } from "@/types/vtt-walls";

interface CreateWallInput {
  points: Point[];
  is_door?: boolean;
}

export function useVttWalls(campaignId: string | null, mapId: string | null) {
  const [walls, setWalls] = useState<Wall[]>([]);
  const sceneChannelRef = useRef<RealtimeChannel | null>(null);

  // Initial load + postgres_changes subscription
  useEffect(() => {
    if (!campaignId || !mapId) {
      setWalls([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("vtt_walls")
        .select("*")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load walls:", error);
        return;
      }
      setWalls((data ?? []) as unknown as Wall[]);
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`vtt_walls:${mapId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_walls",
          filter: `map_id=eq.${mapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as Wall;
            setWalls((prev) =>
              prev.some((w) => w.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as Wall;
            setWalls((prev) => prev.map((w) => (w.id === row.id ? row : w)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as Wall;
            setWalls((prev) => prev.filter((w) => w.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId, mapId]);

  // Snappy door-toggle broadcast channel
  useEffect(() => {
    if (!campaignId || !mapId) return;
    const supabase = createClient();
    const ch = supabase.channel(uniqueChannelTopic(`vtt_scene:${campaignId}:${mapId}`));
    ch.on("broadcast", { event: "door_toggle" }, ({ payload }) => {
      const p = payload as { id: string; is_open: boolean };
      setWalls((prev) =>
        prev.map((w) => (w.id === p.id ? { ...w, is_open: p.is_open } : w))
      );
    });
    ch.subscribe();
    sceneChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      sceneChannelRef.current = null;
    };
  }, [campaignId, mapId]);

  const createWall = useCallback(
    async (input: CreateWallInput): Promise<Wall | null> => {
      if (!campaignId || !mapId) return null;
      const supabase = createClient();
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Wall = {
        id,
        campaign_id: campaignId,
        map_id: mapId,
        points: input.points,
        is_door: input.is_door ?? false,
        is_open: false,
        created_at: new Date().toISOString(),
      };
      setWalls((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from("vtt_walls")
        .insert({
          id,
          campaign_id: campaignId,
          map_id: mapId,
          points: input.points,
          is_door: input.is_door ?? false,
          is_open: false,
        } as never)
        .select("*")
        .single();
      if (error) {
        console.error("Failed to create wall:", error);
        toast.error("Couldn't save wall");
        setWalls((prev) => prev.filter((w) => w.id !== id));
        return null;
      }
      const row = data as unknown as Wall;
      setWalls((prev) => prev.map((w) => (w.id === id ? row : w)));
      return row;
    },
    [campaignId, mapId]
  );

  const deleteWall = useCallback(
    async (id: string) => {
      const supabase = createClient();
      setWalls((prev) => prev.filter((w) => w.id !== id));
      const { error } = await supabase.from("vtt_walls").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete wall:", error);
        toast.error("Couldn't delete wall");
      }
    },
    []
  );

  const toggleDoor = useCallback(
    async (id: string) => {
      const target = walls.find((w) => w.id === id);
      if (!target || !target.is_door) return;
      const nextOpen = !target.is_open;
      // Optimistic + broadcast for snappy peer feedback.
      setWalls((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_open: nextOpen } : w))
      );
      const ch = sceneChannelRef.current;
      if (ch) {
        void ch.send({
          type: "broadcast",
          event: "door_toggle",
          payload: { id, is_open: nextOpen },
        });
      }
      const supabase = createClient();
      const { error } = await supabase
        .from("vtt_walls")
        .update({ is_open: nextOpen } as never)
        .eq("id", id);
      if (error) {
        console.error("Failed to toggle door:", error);
        toast.error("Couldn't open/close door");
        // revert
        setWalls((prev) =>
          prev.map((w) => (w.id === id ? { ...w, is_open: !nextOpen } : w))
        );
        if (ch) {
          void ch.send({
            type: "broadcast",
            event: "door_toggle",
            payload: { id, is_open: !nextOpen },
          });
        }
      }
    },
    [walls]
  );

  return { walls, createWall, deleteWall, toggleDoor };
}
