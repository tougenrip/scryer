"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useVttStore } from "@/lib/store/vtt-store";
import type { MediaItem } from "@/hooks/useCampaignContent";
import type { Scene } from "@/hooks/useForgeContent";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  ChevronDown,
  ImageIcon,
  List,
  LayoutGrid,
  Library,
  Map as MapIcon,
  Shapes,
  Volume2,
} from "lucide-react";
import { pushVttScene } from "@/hooks/useActiveVttScene";
import {
  getBattlemapItems,
  getForgeSceneIdFromMediaItem,
  getOrCreateMediaItemForForgeScene,
} from "@/lib/vtt/forge-scene-media";
import { SampleBattlemapsPanel } from "@/components/campaign/sample-battlemaps-panel";
import { SampleTokensPanel } from "@/components/campaign/sample-tokens-panel";
import { VttAssetPreviewModal } from "@/components/vtt/vtt-asset-preview-modal";
import { cn } from "@/lib/utils";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";

export type VttAssetsPanelProps = {
  campaignId: string;
  currentMapId: string | null;
  maps: MediaItem[];
  forgeScenes: Scene[];
  tokenItems: MediaItem[];
  propItems: MediaItem[];
  soundItems: MediaItem[];
  isDm: boolean;
  onMediaChanged?: () => void;
  onStartPlacement?: () => void;
};

type AssetSource = "samples" | "library";
type AssetCategory = "battlemaps" | "scenes" | "tokens" | "props" | "sounds";
type AssetWindowKey = "library-battlemaps" | "library-scenes" | "library-tokens" | "library-props" | "library-sounds";
type LayoutCategory = Extract<AssetCategory, "battlemaps" | "tokens" | "props">;
export type AssetPanelLayout = "grid" | "list";
type LayoutKey = `${AssetSource}-${LayoutCategory}`;

const INITIAL_ASSET_BATCH = 60;
const ASSET_BATCH_STEP = 60;
const TOKEN_FRAME_CLASS =
  "mx-auto flex aspect-square w-14 items-center justify-center rounded-full border-2 border-amber-300/80 bg-gradient-to-br from-neutral-950 via-stone-900 to-amber-950 p-0.5 shadow-[0_0_0_1px_rgba(0,0,0,0.9),0_0_14px_rgba(245,158,11,0.28)] ring-1 ring-white/10";
const TOKEN_IMAGE_CLASS = "h-full w-full rounded-full object-cover";
const REMOVED_SAMPLE_TOKEN_IDS = new Set(["scryer-placeholder-pawn"]);

function EmptySamplesHint({ category }: { category: Exclude<AssetCategory, "battlemaps"> }) {
  if (category === "scenes") {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground leading-relaxed px-2">
        No bundled narrative scene art yet. Use{" "}
        <span className="font-medium text-foreground">Library → Scenes</span> with Forge, or{" "}
        <span className="font-medium text-foreground">Samples → Battlemaps</span> for tactical
        maps.
      </p>
    );
  }
  if (category === "tokens") {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground px-2">
        More sample tokens may ship in future updates.
      </p>
    );
  }
  if (category === "props") {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground px-2">
        No bundled prop art yet. Upload images under{" "}
        <span className="font-medium text-foreground">Library → Props</span>.
      </p>
    );
  }
  return (
    <p className="py-6 text-center text-xs text-muted-foreground px-2">
      No bundled audio samples yet. Upload tracks under{" "}
      <span className="font-medium text-foreground">Library → Sounds</span>.
    </p>
  );
}

export function VttAssetsPanel({
  campaignId,
  currentMapId,
  maps,
  forgeScenes,
  tokenItems,
  propItems,
  soundItems,
  isDm,
  onMediaChanged,
  onStartPlacement,
}: VttAssetsPanelProps) {
  const router = useRouter();
  const setPendingTokenPlacement = useVttStore((s) => s.setPendingTokenPlacement);
  const [forgeBusy, setForgeBusy] = useState<string | null>(null);
  const [source, setSource] = useState<AssetSource>("library");
  const [visibleCounts, setVisibleCounts] = useState<Partial<Record<AssetWindowKey, number>>>({});
  const [layouts, setLayouts] = useState<Record<LayoutKey, AssetPanelLayout>>({
    "library-battlemaps": "grid",
    "library-tokens": "grid",
    "library-props": "grid",
    "samples-battlemaps": "grid",
    "samples-tokens": "grid",
    "samples-props": "grid",
  });
  
  type PreviewItem = {
    id: string;
    imageUrl: string | null;
    name: string;
    type: "map" | "token" | "prop";
    isForgeScene?: boolean;
    forgeScene?: Scene;
    isSample?: boolean;
  } | null;

  const [previewItem, setPreviewItem] = useState<PreviewItem>(null);

  const battlemaps = useMemo(() => getBattlemapItems(maps), [maps]);
  const visibleTokenItems = useMemo(
    () =>
      tokenItems.filter((item) => {
        const gridConfig = item.grid_config as Record<string, unknown> | null;
        const sampleId = gridConfig?.sample_token_id;
        return typeof sampleId !== "string" || !REMOVED_SAMPLE_TOKEN_IDS.has(sampleId);
      }),
    [tokenItems]
  );

  useEffect(() => {
    setVisibleCounts({});
  }, [source, battlemaps.length, forgeScenes.length, visibleTokenItems.length, propItems.length, soundItems.length]);

  const visibleLimit = (key: AssetWindowKey, total: number) => {
    return Math.min(visibleCounts[key] ?? INITIAL_ASSET_BATCH, total);
  };

  const layoutFor = (layoutSource: AssetSource, category: LayoutCategory) =>
    layouts[`${layoutSource}-${category}`];

  const setLayoutFor = (
    layoutSource: AssetSource,
    category: LayoutCategory,
    layout: AssetPanelLayout
  ) => {
    setLayouts((current) => ({
      ...current,
      [`${layoutSource}-${category}`]: layout,
    }));
  };

  const renderLayoutControls = (layoutSource: AssetSource, category: LayoutCategory) => {
    const current = layoutFor(layoutSource, category);
    return (
      <div className="flex items-center justify-end gap-1 px-2">
        <Button
          type="button"
          variant={current === "grid" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          title="Grid layout"
          aria-label="Grid layout"
          onClick={() => setLayoutFor(layoutSource, category, "grid")}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={current === "list" ? "secondary" : "ghost"}
          size="icon"
          className="h-7 w-7"
          title="List layout"
          aria-label="List layout"
          onClick={() => setLayoutFor(layoutSource, category, "list")}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  const showMoreButton = (key: AssetWindowKey, total: number) => {
    const limit = visibleLimit(key, total);
    if (limit >= total) return null;
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="col-span-full h-8 text-xs"
        onClick={() =>
          setVisibleCounts((current) => ({
            ...current,
            [key]: Math.min((current[key] ?? INITIAL_ASSET_BATCH) + ASSET_BATCH_STEP, total),
          }))
        }
      >
        Show more ({total - limit} remaining)
      </Button>
    );
  };

  const goScene = (id: string) => {
    setPreviewItem(null);
    router.replace(`/campaigns/${campaignId}/vtt?map=${id}`);
  };

  const handoutMedia = async (mediaId: string) => {
    const { error } = await pushVttScene(campaignId, mediaId);
    if (error) {
      toast.error("Could not push scene");
      return;
    }
    toast.success("Scene pushed to players");
    goScene(mediaId);
  };

  const loadScene = async (id: string, fullyFogged: boolean = false) => {
    if (fullyFogged) {
      const supabase = createClient();
      await supabase
        .from("media_items")
        .update({ fog_data: { revealed: false, shapes: [] } })
        .eq("id", id);
    }
    goScene(id);
  };

  const resolveForgeMediaId = async (
    scene: Scene,
    linkedId: string | undefined
  ): Promise<string | null> => {
    if (linkedId) return linkedId;
    setForgeBusy(scene.id);
    try {
      const { mediaId, error } = await getOrCreateMediaItemForForgeScene(scene);
      if (error) {
        toast.error(error.message || "Could not sync scene for VTT");
        return null;
      }
      onMediaChanged?.();
      return mediaId;
    } finally {
      setForgeBusy(null);
    }
  };

  const loadForgeScene = async (scene: Scene, linkedMediaId: string | undefined, fullyFogged: boolean = false) => {
    const id = await resolveForgeMediaId(scene, linkedMediaId);
    if (id) await loadScene(id, fullyFogged);
  };

  const pushForgeScene = async (scene: Scene, linkedMediaId: string | undefined) => {
    const id = await resolveForgeMediaId(scene, linkedMediaId);
    if (id) await handoutMedia(id);
  };

  const beginMediaPlacement = (item: MediaItem) => {
    if (!isDm || !currentMapId) {
      if (!currentMapId) toast.error("Load a scene first, then place assets on the map.");
      return;
    }
    const gridConfig = item.grid_config as Record<string, unknown> | null | undefined;
    setPendingTokenPlacement({
      name: cleanVttDisplayName(item.name),
      image_url: item.image_url,
      type: item.type === "prop" ? "prop" : "token",
      monster_source: gridConfig?.srd_monster_id ? "srd" : null,
      monster_index: typeof gridConfig?.srd_monster_index === "string" ? gridConfig.srd_monster_index : null,
      srd_monster_id: typeof gridConfig?.srd_monster_id === "string" ? gridConfig.srd_monster_id : null,
    });
    onStartPlacement?.();
    toast.message("Move the cursor over the map. Left click places; right click cancels.");
    setPreviewItem(null);
  };

  const forgeLinkedId = (scene: Scene) => {
    for (const m of maps) {
      if (
        getForgeSceneIdFromMediaItem(m.grid_config as Record<string, unknown> | null) ===
        scene.id
      ) {
        return m.id;
      }
    }
    return undefined;
  };

  const categoryTabs = (
    <TabsList className="mx-2 grid h-auto min-h-8 shrink-0 grid-cols-5 gap-0.5 p-1">
      <TabsTrigger
        value="battlemaps"
        className="px-0.5 text-[8px] leading-tight sm:text-[9px]"
        title="Battlemaps"
      >
        Maps
      </TabsTrigger>
      <TabsTrigger value="scenes" className="px-0.5 text-[8px] leading-tight sm:text-[9px]">
        Scenes
      </TabsTrigger>
      <TabsTrigger value="tokens" className="px-0.5 text-[8px] leading-tight sm:text-[9px]">
        Tokens
      </TabsTrigger>
      <TabsTrigger value="props" className="px-0.5 text-[8px] leading-tight sm:text-[9px]">
        Props
      </TabsTrigger>
      <TabsTrigger value="sounds" className="px-0.5 text-[8px] leading-tight sm:text-[9px]">
        Sounds
      </TabsTrigger>
    </TabsList>
  );

  const renderForgeSceneCards = () => (
    <div className="grid grid-cols-2 gap-2">
      {forgeScenes.length === 0 && (
        <p className="col-span-2 text-[10px] text-muted-foreground">
          No Forge scenes. Add one in the Forge → Scenes tab.
        </p>
      )}
      {forgeScenes.slice(0, visibleLimit("library-scenes", forgeScenes.length)).map((scene) => {
        const canVtt = !!scene.image_url?.trim();
        return (
          <button
            key={`forge-${scene.id}`}
            className="group relative aspect-video overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary focus:outline-none"
            onClick={() => {
              if (canVtt) {
                setPreviewItem({
                  id: scene.id,
                  name: scene.name,
                  imageUrl: scene.image_url ?? null,
                  type: "map",
                  isForgeScene: true,
                  forgeScene: scene,
                });
              } else {
                toast.error("Add a scene image in Forge to use this in the VTT.");
              }
            }}
          >
            {scene.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scene.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <MapIcon className="h-6 w-6 opacity-40" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6 text-left">
              <p className="truncate text-[10px] font-medium text-white">{scene.name}</p>
            </div>
          </button>
        );
      })}
      {showMoreButton("library-scenes", forgeScenes.length)}
    </div>
  );

  const renderLibraryBattlemapCards = (layout: AssetPanelLayout) => (
    <div className={layout === "grid" ? "grid grid-cols-2 gap-2 xl:grid-cols-3" : "flex flex-col gap-2"}>
      {battlemaps.length === 0 && (
        <p className={cn("text-[10px] text-muted-foreground", layout === "grid" && "col-span-2")}>
          None yet. Upload in{" "}
          <Link className="text-primary underline underline-offset-2" href={`/campaigns/${campaignId}/media-library?type=map`}>
            Media Library → Battlemaps
          </Link>
          , or open <span className="font-medium text-foreground">Samples → Battlemaps</span>.
        </p>
      )}
      {battlemaps.slice(0, visibleLimit("library-battlemaps", battlemaps.length)).map((m) => (
        <button
          key={m.id}
          className={cn(
            "group relative overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary focus:outline-none",
            layout === "grid" ? "aspect-video" : "flex h-20 items-stretch text-left"
          )}
          onClick={() => {
            setPreviewItem({
              id: m.id,
              name: m.name,
              imageUrl: m.image_url,
              type: "map",
            });
          }}
        >
          <div className={cn("relative overflow-hidden", layout === "grid" ? "h-full w-full" : "h-full w-28 shrink-0")}>
            {m.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <MapIcon className="h-6 w-6 opacity-40" />
              </div>
            )}
            {layout === "grid" && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6 text-left">
                <p className="truncate text-[10px] font-medium text-white">{m.name}</p>
              </div>
            )}
          </div>
          {layout === "list" && (
            <div className="flex min-w-0 flex-1 items-center px-2">
              <p className="truncate text-xs font-medium">{m.name}</p>
            </div>
          )}
        </button>
      ))}
      {showMoreButton("library-battlemaps", battlemaps.length)}
    </div>
  );

  const renderTokenGrid = (items: MediaItem[], key: AssetWindowKey, layout: AssetPanelLayout) => (
    <div className={layout === "grid" ? "grid grid-cols-4 gap-1.5 sm:grid-cols-5 xl:grid-cols-7" : "flex flex-col gap-2"}>
      {items.slice(0, visibleLimit(key, items.length)).map((t) => {
        const displayName = cleanVttDisplayName(t.name);
        return (
        <button
          key={t.id}
          type="button"
          disabled={!isDm || !currentMapId}
          onClick={() => beginMediaPlacement(t)}
          className={cn(
            "group relative overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary focus:outline-none disabled:opacity-40",
            layout === "list" && "flex h-16 items-center gap-2 p-2 text-left"
          )}
          title={displayName}
        >
          {layout === "list" ? (
            <>
              <span className={cn(TOKEN_FRAME_CLASS, "mx-0 w-12 shrink-0")}>
                {t.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image_url} alt="" loading="lazy" decoding="async" className={TOKEN_IMAGE_CLASS} />
                ) : (
                  <span className="text-[10px] font-semibold text-white">{displayName.slice(0, 2).toUpperCase()}</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">{displayName}</span>
                <span className="block text-[10px] capitalize text-muted-foreground">{t.type ?? "asset"}</span>
              </span>
            </>
          ) : t.image_url ? (
            <span className="flex aspect-square items-center justify-center bg-gradient-to-br from-neutral-950 via-stone-900 to-neutral-950 p-2">
              <span className={TOKEN_FRAME_CLASS}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.image_url} alt="" loading="lazy" decoding="async" className={TOKEN_IMAGE_CLASS} />
              </span>
            </span>
          ) : (
            <div className="flex aspect-square items-center justify-center p-2 text-center text-[9px]">
              {displayName}
            </div>
          )}
          {layout === "grid" && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1 pt-5 text-left">
              <p className="truncate text-[9px] font-medium text-white">{displayName}</p>
            </div>
          )}
        </button>
        );
      })}
      {showMoreButton(key, items.length)}
    </div>
  );

  const renderSoundList = (items: MediaItem[]) => (
    <div className="flex flex-col gap-2">
      {items.length === 0 && (
        <p className="text-[10px] text-muted-foreground">
          No audio in the library. Upload in{" "}
          <Link
            className="text-primary underline underline-offset-2"
            href={`/campaigns/${campaignId}/media-library?type=sound`}
          >
            Media Library → Sounds
          </Link>
          .
        </p>
      )}
      {items.slice(0, visibleLimit("library-sounds", items.length)).map((s) => (
        <div
          key={s.id}
          className="rounded-md border border-border bg-card p-2"
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="truncate text-xs font-medium">{s.name}</p>
          </div>
          {s.audio_url ? (
            <audio controls className="h-8 w-full max-w-full" src={s.audio_url} preload="metadata">
              <track kind="captions" />
            </audio>
          ) : (
            <p className="text-[10px] text-muted-foreground">No audio URL</p>
          )}
        </div>
      ))}
      {showMoreButton("library-sounds", items.length)}
    </div>
  );

  const innerSamples = (
    <Tabs
      key="vtt-inner-samples"
      defaultValue="battlemaps"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {categoryTabs}
      <TabsContent
        value="battlemaps"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 pr-2 pt-2 pb-2">
            <p className="text-[10px] text-muted-foreground px-2">
              Starter battlemaps bundled with Scryer. Load copies them into this campaign when
              needed.
            </p>
            {renderLayoutControls("samples", "battlemaps")}
            <SampleBattlemapsPanel
              campaignId={campaignId}
              isDm={!!isDm}
              onLibraryChanged={onMediaChanged}
              onVttLoad={(id) => goScene(id)}
              onVttPush={(id) => void handoutMedia(id)}
              compact
              layout={layoutFor("samples", "battlemaps")}
            />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent
        value="scenes"
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <EmptySamplesHint category="scenes" />
      </TabsContent>
      <TabsContent
        value="tokens"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 pr-2 pt-2 pb-2">
            {renderLayoutControls("samples", "tokens")}
            <SampleTokensPanel
              campaignId={campaignId}
              isDm={!!isDm}
              currentMapId={currentMapId}
              onPlaceToken={beginMediaPlacement}
              onLibraryChanged={onMediaChanged}
              compact
              layout={layoutFor("samples", "tokens")}
            />
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent
        value="props"
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        {renderLayoutControls("samples", "props")}
        <EmptySamplesHint category="props" />
      </TabsContent>
      <TabsContent
        value="sounds"
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        <EmptySamplesHint category="sounds" />
      </TabsContent>
    </Tabs>
  );

  const innerLibrary = (
    <Tabs
      key="vtt-inner-library"
      defaultValue="battlemaps"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {categoryTabs}
      <TabsContent
        value="battlemaps"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 pr-2 pt-2 pb-2">
            <Button variant="outline" size="sm" className="mx-2 h-8 w-[calc(100%-1rem)] text-xs" asChild>
              <Link href={`/campaigns/${campaignId}/media-library?type=map`}>
                <Library className="mr-1 h-3.5 w-3.5" />
                Open Media Library — Battlemaps
              </Link>
            </Button>
            {renderLayoutControls("library", "battlemaps")}
            {renderLibraryBattlemapCards(layoutFor("library", "battlemaps"))}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent
        value="scenes"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 pr-2 pt-2 pb-2">
            <Button variant="outline" size="sm" className="mx-2 h-8 w-[calc(100%-1rem)] text-xs" asChild>
              <Link href={`/campaigns/${campaignId}/forge?tab=scenes`}>Forge — Scenes</Link>
            </Button>
            {renderForgeSceneCards()}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent
        value="tokens"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 pr-2 pt-2 pb-2">
            {!isDm && (
              <p className="px-2 text-xs text-muted-foreground">Only the DM can place tokens.</p>
            )}
            {isDm && (
              <Button variant="outline" size="sm" className="mx-2 h-8 w-[calc(100%-1rem)] text-xs" asChild>
                <Link href={`/campaigns/${campaignId}/media-library?type=token`}>
                  <ImageIcon className="mr-1 h-3.5 w-3.5" />
                  Upload tokens — Media Library
                </Link>
              </Button>
            )}
            {renderLayoutControls("library", "tokens")}
            {renderTokenGrid(visibleTokenItems, "library-tokens", layoutFor("library", "tokens"))}
            {visibleTokenItems.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No token images in the library.
              </p>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent
        value="props"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 pr-2 pt-2 pb-2">
            {!isDm && (
              <p className="px-2 text-xs text-muted-foreground">Only the DM can place props.</p>
            )}
            {isDm && (
              <Button variant="outline" size="sm" className="mx-2 h-8 w-[calc(100%-1rem)] text-xs" asChild>
                <Link href={`/campaigns/${campaignId}/media-library?type=prop`}>
                  <Shapes className="mr-1 h-3.5 w-3.5" />
                  Upload props — Media Library
                </Link>
              </Button>
            )}
            <p className="px-2 text-[10px] text-muted-foreground">
              Tap an image to drop it on the map (same layer as tokens—furniture, objects, etc.).
            </p>
            {renderLayoutControls("library", "props")}
            {renderTokenGrid(propItems, "library-props", layoutFor("library", "props"))}
            {propItems.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No props in the library.
              </p>
            )}
          </div>
        </ScrollArea>
      </TabsContent>
      <TabsContent
        value="sounds"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 pr-2 pt-2 pb-2">
            <Button variant="outline" size="sm" className="mx-2 h-8 w-[calc(100%-1rem)] text-xs" asChild>
              <Link href={`/campaigns/${campaignId}/media-library?type=sound`}>
                <Volume2 className="mr-1 h-3.5 w-3.5" />
                Upload sounds — Media Library
              </Link>
            </Button>
            {renderSoundList(soundItems)}
          </div>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );

  return (
    <Tabs
      value={source}
      onValueChange={(v) => setSource(v as AssetSource)}
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-0 pt-2"
    >
      <TabsList className="mx-2 grid h-9 shrink-0 grid-cols-2">
        <TabsTrigger value="samples" className="gap-1 text-xs">
          <LayoutGrid className="h-3.5 w-3.5" />
          Samples
        </TabsTrigger>
        <TabsTrigger value="library" className="gap-1 text-xs">
          <Library className="h-3.5 w-3.5" />
          Library
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="samples"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <Collapsible className="group mx-2 mb-2 rounded-md border border-border bg-muted px-2 py-1.5">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-medium text-foreground hover:opacity-90">
            Adding assets &amp; bulk import
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Your files:</span> use{" "}
              <Link
                className="text-primary underline underline-offset-2"
                href={`/campaigns/${campaignId}/media-library?type=map`}
              >
                Media Library
              </Link>{" "}
              (battlemaps, tokens, props, sounds) or{" "}
              <span className="font-medium text-foreground">Library</span> here.{" "}
              <span className="font-medium text-foreground">Samples</span> are free starters (maps &
              tokens) bundled with Scryer.
            </p>
            <p>
              <span className="font-medium text-foreground">Many files:</span> use the bulk import
              script (paths per script docs), then run{" "}
              <code className="rounded bg-background px-1 py-px text-[9px] text-foreground">
                yarn bulk-import-media
              </code>{" "}
              — see{" "}
              <code className="rounded bg-background px-1 py-px text-[9px] text-foreground">
                scripts/bulk-import-campaign-media.cjs
              </code>
              .
            </p>
          </CollapsibleContent>
        </Collapsible>
        {innerSamples}
      </TabsContent>

      <TabsContent
        value="library"
        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
      >
        <Collapsible className="group mx-2 mb-2 rounded-md border border-border bg-muted px-2 py-1.5">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-medium text-foreground hover:opacity-90">
            Adding assets &amp; bulk import
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2 text-[10px] leading-relaxed text-muted-foreground">
            <p>
              Upload and manage campaign media in the{" "}
              <Link
                className="text-primary underline underline-offset-2"
                href={`/campaigns/${campaignId}/media-library`}
              >
                Media Library
              </Link>
              . Use <span className="font-medium text-foreground">Samples</span> for quick starter
              maps and tokens.
            </p>
            <p>
              <span className="font-medium text-foreground">Many files:</span>{" "}
              <code className="rounded bg-background px-1 py-px text-[9px] text-foreground">
                yarn bulk-import-media
              </code>{" "}
              — see{" "}
              <code className="rounded bg-background px-1 py-px text-[9px] text-foreground">
                scripts/bulk-import-campaign-media.cjs
              </code>
              .
            </p>
          </CollapsibleContent>
        </Collapsible>
        {innerLibrary}
      </TabsContent>
      
      <VttAssetPreviewModal
        isOpen={!!previewItem}
        onClose={() => setPreviewItem(null)}
        imageUrl={previewItem?.imageUrl ?? null}
        title={previewItem?.name ?? "Asset"}
        type={previewItem?.type ?? "map"}
        isDm={isDm}
        isBusy={!!forgeBusy}
        onLoad={(fullyFogged) => {
          if (!previewItem) return;
          if (previewItem.type === "map") {
            if (previewItem.isForgeScene && previewItem.forgeScene) {
              const linked = forgeLinkedId(previewItem.forgeScene);
              void loadForgeScene(previewItem.forgeScene, linked, fullyFogged);
            } else {
              void loadScene(previewItem.id, fullyFogged);
            }
          } else {
            // It's a token or prop
            const item = (previewItem.type === "token" ? visibleTokenItems : propItems).find(i => i.id === previewItem.id);
            if (item) beginMediaPlacement(item);
          }
        }}
        onPush={
          previewItem?.type === "map" 
            ? () => {
                if (!previewItem) return;
                if (previewItem.isForgeScene && previewItem.forgeScene) {
                  const linked = forgeLinkedId(previewItem.forgeScene);
                  void pushForgeScene(previewItem.forgeScene, linked);
                } else {
                  void handoutMedia(previewItem.id);
                }
              }
            : undefined
        }
      />
    </Tabs>
  );
}
