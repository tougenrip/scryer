export type AoeShape = "circle" | "cone" | "line" | "square" | "ring";

export const AOE_SHAPES: AoeShape[] = ["circle", "cone", "line", "square", "ring"];

export interface AoeArea {
  id: string;
  campaign_id: string;
  map_id: string;
  owner_user_id: string;
  shape: AoeShape;
  origin_x: number;
  origin_y: number;
  length_ft: number;
  rotation_deg: number;
  color: string;
  label: string | null;
  created_at: string;
}

export interface EphemeralAoe {
  userId: string;
  displayName: string;
  color: string;
  shape: AoeShape;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  updatedAt: number;
}

export interface PingEvent {
  id: string;
  userId: string;
  displayName: string;
  color: string;
  x: number;
  y: number;
  firedAt: number;
}

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface Drawing {
  id: string;
  campaign_id: string;
  map_id: string;
  owner_user_id: string;
  points: DrawingPoint[];
  color: string;
  stroke_width: number;
  created_at: string;
}

export interface EphemeralDrawing {
  userId: string;
  displayName: string;
  color: string;
  strokeWidth: number;
  points: DrawingPoint[];
  updatedAt: number;
}
