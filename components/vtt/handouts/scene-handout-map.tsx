"use client";

import type { EmbeddedMarker } from "@/hooks/useVttHandouts";
import { MARKER_PIN_ICON_MAP } from "@/components/forge/atlas/marker-pin-icon-registry";
import { AtlasMarkerBackground } from "@/components/forge/atlas/atlas-marker-background";

interface Props {
  imageUrl: string;
  markers: EmbeddedMarker[];
}

const SIZE_PX: Record<EmbeddedMarker["size"], number> = {
  small: 18,
  medium: 24,
  large: 30,
};

/**
 * Compact, read-only scene map for handouts. Renders the scene image at the
 * card's available width and overlays markers using the same visual language
 * as the Forge atlas (pin shapes + lucide icons, recoloured per marker).
 *
 * Marker positions in `location_markers.x/y` are normalized [0..1] image
 * coordinates, so percentage-based absolute positioning Just Works at any
 * card size without re-measuring the image.
 */
export function SceneHandoutMap({ imageUrl, markers }: Props) {
  return (
    <div className="relative rounded overflow-hidden border border-[#7a1f1f]/30 bg-black/5">
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
          const px = SIZE_PX[m.size] ?? SIZE_PX.medium;
          return (
            <div
              key={m.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${m.x * 100}%`,
                top: `${m.y * 100}%`,
                width: px,
                height: px,
              }}
              title={m.name ?? undefined}
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
                  style={{ width: px * 0.6, height: px * 0.6 }}
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
            </div>
          );
        })}
    </div>
  );
}
