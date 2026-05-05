import { createClient } from "@/lib/supabase/client";
import type { VttSampleAssetRow } from "./sample-catalog";
import { labelFromSampleStoragePath } from "./sample-storage-label";

export const SAMPLE_ASSET_KEY = "vtt_sample_asset_id" as const;

export async function ensureVttSampleAssetInCampaign(
  campaignId: string,
  asset: VttSampleAssetRow
): Promise<{ mediaId: string | null; error: Error | null }> {
  const supabase = createClient();
  
  const type = asset.kind === "battlemap" ? "map" : asset.kind === "token" ? "token" : "prop";
  
  const { data: rows, error: fetchError } = await supabase
    .from("media_items")
    .select("id, grid_config")
    .eq("campaign_id", campaignId)
    .eq("type", type);
    
  if (fetchError) {
    return { mediaId: null, error: fetchError as Error };
  }
  
  for (const m of (rows || [])) {
    const g = m.grid_config as Record<string, unknown> | null;
    if (g && String(g[SAMPLE_ASSET_KEY]) === asset.id) {
      return { mediaId: m.id, error: null };
    }
  }
  
  const name = labelFromSampleStoragePath(asset.storage_path);
  const grid_config = {
    ...(asset.grid_config && typeof asset.grid_config === "object" ? asset.grid_config : {}),
    [SAMPLE_ASSET_KEY]: asset.id
  };
  
  const { data: created, error: insertError } = await supabase
    .from("media_items")
    .insert({
      campaign_id: campaignId,
      name: `[Sample] ${name}`,
      image_url: asset.public_url,
      type,
      grid_config
    })
    .select("id")
    .single();
    
  if (insertError) {
    return { mediaId: null, error: insertError as Error };
  }
  return { mediaId: created.id, error: null };
}
