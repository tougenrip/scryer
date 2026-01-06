export type TokenSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

export interface Token {
  id: string;
  map_id: string;
  character_id?: string | null;
  monster_source?: 'srd' | 'homebrew' | null;
  monster_index?: string | null;
  name: string | null;
  x: number;
  y: number;
  size: TokenSize;
  color: string;
  rotation: number;
  visible_to?: string[] | null;
  conditions: string[];
  hp_current?: number | null;
  hp_max?: number | null;
  scale: number;
  image_url?: string | null; // For display, likely joined from character/monster
  created_at?: string;
}

export interface FogShape {
  id: string;
  type: 'rect' | 'circle' | 'polygon';
  points?: number[]; // For polygon: [x1, y1, x2, y2, ...]
  x?: number;        // For rect/circle
  y?: number;        // For rect/circle
  width?: number;    // For rect
  height?: number;   // For rect
  radius?: number;   // For circle
  subtracted?: boolean; // If true, this shape reveals fog (erases)
}

export interface FogData {
  shapes: FogShape[];
  revealed: boolean; // Global reveal state
}
