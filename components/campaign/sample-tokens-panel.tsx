"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ensureSampleTokenInCampaign,
  ensureSrdMonsterTokenInCampaign,
  SAMPLE_TOKENS,
} from "@/lib/vtt/sample-tokens";
import { ensureVttSampleAssetInCampaign } from "@/lib/vtt/sample-asset-ensure";
import { useVttSamples } from "@/hooks/useVttSamples";
import { useSrdMonsters, SrdMonster } from "@/hooks/useSrdMonsters";
import type { VttSampleAssetRow } from "@/lib/vtt/sample-catalog";
import { labelFromSampleStoragePath } from "@/lib/vtt/sample-storage-label";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";
import type { MediaItem } from "@/hooks/useCampaignContent";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const INITIAL_TOKEN_BATCH = 72;
const TOKEN_BATCH_STEP = 72;
const TOKEN_FRAME_CLASS =
  "mx-auto mt-2 flex aspect-square w-12 items-center justify-center rounded-full border-2 border-amber-300/80 bg-gradient-to-br from-neutral-950 via-stone-900 to-amber-950 p-0.5 shadow-[0_0_0_1px_rgba(0,0,0,0.9),0_0_14px_rgba(245,158,11,0.28)] ring-1 ring-white/10";
const TOKEN_IMAGE_CLASS = "h-full w-full rounded-full object-cover";

type Props = {
  campaignId: string;
  isDm: boolean;
  currentMapId: string | null;
  onPlaceToken: (item: MediaItem) => void | Promise<void>;
  onLibraryChanged?: () => void;
  compact?: boolean;
  layout?: "grid" | "list";
};

export function SampleTokensPanel({
  campaignId,
  isDm,
  currentMapId,
  onPlaceToken,
  onLibraryChanged,
  compact,
  layout = "grid",
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibleMonsters, setVisibleMonsters] = useState(INITIAL_TOKEN_BATCH);
  const [visibleDbTokens, setVisibleDbTokens] = useState(INITIAL_TOKEN_BATCH);
  const { data: samplesData, isLoading } = useVttSamples();
  const { monsters, loading: monstersLoading } = useSrdMonsters();

  const handlePlaceHardcoded = async (sampleId: string) => {
    if (!isDm) {
      toast.error("Only the DM can place tokens");
      return;
    }
    if (!currentMapId) {
      toast.error("Load a scene first, then place tokens.");
      return;
    }
    setBusyId(sampleId);
    try {
      const { mediaId, error } = await ensureSampleTokenInCampaign(campaignId, sampleId);
      if (error || !mediaId) {
        toast.error(error?.message ?? "Could not use sample token");
        return;
      }
      const sample = SAMPLE_TOKENS.find((s) => s.id === sampleId);
      if (!sample) return;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const item: MediaItem = {
        id: mediaId,
        campaign_id: campaignId,
        name: `[Sample] ${sample.name}`,
        image_url: `${origin}${sample.publicPath}`,
        audio_url: null,
        type: "token",
        created_at: null,
        grid_config: { sample_token_id: sample.id },
      };
      onLibraryChanged?.();
      await onPlaceToken(item);
    } finally {
      setBusyId(null);
    }
  };

  const handlePlaceDb = async (asset: VttSampleAssetRow) => {
    if (!isDm) {
      toast.error("Only the DM can place tokens");
      return;
    }
    if (!currentMapId) {
      toast.error("Load a scene first, then place tokens.");
      return;
    }
    setBusyId(asset.id);
    try {
      const { mediaId, error } = await ensureVttSampleAssetInCampaign(campaignId, asset);
      if (error || !mediaId) {
        toast.error(error?.message ?? "Could not use sample token");
        return;
      }
      const name = asset.name ?? labelFromSampleStoragePath(asset.storage_path);
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const imageUrl = asset.public_url.startsWith("http") ? asset.public_url : `${origin}${asset.public_url}`;
      const item: MediaItem = {
        id: mediaId,
        campaign_id: campaignId,
        name: `[Sample] ${name}`,
        image_url: imageUrl,
        audio_url: null,
        type: "token",
        created_at: null,
        grid_config: { vtt_sample_asset_id: asset.id },
      };
      onLibraryChanged?.();
      await onPlaceToken(item);
    } finally {
      setBusyId(null);
    }
  };

  const handlePlaceMonster = async (monster: SrdMonster) => {
    if (!isDm) {
      toast.error("Only the DM can place tokens");
      return;
    }
    if (!currentMapId) {
      toast.error("Load a scene first, then place tokens.");
      return;
    }
    setBusyId(monster.id);
    try {
      const monsterImageUrl = Array.isArray(monster.image_urls) ? monster.image_urls[0] : null;
      const { mediaId, error, imageUrl } = await ensureSrdMonsterTokenInCampaign(
        campaignId,
        monster.id,
        monster.name,
        monsterImageUrl,
        monster.index
      );
      if (error || !mediaId) {
        toast.error(error?.message ?? "Could not use monster token");
        return;
      }

      const item: MediaItem = {
        id: mediaId,
        campaign_id: campaignId,
        name: cleanVttDisplayName(monster.name),
        image_url: imageUrl,
        audio_url: null,
        type: "token",
        created_at: null,
        grid_config: { srd_monster_id: monster.id, srd_monster_index: monster.index },
      };
      onLibraryChanged?.();
      await onPlaceToken(item);
    } finally {
      setBusyId(null);
    }
  };

  const dbTokens = samplesData?.assets.filter((a) => a.kind === "token") ?? [];
  const searchLower = search.toLowerCase();
  const filteredMonsters = monsters.filter((m) => m.name.toLowerCase().includes(searchLower));
  const filteredHardcoded = SAMPLE_TOKENS.filter((s) => s.name.toLowerCase().includes(searchLower));
  const filteredDbTokens = dbTokens.filter((a) => {
    const name = a.name ?? labelFromSampleStoragePath(a.storage_path);
    return name.toLowerCase().includes(searchLower);
  });

  useEffect(() => {
    setVisibleMonsters(INITIAL_TOKEN_BATCH);
    setVisibleDbTokens(INITIAL_TOKEN_BATCH);
  }, [search]);

  const dbTokensToRender = filteredDbTokens.slice(0, visibleDbTokens);
  const monstersToRender = filteredMonsters.slice(0, visibleMonsters);

  const renderTokenCard = ({
    id,
    name,
    subtitle,
    imageUrl,
    busy,
    onPlace,
  }: {
    id: string;
    name: string;
    subtitle?: string;
    imageUrl: string;
    busy: boolean;
    onPlace: () => void;
  }) => {
    if (layout === "list") {
      return (
        <Card key={id} className="overflow-hidden rounded-md">
          <CardContent className="flex items-center gap-2 p-2">
            <div className={cn(TOKEN_FRAME_CLASS, "mx-0 mt-0 w-12 shrink-0")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" loading="lazy" decoding="async" className={TOKEN_IMAGE_CLASS} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold leading-tight" title={name}>
                {name}
              </p>
              {subtitle && (
                <p className="truncate text-[10px] leading-snug text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
            <Button
              size="sm"
              className="h-7 shrink-0 px-2 text-[10px]"
              disabled={!isDm || !currentMapId || busy}
              onClick={onPlace}
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Place"}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={id} className="overflow-hidden rounded-md">
        <div className={cn("relative bg-muted/50", compact ? "h-16" : "h-20")}>
          <div className={TOKEN_FRAME_CLASS}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" loading="lazy" decoding="async" className={TOKEN_IMAGE_CLASS} />
          </div>
        </div>
        <CardContent className="space-y-1 p-1.5">
          <p className="truncate text-center text-[9px] font-semibold leading-tight" title={name}>
            {name}
          </p>
          {subtitle && (
            <p className="truncate text-center text-[8px] leading-snug text-muted-foreground">
              {subtitle}
            </p>
          )}
          <Button
            size="sm"
            className="h-6 w-full text-[9px]"
            disabled={!isDm || !currentMapId || busy}
            onClick={onPlace}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Place"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="px-1">
        <Input
          placeholder="Search tokens & monsters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
      </div>

      <div
        className={cn(
          "gap-1.5",
          layout === "grid"
            ? cn("grid", compact ? "grid-cols-4 sm:grid-cols-5 xl:grid-cols-6" : "grid-cols-3 sm:grid-cols-4 xl:grid-cols-5")
            : "flex flex-col"
        )}
      >
        {filteredHardcoded.map((sample) =>
          renderTokenCard({
            id: sample.id,
            name: sample.name,
            subtitle: sample.description,
            imageUrl: sample.publicPath,
            busy: busyId === sample.id,
            onPlace: () => void handlePlaceHardcoded(sample.id),
          })
        )}

        {isLoading && filteredDbTokens.length === 0 && (
          <div className="col-span-full py-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {dbTokensToRender.map((asset) => {
          const name = asset.name ?? labelFromSampleStoragePath(asset.storage_path);
          return renderTokenCard({
            id: asset.id,
            name,
            imageUrl: asset.public_url,
            busy: busyId === asset.id,
            onPlace: () => void handlePlaceDb(asset),
          });
        })}

        {visibleDbTokens < filteredDbTokens.length && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="col-span-full h-8 text-xs"
            onClick={() => setVisibleDbTokens((count) => count + TOKEN_BATCH_STEP)}
          >
            Show more sample tokens ({filteredDbTokens.length - visibleDbTokens} remaining)
          </Button>
        )}

        {monstersLoading && filteredMonsters.length === 0 && (
          <div className="col-span-full py-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {monstersToRender.map((monster) => {
          const imageUrl =
            (Array.isArray(monster.image_urls) && monster.image_urls[0]) ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(monster.name)}&background=random&color=fff&rounded=true&size=256`;
          return renderTokenCard({
            id: monster.id,
            name: monster.name,
            subtitle: `CR ${monster.challenge_rating ?? "-"} • ${monster.type ?? "-"}`,
            imageUrl,
            busy: busyId === monster.id,
            onPlace: () => void handlePlaceMonster(monster),
          });
        })}

        {visibleMonsters < filteredMonsters.length && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="col-span-full h-8 text-xs"
            onClick={() => setVisibleMonsters((count) => count + TOKEN_BATCH_STEP)}
          >
            Show more monsters ({filteredMonsters.length - visibleMonsters} remaining)
          </Button>
        )}
      </div>
    </div>
  );
}
