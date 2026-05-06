"use client";

import { Layer, Rect, Line } from "react-konva";
import type { Point } from "@/types/vtt-walls";

interface Props {
  /** Map dimensions in stage coords. */
  mapWidth: number;
  mapHeight: number;
  /** Currently-visible polygons (one per owned token, possibly clipped to light radii). */
  visiblePolygons: number[][];
  /** Memory polygons (already accumulated). */
  memoryPolygons: number[][];
  /** Hide entirely (DM bypass / vision_enabled false). */
  hidden: boolean;
}

const NEVER_SEEN_COLOR = "#000";

export function LosMaskLayer({
  mapWidth,
  mapHeight,
  visiblePolygons,
  memoryPolygons,
  hidden,
}: Props) {
  if (hidden) return null;
  return (
    <Layer listening={false}>
      {/* Layer 1: solid black covering everything ("never seen") */}
      <Rect x={0} y={0} width={mapWidth} height={mapHeight} fill={NEVER_SEEN_COLOR} />
      {/* Layer 2: punch memory polygons to 50% — destination-out at 0.5 alpha */}
      {memoryPolygons.map((flat, i) => (
        <Line
          key={`mem-${i}`}
          points={flat}
          closed
          fill="rgba(0,0,0,1)"
          opacity={0.5}
          globalCompositeOperation="destination-out"
        />
      ))}
      {/* Layer 3: punch currently-visible to 100% transparent */}
      {visiblePolygons.map((flat, i) => (
        <Line
          key={`vis-${i}`}
          points={flat}
          closed
          fill="rgba(0,0,0,1)"
          globalCompositeOperation="destination-out"
        />
      ))}
    </Layer>
  );
}

/** Helper to convert Point[] to flat number[] for Konva. */
export function pointsToFlat(points: Point[]): number[] {
  const out: number[] = [];
  for (const p of points) out.push(p.x, p.y);
  return out;
}
