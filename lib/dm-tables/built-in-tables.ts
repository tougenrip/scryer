/**
 * Built-in DM random tables. These are read-only at runtime — they
 * roll the same way as user-authored tables, but live in code so a
 * fresh campaign has useful content from the first session.
 *
 * Entries that map to a library item carry their SRD `index` in
 * metadata so renderers can deep-link to the item info sheet.
 *
 * Format intentionally mirrors `DmRandomTableEntry.metadata` so the
 * "Use as template" flow can clone these directly into the user's
 * own custom-tables table with no field translation.
 */

import type { DmRandomTableEntry } from "@/types/dm-random-tables";

export interface BuiltInTable {
  /** Stable string id, prefixed `builtin:` so it never collides with
   *  a UUID from the custom-tables table. */
  id: string;
  name: string;
  category: string;
  description: string;
  rolls_per_use: number;
  entries: ReadonlyArray<
    Pick<DmRandomTableEntry, "value" | "weight" | "metadata">
  >;
}

/** Helper to build an SRD-equipment entry concisely. */
function eq(
  index: string,
  name: string,
  price: string,
  weight = 1
): BuiltInTable["entries"][number] {
  return {
    value: name,
    weight,
    metadata: { source: "srd", kind: "equipment", index, price },
  };
}

/** Helper to build an SRD-magic-item entry concisely. */
function magic(
  index: string,
  name: string,
  rarity: string,
  price: string,
  weight = 1
): BuiltInTable["entries"][number] {
  return {
    value: name,
    weight,
    metadata: { source: "srd", kind: "magic", index, price, rarity },
  };
}

/** Free-form text entry (no library link). */
function text(
  value: string,
  weight = 1,
  metadata: Record<string, unknown> = {}
): BuiltInTable["entries"][number] {
  return { value, weight, metadata };
}

// ── BLACKSMITH ───────────────────────────────────────────────────────
const BLACKSMITH: BuiltInTable = {
  id: "builtin:blacksmith",
  name: "Blacksmith",
  category: "shop",
  description: "Mundane weapons, armor, and shields stocked by a town smithy.",
  rolls_per_use: 5,
  entries: [
    // Simple weapons (common — higher weight)
    eq("dagger", "Dagger", "2 gp", 3),
    eq("club", "Club", "1 sp", 3),
    eq("handaxe", "Handaxe", "5 gp", 3),
    eq("mace", "Mace", "5 gp", 3),
    eq("spear", "Spear", "1 gp", 3),
    eq("shortbow", "Shortbow", "25 gp", 2),
    // Martial weapons
    eq("longsword", "Longsword", "15 gp", 2),
    eq("battleaxe", "Battleaxe", "10 gp", 2),
    eq("warhammer", "Warhammer", "15 gp", 2),
    eq("rapier", "Rapier", "25 gp", 2),
    eq("shortsword", "Shortsword", "10 gp", 2),
    eq("longbow", "Longbow", "50 gp", 1),
    eq("halberd", "Halberd", "20 gp", 1),
    eq("glaive", "Glaive", "20 gp", 1),
    // Armor
    eq("leather-armor", "Leather Armor", "10 gp", 3),
    eq("studded-leather-armor", "Studded Leather", "45 gp", 2),
    eq("chain-shirt", "Chain Shirt", "50 gp", 2),
    eq("scale-mail", "Scale Mail", "50 gp", 2),
    eq("chain-mail", "Chain Mail", "75 gp", 1),
    eq("breastplate", "Breastplate", "400 gp", 1),
    eq("half-plate-armor", "Half Plate", "750 gp", 1),
    eq("plate-armor", "Plate", "1500 gp", 1),
    eq("shield", "Shield", "10 gp", 3),
  ],
};

// ── MAGIC SHOP ───────────────────────────────────────────────────────
const MAGIC_SHOP: BuiltInTable = {
  id: "builtin:magic-shop",
  name: "Magic Shop",
  category: "shop",
  description: "A mid-tier arcanum — potions, scrolls, and a few wondrous items.",
  rolls_per_use: 6,
  entries: [
    // Potions (common — higher weight)
    magic("potion-of-healing", "Potion of Healing", "Common", "50 gp", 4),
    magic("potion-of-greater-healing", "Potion of Greater Healing", "Uncommon", "150 gp", 2),
    magic("potion-of-climbing", "Potion of Climbing", "Common", "75 gp", 2),
    magic("potion-of-water-breathing", "Potion of Water Breathing", "Uncommon", "180 gp", 1),
    magic("oil-of-slipperiness", "Oil of Slipperiness", "Uncommon", "100 gp", 1),
    magic("philter-of-love", "Philter of Love", "Uncommon", "90 gp", 1),
    magic("potion-of-fire-breath", "Potion of Fire Breath", "Uncommon", "150 gp", 1),
    magic("potion-of-resistance", "Potion of Resistance", "Uncommon", "200 gp", 1),
    // Scrolls
    magic("spell-scroll-cantrip", "Spell Scroll (Cantrip)", "Common", "15 gp", 3),
    magic("spell-scroll-1st-level", "Spell Scroll (1st level)", "Common", "50 gp", 3),
    magic("spell-scroll-2nd-level", "Spell Scroll (2nd level)", "Uncommon", "150 gp", 2),
    magic("spell-scroll-3rd-level", "Spell Scroll (3rd level)", "Rare", "300 gp", 1),
    // Wondrous (cheap & common)
    magic("driftglobe", "Driftglobe", "Uncommon", "300 gp", 1),
    magic("bag-of-holding", "Bag of Holding", "Uncommon", "500 gp", 1),
    magic("goggles-of-night", "Goggles of Night", "Uncommon", "150 gp", 1),
    magic("boots-of-elvenkind", "Boots of Elvenkind", "Uncommon", "250 gp", 1),
    magic("cloak-of-protection", "Cloak of Protection", "Uncommon", "350 gp", 1),
    magic("immovable-rod", "Immovable Rod", "Uncommon", "400 gp", 1),
  ],
};

// ── APOTHECARY / ALCHEMIST ───────────────────────────────────────────
const APOTHECARY: BuiltInTable = {
  id: "builtin:apothecary",
  name: "Apothecary",
  category: "shop",
  description: "Healer's potions, antitoxins, and reagents.",
  rolls_per_use: 4,
  entries: [
    magic("potion-of-healing", "Potion of Healing", "Common", "50 gp", 5),
    magic("potion-of-greater-healing", "Potion of Greater Healing", "Uncommon", "150 gp", 2),
    eq("antitoxin-vial", "Antitoxin (vial)", "50 gp", 4),
    eq("healers-kit", "Healer's Kit", "5 gp", 4),
    eq("herbalism-kit", "Herbalism Kit", "5 gp", 3),
    eq("poisoners-kit", "Poisoner's Kit", "50 gp", 1),
    eq("alchemists-supplies", "Alchemist's Supplies", "50 gp", 2),
    text("Bundle of healing herbs", 3, { price: "1 gp" }),
    text("Vial of holy water", 2, { price: "25 gp" }),
    text("Dried Yew Berries (poison ingredient)", 1, { price: "10 gp" }),
  ],
};

// ── ADVENTURING GEAR STALL ───────────────────────────────────────────
const GEAR_STALL: BuiltInTable = {
  id: "builtin:gear-stall",
  name: "Adventuring Gear Stall",
  category: "shop",
  description: "Ropes, lanterns, packs — the practical kit every adventurer needs.",
  rolls_per_use: 6,
  entries: [
    eq("rope-hempen-50-feet", "Rope, hempen (50 ft)", "1 gp", 4),
    eq("rope-silk-50-feet", "Rope, silk (50 ft)", "10 gp", 2),
    eq("torch", "Torch", "1 cp", 5),
    eq("lantern-hooded", "Lantern, hooded", "5 gp", 3),
    eq("lantern-bullseye", "Lantern, bullseye", "10 gp", 2),
    eq("oil-flask", "Oil flask", "1 sp", 4),
    eq("tinderbox", "Tinderbox", "5 sp", 4),
    eq("bedroll", "Bedroll", "1 gp", 3),
    eq("blanket", "Blanket", "5 sp", 3),
    eq("rations-1-day", "Rations (1 day)", "5 sp", 5),
    eq("waterskin", "Waterskin", "2 sp", 4),
    eq("backpack", "Backpack", "2 gp", 3),
    eq("crowbar", "Crowbar", "2 gp", 2),
    eq("hammer", "Hammer", "1 gp", 2),
    eq("piton", "Piton", "5 cp", 3),
    eq("grappling-hook", "Grappling Hook", "2 gp", 2),
    eq("manacles", "Manacles", "2 gp", 1),
    eq("chain-10-feet", "Chain (10 ft)", "5 gp", 1),
    eq("explorers-pack", "Explorer's Pack", "10 gp", 2),
    eq("dungeoneers-pack", "Dungeoneer's Pack", "12 gp", 1),
  ],
};

// ── TRAVELLING MERCHANT ──────────────────────────────────────────────
const TRAVELLING_MERCHANT: BuiltInTable = {
  id: "builtin:travelling-merchant",
  name: "Travelling Merchant",
  category: "shop",
  description:
    "A pedlar's wagon — mostly mundane wares, the occasional curiosity, very rarely a real find.",
  rolls_per_use: 5,
  entries: [
    // Common goods
    eq("rations-1-day", "Rations (1 day)", "5 sp", 4),
    eq("rope-hempen-50-feet", "Rope, hempen (50 ft)", "1 gp", 3),
    eq("torch", "Torch", "1 cp", 5),
    eq("oil-flask", "Oil flask", "1 sp", 4),
    eq("ink-1-ounce-bottle", "Ink (1-ounce bottle)", "10 gp", 1),
    eq("parchment-one-sheet", "Parchment (1 sheet)", "1 sp", 3),
    eq("perfume-vial", "Perfume (vial)", "5 gp", 1),
    eq("spices-1-pound", "Spices (1 lb)", "2 gp", 2),
    eq("playing-card-set", "Playing cards", "5 sp", 2),
    eq("dice-set", "Dice set", "1 sp", 3),
    eq("musical-instrument-lute", "Lute", "35 gp", 1),
    eq("crystal", "Crystal (spellcasting focus)", "10 gp", 1),
    // Curiosities (text)
    text("A worn map to 'somewhere wet'", 2, { price: "5 gp" }),
    text("A stuffed owlbear claw on a leather thong", 2, { price: "8 gp" }),
    text("A small jar of dragon-scale dust (probably fish-scale dyed)", 1, {
      price: "25 gp",
    }),
    text("A weatherproof tinderbox of dwarven make", 2, { price: "15 gp" }),
    // Real finds (rare)
    magic("potion-of-healing", "Potion of Healing (last one)", "Common", "55 gp", 1),
    magic("driftglobe", "Driftglobe (cracked)", "Uncommon", "120 gp", 1),
  ],
};

// ── TAVERN MENU ──────────────────────────────────────────────────────
const TAVERN_MENU: BuiltInTable = {
  id: "builtin:tavern-menu",
  name: "Tavern Menu",
  category: "shop",
  description: "A roadside inn's daily offerings — food, drink, and dessert.",
  rolls_per_use: 6,
  entries: [
    text("Bowl of barley stew with bread", 5, { price: "5 sp" }),
    text("Roast chicken leg with potatoes", 4, { price: "8 sp" }),
    text("Shepherd's pie", 4, { price: "1 gp" }),
    text("Smoked sausage and onions", 4, { price: "7 sp" }),
    text("Fried river trout with greens", 3, { price: "1 gp" }),
    text("Boar ribs with honey glaze", 2, { price: "2 gp" }),
    text("Mutton & barley stew", 4, { price: "6 sp" }),
    text("Local ale (pint)", 6, { price: "4 cp" }),
    text("House red wine (mug)", 4, { price: "2 sp" }),
    text("Honey mead (cup)", 3, { price: "5 sp" }),
    text("Dwarven stout (pint)", 2, { price: "1 gp" }),
    text("Hot mulled cider", 3, { price: "5 cp" }),
    text("Berry crumble with cream", 3, { price: "3 sp" }),
    text("Sweet honey cake", 3, { price: "2 sp" }),
    text("Hard cheese & dried fruit board", 3, { price: "5 sp" }),
  ],
};

// ── NPC NAMES (HUMAN) ────────────────────────────────────────────────
const NPC_NAMES_HUMAN: BuiltInTable = {
  id: "builtin:npc-names-human",
  name: "Human Names",
  category: "npc",
  description: "Quick first names + epithets for human NPCs you forgot to prepare.",
  rolls_per_use: 1,
  entries: [
    text("Aldric the Steady"), text("Brenna Fairwind"), text("Cassian Vex"),
    text("Dara Moonsong"), text("Elias Thorne"), text("Fenwick Brassboot"),
    text("Garrick Ashfall"), text("Hilde Stoneward"), text("Ines the Quiet"),
    text("Jorah Blackbriar"), text("Kestrel Vane"), text("Lyra Wren"),
    text("Mathis Coldwater"), text("Nira Sundown"), text("Osric Greyveil"),
    text("Petra Saltwood"), text("Quill Marrow"), text("Rorik Hammerfall"),
    text("Selene Ashford"), text("Tobin Ironvale"), text("Una Lockhart"),
    text("Vance Brimwhistle"), text("Wren the Mute"), text("Yara Stormcrow"),
    text("Zane Dustblade"),
  ],
};

// ── WEATHER FLIPS ────────────────────────────────────────────────────
const WEATHER: BuiltInTable = {
  id: "builtin:weather",
  name: "Weather Flip",
  category: "weather",
  description: "Quick weather changes for travel between locations.",
  rolls_per_use: 1,
  entries: [
    text("Clear and calm", 6),
    text("Light overcast, pleasant temperature", 5),
    text("Patchy fog clears by midday", 3),
    text("Light rain showers all day", 4),
    text("Heavy rain — visibility halved", 2),
    text("Thunderstorm — disadvantage on Perception", 1),
    text("Strong winds — ranged attacks at disadvantage past 100 ft", 2),
    text("Sudden cold snap — exhaustion checks after 4h without warmth", 1),
    text("Unseasonable heatwave", 1),
    text("Light snow — tracks visible", 2),
    text("Heavy snow / blizzard — travel halved", 1),
    text("Eerie stillness — birds silent, animals hidden", 1),
  ],
};

// ── PLOT HOOKS ───────────────────────────────────────────────────────
const PLOT_HOOKS: BuiltInTable = {
  id: "builtin:plot-hooks",
  name: "Plot Hooks",
  category: "plot",
  description: "One-line adventure seeds when the party finishes a session early.",
  rolls_per_use: 1,
  entries: [
    text("A child has gone missing from the village — last seen near the old chapel."),
    text("A merchant offers double the gold to escort a sealed crate, no questions asked."),
    text("The town well has run black overnight, and the animals refuse to drink."),
    text("A noble's lost signet ring is rumoured to have surfaced in a thieves' den."),
    text("Strange lights have been seen above the abandoned tower three nights running."),
    text("A travelling priest begs for help recovering a holy relic stolen by bandits."),
    text("The local lord is hosting a tournament with a magical prize for the winner."),
    text("A retired adventurer wants their old loot recovered from the dungeon they sealed."),
    text("Crops are dying in only one farmer's field — and his neighbours are happy about it."),
    text("A talking raven follows the party and speaks in someone else's voice."),
    text("A masked stranger pays the tab and leaves a sealed letter on the table."),
    text("The lighthouse keeper hasn't lit the flame in three nights and ships are wrecking."),
  ],
};

export const BUILT_IN_TABLES: ReadonlyArray<BuiltInTable> = [
  BLACKSMITH,
  MAGIC_SHOP,
  APOTHECARY,
  GEAR_STALL,
  TRAVELLING_MERCHANT,
  TAVERN_MENU,
  NPC_NAMES_HUMAN,
  WEATHER,
  PLOT_HOOKS,
];

/** True if an id refers to a built-in (vs a UUID from the DB). */
export function isBuiltInTableId(id: string): boolean {
  return id.startsWith("builtin:");
}

/**
 * Pick `count` weighted entries from a built-in table — WITHOUT
 * replacement within the same roll, so "roll 5 items" on a shop
 * table never returns the same row twice. If `count` exceeds the
 * number of unique entries, the remainder is sampled again from the
 * full pool.
 */
export function rollBuiltIn(
  table: BuiltInTable,
  count?: number
): BuiltInTable["entries"][number][] {
  const entries = table.entries;
  if (entries.length === 0) return [];
  const n = Math.max(1, count ?? table.rolls_per_use);
  const out: BuiltInTable["entries"][number][] = [];
  let pool: BuiltInTable["entries"][number][] = [...entries];
  for (let i = 0; i < n; i++) {
    if (pool.length === 0) pool = [...entries]; // ran out, restart
    const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
    let pick = Math.random() * totalWeight;
    let idx = pool.length - 1;
    for (let j = 0; j < pool.length; j++) {
      pick -= pool[j].weight;
      if (pick <= 0) {
        idx = j;
        break;
      }
    }
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}
