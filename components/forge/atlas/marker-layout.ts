import type { LocationMarker } from "@/hooks/useForgeContent";

const VIEWBOX = 24;

/**
 * Extra translateY (px) for the map glyph so it sits on the fill's visual centroid.
 * Triangle / bookmark / teardrop carry most ink below (12, 12) in the 24×24 frame, so
 * flex centering leaves the icon too high. Positive = move down.
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
      du = 1.45;
      break;
    case "teardrop":
      du = 3.1;
      break;
    default:
      return 0;
  }

  return (du / VIEWBOX) * boxPx;
}
