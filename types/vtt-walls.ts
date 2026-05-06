export interface Point {
  x: number;
  y: number;
}

/** Database row. `points` is the polyline; for doors it must be exactly 2 points. */
export interface Wall {
  id: string;
  campaign_id: string;
  map_id: string;
  points: Point[];
  is_door: boolean;
  is_open: boolean;
  created_at: string;
}

/** A 2-point primitive used by the geometry helpers after polylines are expanded. */
export interface WallSegment {
  /** Wall row id this segment belongs to. */
  wallId: string;
  a: Point;
  b: Point;
  isDoor: boolean;
  isOpen: boolean;
}

/** Per-user, per-map memory polygon. seen_polygon is an array of rings, each ring is a flat [x,y,...]. */
export interface PlayerVisibility {
  campaign_id: string;
  map_id: string;
  user_id: string;
  seen_polygon: number[][];
  updated_at: string;
}
