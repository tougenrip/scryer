"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";
import type { Drawing, DrawingPoint } from "@/types/vtt-aoe";

interface CreateDrawingInput {
  points: DrawingPoint[];
  color: string;
  stroke_width: number;
  is_private?: boolean;
  /** Optional explicit id (used by undo to recreate with the original id). */
  id?: string;
}

export function useVttDrawings(campaignId: string | null, mapId: string | null) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  useEffect(() => {
    if (!campaignId || !mapId) {
      setDrawings([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("vtt_drawings")
        .select("*")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load drawings:", error);
        return;
      }
      setDrawings((data ?? []) as unknown as Drawing[]);
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`vtt_drawings:${mapId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_drawings",
          filter: `map_id=eq.${mapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as Drawing;
            setDrawings((prev) => (prev.some((d) => d.id === row.id) ? prev : [...prev, row]));
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as Drawing;
            setDrawings((prev) => prev.map((d) => (d.id === row.id ? row : d)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as Drawing;
            setDrawings((prev) => prev.filter((d) => d.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId, mapId]);

  const createDrawing = useCallback(
    async (input: CreateDrawingInput): Promise<Drawing | null> => {
      if (!campaignId || !mapId) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const id =
        input.id ??
        ((typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`) as string);
      const isPrivate = input.is_private ?? false;

      const optimistic: Drawing = {
        id,
        campaign_id: campaignId,
        map_id: mapId,
        owner_user_id: user.id,
        points: input.points,
        color: input.color,
        stroke_width: input.stroke_width,
        is_private: isPrivate,
        created_at: new Date().toISOString(),
      };
      setDrawings((prev) =>
        prev.some((d) => d.id === id) ? prev : [...prev, optimistic]
      );

      const { data, error } = await supabase
        .from("vtt_drawings")
        .insert({
          id,
          campaign_id: campaignId,
          map_id: mapId,
          owner_user_id: user.id,
          points: input.points,
          color: input.color,
          stroke_width: input.stroke_width,
          is_private: isPrivate,
        } as never)
        .select("*")
        .single();

      if (error) {
        console.error("Failed to create drawing:", error);
        toast.error("Couldn't save drawing");
        setDrawings((prev) => prev.filter((d) => d.id !== id));
        return null;
      }
      const row = data as unknown as Drawing;
      setDrawings((prev) => prev.map((d) => (d.id === id ? row : d)));
      return row;
    },
    [campaignId, mapId]
  );

  const deleteDrawing = useCallback(async (id: string) => {
    const supabase = createClient();
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    const { error } = await supabase.from("vtt_drawings").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete drawing:", error);
      toast.error("Couldn't delete drawing");
    }
  }, []);

  const clearDrawings = useCallback(
    async (ownerUserId?: string) => {
      if (!mapId) return;
      const supabase = createClient();
      setDrawings((prev) =>
        ownerUserId ? prev.filter((d) => d.owner_user_id !== ownerUserId) : []
      );
      let q = supabase.from("vtt_drawings").delete().eq("map_id", mapId);
      if (ownerUserId) q = q.eq("owner_user_id", ownerUserId);
      const { error } = await q;
      if (error) {
        console.error("Failed to clear drawings:", error);
        toast.error("Couldn't clear drawings");
      }
    },
    [mapId]
  );

  return { drawings, createDrawing, deleteDrawing, clearDrawings };
}
