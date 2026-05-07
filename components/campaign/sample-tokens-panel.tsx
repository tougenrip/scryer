"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  // Monster filter state
  const [minCr, setMinCr] = useState<string>("");
  const [maxCr, setMaxCr] = useState<string>("");
  const [filterSize, setFilterSize] = useState<string>("any");
  const [filterType, setFilterType] = useState<string>("any");
  const [sortAlpha, setSortAlpha] = useState(false);

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

  // Collect unique monster types for the type filter dropdown
  const allMonsterTypes = useMemo(() => {
    const typeSet = new Set<string>();
    for (const m of monsters) {
      if (m.type) typeSet.add(m.type);
    }
    return Array.from(typeSet).sort();
  }, [monsters]);

  const parsedMinCr = minCr.trim() !== "" ? parseFloat(minCr) : null;
  const parsedMaxCr = maxCr.trim() !== "" ? parseFloat(maxCr) : null;

  const filteredMonsters = useMemo(() => {
    let items = monsters.filter((m) => {
      if (!m.name.toLowerCase().includes(searchLower)) return false;
      const cr = m.challenge_rating ?? 0;
      if (parsedMinCr !== null && !isNaN(parsedMinCr) && cr < parsedMinCr) return false;
      if (parsedMaxCr !== null && !isNaN(parsedMaxCr) && cr > parsedMaxCr) return false;
      if (filterSize !== "any" && m.size?.toLowerCase() !== filterSize.toLowerCase()) return false;
      if (filterType !== "any" && m.type?.toLowerCase() !== filterType.toLowerCase()) return false;
      return true;
    });
    if (sortAlpha) items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [monsters, searchLower, parsedMinCr, parsedMaxCr, filterSize, filterType, sortAlpha]);

  const filteredHardcoded = SAMPLE_TOKENS.filter((s) => s.name.toLowerCase().includes(searchLower));
  const filteredDbTokens = dbTokens.filter((a) => {
    const name = a.name ?? labelFromSampleStoragePath(a.storage_path);
    return name.toLowerCase().includes(searchLower);
  });

  useEffect(() => {
    setVisibleMonsters(INITIAL_TOKEN_BATCH);
    setVisibleDbTokens(INITIAL_TOKEN_BATCH);
  }, [search, parsedMinCr, parsedMaxCr, filterSize, filterType, sortAlpha]);

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

      {/* Monster filters row */}
      <div className="flex flex-wrap items-center gap-1.5 px-1">
        <span className="shrink-0 text-[10px] text-muted-foreground">CR</span>
        <Input
          type="number"
          placeholder="min"
          value={minCr}
          onChange={(e) => setMinCr(e.target.value)}
          className="h-7 w-14 text-xs"
          min={0}
          step={0.125}
        />
        <span className="text-[10px] text-muted-foreground">–</span>
        <Input
          type="number"
          placeholder="max"
          value={maxCr}
          onChange={(e) => setMaxCr(e.target.value)}
          className="h-7 w-14 text-xs"
          min={0}
          step={0.125}
        />
        <Select value={filterSize} onValueChange={setFilterSize}>
          <SelectTrigger className="h-7 w-[90px] text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any size</SelectItem>
            <SelectItem value="tiny">Tiny</SelectItem>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
            <SelectItem value="huge">Huge</SelectItem>
            <SelectItem value="gargantuan">Gargantuan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 w-[100px] text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any type</SelectItem>
            {allMonsterTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={sortAlpha ? "default" : "outline"}
          size="sm"
          className="h-7 shrink-0 px-2 text-[10px]"
          onClick={() => setSortAlpha((v) => !v)}
          title="Sort monsters A→Z"
        >
          A→Z
        </Button>
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
