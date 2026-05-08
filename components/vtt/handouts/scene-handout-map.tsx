"use client";

import type { EmbeddedMarker } from "@/hooks/useVttHandouts";
import { MARKER_PIN_ICON_MAP } from "@/components/forge/atlas/marker-pin-icon-registry";
import { AtlasMarkerBackground } from "@/components/forge/atlas/atlas-marker-background";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  isRichTextHtmlVisuallyEmpty,
  richTextHtmlToPlainText,
} from "@/lib/utils/rich-text-html";
import { PARCHMENT_TOOLTIP_CLASS } from "@/components/vtt/quick-search/parchment";
import { cn } from "@/lib/utils";

interface Props {
  imageUrl: string;
  markers: EmbeddedMarker[];
}

/**
 * Match the Forge atlas marker proportions: icon ≈ 30% of the container.
 * The previous 60% icon was overflowing the white pin background.
 */
const SIZE_PX: Record<EmbeddedMarker["size"], { container: number; icon: number }> = {
  small: { container: 28, icon: 10 },
  medium: { container: 36, icon: 12 },
  large: { container: 46, icon: 15 },
};

/**
 * Compact, read-only scene map for handouts. Renders the scene image at the
 * card's available width and overlays markers using the same visual language
 * as the Forge atlas (pin shapes + lucide icons, recoloured per marker).
 *
 * Marker positions in `location_markers.x/y` are stored as integers 0..100
 * (percent of image width/height), so percentage-based absolute positioning
 * works at any card size without re-measuring the image.
 */
export function SceneHandoutMap({ imageUrl, markers }: Props) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative rounded overflow-hidden border border-amber-500/30 bg-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="block w-full h-auto select-none pointer-events-none"
          draggable={false}
        />
        {markers
          .filter((m) => m.visible !== false)
          .map((m) => {
            const Icon = m.icon_type
              ? MARKER_PIN_ICON_MAP[m.icon_type as keyof typeof MARKER_PIN_ICON_MAP]
              : null;
            const sz = SIZE_PX[m.size] ?? SIZE_PX.medium;
            const px = sz.container;
            const iconPx = sz.icon;
            const desc =
              m.description != null && !isRichTextHtmlVisuallyEmpty(m.description)
                ? richTextHtmlToPlainText(m.description)
                : "";
            const hasTip = Boolean(m.name) || Boolean(desc);
            const pin = (
              <button
                type="button"
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-help bg-transparent border-0 p-0"
                style={{
                  left: `${m.x}%`,
                  top: `${m.y}%`,
                  width: px,
                  height: px,
                }}
              >
                {m.background_shape && (
                  <AtlasMarkerBackground
                    shape={m.background_shape as never}
                    fill={m.color}
                    size={px}
                  />
                )}
                {Icon && (
                  <Icon
                    className="absolute inset-0 m-auto text-white drop-shadow"
                    style={{ width: iconPx, height: iconPx }}
                  />
                )}
                {!m.background_shape && !Icon && (
                  <div
                    className="rounded-full border-2 border-white shadow"
                    style={{
                      width: px,
                      height: px,
                      backgroundColor: m.color,
                    }}
                  />
                )}
              </button>
            );
            if (!hasTip) return <span key={m.id}>{pin}</span>;
            return (
              <Tooltip key={m.id}>
                <TooltipTrigger asChild>{pin}</TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className={cn(
                    "max-w-xs whitespace-pre-wrap",
                    PARCHMENT_TOOLTIP_CLASS
                  )}
                >
                  {m.name && (
                    <p
                      className="font-bold text-sm mb-0.5 text-amber-400"
                      style={{ fontVariant: "small-caps" }}
                    >
                      {m.name}
                    </p>
                  )}
                  {desc && <p className="text-xs leading-relaxed">{desc}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
      </div>
    </TooltipProvider>
  );
}
