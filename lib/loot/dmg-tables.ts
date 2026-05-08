/**
 * DMG 2014 Treasure tables, transcribed for in-app loot rolling.
 *
 * Two systems:
 *   1) Individual Treasure (DMG p.136) — coin a single monster carries.
 *      Indexed by CR tier of the monster.
 *   2) Treasure Hoard (DMG p.137-139) — bigger pile of coin + rolls onto
 *      Magic Item Tables A through I.
 *
 * Tables are kept as plain data so they're easy to audit against the book.
 */

export type CrTier = "0-4" | "5-10" | "11-16" | "17+";

export type MagicTable = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

/** Rarity each magic-item table maps to in srd_magic_items.rarity. */
export const MAGIC_TABLE_RARITY: Record<MagicTable, string> = {
  A: "Common",
  B: "Uncommon",
  C: "Rare",
  D: "Very Rare",
  E: "Legendary",
  F: "Uncommon",
  G: "Rare",
  H: "Very Rare",
  I: "Legendary",
};

export interface DiceRoll {
  /** e.g. "5d6", "4d6*100" — multiplier for *coins-by-the-hundred entries. */
  dice: string;
  multiplier?: number;
}

export interface CoinAward {
  cp?: DiceRoll;
  sp?: DiceRoll;
  ep?: DiceRoll;
  gp?: DiceRoll;
  pp?: DiceRoll;
}

export interface IndividualRow {
  /** Inclusive percentile span on a d100. */
  pctMin: number;
  pctMax: number;
  coins: CoinAward;
}

export interface MagicHoardEntry {
  table: MagicTable;
  /** Number of items rolled — e.g. {dice:"2d6"} means roll 2d6 and pull that
   *  many random items from the table's rarity pool. */
  count: DiceRoll;
}

export interface HoardRow {
  pctMin: number;
  pctMax: number;
  coins: CoinAward;
  /** Magic items granted by this row, possibly empty. */
  magic: MagicHoardEntry[];
}

/** Convenience builder. */
const d = (dice: string, multiplier?: number): DiceRoll => ({ dice, multiplier });

/* ────────────────────────────────────────────────────────────────────── */
/*  Individual Treasure (DMG p.136). Per defeated monster.               */
/* ────────────────────────────────────────────────────────────────────── */

export const INDIVIDUAL_TREASURE: Record<CrTier, IndividualRow[]> = {
  "0-4": [
    { pctMin: 1, pctMax: 30, coins: { cp: d("5d6") } },
    { pctMin: 31, pctMax: 60, coins: { sp: d("4d6") } },
    { pctMin: 61, pctMax: 70, coins: { ep: d("3d6") } },
    { pctMin: 71, pctMax: 95, coins: { gp: d("3d6") } },
    { pctMin: 96, pctMax: 100, coins: { pp: d("1d6") } },
  ],
  "5-10": [
    { pctMin: 1, pctMax: 30, coins: { cp: d("4d6", 100), ep: d("1d6", 10) } },
    { pctMin: 31, pctMax: 60, coins: { sp: d("6d6", 10), gp: d("2d6", 10) } },
    { pctMin: 61, pctMax: 70, coins: { ep: d("1d6", 100), gp: d("2d6", 10) } },
    { pctMin: 71, pctMax: 95, coins: { gp: d("4d6", 10) } },
    { pctMin: 96, pctMax: 100, coins: { pp: d("2d6", 10) } },
  ],
  "11-16": [
    { pctMin: 1, pctMax: 20, coins: { sp: d("4d6", 100), gp: d("1d6", 100) } },
    { pctMin: 21, pctMax: 35, coins: { ep: d("1d6", 100), gp: d("1d6", 100) } },
    { pctMin: 36, pctMax: 75, coins: { gp: d("2d6", 100), pp: d("1d6", 10) } },
    { pctMin: 76, pctMax: 100, coins: { gp: d("2d6", 100), pp: d("2d6", 10) } },
  ],
  "17+": [
    { pctMin: 1, pctMax: 15, coins: { ep: d("2d6", 1000), gp: d("8d6", 100) } },
    { pctMin: 16, pctMax: 55, coins: { gp: d("1d6", 1000), pp: d("1d6", 100) } },
    { pctMin: 56, pctMax: 100, coins: { gp: d("1d6", 1000), pp: d("2d6", 100) } },
  ],
};

/* ────────────────────────────────────────────────────────────────────── */
/*  Treasure Hoard (DMG p.137-139). Once per encounter, by tier of the   */
/*  highest-CR participant.                                              */
/* ────────────────────────────────────────────────────────────────────── */

export const TREASURE_HOARD: Record<CrTier, HoardRow[]> = {
  "0-4": [
    { pctMin: 1, pctMax: 6, coins: {}, magic: [] },
    {
      pctMin: 7,
      pctMax: 16,
      coins: { cp: d("6d6", 100), sp: d("3d6", 100), gp: d("2d6", 10) },
      magic: [],
    },
    {
      pctMin: 17,
      pctMax: 26,
      coins: { cp: d("6d6", 100), sp: d("3d6", 100), gp: d("2d6", 10) },
      magic: [{ table: "A", count: d("1d6") }],
    },
    {
      pctMin: 27,
      pctMax: 36,
      coins: { cp: d("6d6", 100), sp: d("3d6", 100), gp: d("2d6", 10) },
      magic: [{ table: "B", count: d("1d4") }],
    },
    {
      pctMin: 37,
      pctMax: 44,
      coins: { cp: d("6d6", 100), sp: d("3d6", 100), gp: d("2d6", 10) },
      magic: [{ table: "C", count: d("1d4") }],
    },
    {
      pctMin: 45,
      pctMax: 52,
      coins: { sp: d("6d6", 100), gp: d("4d6", 10) },
      magic: [],
    },
    {
      pctMin: 53,
      pctMax: 60,
      coins: { sp: d("6d6", 100), gp: d("4d6", 10) },
      magic: [{ table: "A", count: d("1d6") }],
    },
    {
      pctMin: 61,
      pctMax: 65,
      coins: { sp: d("6d6", 100), gp: d("4d6", 10) },
      magic: [{ table: "B", count: d("1d4") }],
    },
    {
      pctMin: 66,
      pctMax: 70,
      coins: { sp: d("6d6", 100), gp: d("4d6", 10) },
      magic: [{ table: "C", count: d("1d4") }],
    },
    {
      pctMin: 71,
      pctMax: 75,
      coins: { ep: d("2d6", 10), gp: d("2d6", 10) },
      magic: [],
    },
    {
      pctMin: 76,
      pctMax: 80,
      coins: { ep: d("2d6", 10), gp: d("2d6", 10) },
      magic: [{ table: "A", count: d("1d6") }],
    },
    {
      pctMin: 81,
      pctMax: 85,
      coins: { ep: d("2d6", 10), gp: d("2d6", 10) },
      magic: [{ table: "B", count: d("1d4") }],
    },
    {
      pctMin: 86,
      pctMax: 92,
      coins: { ep: d("2d6", 10), gp: d("2d6", 10) },
      magic: [{ table: "C", count: d("1d4") }],
    },
    {
      pctMin: 93,
      pctMax: 97,
      coins: { ep: d("2d6", 10), gp: d("2d6", 10) },
      magic: [{ table: "F", count: d("1d4") }],
    },
    {
      pctMin: 98,
      pctMax: 99,
      coins: { ep: d("2d6", 10), gp: d("2d6", 10) },
      magic: [{ table: "G", count: d("1") }],
    },
    {
      pctMin: 100,
      pctMax: 100,
      coins: { ep: d("2d6", 10), gp: d("2d6", 10) },
      magic: [{ table: "G", count: d("1") }],
    },
  ],

  "5-10": [
    {
      pctMin: 1,
      pctMax: 4,
      coins: { cp: d("2d6", 100), sp: d("2d6", 100), gp: d("6d6", 10) },
      magic: [],
    },
    {
      pctMin: 5,
      pctMax: 10,
      coins: { cp: d("2d6", 100), sp: d("2d6", 100), gp: d("6d6", 10) },
      magic: [{ table: "A", count: d("2d6") }],
    },
    {
      pctMin: 11,
      pctMax: 16,
      coins: { cp: d("2d6", 100), sp: d("2d6", 100), gp: d("6d6", 10) },
      magic: [{ table: "B", count: d("1d4") }],
    },
    {
      pctMin: 17,
      pctMax: 22,
      coins: { cp: d("2d6", 100), sp: d("2d6", 100), gp: d("6d6", 10) },
      magic: [{ table: "C", count: d("1d4") }],
    },
    {
      pctMin: 23,
      pctMax: 28,
      coins: { cp: d("2d6", 100), sp: d("2d6", 100), gp: d("6d6", 10) },
      magic: [{ table: "D", count: d("1") }],
    },
    {
      pctMin: 29,
      pctMax: 32,
      coins: { sp: d("2d6", 100), ep: d("2d6", 10), gp: d("6d6", 10) },
      magic: [],
    },
    {
      pctMin: 33,
      pctMax: 38,
      coins: { sp: d("2d6", 100), ep: d("2d6", 10), gp: d("6d6", 10) },
      magic: [{ table: "A", count: d("2d6") }],
    },
    {
      pctMin: 39,
      pctMax: 44,
      coins: { sp: d("2d6", 100), ep: d("2d6", 10), gp: d("6d6", 10) },
      magic: [{ table: "B", count: d("1d4") }],
    },
    {
      pctMin: 45,
      pctMax: 50,
      coins: { sp: d("2d6", 100), ep: d("2d6", 10), gp: d("6d6", 10) },
      magic: [{ table: "C", count: d("1d4") }],
    },
    {
      pctMin: 51,
      pctMax: 56,
      coins: { sp: d("2d6", 100), ep: d("2d6", 10), gp: d("6d6", 10) },
      magic: [{ table: "D", count: d("1") }],
    },
    {
      pctMin: 57,
      pctMax: 60,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [],
    },
    {
      pctMin: 61,
      pctMax: 65,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "A", count: d("2d6") }],
    },
    {
      pctMin: 66,
      pctMax: 70,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "B", count: d("1d4") }],
    },
    {
      pctMin: 71,
      pctMax: 75,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "C", count: d("1d4") }],
    },
    {
      pctMin: 76,
      pctMax: 78,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "D", count: d("1") }],
    },
    {
      pctMin: 79,
      pctMax: 80,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "E", count: d("1") }],
    },
    {
      pctMin: 81,
      pctMax: 85,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "F", count: d("1d4") }],
    },
    {
      pctMin: 86,
      pctMax: 90,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "G", count: d("1d4") }],
    },
    {
      pctMin: 91,
      pctMax: 95,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "H", count: d("1") }],
    },
    {
      pctMin: 96,
      pctMax: 100,
      coins: { gp: d("4d6", 100), pp: d("1d6", 10) },
      magic: [{ table: "I", count: d("1") }],
    },
  ],

  "11-16": [
    {
      pctMin: 1,
      pctMax: 3,
      coins: { gp: d("4d6", 100), pp: d("5d6", 10) },
      magic: [],
    },
    {
      pctMin: 4,
      pctMax: 6,
      coins: { gp: d("4d6", 100), pp: d("5d6", 10) },
      magic: [{ table: "A", count: d("1d4") }, { table: "B", count: d("1d6") }],
    },
    {
      pctMin: 7,
      pctMax: 12,
      coins: { gp: d("4d6", 100), pp: d("5d6", 10) },
      magic: [{ table: "C", count: d("1d6") }],
    },
    {
      pctMin: 13,
      pctMax: 18,
      coins: { gp: d("4d6", 100), pp: d("5d6", 10) },
      magic: [{ table: "D", count: d("1d4") }],
    },
    {
      pctMin: 19,
      pctMax: 24,
      coins: { gp: d("4d6", 100), pp: d("5d6", 10) },
      magic: [{ table: "E", count: d("1") }],
    },
    {
      pctMin: 25,
      pctMax: 26,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "F", count: d("1d4") }, { table: "G", count: d("1") }],
    },
    {
      pctMin: 27,
      pctMax: 32,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "C", count: d("1d6") }],
    },
    {
      pctMin: 33,
      pctMax: 38,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "D", count: d("1d4") }],
    },
    {
      pctMin: 39,
      pctMax: 44,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "E", count: d("1") }],
    },
    {
      pctMin: 45,
      pctMax: 50,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "F", count: d("1d4") }],
    },
    {
      pctMin: 51,
      pctMax: 54,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "G", count: d("1") }],
    },
    {
      pctMin: 55,
      pctMax: 59,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "H", count: d("1") }],
    },
    {
      pctMin: 60,
      pctMax: 63,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "I", count: d("1") }],
    },
    {
      pctMin: 64,
      pctMax: 66,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "F", count: d("1d4") }, { table: "G", count: d("1d4") }],
    },
    {
      pctMin: 67,
      pctMax: 74,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "C", count: d("1d6") }],
    },
    {
      pctMin: 75,
      pctMax: 82,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "D", count: d("1d4") }],
    },
    {
      pctMin: 83,
      pctMax: 90,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "E", count: d("1") }],
    },
    {
      pctMin: 91,
      pctMax: 95,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "G", count: d("1d4") }],
    },
    {
      pctMin: 96,
      pctMax: 99,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "H", count: d("1d4") }],
    },
    {
      pctMin: 100,
      pctMax: 100,
      coins: { gp: d("2d6", 1000), pp: d("3d6", 100) },
      magic: [{ table: "I", count: d("1") }],
    },
  ],

  "17+": [
    {
      pctMin: 1,
      pctMax: 2,
      coins: { gp: d("12d6", 1000), pp: d("8d6", 100) },
      magic: [],
    },
    {
      pctMin: 3,
      pctMax: 5,
      coins: { gp: d("12d6", 1000), pp: d("8d6", 100) },
      magic: [{ table: "C", count: d("3d6") }],
    },
    {
      pctMin: 6,
      pctMax: 8,
      coins: { gp: d("12d6", 1000), pp: d("8d6", 100) },
      magic: [{ table: "D", count: d("1d10") }],
    },
    {
      pctMin: 9,
      pctMax: 11,
      coins: { gp: d("12d6", 1000), pp: d("8d6", 100) },
      magic: [{ table: "E", count: d("1d4") }],
    },
    {
      pctMin: 12,
      pctMax: 14,
      coins: { gp: d("12d6", 1000), pp: d("8d6", 100) },
      magic: [{ table: "G", count: d("1d4") }],
    },
    {
      pctMin: 15,
      pctMax: 22,
      coins: { gp: d("12d6", 1000), pp: d("8d6", 100) },
      magic: [{ table: "H", count: d("1d4") }],
    },
    {
      pctMin: 23,
      pctMax: 30,
      coins: { gp: d("12d6", 1000), pp: d("8d6", 100) },
      magic: [{ table: "I", count: d("1d4") }],
    },
    {
      pctMin: 31,
      pctMax: 33,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "C", count: d("3d6") }],
    },
    {
      pctMin: 34,
      pctMax: 36,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "D", count: d("1d10") }],
    },
    {
      pctMin: 37,
      pctMax: 40,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "E", count: d("1d4") }],
    },
    {
      pctMin: 41,
      pctMax: 46,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "G", count: d("2d4") }],
    },
    {
      pctMin: 47,
      pctMax: 52,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "H", count: d("1d4") }],
    },
    {
      pctMin: 53,
      pctMax: 58,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "I", count: d("1d4") }],
    },
    {
      pctMin: 59,
      pctMax: 63,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "D", count: d("1d10") }, { table: "E", count: d("1d4") }],
    },
    {
      pctMin: 64,
      pctMax: 68,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "G", count: d("1d4") }, { table: "H", count: d("1d4") }],
    },
    {
      pctMin: 69,
      pctMax: 74,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "H", count: d("2d4") }, { table: "I", count: d("1d4") }],
    },
    {
      pctMin: 75,
      pctMax: 100,
      coins: { gp: d("3d6", 1000), pp: d("5d6", 100) },
      magic: [{ table: "I", count: d("2d4") }],
    },
  ],
};

/** Map a numeric CR to its tier band. */
export function crTier(cr: number): CrTier {
  if (cr <= 4) return "0-4";
  if (cr <= 10) return "5-10";
  if (cr <= 16) return "11-16";
  return "17+";
}
