import type { Point, WallSegment } from "@/types/vtt-walls";

const SLIDE_BACK_EPS = 0.5; // px to back off from a wall after a hit

interface SegHit {
  t: number; // 0..1 along (from→to)
  point: Point;
  segment: WallSegment;
}

/** Intersect two segments (p→q) and (a→b). Returns t along p→q and the point. */
function segmentSegmentIntersect(
  px: number,
  py: number,
  qx: number,
  qy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { t: number; point: Point } | null {
  const rx = qx - px;
  const ry = qy - py;
  const sx = bx - ax;
  const sy = by - ay;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((ax - px) * sy - (ay - py) * sx) / denom;
  const u = ((ax - px) * ry - (ay - py) * rx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, point: { x: px + rx * t, y: py + ry * t } };
}

/** Returns the first segment hit by from→to, if any. */
function firstHit(
  from: Point,
  to: Point,
  segments: WallSegment[]
): SegHit | null {
  let best: SegHit | null = null;
  for (const s of segments) {
    const hit = segmentSegmentIntersect(
      from.x,
      from.y,
      to.x,
      to.y,
      s.a.x,
      s.a.y,
      s.b.x,
      s.b.y
    );
    if (hit && (!best || hit.t < best.t)) {
      best = { t: hit.t, point: hit.point, segment: s };
    }
  }
  return best;
}

export function segmentBlocked(
  from: Point,
  to: Point,
  segments: WallSegment[]
): boolean {
  return firstHit(from, to, segments) !== null;
}

/**
 * If the direct path is blocked, slide the residual movement along the
 * obstructing wall. Recurse once more so corner-then-corner works. Returns
 * the final reachable position.
 */
export function slideAgainstWalls(
  from: Point,
  desired: Point,
  segments: WallSegment[],
  iterations = 0
): Point {
  if (iterations >= 2) return from;
  const hit = firstHit(from, desired, segments);
  if (!hit) return desired;

  // Step back from the wall a touch so we're never *on* it.
  const dxFull = desired.x - from.x;
  const dyFull = desired.y - from.y;
  const totalDist = Math.hypot(dxFull, dyFull);
  if (totalDist < 1e-9) return from;
  const reachableDist = Math.max(0, hit.t * totalDist - SLIDE_BACK_EPS);
  const ux = dxFull / totalDist;
  const uy = dyFull / totalDist;
  const reached: Point = {
    x: from.x + ux * reachableDist,
    y: from.y + uy * reachableDist,
  };

  // Project residual onto wall tangent.
  const wx = hit.segment.b.x - hit.segment.a.x;
  const wy = hit.segment.b.y - hit.segment.a.y;
  const wLen = Math.hypot(wx, wy);
  if (wLen < 1e-9) return reached;
  const tx = wx / wLen;
  const ty = wy / wLen;
  const remX = desired.x - reached.x;
  const remY = desired.y - reached.y;
  const proj = remX * tx + remY * ty;
  const slid: Point = {
    x: reached.x + tx * proj,
    y: reached.y + ty * proj,
  };
  return slideAgainstWalls(reached, slid, segments, iterations + 1);
}
