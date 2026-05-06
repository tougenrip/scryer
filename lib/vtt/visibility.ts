import type { Point, Wall, WallSegment } from "@/types/vtt-walls";

const RAY_EPSILON = 0.0001;
const VIEW_RADIUS_PX = 5000; // bound the polygon when no wall is hit

/** Expand a list of Walls (each a polyline) into 2-point segments. */
export function wallsToSegments(walls: Wall[]): WallSegment[] {
  const segs: WallSegment[] = [];
  for (const w of walls) {
    for (let i = 0; i < w.points.length - 1; i++) {
      segs.push({
        wallId: w.id,
        a: w.points[i],
        b: w.points[i + 1],
        isDoor: w.is_door,
        isOpen: w.is_open,
      });
    }
  }
  return segs;
}

/** Filter sight-blocking segments (closed walls + closed doors). */
export function sightBlockingSegments(walls: Wall[]): WallSegment[] {
  return wallsToSegments(walls).filter((s) => !(s.isDoor && s.isOpen));
}

/** Filter movement-blocking segments. Same set as sight in this design. */
export function movementBlockingSegments(walls: Wall[]): WallSegment[] {
  return sightBlockingSegments(walls);
}

interface RayHit {
  point: Point;
  t: number; // distance along ray from origin
}

/**
 * Intersect a ray (origin, unit dir) with a segment (a→b). Returns t (distance
 * along ray) and hit point if the intersection is in the forward direction and
 * within the segment, else null.
 */
function raySegmentIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): RayHit | null {
  const sx = bx - ax;
  const sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((ax - ox) * sy - (ay - oy) * sx) / denom;
  const u = ((ax - ox) * dy - (ay - oy) * dx) / denom;
  if (t < 0 || u < 0 || u > 1) return null;
  return { point: { x: ox + dx * t, y: oy + dy * t }, t };
}

/**
 * Compute the visibility polygon from `viewpoint` against `segments`.
 * Standard angular sweep over endpoints, with ±epsilon offsets for the
 * see-past-corner case. Returns a polygon as a list of ordered points.
 */
export function computeVisibilityPolygon(
  viewpoint: Point,
  segments: WallSegment[]
): Point[] {
  const angles: number[] = [];
  for (const s of segments) {
    for (const p of [s.a, s.b]) {
      const a = Math.atan2(p.y - viewpoint.y, p.x - viewpoint.x);
      angles.push(a, a + RAY_EPSILON, a - RAY_EPSILON);
    }
  }
  // If there are no walls, the polygon is just a big circle approximation.
  if (angles.length === 0) {
    const out: Point[] = [];
    const N = 32;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      out.push({
        x: viewpoint.x + Math.cos(a) * VIEW_RADIUS_PX,
        y: viewpoint.y + Math.sin(a) * VIEW_RADIUS_PX,
      });
    }
    return out;
  }

  angles.sort((a, b) => a - b);

  const polygon: Point[] = [];
  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closest: RayHit | null = null;
    for (const s of segments) {
      const hit = raySegmentIntersect(
        viewpoint.x,
        viewpoint.y,
        dx,
        dy,
        s.a.x,
        s.a.y,
        s.b.x,
        s.b.y
      );
      if (hit && (!closest || hit.t < closest.t)) closest = hit;
    }
    if (!closest) {
      polygon.push({
        x: viewpoint.x + dx * VIEW_RADIUS_PX,
        y: viewpoint.y + dy * VIEW_RADIUS_PX,
      });
    } else {
      polygon.push(closest.point);
    }
  }
  return polygon;
}

/** Convert a polygon to a flat [x,y,x,y,...] array for Konva.Line(closed). */
export function polygonToFlatPoints(poly: Point[]): number[] {
  const out: number[] = [];
  for (const p of poly) {
    out.push(p.x, p.y);
  }
  return out;
}

/** Test if a point is inside a polygon. Ray casting. */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
