"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ensureSampleBattlemapInCampaign,
  SAMPLE_BATTLEMAPS,
} from "@/lib/vtt/sample-battlemaps";
import { ensureVttSampleAssetInCampaign } from "@/lib/vtt/sample-asset-ensure";
import { useVttSamples } from "@/hooks/useVttSamples";
import type { VttSampleAssetRow } from "@/lib/vtt/sample-catalog";
import { labelFromSampleStoragePath } from "@/lib/vtt/sample-storage-label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { VttAssetPreviewModal } from "@/components/vtt/vtt-asset-preview-modal";

type Props = {
  campaignId: string;
  isDm: boolean;
  onLibraryChanged?: () => void;
  onVttLoad?: (mediaId: string) => void;
  onVttPush?: (mediaId: string) => void;
  compact?: boolean;
  layout?: "grid" | "list";
};

export function SampleBattlemapsPanel({
  campaignId,
  isDm,
  onLibraryChanged,
  onVttLoad,
  onVttPush,
  compact,
  layout = "grid",
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const { data: samplesData, isLoading } = useVttSamples();
  const [previewSample, setPreviewSample] = useState<{ id: string, name: string, publicPath: string, isDb: boolean, dbAsset?: VttSampleAssetRow } | null>(null);

  const runEnsureHardcoded = async (sampleId: string): Promise<string | null> => {
    setBusyId(sampleId);
    try {
      const { mediaId, error } = await ensureSampleBattlemapInCampaign(campaignId, sampleId);
      if (error || !mediaId) {
        toast.error(error?.message ?? "Could not use sample battlemap");
        return null;
      }
      onLibraryChanged?.();
      return mediaId;
    } finally {
      setBusyId(null);
    }
  };

  const runEnsureDbAsset = async (asset: VttSampleAssetRow): Promise<string | null> => {
    setBusyId(asset.id);
    try {
      const { mediaId, error } = await ensureVttSampleAssetInCampaign(campaignId, asset);
      if (error || !mediaId) {
        toast.error(error?.message ?? "Could not use sample battlemap");
        return null;
      }
      onLibraryChanged?.();
      return mediaId;
    } finally {
      setBusyId(null);
    }
  };

  const handleVttLoadHardcoded = async (sampleId: string) => {
    const id = await runEnsureHardcoded(sampleId);
    if (id) onVttLoad?.(id);
  };

  const handleVttPushHardcoded = async (sampleId: string) => {
    const id = await runEnsureHardcoded(sampleId);
    if (id) onVttPush?.(id);
  };

  const handleVttLoadDb = async (asset: VttSampleAssetRow) => {
    const id = await runEnsureDbAsset(asset);
    if (id) onVttLoad?.(id);
  };

  const handleVttPushDb = async (asset: VttSampleAssetRow) => {
    const id = await runEnsureDbAsset(asset);
    if (id) onVttPush?.(id);
  };

  const dbBattlemaps = samplesData?.assets.filter((a) => a.kind === "battlemap") ?? [];

  return (
    <div
      className={cn(
        "gap-2",
        layout === "grid"
          ? cn("grid", compact ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3")
          : "flex flex-col"
      )}
    >
      {SAMPLE_BATTLEMAPS.map((s) => {
        const busy = busyId === s.id;
        return (
          <button
            key={s.id}
            disabled={busy}
            className={cn(
              "group relative overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary focus:outline-none",
              layout === "grid" ? "aspect-video" : "flex h-20 items-stretch text-left"
            )}
            onClick={() => {
              setPreviewSample({
                id: s.id,
                name: s.name,
                publicPath: s.publicPath,
                isDb: false,
              });
            }}
          >
            <div className={cn("relative overflow-hidden", layout === "grid" ? "h-full w-full" : "h-full w-28 shrink-0")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.publicPath} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              {layout === "grid" && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6 text-left">
                  <p className="truncate text-[10px] font-medium text-white">{s.name}</p>
                </div>
              )}
            </div>
            {layout === "list" && (
              <div className="flex min-w-0 flex-1 items-center px-2">
                <p className="truncate text-xs font-medium">{s.name}</p>
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </button>
        );
      })}

      {isLoading && dbBattlemaps.length === 0 && (
        <div className="col-span-full py-4 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {dbBattlemaps.map((a) => {
        const busy = busyId === a.id;
        const name = a.name ?? labelFromSampleStoragePath(a.storage_path);
        return (
          <button
            key={a.id}
            disabled={busy}
            className={cn(
              "group relative overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary focus:outline-none",
              layout === "grid" ? "aspect-video" : "flex h-20 items-stretch text-left"
            )}
            onClick={() => {
              setPreviewSample({
                id: a.id,
                name: name,
                publicPath: a.public_url,
                isDb: true,
                dbAsset: a,
              });
            }}
          >
            <div className={cn("relative overflow-hidden", layout === "grid" ? "h-full w-full" : "h-full w-28 shrink-0")}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.public_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              {layout === "grid" && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-6 text-left">
                  <p className="truncate text-[10px] font-medium text-white">{name}</p>
                </div>
              )}
            </div>
            {layout === "list" && (
              <div className="flex min-w-0 flex-1 items-center px-2">
                <p className="truncate text-xs font-medium">{name}</p>
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              </div>
            )}
          </button>
        );
      })}
      
      <VttAssetPreviewModal
        isOpen={!!previewSample}
        onClose={() => setPreviewSample(null)}
        imageUrl={previewSample?.publicPath ?? null}
        title={previewSample?.name ?? "Sample Battlemap"}
        tags={previewSample?.dbAsset?.tags ?? []}
        type="map"
        isDm={isDm}
        isBusy={!!busyId}
        onLoad={async () => {
          if (!previewSample) return;
          if (previewSample.isDb && previewSample.dbAsset) {
            await handleVttLoadDb(previewSample.dbAsset);
          } else {
            await handleVttLoadHardcoded(previewSample.id);
          }
          setPreviewSample(null);
        }}
        onPush={
          () => {
            if (!previewSample) return;
            if (previewSample.isDb && previewSample.dbAsset) {
              void handleVttPushDb(previewSample.dbAsset);
            } else {
              void handleVttPushHardcoded(previewSample.id);
            }
            setPreviewSample(null);
          }
        }
      />
    </div>
  );
}
