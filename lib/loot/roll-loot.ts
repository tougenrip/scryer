/**
 * Pure functions for rolling loot from the DMG tables. The DB-touching
 * "look up an actual srd_magic_items row of rarity X" step is async; the
 * dice math is sync.
 */

import { createClient } from "@/lib/supabase/client";
import {
  INDIVIDUAL_TREASURE,
  TREASURE_HOARD,
  MAGIC_TABLE_RARITY,
  crTier,
  type CrTier,
  type DiceRoll,
  type CoinAward,
  type IndividualRow,
  type HoardRow,
  type MagicHoardEntry,
} from "./dmg-tables";

export interface RolledCoins {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export interface RolledItem {
  /** Stable client-side id for list keying / per-row reroll. */
  uid: string;
  source: "srd";
  kind: "equipment" | "magic";
  index: string;
  name: string;
  rarity: string | null;
}

export interface RolledLoot {
  coins: RolledCoins;
  items: RolledItem[];
  /** For diagnostics in the modal: which DMG rows fired. */
  trace: {
    tier: CrTier;
    individualPercentiles: number[];
    hoardPercentile: number;
  };
}

const ZERO_COINS: RolledCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

/* ─────────────  Dice  ───────────── */

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Roll "NdM" or "NdM*K" (multiplier handled by the dmg-tables shape). */
export function rollDice(roll: DiceRoll): number {
  const match = /^(\d+)d(\d+)$/.exec(roll.dice);
  if (!match) return 0;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  let total = 0;
  for (let i = 0; i < count; i++) total += rollDie(sides);
  return total * (roll.multiplier ?? 1);
}

function rollCoins(award: CoinAward): RolledCoins {
  const out = { ...ZERO_COINS };
  if (award.cp) out.cp = rollDice(award.cp);
  if (award.sp) out.sp = rollDice(award.sp);
  if (award.ep) out.ep = rollDice(award.ep);
  if (award.gp) out.gp = rollDice(award.gp);
  if (award.pp) out.pp = rollDice(award.pp);
  return out;
}

function addCoins(a: RolledCoins, b: RolledCoins): RolledCoins {
  return {
    cp: a.cp + b.cp,
    sp: a.sp + b.sp,
    ep: a.ep + b.ep,
    gp: a.gp + b.gp,
    pp: a.pp + b.pp,
  };
}

/* ─────────────  Table lookups  ───────────── */

function pickIndividualRow(tier: CrTier, p: number): IndividualRow {
  const rows = INDIVIDUAL_TREASURE[tier];
  return rows.find((r) => p >= r.pctMin && p <= r.pctMax) ?? rows[0];
}

function pickHoardRow(tier: CrTier, p: number): HoardRow {
  const rows = TREASURE_HOARD[tier];
  return rows.find((r) => p >= r.pctMin && p <= r.pctMax) ?? rows[0];
}

/* ─────────────  Magic-item resolution  ───────────── */

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Pick a random magic item of the given rarity from `srd_magic_items`. Falls
 * back to the next rarity down if the requested rarity has no rows.
 */
export async function pickRandomMagicItem(rarity: string): Promise<{
  index: string;
  name: string;
  rarity: string;
} | null> {
  const supabase = createClient();
  const tryRarities = [
    rarity,
    // Soft fallbacks if the requested rarity has nothing.
    "Uncommon",
    "Common",
  ];
  for (const r of tryRarities) {
    const { data } = await supabase
      .from("srd_magic_items")
      .select("index,name,rarity")
      .eq("rarity", r)
      .limit(500);
    if (data && data.length > 0) {
      const pick = data[Math.floor(Math.random() * data.length)];
      return {
        index: pick.index as string,
        name: pick.name as string,
        rarity: (pick.rarity as string) ?? r,
      };
    }
  }
  return null;
}

/** Resolve a hoard's magic-item entries into concrete items. */
async function resolveMagicEntries(
  entries: MagicHoardEntry[]
): Promise<RolledItem[]> {
  const out: RolledItem[] = [];
  for (const entry of entries) {
    const rarity = MAGIC_TABLE_RARITY[entry.table];
    const count = rollDice(entry.count);
    for (let i = 0; i < count; i++) {
      const item = await pickRandomMagicItem(rarity);
      if (!item) continue;
      out.push({
        uid: uid(),
        source: "srd",
        kind: "magic",
        index: item.index,
        name: item.name,
        rarity: item.rarity,
      });
    }
  }
  return out;
}

/* ─────────────  Public API  ───────────── */

export interface MonsterForLoot {
  challenge_rating: number;
}

/**
 * Roll loot for an encounter. Coin is rolled per-monster on the Individual
 * Treasure table. Magic items are rolled once for the encounter on the
 * Treasure Hoard table at the highest-CR participant's tier.
 */
export async function rollLootForEncounter(
  monsters: MonsterForLoot[]
): Promise<RolledLoot> {
  if (monsters.length === 0) {
    return {
      coins: { ...ZERO_COINS },
      items: [],
      trace: {
        tier: "0-4",
        individualPercentiles: [],
        hoardPercentile: 0,
      },
    };
  }

  // Tier comes from the strongest monster (DMG p.135).
  const highestCr = monsters.reduce(
    (m, x) => Math.max(m, x.challenge_rating ?? 0),
    0
  );
  const tier = crTier(highestCr);

  // Individual coin per monster.
  let coins = { ...ZERO_COINS };
  const individualPercentiles: number[] = [];
  for (const m of monsters) {
    const monsterTier = crTier(m.challenge_rating ?? 0);
    const p = rollDie(100);
    individualPercentiles.push(p);
    coins = addCoins(coins, rollCoins(pickIndividualRow(monsterTier, p).coins));
  }

  // One hoard roll for the encounter.
  const hoardP = rollDie(100);
  const hoardRow = pickHoardRow(tier, hoardP);
  coins = addCoins(coins, rollCoins(hoardRow.coins));
  const items = await resolveMagicEntries(hoardRow.magic);

  return {
    coins,
    items,
    trace: {
      tier,
      individualPercentiles,
      hoardPercentile: hoardP,
    },
  };
}

/**
 * Reroll a single magic item with the same rarity as the original. Used by
 * the per-row 🎲 button in the End-with-Loot modal.
 */
export async function rerollMagicItem(
  current: RolledItem
): Promise<RolledItem | null> {
  if (current.kind !== "magic" || !current.rarity) return null;
  const item = await pickRandomMagicItem(current.rarity);
  if (!item) return null;
  return {
    uid: uid(),
    source: "srd",
    kind: "magic",
    index: item.index,
    name: item.name,
    rarity: item.rarity,
  };
}
