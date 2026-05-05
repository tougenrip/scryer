import { createClient } from "@/lib/supabase/client";
import { buildGridConfig } from "@/lib/vtt/grid-config";
import type { Scene } from "@/hooks/useForgeContent";
import type { MediaItem } from "@/hooks/useCampaignContent";

const FORGE_KEY = "forge_scene_id";

/** Find or create a media_items row for a Forge scene so VTT (tokens, handout) can use media_items.id */
export async function getOrCreateMediaItemForForgeScene(
  scene: Scene
): Promise<{ mediaId: string | null; error: Error | null }> {
  if (!scene.image_url?.trim()) {
    return {
      mediaId: null,
      error: new Error("This scene has no image yet. Add one in the Forge Scenes editor."),
    };
  }

  const supabase = createClient();

  const { data: rows, error: fetchError } = await supabase
    .from("media_items")
    .select("id, grid_config")
    .eq("campaign_id", scene.campaign_id)
    .eq("type", "map");

  if (fetchError) {
    return { mediaId: null, error: fetchError as Error };
  }

  const existing = rows?.find((r) => {
    const g = r.grid_config as Record<string, unknown> | null;
    return g && String(g[FORGE_KEY]) === scene.id;
  });
  if (existing) {
    return { mediaId: existing.id, error: null };
  }

  const grid_config = {
    ...buildGridConfig({
      gridType: "square",
      feetPerSquare: 5,
      widthSquares: null,
      heightSquares: null,
      pixelSize: 50,
    }),
    [FORGE_KEY]: scene.id,
  };

  const { data: created, error: insertError } = await supabase
    .from("media_items")
    .insert({
      campaign_id: scene.campaign_id,
      name: scene.name,
      image_url: scene.image_url,
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

export function getForgeSceneIdFromMediaItem(
  gridConfig: Record<string, unknown> | null | undefined
): string | null {
  if (!gridConfig || typeof gridConfig !== "object") return null;
  const v = gridConfig[FORGE_KEY];
  return typeof v === "string" ? v : null;
}

/** Library battlemaps: `media_items` type map that are not the shadow row for a Forge scene */
export function getBattlemapItems(maps: MediaItem[]): MediaItem[] {
  return maps.filter((m) => !getForgeSceneIdFromMediaItem(m.grid_config ?? null));
}
