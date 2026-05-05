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
  /** DB column: library portrait; falls back to character image in hooks */
  image_url?: string | null;
  created_at?: string;
  character?: {
    name: string | null;
    image_url: string | null;
    armor_class?: number | null;
    speed?: number | null;
    hp_current?: number | null;
    hp_max?: number | null;
    class_index?: string | null;
    race_index?: string | null;
    senses?: unknown;
  } | null;
  monster?: {
    index: string;
    name: string;
    armor_class: number | null;
    hit_points: number | null;
    hit_dice: string | null;
    speed: unknown;
    damage_resistances: string[] | null;
    damage_immunities: string[] | null;
    damage_vulnerabilities: string[] | null;
    condition_immunities: string[] | null;
    senses: unknown;
    type: string | null;
    subtype: string | null;
    challenge_rating: number | null;
  } | null;
}

export interface FogShape {
  id: string;
  type: 'rect' | 'circle' | 'polygon' | 'brush';
  points?: number[]; // For polygon/brush: [x1, y1, x2, y2, ...]
  x?: number;        // For rect/circle
  y?: number;        // For rect/circle
  width?: number;    // For rect
  height?: number;   // For rect
  radius?: number;   // For circle
  strokeWidth?: number; // For brush
  subtracted?: boolean; // If true, this shape reveals fog (erases)
}

export interface FogData {
  shapes: FogShape[];
  revealed: boolean; // Global reveal state
}
