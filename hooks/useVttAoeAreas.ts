"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { AoeArea, AoeShape } from "@/types/vtt-aoe";

interface CreateAreaInput {
  shape: AoeShape;
  origin_x: number;
  origin_y: number;
  length_ft: number;
  rotation_deg: number;
  color: string;
  label?: string | null;
}

export function useVttAoeAreas(campaignId: string | null, mapId: string | null) {
  const [areas, setAreas] = useState<AoeArea[]>([]);

  useEffect(() => {
    if (!campaignId || !mapId) {
      setAreas([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("vtt_aoe_areas")
        .select("*")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load AOE areas:", error);
        return;
      }
      setAreas((data ?? []) as unknown as AoeArea[]);
    };
    void fetchAll();

    const channel = supabase
      .channel(`vtt_aoe_areas:${mapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_aoe_areas",
          filter: `map_id=eq.${mapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            setAreas((prev) => {
              const row = payload.new as unknown as AoeArea;
              if (prev.some((a) => a.id === row.id)) return prev;
              return [...prev, row];
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as AoeArea;
            setAreas((prev) => prev.map((a) => (a.id === row.id ? row : a)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as AoeArea;
            setAreas((prev) => prev.filter((a) => a.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId, mapId]);

  const createArea = useCallback(
    async (input: CreateAreaInput): Promise<AoeArea | null> => {
      if (!campaignId || !mapId) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const id = (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`) as string;

      const optimistic: AoeArea = {
        id,
        campaign_id: campaignId,
        map_id: mapId,
        owner_user_id: user.id,
        shape: input.shape,
        origin_x: input.origin_x,
        origin_y: input.origin_y,
        length_ft: input.length_ft,
        rotation_deg: input.rotation_deg,
        color: input.color,
        label: input.label ?? null,
        created_at: new Date().toISOString(),
      };
      setAreas((prev) => (prev.some((a) => a.id === id) ? prev : [...prev, optimistic]));

      const { data, error } = await supabase
        .from("vtt_aoe_areas")
        .insert({
          id,
          campaign_id: campaignId,
          map_id: mapId,
          owner_user_id: user.id,
          shape: input.shape,
          origin_x: input.origin_x,
          origin_y: input.origin_y,
          length_ft: input.length_ft,
          rotation_deg: input.rotation_deg,
          color: input.color,
          label: input.label ?? null,
        } as never)
        .select("*")
        .single();

      if (error) {
        console.error("Failed to create AOE area:", error);
        toast.error("Couldn't place area");
        setAreas((prev) => prev.filter((a) => a.id !== id));
        return null;
      }
      const row = data as unknown as AoeArea;
      setAreas((prev) => prev.map((a) => (a.id === id ? row : a)));
      return row;
    },
    [campaignId, mapId]
  );

  const updateArea = useCallback(
    async (
      id: string,
      updates: Partial<Pick<AoeArea, "origin_x" | "origin_y" | "rotation_deg" | "length_ft" | "label">>
    ) => {
      const supabase = createClient();
      setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
      const { error } = await supabase
        .from("vtt_aoe_areas")
        .update(updates as never)
        .eq("id", id);
      if (error) {
        console.error("Failed to update AOE area:", error);
        toast.error("Couldn't update area");
      }
    },
    []
  );

  const deleteArea = useCallback(async (id: string) => {
    const supabase = createClient();
    setAreas((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase.from("vtt_aoe_areas").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete AOE area:", error);
      toast.error("Couldn't delete area");
    }
  }, []);

  return { areas, createArea, updateArea, deleteArea };
}
