"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";
import type { LightSource } from "@/types/vtt-light";

interface CreateLightInput {
  x: number;
  y: number;
  radius_ft: number;
  color?: string;
  intensity?: number;
  name?: string | null;
  /** Optional explicit id (used for optimistic insert + undo recreate). */
  id?: string;
}

/**
 * Realtime subscription + CRUD for standalone light sources on a VTT
 * map. Mirrors useVttAoeAreas — DM-only to mutate (enforced by RLS),
 * everyone can read so players see lights render in scene_dark mode.
 */
export function useVttLightSources(
  campaignId: string | null,
  mapId: string | null
) {
  const [lights, setLights] = useState<LightSource[]>([]);

  useEffect(() => {
    if (!campaignId || !mapId) {
      setLights([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("vtt_light_sources")
        .select("*")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load light sources:", error);
        return;
      }
      setLights((data ?? []) as unknown as LightSource[]);
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`vtt_light_sources:${mapId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_light_sources",
          filter: `map_id=eq.${mapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            setLights((prev) => {
              const row = payload.new as unknown as LightSource;
              if (prev.some((a) => a.id === row.id)) return prev;
              return [...prev, row];
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as LightSource;
            setLights((prev) => prev.map((a) => (a.id === row.id ? row : a)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as LightSource;
            setLights((prev) => prev.filter((a) => a.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId, mapId]);

  const createLight = useCallback(
    async (input: CreateLightInput): Promise<LightSource | null> => {
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

      const optimistic: LightSource = {
        id,
        campaign_id: campaignId,
        map_id: mapId,
        owner_user_id: user.id,
        x: input.x,
        y: input.y,
        radius_ft: input.radius_ft,
        color: input.color ?? "#FFC080",
        intensity: input.intensity ?? 1,
        name: input.name ?? null,
        created_at: new Date().toISOString(),
      };
      setLights((prev) => (prev.some((l) => l.id === id) ? prev : [...prev, optimistic]));

      const { data, error } = await supabase
        .from("vtt_light_sources")
        .insert({
          id,
          campaign_id: campaignId,
          map_id: mapId,
          owner_user_id: user.id,
          x: input.x,
          y: input.y,
          radius_ft: input.radius_ft,
          color: input.color ?? "#FFC080",
          intensity: input.intensity ?? 1,
          name: input.name ?? null,
        } as never)
        .select("*")
        .single();

      if (error) {
        console.error("Failed to create light source:", error);
        toast.error("Couldn't place light");
        setLights((prev) => prev.filter((l) => l.id !== id));
        return null;
      }
      const row = data as unknown as LightSource;
      setLights((prev) => prev.map((l) => (l.id === id ? row : l)));
      return row;
    },
    [campaignId, mapId]
  );

  const updateLight = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<LightSource, "x" | "y" | "radius_ft" | "color" | "intensity" | "name">
      >
    ) => {
      const supabase = createClient();
      setLights((prev) => prev.map((l) => (l.id === id ? { ...l, ...updates } : l)));
      const { error } = await supabase
        .from("vtt_light_sources")
        .update(updates as never)
        .eq("id", id);
      if (error) {
        console.error("Failed to update light source:", error);
        toast.error("Couldn't update light");
      }
    },
    []
  );

  const deleteLight = useCallback(async (id: string) => {
    const supabase = createClient();
    setLights((prev) => prev.filter((l) => l.id !== id));
    const { error } = await supabase
      .from("vtt_light_sources")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Failed to delete light source:", error);
      toast.error("Couldn't delete light");
    }
  }, []);

  return { lights, createLight, updateLight, deleteLight };
}
