"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dices,
  Copy,
  UtensilsCrossed,
  Store,
  Gem,
  Skull,
  BookOpen,
  Coins,
  Shield,
  Wand2,
  Wine,
  Beef,
  CakeSlice,
  Soup,
  Scroll,
  Sword,
  FlaskConical,
  Sparkles,
  Crown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface GeneratedItem {
  name: string;
  description?: string;
  price?: string;
  rarity?: string;
  category?: string;
  extra?: string;
}

interface GeneratedResult {
  title: string;
  subtitle: string;
  tier: string;
  items: GeneratedItem[];
  generatedAt: Date;
  flavor?: string;
}

type TierLevel = 1 | 2 | 3 | 4 | 5;

interface Generator {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tiers: Record<TierLevel, string>;
  generate: (tier: TierLevel) => GeneratedResult;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function pick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function goldPrice(base: number, variance: number = 0.3): string {
  const mult = 1 + (Math.random() - 0.5) * variance * 2;
  const price = Math.max(1, Math.round(base * mult));
  if (price >= 100) return `${price} gp`;
  if (price >= 10) return `${price} sp`;
  return `${price} cp`;
}

function copperToString(cp: number): string {
  if (cp >= 1000) return `${Math.round(cp / 100)} gp`;
  if (cp >= 100) return `${Math.round(cp / 10)} sp`;
  return `${cp} cp`;
}

// ─── DATA: Tavern Menu ──────────────────────────────────────────────

const TAVERN_NAMES_BY_TIER: Record<TierLevel, string[]> = {
  1: ["The Rat's Nest", "The Gutter Mug", "The Broken Barrel", "The Filthy Flagon", "The Pig's Snout"],
  2: ["The Copper Kettle", "The Wanderer's Rest", "The Tired Ox", "The Hearthside", "The Muddy Boot"],
  3: ["The Silver Stag", "The Laughing Bard", "The Golden Goose", "The Prancing Pony", "The Hearth & Hound"],
  4: ["The Gilded Lily", "The Velvet Chalice", "The Moonlit Mug", "The Crimson Crown", "The Sapphire Throne"],
  5: ["The Platinum Dragon", "The Celestial Banquet", "The Emperor's Feast", "The Arcanum Lounge", "The Astral Spire"],
};

const APPETIZERS: Record<TierLevel, { name: string; desc: string; basePrice: number }[]> = {
  1: [
    { name: "Mystery Broth", desc: "A thin, watery soup of questionable origin", basePrice: 1 },
    { name: "Stale Bread Crust", desc: "Hard as a rock, but edible if you dip it", basePrice: 1 },
    { name: "Pickled Egg", desc: "Sat in brine for... a while", basePrice: 2 },
    { name: "Boiled Turnips", desc: "Overcooked and underseasoned", basePrice: 1 },
  ],
  2: [
    { name: "Onion Soup", desc: "Simple but filling, served with a bread heel", basePrice: 3 },
    { name: "Cheese & Bread Board", desc: "Local cheese with day-old bread", basePrice: 4 },
    { name: "Roasted Mushrooms", desc: "Forest mushrooms with salt and herbs", basePrice: 3 },
    { name: "Potato Wedges", desc: "Crispy fried and salted", basePrice: 3 },
    { name: "Pickled Vegetables", desc: "A small jar of brined carrots and radishes", basePrice: 2 },
  ],
  3: [
    { name: "Herb-crusted Goat Cheese Crostini", desc: "Toasted bread with whipped goat cheese and fresh herbs", basePrice: 8 },
    { name: "Smoked Salmon Bites", desc: "Cold-smoked river salmon on rye with dill cream", basePrice: 10 },
    { name: "Wild Mushroom Tartlets", desc: "Flaky pastry filled with sautéed forest mushrooms", basePrice: 7 },
    { name: "Spiced Meat Skewers", desc: "Grilled lamb with cumin and paprika glaze", basePrice: 9 },
    { name: "Roasted Beet Salad", desc: "Golden beets with walnuts and honey vinaigrette", basePrice: 6 },
  ],
  4: [
    { name: "Seared Foie Gras", desc: "Pan-seared duck liver with fig compote", basePrice: 25 },
    { name: "Oysters on Ice", desc: "Half-dozen fresh oysters with mignonette", basePrice: 30 },
    { name: "Truffle Deviled Eggs", desc: "Free-range eggs with black truffle shavings", basePrice: 20 },
    { name: "Lobster Bisque", desc: "Creamy soup of Sword Coast lobster", basePrice: 22 },
    { name: "Carpaccio of Auroch", desc: "Paper-thin sliced rare auroch with capers", basePrice: 28 },
  ],
  5: [
    { name: "Dragon Turtle Consommé", desc: "Crystal-clear broth infused with rare sea herbs", basePrice: 80 },
    { name: "Phoenix Egg Soufflé", desc: "Light as air, faintly glowing, impossibly fluffy", basePrice: 150 },
    { name: "Astral Plum Tartare", desc: "Planar fruit with edible gold leaf and starlight glaze", basePrice: 120 },
    { name: "Beholder Eye Ceviche", desc: "A delicacy for the truly adventurous palate", basePrice: 200 },
    { name: "Fey-touched Ambrosia", desc: "Leaves a pleasant tingling on the tongue for hours", basePrice: 100 },
  ],
};

const MAINS: Record<TierLevel, { name: string; desc: string; basePrice: number }[]> = {
  1: [
    { name: "Rat-on-a-Stick", desc: "Charred rodent on a wooden skewer. Don't ask.", basePrice: 2 },
    { name: "Gruel", desc: "A grey, flavorless porridge. It's filling at least", basePrice: 1 },
    { name: "Boot Leather Stew", desc: "Tough mystery meat in a thin brown liquid", basePrice: 3 },
    { name: "Burnt Sausage", desc: "Blackened on the outside, raw on the inside", basePrice: 3 },
  ],
  2: [
    { name: "Shepherd's Pie", desc: "Ground meat and root vegetables under mashed potato", basePrice: 5 },
    { name: "Roast Chicken Leg", desc: "A whole leg with roasted potatoes and gravy", basePrice: 6 },
    { name: "Fish & Chips", desc: "Battered river trout with fried potato wedges", basePrice: 5 },
    { name: "Pork & Bean Stew", desc: "Hearty, thick stew with chunks of salted pork", basePrice: 4 },
    { name: "Meat Pie", desc: "Flaky crust filled with seasoned beef and onions", basePrice: 5 },
  ],
  3: [
    { name: "Braised Venison Shank", desc: "Slow-cooked in red wine with root vegetables", basePrice: 15 },
    { name: "Pan-seared Trout", desc: "River trout with lemon butter, capers, and almonds", basePrice: 12 },
    { name: "Herb-roasted Half Chicken", desc: "Free-range chicken with rosemary jus", basePrice: 11 },
    { name: "Wild Boar Ribs", desc: "Lacquered with honey-mustard glaze, fall-off-the-bone", basePrice: 14 },
    { name: "Mushroom & Barley Risotto", desc: "Creamy forest mushroom risotto with aged parmesan", basePrice: 10 },
  ],
  4: [
    { name: "Wagyu Auroch Steak", desc: "Perfectly marbled, cooked over dragonwood coals", basePrice: 50 },
    { name: "Whole Roasted Pheasant", desc: "Stuffed with chestnuts, apricots, and sage", basePrice: 40 },
    { name: "Swordfish au Poivre", desc: "Peppercorn-crusted with brandy cream sauce", basePrice: 45 },
    { name: "Rack of Lamb", desc: "Herb-crusted with mint gremolata and truffle mash", basePrice: 55 },
    { name: "Lobster Thermidor", desc: "Sword Coast lobster in cognac cream, gratinéed", basePrice: 60 },
  ],
  5: [
    { name: "Gold Dragon Filet", desc: "Impossibly tender filet aged in astral ice for a century", basePrice: 500 },
    { name: "Kraken Tentacle Steak", desc: "Grilled over elemental fire, served with void salt", basePrice: 400 },
    { name: "Roc Egg Omelette", desc: "Feeds four, cooked with saffron from Mount Celestia", basePrice: 300 },
    { name: "Tarrasque Carpaccio", desc: "Regenerating meat sliced infinitely thin. Yes, really.", basePrice: 1000 },
    { name: "Planar Feast Platter", desc: "A course from each Outer Plane, chosen by the chef", basePrice: 750 },
  ],
};

const DRINKS: Record<TierLevel, { name: string; desc: string; basePrice: number }[]> = {
  1: [
    { name: "Watered-down Ale", desc: "Mostly water with a hint of something fermented", basePrice: 1 },
    { name: "Swamp Wine", desc: "Tastes exactly like it sounds", basePrice: 1 },
    { name: "Gut-rot Whiskey", desc: "Burns going down, and coming back up", basePrice: 2 },
    { name: "Muddy Water", desc: "It's... technically drinkable", basePrice: 0 },
  ],
  2: [
    { name: "Local Ale", desc: "A decent amber ale from a nearby brewery", basePrice: 2 },
    { name: "House Red Wine", desc: "An acceptable table wine", basePrice: 3 },
    { name: "Honey Mead", desc: "Sweet and strong, a traveler's favorite", basePrice: 3 },
    { name: "Cider", desc: "Crisp apple cider from local orchards", basePrice: 2 },
    { name: "Herbal Tea", desc: "Chamomile and mint, soothing after a long day", basePrice: 1 },
  ],
  3: [
    { name: "Dwarven Stout", desc: "Rich, dark, and impossibly smooth", basePrice: 5 },
    { name: "Elven Moonwine", desc: "Pale silver wine with floral notes", basePrice: 8 },
    { name: "Imported Red", desc: "Full-bodied Amnian vintage", basePrice: 7 },
    { name: "Spiced Rum", desc: "Warm cinnamon and clove notes, served neat", basePrice: 5 },
    { name: "Mulled Wine", desc: "Warmed with star anise, cinnamon, and orange peel", basePrice: 4 },
    { name: "Cold Brew Coffee", desc: "Strong and bitter, keeps you alert on watch", basePrice: 3 },
  ],
  4: [
    { name: "Reserve Champagne", desc: "Sparkling wine from the Moonshae Isles", basePrice: 20 },
    { name: "50-Year Brandy", desc: "Smooth as silk with notes of caramel and oak", basePrice: 25 },
    { name: "Golden Mead Reserve", desc: "Aged in enchanted barrels, complex honey flavor", basePrice: 18 },
    { name: "Alchemist's Cocktail", desc: "Color-changing drink with layered fruit liqueurs", basePrice: 15 },
    { name: "Shadowdark Whiskey", desc: "From the Underdark. Dark, smoky, and very potent", basePrice: 22 },
  ],
  5: [
    { name: "Ambrosia of the Gods", desc: "Literally divine. Grants a warm glow for an hour", basePrice: 100 },
    { name: "Feywild Nectar", desc: "Shimmers with all colors. Mildly hallucinogenic", basePrice: 80 },
    { name: "Bottled Starlight", desc: "Distilled from actual starlight. Glows softly", basePrice: 150 },
    { name: "Temporal Bourbon", desc: "Aged 1,000 years using time magic", basePrice: 200 },
    { name: "Liquid Luck", desc: "Grant advantage on one ability check within 24h", basePrice: 500 },
  ],
};

const DESSERTS: Record<TierLevel, { name: string; desc: string; basePrice: number }[]> = {
  1: [
    { name: "Hard Biscuit", desc: "More of a jawbreaker than a treat", basePrice: 1 },
    { name: "Bruised Apple", desc: "The best of the barrel", basePrice: 1 },
  ],
  2: [
    { name: "Berry Crumble", desc: "Mixed berries under a buttery oat topping", basePrice: 3 },
    { name: "Rice Pudding", desc: "Creamy and dusted with cinnamon", basePrice: 2 },
    { name: "Honeycake", desc: "Dense, sweet, and served with cream", basePrice: 3 },
  ],
  3: [
    { name: "Chocolate Torte", desc: "Rich dark chocolate with raspberry coulis", basePrice: 8 },
    { name: "Crème Brûlée", desc: "Creamy custard with a caramelized sugar crust", basePrice: 7 },
    { name: "Apple Tart Tatin", desc: "Caramelized apple upside-down tart with cream", basePrice: 6 },
    { name: "Cheese Board", desc: "Aged cheeses with honeycomb and dried fruits", basePrice: 9 },
  ],
  4: [
    { name: "Grand Soufflé", desc: "Chocolate soufflé with gold leaf and crème anglaise", basePrice: 18 },
    { name: "Flambe Crêpes", desc: "Set ablaze tableside with Grand Marnier", basePrice: 20 },
    { name: "Artisan Gelato Flight", desc: "Five exotic flavors: saffron, lavender, truffle, rose, espresso", basePrice: 15 },
  ],
  5: [
    { name: "Celestial Parfait", desc: "Layers of planar fruits and divine cream, softly glowing", basePrice: 80 },
    { name: "Wish Cake", desc: "Make a wish before each bite. It might come true. (1% chance)", basePrice: 250 },
    { name: "Elemental Ice Sculpture", desc: "Edible ice cream in impossible fractal shapes", basePrice: 120 },
  ],
};

const TAVERN_FLAVORS: Record<TierLevel, string[]> = {
  1: [
    "The floor is sticky. The barkeep has an eye patch and doesn't make eye contact.",
    "A rat scurries across the bar. Nobody bats an eye.",
    "The 'menu' is a piece of charcoal scrawled on a plank of wood.",
  ],
  2: [
    "A warm fire crackles in the hearth. The smell of baking bread fills the air.",
    "A bard plays softly in the corner, missing every third note.",
    "The tables are rough-hewn but clean. A cat sleeps on the windowsill.",
  ],
  3: [
    "Polished wooden panels line the walls. A chandelier of antlers hangs overhead.",
    "The menu is hand-lettered on fine parchment with elegant calligraphy.",
    "A sommelier approaches your table with a knowing smile.",
  ],
  4: [
    "Crystal chandeliers cast prismatic light. The silverware is actual silver.",
    "Each table has its own privacy enchantment. Sound dampening runes glow faintly in the floor.",
    "A string quartet of enchanted instruments plays themselves in the corner.",
  ],
  5: [
    "The dining hall exists in a pocket dimension. Stars drift past the windows.",
    "Your chair adjusts itself to perfect comfort. The menu reads your mind and rearranges to your preferences.",
    "The head chef is an archmage. Each dish is a minor magical experience.",
  ],
};

// ─── DATA: Magic Shop ───────────────────────────────────────────────

const SHOP_NAMES: Record<TierLevel, string[]> = {
  1: ["Odd Bits & Bobs", "The Junk Wizard's Cart", "Barely Magical Surplus", "Hedge Witch's Hut"],
  2: ["The Arcane Emporium", "Scrolls & Sundries", "The Enchanted Shelf", "Potion Peddler's"],
  3: ["The Mystic Vault", "Arcanum Trading Co.", "The Enchanter's Hall", "Silverweave Imports"],
  4: ["The Grand Arcanum", "House of Wonders", "The Planar Bazaar", "Elminster's Chosen"],
  5: ["The Celestial Armory", "Artifacts of Legend", "The Astral Exchange", "Mystra's Treasury"],
};

interface ShopItemDef {
  name: string;
  desc: string;
  rarity: string;
  basePrice: number;
  category: string;
}

const SHOP_POTIONS: Record<TierLevel, ShopItemDef[]> = {
  1: [
    { name: "Potion of Mild Courage", desc: "Suppresses fear for 10 minutes. Tastes like warm milk.", rarity: "Common", basePrice: 25, category: "Potion" },
    { name: "Salve of Minor Healing", desc: "Heals 1d4 HP when applied to a wound", rarity: "Common", basePrice: 15, category: "Potion" },
    { name: "Bottle of Fizzy Water", desc: "Carbonated. May or may not be magical.", rarity: "Common", basePrice: 5, category: "Potion" },
    { name: "Insomnia Tea", desc: "Keeps you awake for 8 hours. Jitters included.", rarity: "Common", basePrice: 10, category: "Potion" },
  ],
  2: [
    { name: "Potion of Healing", desc: "Restores 2d4+2 hit points", rarity: "Common", basePrice: 50, category: "Potion" },
    { name: "Potion of Climbing", desc: "Gain climbing speed for 1 hour", rarity: "Common", basePrice: 75, category: "Potion" },
    { name: "Antitoxin", desc: "Advantage on saves vs. poison for 1 hour", rarity: "Common", basePrice: 50, category: "Potion" },
    { name: "Oil of Slipperiness", desc: "Coat a surface or creature for 8 hours", rarity: "Uncommon", basePrice: 100, category: "Potion" },
    { name: "Philter of Love", desc: "Charmed by next creature seen for 1 hour", rarity: "Uncommon", basePrice: 90, category: "Potion" },
  ],
  3: [
    { name: "Potion of Greater Healing", desc: "Restores 4d4+4 hit points", rarity: "Uncommon", basePrice: 150, category: "Potion" },
    { name: "Potion of Fire Resistance", desc: "Resistance to fire damage for 1 hour", rarity: "Uncommon", basePrice: 200, category: "Potion" },
    { name: "Potion of Water Breathing", desc: "Breathe underwater for 1 hour", rarity: "Uncommon", basePrice: 180, category: "Potion" },
    { name: "Potion of Heroism", desc: "10 temp HP and Bless for 1 hour", rarity: "Rare", basePrice: 300, category: "Potion" },
    { name: "Elixir of Health", desc: "Cures all diseases and conditions", rarity: "Rare", basePrice: 350, category: "Potion" },
  ],
  4: [
    { name: "Potion of Superior Healing", desc: "Restores 8d4+8 hit points", rarity: "Rare", basePrice: 500, category: "Potion" },
    { name: "Potion of Invisibility", desc: "Invisible for 1 hour or until you attack", rarity: "Very Rare", basePrice: 1000, category: "Potion" },
    { name: "Potion of Flying", desc: "Flying speed of 60 ft for 1 hour", rarity: "Very Rare", basePrice: 1200, category: "Potion" },
    { name: "Potion of Speed", desc: "Haste for 1 minute, no concentration", rarity: "Very Rare", basePrice: 1500, category: "Potion" },
  ],
  5: [
    { name: "Potion of Supreme Healing", desc: "Restores 10d4+20 hit points", rarity: "Very Rare", basePrice: 2500, category: "Potion" },
    { name: "Potion of Storm Giant Strength", desc: "STR becomes 29 for 1 hour", rarity: "Legendary", basePrice: 5000, category: "Potion" },
    { name: "Potion of Longevity", desc: "Reduces age by 1d6+6 years", rarity: "Very Rare", basePrice: 4000, category: "Potion" },
  ],
};

const SHOP_SCROLLS: Record<TierLevel, ShopItemDef[]> = {
  1: [
    { name: "Scroll of Prestidigitation", desc: "Cantrip - minor magical tricks", rarity: "Common", basePrice: 15, category: "Scroll" },
    { name: "Scroll of Mending", desc: "Cantrip - repairs a single break", rarity: "Common", basePrice: 15, category: "Scroll" },
    { name: "Scroll of Light", desc: "Cantrip - creates bright light for 1 hour", rarity: "Common", basePrice: 15, category: "Scroll" },
  ],
  2: [
    { name: "Scroll of Shield", desc: "1st level - +5 AC as reaction", rarity: "Common", basePrice: 50, category: "Scroll" },
    { name: "Scroll of Cure Wounds", desc: "1st level - heals 1d8+mod", rarity: "Common", basePrice: 50, category: "Scroll" },
    { name: "Scroll of Detect Magic", desc: "1st level - sense magic within 30 ft", rarity: "Common", basePrice: 50, category: "Scroll" },
    { name: "Scroll of Identify", desc: "1st level - learn item properties", rarity: "Common", basePrice: 50, category: "Scroll" },
  ],
  3: [
    { name: "Scroll of Fireball", desc: "3rd level - 8d6 fire in 20ft sphere", rarity: "Uncommon", basePrice: 200, category: "Scroll" },
    { name: "Scroll of Counterspell", desc: "3rd level - negate a spell", rarity: "Uncommon", basePrice: 200, category: "Scroll" },
    { name: "Scroll of Revivify", desc: "3rd level - return the dead to life", rarity: "Uncommon", basePrice: 300, category: "Scroll" },
    { name: "Scroll of Fly", desc: "3rd level - grants flight for 10 min", rarity: "Uncommon", basePrice: 200, category: "Scroll" },
  ],
  4: [
    { name: "Scroll of Polymorph", desc: "4th level - transform a creature", rarity: "Rare", basePrice: 500, category: "Scroll" },
    { name: "Scroll of Greater Invisibility", desc: "4th level - invisible even while attacking", rarity: "Rare", basePrice: 500, category: "Scroll" },
    { name: "Scroll of Wall of Force", desc: "5th level - impenetrable barrier", rarity: "Rare", basePrice: 750, category: "Scroll" },
    { name: "Scroll of Teleportation Circle", desc: "5th level - create a teleportation circle", rarity: "Rare", basePrice: 750, category: "Scroll" },
  ],
  5: [
    { name: "Scroll of True Resurrection", desc: "9th level - raise the dead completely", rarity: "Legendary", basePrice: 10000, category: "Scroll" },
    { name: "Scroll of Wish", desc: "9th level - the ultimate spell", rarity: "Legendary", basePrice: 50000, category: "Scroll" },
    { name: "Scroll of Gate", desc: "9th level - open a portal to another plane", rarity: "Legendary", basePrice: 15000, category: "Scroll" },
  ],
};

const SHOP_GEAR: Record<TierLevel, ShopItemDef[]> = {
  1: [
    { name: "Driftglobe (cracked)", desc: "Casts Light when shaken. 50% chance it works.", rarity: "Common", basePrice: 20, category: "Wondrous" },
    { name: "Cloak of Billowing", desc: "Dramatically billows on command. No mechanical benefit.", rarity: "Common", basePrice: 25, category: "Wondrous" },
    { name: "Mystery Key", desc: "Opens... something. Somewhere. Probably.", rarity: "Common", basePrice: 10, category: "Wondrous" },
    { name: "Hat of Vermin", desc: "Pull a bat, frog, or rat from the hat 3/day", rarity: "Common", basePrice: 30, category: "Wondrous" },
  ],
  2: [
    { name: "Bag of Holding", desc: "Extradimensional space, holds 500 lbs", rarity: "Uncommon", basePrice: 200, category: "Wondrous" },
    { name: "Goggles of Night", desc: "Darkvision 60 ft while worn", rarity: "Uncommon", basePrice: 150, category: "Wondrous" },
    { name: "Boots of Elvenkind", desc: "Advantage on Stealth checks", rarity: "Uncommon", basePrice: 250, category: "Wondrous" },
    { name: "Cloak of Protection", desc: "+1 to AC and saving throws", rarity: "Uncommon", basePrice: 350, category: "Wondrous" },
    { name: "+1 Weapon (various)", desc: "+1 to attack and damage rolls", rarity: "Uncommon", basePrice: 300, category: "Weapon" },
    { name: "+1 Shield", desc: "+1 AC on top of normal shield bonus", rarity: "Uncommon", basePrice: 250, category: "Armor" },
  ],
  3: [
    { name: "Flame Tongue Sword", desc: "Bonus 2d6 fire damage when ignited", rarity: "Rare", basePrice: 1000, category: "Weapon" },
    { name: "Cloak of Displacement", desc: "Attackers have disadvantage against you", rarity: "Rare", basePrice: 1200, category: "Wondrous" },
    { name: "Amulet of Health", desc: "Constitution becomes 19", rarity: "Rare", basePrice: 1500, category: "Wondrous" },
    { name: "Ring of Protection", desc: "+1 to AC and saving throws", rarity: "Rare", basePrice: 1000, category: "Wondrous" },
    { name: "Winged Boots", desc: "Fly for 4 hours per day", rarity: "Rare", basePrice: 1200, category: "Wondrous" },
    { name: "+2 Weapon (various)", desc: "+2 to attack and damage rolls", rarity: "Rare", basePrice: 2000, category: "Weapon" },
  ],
  4: [
    { name: "Staff of Power", desc: "+2 attacks, multiple spells, retributive strike", rarity: "Very Rare", basePrice: 8000, category: "Weapon" },
    { name: "Cloak of Invisibility", desc: "Invisible while wearing the hood", rarity: "Legendary", basePrice: 10000, category: "Wondrous" },
    { name: "Belt of Giant Strength (Fire)", desc: "STR becomes 25", rarity: "Very Rare", basePrice: 6000, category: "Wondrous" },
    { name: "Robe of the Archmagi", desc: "+2 AC, advantage on saves vs spells, +2 spell DC", rarity: "Legendary", basePrice: 12000, category: "Wondrous" },
    { name: "+3 Weapon (various)", desc: "+3 to attack and damage rolls", rarity: "Very Rare", basePrice: 5000, category: "Weapon" },
  ],
  5: [
    { name: "Vorpal Sword", desc: "Crits sever heads", rarity: "Legendary", basePrice: 25000, category: "Weapon" },
    { name: "Tome of Clear Thought", desc: "Permanently increase INT by 2", rarity: "Very Rare", basePrice: 30000, category: "Wondrous" },
    { name: "Deck of Many Things", desc: "Draw cards, change your fate. Or end it.", rarity: "Legendary", basePrice: 50000, category: "Wondrous" },
    { name: "Ring of Three Wishes", desc: "Three castings of the Wish spell", rarity: "Legendary", basePrice: 75000, category: "Wondrous" },
    { name: "Apparatus of Kwalish", desc: "A mechanical lobster submarine. Yes, really.", rarity: "Legendary", basePrice: 20000, category: "Wondrous" },
  ],
};

const SHOP_FLAVORS: Record<TierLevel, string[]> = {
  1: ["A rickety cart with a moth-eaten curtain. The vendor has three teeth and a twitch.", "A blanket on the ground displaying questionable wares. 'All sales final, no refunds. My word is my bond. Sort of.'"],
  2: ["A tidy shop with organized shelves. Faint arcane humming from the back room.", "The shopkeeper polishes a crystal while eyeing you over half-moon spectacles."],
  3: ["Enchanted display cases protect each item. An unseen servant offers you tea.", "Rune-warded shelves glow softly. A trained pseudodragon acts as shop guardian."],
  4: ["The shop exists in a demiplane accessible through an unassuming door. Inside, it's twice the size.", "Each item hovers on a column of light with a plaque describing its history and provenance."],
  5: ["The shopkeeper is a retired lich who 'found a better hobby.' Inventory from across the planes.", "Time moves differently here. You could browse for a year and only minutes pass outside."],
};

// ─── DATA: Treasure Hoard ───────────────────────────────────────────

const GEMS: Record<TierLevel, { name: string; value: number }[]> = {
  1: [
    { name: "Azurite", value: 10 }, { name: "Banded Agate", value: 10 }, { name: "Blue Quartz", value: 10 }, { name: "Moss Agate", value: 10 },
  ],
  2: [
    { name: "Bloodstone", value: 50 }, { name: "Carnelian", value: 50 }, { name: "Moonstone", value: 50 }, { name: "Onyx", value: 50 }, { name: "Star Rose Quartz", value: 50 },
  ],
  3: [
    { name: "Alexandrite", value: 500 }, { name: "Aquamarine", value: 500 }, { name: "Black Pearl", value: 500 }, { name: "Garnet", value: 500 },
  ],
  4: [
    { name: "Black Opal", value: 1000 }, { name: "Blue Sapphire", value: 1000 }, { name: "Emerald", value: 1000 }, { name: "Fire Opal", value: 1000 }, { name: "Star Ruby", value: 5000 },
  ],
  5: [
    { name: "Flawless Diamond", value: 5000 }, { name: "Jacinth", value: 5000 }, { name: "Ruby of the War Mage", value: 5000 }, { name: "Star Sapphire", value: 5000 },
  ],
};

const ART_OBJECTS: Record<TierLevel, { name: string; value: number }[]> = {
  1: [
    { name: "Silver ewer", value: 25 }, { name: "Carved bone statuette", value: 25 }, { name: "Gold locket with portrait", value: 25 },
  ],
  2: [
    { name: "Gold ring with bloodstone", value: 250 }, { name: "Silk robe with gold embroidery", value: 250 }, { name: "Carved jade figurine", value: 250 },
  ],
  3: [
    { name: "Jeweled gold crown", value: 2500 }, { name: "Platinum bracelet with sapphire", value: 2500 }, { name: "Painting by a master artist", value: 2500 },
  ],
  4: [
    { name: "Gold dragon figurine with ruby eyes", value: 7500 }, { name: "Mithral-thread tapestry", value: 7500 }, { name: "Adamantine chess set", value: 7500 },
  ],
  5: [
    { name: "Celestial-forged scepter", value: 25000 }, { name: "Crown of a fallen empire", value: 25000 }, { name: "Eye of a dead god (crystallized)", value: 25000 },
  ],
};

// ─── Generator Definitions ──────────────────────────────────────────

function createTavernGenerator(): Generator {
  return {
    id: "tavern-menu",
    name: "Tavern Menu",
    description: "Generate a full tavern menu with food, drinks, and desserts",
    icon: UtensilsCrossed,
    tiers: { 1: "Squalid Dive", 2: "Modest Inn", 3: "Comfortable Tavern", 4: "Wealthy Establishment", 5: "Legendary Feast Hall" },
    generate(tier: TierLevel): GeneratedResult {
      const tavernName = pickOne(TAVERN_NAMES_BY_TIER[tier]);
      const appetizers = pick(APPETIZERS[tier], tier <= 2 ? 2 : 3);
      const mains = pick(MAINS[tier], tier <= 2 ? 3 : 4);
      const drinks = pick(DRINKS[tier], tier <= 2 ? 3 : 4);
      const desserts = pick(DESSERTS[tier], tier <= 2 ? 1 : 2);

      const items: GeneratedItem[] = [
        ...appetizers.map(a => ({ name: a.name, description: a.desc, price: copperToString(a.basePrice * 10), category: "🥣 Appetizer" })),
        ...mains.map(m => ({ name: m.name, description: m.desc, price: copperToString(m.basePrice * 10), category: "🍖 Main Course" })),
        ...desserts.map(d => ({ name: d.name, description: d.desc, price: copperToString(d.basePrice * 10), category: "🍰 Dessert" })),
        ...drinks.map(d => ({ name: d.name, description: d.desc, price: copperToString(d.basePrice * 10), category: "🍺 Drinks" })),
      ];

      return {
        title: tavernName,
        subtitle: `${this.tiers[tier]} — Menu`,
        tier: this.tiers[tier],
        items,
        generatedAt: new Date(),
        flavor: pickOne(TAVERN_FLAVORS[tier]),
      };
    },
  };
}

function createMagicShopGenerator(): Generator {
  return {
    id: "magic-shop",
    name: "Magic Shop",
    description: "Generate a magic shop inventory with potions, scrolls, and gear",
    icon: Wand2,
    tiers: { 1: "Hedge Wizard's Cart", 2: "Village Enchanter", 3: "City Arcanum", 4: "Grand Emporium", 5: "Legendary Artificer" },
    generate(tier: TierLevel): GeneratedResult {
      const shopName = pickOne(SHOP_NAMES[tier]);
      const potions = pick(SHOP_POTIONS[tier], tier <= 2 ? 2 : 3);
      const scrolls = pick(SHOP_SCROLLS[tier], tier <= 2 ? 2 : 3);
      const gear = pick(SHOP_GEAR[tier], tier <= 2 ? 2 : tier <= 3 ? 3 : 4);

      const allItems = [...potions, ...scrolls, ...gear];
      const items: GeneratedItem[] = allItems.map(item => ({
        name: item.name,
        description: item.desc,
        price: `${item.basePrice} gp`,
        rarity: item.rarity,
        category: item.category === "Potion" ? "🧪 Potions" : item.category === "Scroll" ? "📜 Scrolls" : item.category === "Weapon" ? "⚔️ Weapons" : item.category === "Armor" ? "🛡️ Armor" : "✨ Wondrous Items",
      }));

      // Sort by category
      items.sort((a, b) => (a.category || "").localeCompare(b.category || ""));

      return {
        title: shopName,
        subtitle: `${this.tiers[tier]} — Inventory`,
        tier: this.tiers[tier],
        items,
        generatedAt: new Date(),
        flavor: pickOne(SHOP_FLAVORS[tier]),
      };
    },
  };
}

function createTreasureHoardGenerator(): Generator {
  return {
    id: "treasure-hoard",
    name: "Treasure Hoard",
    description: "Generate a treasure hoard with coins, gems, and art objects",
    icon: Gem,
    tiers: { 1: "CR 0–4 Hoard", 2: "CR 5–10 Hoard", 3: "CR 11–16 Hoard", 4: "CR 17–20 Hoard", 5: "Legendary Hoard" },
    generate(tier: TierLevel): GeneratedResult {
      const coinMultiplier = [1, 5, 25, 100, 500][tier - 1];
      const items: GeneratedItem[] = [];

      // Coins
      const copper = Math.floor(Math.random() * 600 * coinMultiplier);
      const silver = Math.floor(Math.random() * 300 * coinMultiplier);
      const gold = Math.floor(Math.random() * 100 * coinMultiplier);
      const platinum = tier >= 3 ? Math.floor(Math.random() * 20 * coinMultiplier) : 0;

      const coinParts: string[] = [];
      if (copper > 0) coinParts.push(`${copper.toLocaleString()} cp`);
      if (silver > 0) coinParts.push(`${silver.toLocaleString()} sp`);
      if (gold > 0) coinParts.push(`${gold.toLocaleString()} gp`);
      if (platinum > 0) coinParts.push(`${platinum.toLocaleString()} pp`);

      items.push({
        name: "Coins",
        description: coinParts.join(", "),
        category: "💰 Currency",
      });

      // Gems
      const gemCount = Math.max(1, Math.floor(Math.random() * (tier + 2)));
      const gems = pick(GEMS[tier], gemCount);
      gems.forEach(gem => {
        items.push({
          name: gem.name,
          description: `Gemstone worth ${gem.value} gp`,
          price: `${gem.value} gp`,
          category: "💎 Gems",
        });
      });

      // Art objects
      if (tier >= 2) {
        const artCount = Math.max(1, Math.floor(Math.random() * tier));
        const art = pick(ART_OBJECTS[tier], artCount);
        art.forEach(a => {
          items.push({
            name: a.name,
            description: `Art object worth ${a.value.toLocaleString()} gp`,
            price: `${a.value.toLocaleString()} gp`,
            category: "🎨 Art Objects",
          });
        });
      }

      // Magic items at higher tiers
      if (tier >= 3) {
        const magicItems = pick(SHOP_GEAR[tier], Math.min(tier - 1, 3));
        magicItems.forEach(item => {
          items.push({
            name: item.name,
            description: item.desc,
            rarity: item.rarity,
            category: "✨ Magic Items",
          });
        });
      }

      const totalValue = (copper / 100 + silver / 10 + gold + platinum * 10 +
        gems.reduce((s, g) => s + g.value, 0)).toLocaleString();

      return {
        title: `Treasure Hoard`,
        subtitle: `${this.tiers[tier]} — Est. ${totalValue} gp total`,
        tier: this.tiers[tier],
        items,
        generatedAt: new Date(),
        flavor: tier >= 4
          ? "The hoard glitters with an almost supernatural brilliance. Ancient magic lingers in the air."
          : tier >= 2
          ? "A respectable collection of wealth, carefully accumulated over years."
          : "A modest pile of valuables, but treasure nonetheless.",
      };
    },
  };
}

// ─── All Generators ─────────────────────────────────────────────────

const GENERATORS: Generator[] = [
  createTavernGenerator(),
  createMagicShopGenerator(),
  createTreasureHoardGenerator(),
];

// ─── Rarity colors ──────────────────────────────────────────────────

const RARITY_COLORS: Record<string, string> = {
  Common: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  Uncommon: "bg-green-500/20 text-green-300 border-green-500/30",
  Rare: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Very Rare": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Legendary: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  Artifact: "bg-red-500/20 text-red-300 border-red-500/30",
};

// ─── Component ───────────────────────────────────────────────────────

interface RandomTablesTabProps {
  campaignId: string;
  isDm: boolean;
}

export function RandomTablesTab({ campaignId, isDm }: RandomTablesTabProps) {
  const [selectedGeneratorId, setSelectedGeneratorId] = useState<string>(GENERATORS[0].id);
  const [tier, setTier] = useState<TierLevel>(3);
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const generator = useMemo(() => GENERATORS.find(g => g.id === selectedGeneratorId)!, [selectedGeneratorId]);

  const handleGenerate = useCallback(() => {
    setIsRolling(true);
    setTimeout(() => {
      const gen = GENERATORS.find(g => g.id === selectedGeneratorId)!;
      const newResult = gen.generate(tier);
      setResult(newResult);
      setExpandedCategories(new Set()); // Reset expansions
      setIsRolling(false);
    }, 500);
  }, [selectedGeneratorId, tier]);

  const copyAllToClipboard = useCallback(() => {
    if (!result) return;
    let text = `# ${result.title}\n_${result.subtitle}_\n\n`;
    if (result.flavor) text += `> ${result.flavor}\n\n`;
    
    let currentCat = "";
    result.items.forEach(item => {
      if (item.category && item.category !== currentCat) {
        currentCat = item.category!;
        text += `\n## ${currentCat}\n`;
      }
      text += `- **${item.name}**`;
      if (item.price) text += ` — ${item.price}`;
      if (item.rarity) text += ` [${item.rarity}]`;
      text += `\n`;
      if (item.description) text += `  _${item.description}_\n`;
    });

    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard as markdown");
  }, [result]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    if (!result) return [];
    const groups: { category: string; items: GeneratedItem[] }[] = [];
    let currentCat = "";
    result.items.forEach(item => {
      const cat = item.category || "Other";
      if (cat !== currentCat) {
        currentCat = cat;
        groups.push({ category: cat, items: [] });
      }
      groups[groups.length - 1].items.push(item);
    });
    return groups;
  }, [result]);

  return (
    <div
      style={{
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Header */}
      <div>
        <div
          className="font-serif"
          style={{
            fontSize: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Dices size={18} style={{ color: "var(--primary)" }} />
          Random Generators
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--muted-foreground)",
            marginTop: 2,
          }}
        >
          Roll tavern menus, shop inventories, treasure hoards, and more
        </div>
      </div>

      {/* Generator Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GENERATORS.map(gen => {
          const Icon = gen.icon;
          const isSelected = gen.id === selectedGeneratorId;
          return (
            <button
              key={gen.id}
              onClick={() => {
                setSelectedGeneratorId(gen.id);
                setResult(null);
              }}
              className={cn(
                "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                "hover:shadow-md hover:border-primary/40",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:bg-accent/30"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                isSelected ? "bg-primary/20" : "bg-muted"
              )}>
                <Icon className={cn("h-5 w-5", isSelected ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{gen.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{gen.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tier Selection + Generate */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            {/* Tier Slider */}
            <div className="flex-1 w-full space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Quality / Power Tier</Label>
                <Badge variant="outline" className="font-mono">
                  {generator.tiers[tier]}
                </Badge>
              </div>
              <Slider
                value={[tier]}
                onValueChange={([v]) => setTier(v as TierLevel)}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground px-1">
                <span>Squalid</span>
                <span>Modest</span>
                <span>Comfortable</span>
                <span>Wealthy</span>
                <span>Legendary</span>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              size="lg"
              className={cn(
                "gap-2 px-8 font-semibold shrink-0 min-w-[160px]",
                isRolling && "animate-pulse"
              )}
              onClick={handleGenerate}
              disabled={isRolling}
            >
              <Dices className={cn("h-5 w-5", isRolling && "animate-spin")} />
              {isRolling ? "Generating..." : "Generate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result Display */}
      {result && (
        <Card className="overflow-hidden">
          {/* Header bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <CardContent className="p-6">
            {/* Title + Copy */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl font-bold">{result.title}</h3>
                <p className="text-sm text-muted-foreground">{result.subtitle}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={copyAllToClipboard}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy All
              </Button>
            </div>

            {/* Flavor text */}
            {result.flavor && (
              <div className="mb-6 px-4 py-3 bg-muted/50 rounded-lg border border-border/50 italic text-sm text-muted-foreground">
                &ldquo;{result.flavor}&rdquo;
              </div>
            )}

            {/* Items grouped by category */}
            <div className="space-y-4">
              {groupedItems.map(group => (
                <div key={group.category}>
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(group.category)}
                    className="flex items-center gap-2 w-full text-left mb-2 group"
                  >
                    {expandedCategories.has(group.category) ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <h4 className="font-semibold text-sm">{group.category}</h4>
                    <span className="text-xs text-muted-foreground">({group.items.length})</span>
                    <div className="flex-1 border-b border-border/50 ml-2" />
                  </button>

                  {/* Items */}
                  {!expandedCategories.has(group.category) && (
                    <div className="space-y-1.5 ml-5">
                      {group.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors group/item"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{item.name}</span>
                              {item.rarity && (
                                <span className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded-full border font-medium",
                                  RARITY_COLORS[item.rarity] || "bg-muted text-muted-foreground"
                                )}>
                                  {item.rarity}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 italic">{item.description}</p>
                            )}
                          </div>
                          {item.price && (
                            <span className="text-sm font-mono font-semibold text-primary shrink-0">
                              {item.price}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Small Label helper to avoid needing to import in this file
function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props} />;
}
