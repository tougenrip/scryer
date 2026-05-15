export interface DmRandomTable {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  /** Free-form sidebar grouping. Common values: 'npc', 'shop',
   *  'weather', 'plot', 'dungeon', 'encounter', or null. */
  category: string | null;
  rolls_per_use: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DmRandomTableEntry {
  id: string;
  table_id: string;
  weight: number;
  value: string;
  /** Optional structured payload — e.g. shop stock entries carry
   *  `{ price, rarity }`. Renderers can pluck known keys; unknown
   *  keys are ignored. */
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RollResult {
  table: DmRandomTable;
  entries: DmRandomTableEntry[];
}
