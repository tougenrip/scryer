"use client";

import { useMemo } from "react";
import { Loader2, MapPinned, ScrollText } from "lucide-react";
import type { MediaItem } from "@/hooks/useCampaignContent";
import type { Scene } from "@/hooks/useForgeContent";
import { useLocationMarkers } from "@/hooks/useForgeContent";
import { AtlasMap } from "@/components/forge/atlas/atlas-map";
import { getForgeSceneIdFromMediaItem } from "@/lib/vtt/forge-scene-media";

type VttHandoutsPanelProps = {
  campaignId: string;
  currentMapId: string | null;
  currentMap: MediaItem | null;
  forgeScenes?: Scene[];
  fallbackName?: string | null;
  fallbackImageUrl?: string | null;
};

export function VttHandoutsPanel({
  campaignId,
  currentMapId,
  currentMap,
  forgeScenes = [],
  fallbackName,
  fallbackImageUrl,
}: VttHandoutsPanelProps) {
  const imageUrl = currentMap?.image_url ?? fallbackImageUrl ?? null;
  const mapName = currentMap?.name ?? fallbackName ?? "Handout map";
  const forgeSceneId = useMemo(() => {
    const linkedSceneId = getForgeSceneIdFromMediaItem(currentMap?.grid_config ?? null);
    if (linkedSceneId) return linkedSceneId;

    const matchedScene = forgeScenes.find((scene) => {
      const sameImage = !!imageUrl && scene.image_url === imageUrl;
      const sameName = !!mapName && scene.name === mapName;
      return sameImage && sameName;
    });
    return matchedScene?.id ?? null;
  }, [currentMap?.grid_config, forgeScenes, imageUrl, mapName]);

  const {
    markers: mediaMapMarkers,
    loading: mediaMapMarkersLoading,
    error: mediaMapMarkersError,
  } = useLocationMarkers(
    campaignId && currentMapId ? campaignId : null,
    undefined,
    currentMapId ?? undefined
  );

  const {
    markers: forgeSceneMarkers,
    loading: forgeSceneMarkersLoading,
    error: forgeSceneMarkersError,
  } = useLocationMarkers(
    campaignId && forgeSceneId ? campaignId : null,
    forgeSceneId ?? undefined,
    undefined
  );

  const markers = useMemo(() => {
    const byId = new Map(
      [...mediaMapMarkers, ...forgeSceneMarkers].map((marker) => [marker.id, marker])
    );
    return Array.from(byId.values());
  }, [mediaMapMarkers, forgeSceneMarkers]);

  const visibleMarkerCount = markers.filter((marker) => marker.visible).length;
  const loading = mediaMapMarkersLoading || forgeSceneMarkersLoading;
  const error = mediaMapMarkersError || forgeSceneMarkersError;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-card">
      <div className="shrink-0 border-b border-border p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-500">
            <ScrollText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">Handouts</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {currentMapId ? mapName : "No map has been handed out yet"}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!currentMapId || !imageUrl ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 p-6 text-center">
            <MapPinned className="mb-3 h-9 w-9 text-muted-foreground" />
            <h3 className="text-sm font-medium">No handout map</h3>
            <p className="mt-1 max-w-sm text-xs text-muted-foreground">
              When the DM pushes a map to the VTT, it will appear here with its visible pins.
            </p>
          </div>
        ) : (
          <div className="flex min-h-full flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="truncate">{mapName}</span>
              <span className="shrink-0">
                {loading ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Pins
                  </span>
                ) : (
                  `${visibleMarkerCount} visible pin${visibleMarkerCount === 1 ? "" : "s"}`
                )}
              </span>
            </div>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Could not load map pins.
              </p>
            )}
            <div className="min-h-[540px] flex-1">
              <AtlasMap imageUrl={imageUrl} markers={markers} isDm={false} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
