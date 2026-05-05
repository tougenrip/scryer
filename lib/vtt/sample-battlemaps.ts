import { createClient } from "@/lib/supabase/client";

export const SAMPLE_BATTLEMAP_KEY = "sample_battlemap_id" as const;

export type PublicSampleBattlemap = {
  id: string;
  name: string;
  description?: string;
  /** Path served from /public, e.g. /vtt/samples/battlemaps/map.webp */
  publicPath: string;
  grid_config: {
    pixelSize: number;
    type: "square" | "hex";
    feetPerSquare?: number;
  };
};

/**
 * Global sample battlemaps (bundled under public/). Shown in VTT Assets → Samples.
 * Load / Push copies into the campaign as type `map` when needed.
 */
export const SAMPLE_BATTLEMAPS: PublicSampleBattlemap[] = [
];

export function getSampleBattlemap(id: string): PublicSampleBattlemap | undefined {
  return SAMPLE_BATTLEMAPS.find((s) => s.id === id);
}

function absolutePublicUrl(publicPath: string): string {
  if (typeof window === "undefined") return publicPath;
  return `${window.location.origin}${publicPath}`;
}

function findExistingSampleRow(
  maps: { id: string; grid_config: unknown }[],
  sampleId: string
): string | undefined {
  for (const m of maps) {
    const g = m.grid_config as Record<string, unknown> | null;
    if (g && String(g[SAMPLE_BATTLEMAP_KEY]) === sampleId) return m.id;
  }
  return undefined;
}

/**
 * Ensures this sample exists as a `media_items` row for the campaign (idempotent).
 */
export async function ensureSampleBattlemapInCampaign(
  campaignId: string,
  sampleId: string
): Promise<{ mediaId: string | null; error: Error | null }> {
  const sample = getSampleBattlemap(sampleId);
  if (!sample) {
    return { mediaId: null, error: new Error("Unknown sample battlemap") };
  }

  const supabase = createClient();

  const { data: rows, error: fetchError } = await supabase
    .from("media_items")
    .select("id, grid_config")
    .eq("campaign_id", campaignId)
    .eq("type", "map");

  if (fetchError) {
    return { mediaId: null, error: fetchError as Error };
  }

  const existing = findExistingSampleRow(rows ?? [], sampleId);
  if (existing) {
    return { mediaId: existing, error: null };
  }

  const image_url = absolutePublicUrl(sample.publicPath);
  const grid_config = {
    ...sample.grid_config,
    [SAMPLE_BATTLEMAP_KEY]: sample.id,
  };

  const { data: created, error: insertError } = await supabase
    .from("media_items")
    .insert({
      campaign_id: campaignId,
      name: `[Sample] ${sample.name}`,
      image_url,
      type: "map",
      grid_config,
    })
    .select("id")
    .single();

  if (insertError) {
    return { mediaId: null, error: insertError as Error };
  }
  return { mediaId: created.id, error: null };
}

export function isSampleBattlemapItem(gridConfig: unknown): boolean {
  if (!gridConfig || typeof gridConfig !== "object") return false;
  return SAMPLE_BATTLEMAP_KEY in (gridConfig as object);
}
