export interface LightSource {
  id: string;
  campaign_id: string;
  map_id: string;
  owner_user_id: string;
  x: number;
  y: number;
  radius_ft: number;
  /** Hex color, e.g. '#FFC080'. */
  color: string;
  /** 0..2, default 1. Higher = brighter at center. */
  intensity: number;
  name: string | null;
  created_at: string;
}
