import { createClient } from "@/lib/supabase/client";

export const SAMPLE_TOKEN_KEY = "sample_token_id" as const;

export type PublicSampleToken = {
  id: string;
  name: string;
  description?: string;
  publicPath: string;
};

/** Bundled token art for VTT Assets → Samples → Tokens. */
export const SAMPLE_TOKENS: PublicSampleToken[] = [];

export function getSampleToken(id: string): PublicSampleToken | undefined {
  return SAMPLE_TOKENS.find((s) => s.id === id);
}

function absolutePublicUrl(publicPath: string): string {
  if (typeof window === "undefined") return publicPath;
  return `${window.location.origin}${publicPath}`;
}

function findExistingSampleRow(
  rows: { id: string; grid_config: unknown }[],
  sampleId: string
): string | undefined {
  for (const m of rows) {
    const g = m.grid_config as Record<string, unknown> | null;
    if (g && String(g[SAMPLE_TOKEN_KEY]) === sampleId) return m.id;
  }
  return undefined;
}

/** Ensures this sample exists as a `media_items` row (type token) for the campaign. */
export async function ensureSampleTokenInCampaign(
  campaignId: string,
  sampleId: string
): Promise<{ mediaId: string | null; error: Error | null }> {
  const sample = getSampleToken(sampleId);
  if (!sample) {
    return { mediaId: null, error: new Error("Unknown sample token") };
  }

  const supabase = createClient();

  const { data: rows, error: fetchError } = await supabase
    .from("media_items")
    .select("id, grid_config")
    .eq("campaign_id", campaignId)
    .eq("type", "token");

  if (fetchError) {
    return { mediaId: null, error: fetchError as Error };
  }

  const existing = findExistingSampleRow(rows ?? [], sampleId);
  if (existing) {
    return { mediaId: existing, error: null };
  }

  const image_url = absolutePublicUrl(sample.publicPath);
  const grid_config = {
    [SAMPLE_TOKEN_KEY]: sample.id,
  };

  const { data: created, error: insertError } = await supabase
    .from("media_items")
    .insert({
      campaign_id: campaignId,
      name: `[Sample] ${sample.name}`,
      image_url,
      type: "token",
      grid_config,
    })
    .select("id")
    .single();

  if (insertError) {
    return { mediaId: null, error: insertError as Error };
  }
  return { mediaId: created.id, error: null };
}

export const SRD_MONSTER_KEY = "srd_monster_id" as const;

/** Ensures this SRD monster exists as a `media_items` row (type token) for the campaign. */
export async function ensureSrdMonsterTokenInCampaign(
  campaignId: string,
  monsterId: string,
  monsterName: string,
  monsterImageUrl?: string | null,
  monsterIndex?: string | null
): Promise<{ mediaId: string | null; error: Error | null; imageUrl: string }> {
  const supabase = createClient();

  const { data: rows, error: fetchError } = await supabase
    .from("media_items")
    .select("id, grid_config, image_url")
    .eq("campaign_id", campaignId)
    .eq("type", "token");

  if (fetchError) {
    return { mediaId: null, error: fetchError as Error, imageUrl: "" };
  }

  // Find existing
  for (const m of rows ?? []) {
    const g = m.grid_config as Record<string, unknown> | null;
    if (g && String(g[SRD_MONSTER_KEY]) === monsterId) {
      return { mediaId: m.id, error: null, imageUrl: m.image_url || "" };
    }
  }

  const imageUrl =
    monsterImageUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(monsterName)}&background=random&color=fff&rounded=true&size=256`;
  const grid_config = {
    [SRD_MONSTER_KEY]: monsterId,
    srd_monster_index: monsterIndex ?? null,
  };

  const { data: created, error: insertError } = await supabase
    .from("media_items")
    .insert({
      campaign_id: campaignId,
      name: `[Monster] ${monsterName}`,
      image_url: imageUrl,
      type: "token",
      grid_config,
    })
    .select("id, image_url")
    .single();

  if (insertError) {
    return { mediaId: null, error: insertError as Error, imageUrl: "" };
  }
  return { mediaId: created.id, error: null, imageUrl: created.image_url || imageUrl };
}

