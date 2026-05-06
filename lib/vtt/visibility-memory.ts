import polygonClipping from "polygon-clipping";
import type { Point } from "@/types/vtt-walls";

type Ring = [number, number][];

function pointsToRing(points: Point[]): Ring {
  // polygon-clipping requires the first and last points to be equal (closed ring).
  const ring: Ring = points.map((p) => [p.x, p.y] as [number, number]);
  if (ring.length === 0) return ring;
  const [fx, fy] = ring[0];
  const last = ring[ring.length - 1];
  if (last[0] !== fx || last[1] !== fy) ring.push([fx, fy]);
  return ring;
}

/** Memory storage shape: array of polygons, each polygon is array of rings (outer + holes). */
export type StoredMemory = number[][][][];

function ringsToFlat(rings: Ring[][]): StoredMemory {
  return rings.map((poly) =>
    poly.map((ring) => ring.flatMap(([x, y]) => [x, y]))
  ) as StoredMemory;
}

function flatToRings(stored: StoredMemory): Ring[][] {
  return stored.map((poly) =>
    poly.map((ring) => {
      const out: Ring = [];
      for (let i = 0; i < ring.length; i += 2) {
        out.push([ring[i], ring[i + 1]]);
      }
      return out;
    })
  );
}

/** Union an existing stored memory with a newly-visible polygon. */
export function unionWithVisible(
  stored: StoredMemory,
  visible: Point[]
): StoredMemory {
  const newPolyRing = pointsToRing(visible);
  if (newPolyRing.length < 4) return stored; // need at least a closed triangle
  const a = flatToRings(stored);
  const result = polygonClipping.union(a as never, [newPolyRing] as never);
  return ringsToFlat(result as Ring[][]);
}

/** Convert stored memory to a list of Konva-friendly polygons (flat point arrays). */
export function storedMemoryToKonvaPolys(stored: StoredMemory): number[][] {
  // Outer ring of each polygon. Holes ignored for v1 (room shapes don't produce holes).
  return stored.map((poly) => poly[0] ?? []);
}
