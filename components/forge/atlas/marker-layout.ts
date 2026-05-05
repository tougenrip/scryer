import type { LocationMarker } from "@/hooks/useForgeContent";

const VIEWBOX = 24;

/**
 * Extra translateY (px) after the frame’s own shift (`backgroundOnlyOffsetY` for teardrop/bookmark).
 * Teardrop/bookmark use 0 here — the frame layer already moves the artwork; adding du here
 * stacked on top of that shift and pushed glyphs into the pin point. Triangle still needs a
 * small nudge because its frame isn’t pre-shifted the same way.
 */
export function markerIconCentroidNudgeY(
  shape: LocationMarker["background_shape"],
  boxPx: number
): number {
  if (!shape) return 0;

  let du = 0;
  switch (shape) {
    case "triangle":
      du = 2.2;
      break;
    case "bookmark":
    case "teardrop":
      du = 0;
      break;
    default:
      return 0;
  }

  return (du / VIEWBOX) * boxPx;
}
