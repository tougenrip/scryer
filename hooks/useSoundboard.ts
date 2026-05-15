"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";
import type {
  SoundboardSound,
  SampleSoundboardAsset,
} from "@/types/soundboard";
import { broadcastSfx } from "@/lib/realtime/vtt-sfx-channel";

const STORAGE_BUCKET = "campaign-audio";

interface CreateInput {
  name: string;
  audio_url: string;
  emoji?: string | null;
  color?: string | null;
  category?: string | null;
  duration_ms?: number | null;
}

/**
 * Soundboard state for one campaign. Manages:
 *   • the campaign-authored sound list (`sounds`) with realtime sync
 *   • the catalog of admin-seeded sample sounds (`samples`) DMs can
 *     pull into their library
 *   • a `play(sound)` helper that broadcasts to every client via the
 *     SFX channel and plays a local HTMLAudio in response
 *   • upload + remove helpers for the DM
 */
export function useSoundboard(campaignId: string | null) {
  const [sounds, setSounds] = useState<SoundboardSound[]>([]);
  const [samples, setSamples] = useState<SampleSoundboardAsset[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch + realtime ─────────────────────────────────────────────
  useEffect(() => {
    if (!campaignId) {
      setSounds([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);

    const fetchAll = async () => {
      const [soundsRes, samplesRes] = await Promise.all([
        supabase
          .from("soundboard_sounds")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: true }),
        supabase
          .from("vtt_sample_assets")
          .select("id, kind, category_id, storage_path, public_url, grid_config")
          .eq("kind", "soundboard")
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (soundsRes.error) {
        console.error("Failed to load soundboard:", soundsRes.error);
      } else {
        setSounds((soundsRes.data ?? []) as unknown as SoundboardSound[]);
      }
      if (samplesRes.error) {
        console.error("Failed to load sample sounds:", samplesRes.error);
      } else {
        const rows = (samplesRes.data ?? []) as Array<{
          id: string;
          kind: "soundboard";
          category_id: string | null;
          storage_path: string;
          public_url: string;
          grid_config?: Record<string, unknown> | null;
          created_at?: string;
        }>;
        setSamples(
          rows.map((r) => {
            const cfg = r.grid_config ?? {};
            const name =
              typeof cfg.display_name === "string"
                ? cfg.display_name
                : nameFromPath(r.storage_path);
            return {
              id: r.id,
              kind: "soundboard",
              category_id: r.category_id,
              name,
              url: r.public_url,
              emoji: typeof cfg.emoji === "string" ? cfg.emoji : null,
              description:
                typeof cfg.description === "string" ? cfg.description : null,
              created_at: r.created_at ?? new Date().toISOString(),
            };
          })
        );
      }
      setLoading(false);
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`soundboard_sounds:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "soundboard_sounds",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as SoundboardSound;
            setSounds((prev) =>
              prev.some((s) => s.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as SoundboardSound;
            setSounds((prev) => prev.map((s) => (s.id === row.id ? row : s)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as SoundboardSound;
            setSounds((prev) => prev.filter((s) => s.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  // Local playback is handled by <SfxAudioBridge>, which is mounted
  // at page scope so it's active regardless of whether the music
  // sidebar is open. The hook just broadcasts.

  /** Fire a sound: broadcast → all clients (incl. self) play locally. */
  const play = useCallback(
    async (sound: { audio_url: string; name?: string; volume?: number }) => {
      if (!campaignId) return;
      await broadcastSfx(campaignId, {
        audio_url: sound.audio_url,
        name: sound.name,
        volume: sound.volume,
      });
    },
    [campaignId]
  );

  // ── CRUD ─────────────────────────────────────────────────────────
  const createSound = useCallback(
    async (input: CreateInput): Promise<SoundboardSound | null> => {
      if (!campaignId) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("soundboard_sounds")
        .insert({
          campaign_id: campaignId,
          name: input.name,
          audio_url: input.audio_url,
          emoji: input.emoji ?? null,
          color: input.color ?? null,
          category: input.category ?? null,
          duration_ms: input.duration_ms ?? null,
          created_by: user.id,
        } as never)
        .select("*")
        .single();
      if (error) {
        console.error("Failed to create soundboard sound:", error);
        toast.error("Couldn't add sound");
        return null;
      }
      return data as unknown as SoundboardSound;
    },
    [campaignId]
  );

  const updateSound = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<SoundboardSound, "name" | "emoji" | "color" | "category">
      >
    ) => {
      const supabase = createClient();
      setSounds((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      );
      const { error } = await supabase
        .from("soundboard_sounds")
        .update(patch as never)
        .eq("id", id);
      if (error) {
        console.error("Failed to update sound:", error);
        toast.error("Couldn't save changes");
      }
    },
    []
  );

  const deleteSound = useCallback(async (id: string) => {
    const supabase = createClient();
    setSounds((prev) => prev.filter((s) => s.id !== id));
    const { error } = await supabase
      .from("soundboard_sounds")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Failed to delete sound:", error);
      toast.error("Couldn't delete sound");
    }
  }, []);

  /** Upload a local file → returns a public URL the caller can pass to
   *  `createSound`. Stores under `{campaignId}/sfx/{ts}-{name}`. */
  const uploadFile = useCallback(
    async (file: File): Promise<string | null> => {
      if (!campaignId) return null;
      const supabase = createClient();
      const ts = Date.now();
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${campaignId}/sfx/${ts}-${safe}`;
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: false });
      if (error) {
        console.error("Upload failed:", error);
        toast.error(`Upload failed: ${error.message}`);
        return null;
      }
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      return data.publicUrl;
    },
    [campaignId]
  );

  /** Pull a sample asset into the campaign's soundboard. Stores the
   *  sample's public_url + carried metadata as a new sound row. */
  const addFromSample = useCallback(
    async (sample: SampleSoundboardAsset) => {
      return createSound({
        name: sample.name,
        audio_url: sample.url,
        emoji: sample.emoji ?? null,
      });
    },
    [createSound]
  );

  // ── Grouped view (by category) for the UI ────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, SoundboardSound[]>();
    for (const s of sounds) {
      const key = s.category?.trim() || "uncategorized";
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, list]) => ({
        category: cat,
        sounds: [...list].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [sounds]);

  return {
    sounds,
    grouped,
    samples,
    loading,
    play,
    createSound,
    updateSound,
    deleteSound,
    uploadFile,
    addFromSample,
  };
}

function nameFromPath(storagePath: string): string {
  // strip dir, strip extension, replace separators
  const file = storagePath.split("/").pop() ?? storagePath;
  return file.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
}
