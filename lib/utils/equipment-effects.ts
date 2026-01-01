// Utility functions for calculating equipment effects on character stats

import { getAbilityModifier } from "./character";
import type { SrdEquipment, HomebrewEquipment } from "@/hooks/useDndContent";

export interface EnrichedInventoryItem {
  id: string;
  name: string;
  source: "srd" | "homebrew";
  quantity: number;
  equipped: boolean;
  attuned: boolean;
  notes?: string;
  equipmentData?: SrdEquipment | HomebrewEquipment;
}

export interface EquipmentEffects {
  armorClass: number;
  stealthDisadvantage: boolean;
  speedModifier: number;
  strengthRequirements: Array<{
    item: string;
    required: number;
    current: number;
    met: boolean;
  }>;
  abilityScoreBonuses: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  acBonus: number; // Additional AC from magic items
  weaponProperties: string[];
  acBreakdown?: {
    base: number;
    armor?: { name: string; ac: number };
    shield?: { name: string; ac: number };
    dexModifier?: number;
    magicBonus?: number;
  };
}

/**
 * Calculate Armor Class from equipped items
 * Handles light, medium, heavy armor, shields, and magic bonuses
 */
export function calculateArmorClass(
  equippedItems: EnrichedInventoryItem[],
  dexterity: number,
  baseAC: number = 10,
  magicACBonus: number = 0
): { ac: number; breakdown: EquipmentEffects["acBreakdown"] } {
  const armor = equippedItems.find(
    (item) =>
      item.equipped &&
      item.equipmentData?.armor_category &&
      item.equipmentData.armor_category !== "Shield"
  );
  const shield = equippedItems.find(
    (item) =>
      item.equipped && item.equipmentData?.armor_category === "Shield"
  );

  let ac = baseAC;
  const breakdown: EquipmentEffects["acBreakdown"] = { base: baseAC };

  if (armor?.equipmentData?.armor_class) {
    const acData = armor.equipmentData.armor_class;
    let armorAC = baseAC;

    if (typeof acData === "number") {
      armorAC = acData;
      ac = armorAC;
    } else if (typeof acData === "object" && acData !== null) {
      const base = (acData as any).base || 10;
      armorAC = base;
      ac = base;

      if ((acData as any).dex_bonus) {
        const dexMod = getAbilityModifier(dexterity);
        const maxBonus = (acData as any).max_bonus ?? Infinity;
        const appliedDexMod = Math.min(dexMod, maxBonus);
        armorAC += appliedDexMod;
        ac += appliedDexMod;
        breakdown.dexModifier = appliedDexMod;
      }
    }

    breakdown.armor = {
      name: armor.name,
      ac: armorAC,
    };
  }

  if (shield?.equipmentData) {
    ac += 2; // Shield always adds +2 AC
    breakdown.shield = {
      name: shield.name,
      ac: 2,
    };
  }

  // Add magic AC bonus
  if (magicACBonus > 0) {
    ac += magicACBonus;
    breakdown.magicBonus = magicACBonus;
  }

  return { ac, breakdown };
}

/**
 * Check if any equipped armor causes stealth disadvantage
 */
export function getStealthDisadvantage(
  equippedItems: EnrichedInventoryItem[]
): boolean {
  return equippedItems.some(
    (item) =>
      item.equipped && item.equipmentData?.stealth_disadvantage === true
  );
}

/**
 * Get strength requirements for equipped items
 */
export function getStrengthRequirements(
  equippedItems: EnrichedInventoryItem[],
  characterStrength: number
): Array<{
  item: string;
  required: number;
  current: number;
  met: boolean;
}> {
  const requirements: Array<{
    item: string;
    required: number;
    current: number;
    met: boolean;
  }> = [];

  equippedItems.forEach((item) => {
    if (item.equipped && item.equipmentData?.str_minimum) {
      const required = item.equipmentData.str_minimum;
      requirements.push({
        item: item.name,
        required,
        current: characterStrength,
        met: characterStrength >= required,
      });
    }
  });

  return requirements;
}

/**
 * Calculate speed modifiers from equipped armor
 * Heavy armor without meeting strength requirement: -10 feet
 */
export function getSpeedModifiers(
  equippedItems: EnrichedInventoryItem[],
  baseSpeed: number,
  characterStrength: number
): number {
  const heavyArmor = equippedItems.find(
    (item) =>
      item.equipped &&
      item.equipmentData?.armor_category === "Heavy"
  );

  if (heavyArmor?.equipmentData) {
    const strMinimum = heavyArmor.equipmentData.str_minimum;
    if (strMinimum && characterStrength < strMinimum) {
      return -10; // -10 feet penalty
    }
  }

  return 0;
}

/**
 * Parse ability score bonuses and AC bonuses from magic item descriptions
 * Looks for patterns like "+2 to Strength", "Strength +2", "+1 Armor", "AC +1", etc.
 */
export function getAbilityScoreBonuses(
  equippedItems: EnrichedInventoryItem[],
  attunedItems: EnrichedInventoryItem[]
): {
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
} {
  const bonuses: {
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  } = {};

  // Check both equipped and attuned items
  const itemsToCheck = [
    ...equippedItems.filter((item) => item.equipped),
    ...attunedItems.filter((item) => item.attuned),
  ];

  const abilityNames = [
    "strength",
    "dexterity",
    "constitution",
    "intelligence",
    "wisdom",
    "charisma",
  ];

  itemsToCheck.forEach((item) => {
    const description =
      item.equipmentData?.description?.toLowerCase() || "";
    if (!description) return;

    // Pattern 1: "+X to [Ability]" or "[Ability] +X"
    abilityNames.forEach((ability) => {
      const patterns = [
        new RegExp(`\\+\\s*(\\d+)\\s+to\\s+${ability}`, "i"),
        new RegExp(`${ability}\\s*\\+\\s*(\\d+)`, "i"),
        new RegExp(`\\+\\s*(\\d+)\\s+${ability}`, "i"),
      ];

      for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match) {
          const bonus = parseInt(match[1], 10);
          const currentBonus = bonuses[ability as keyof typeof bonuses] || 0;
          bonuses[ability as keyof typeof bonuses] = Math.max(
            currentBonus,
            bonus
          );
          break;
        }
      }
    });
  });

  return bonuses;
}

/**
 * Parse AC bonuses from magic item descriptions
 * Looks for patterns like "+1 Armor", "AC +1", "+1 to AC", etc.
 */
export function getACBonus(
  equippedItems: EnrichedInventoryItem[],
  attunedItems: EnrichedInventoryItem[]
): number {
  let acBonus = 0;

  // Check both equipped and attuned items
  const itemsToCheck = [
    ...equippedItems.filter((item) => item.equipped),
    ...attunedItems.filter((item) => item.attuned),
  ];

  itemsToCheck.forEach((item) => {
    const description =
      item.equipmentData?.description?.toLowerCase() || "";
    if (!description) return;

    // Patterns for AC bonuses
    const acPatterns = [
      /\+(\d+)\s+armor/i, // "+1 Armor"
      /armor\s*\+\s*(\d+)/i, // "Armor +1"
      /ac\s*\+\s*(\d+)/i, // "AC +1"
      /\+(\d+)\s+to\s+ac/i, // "+1 to AC"
      /\+(\d+)\s+armor\s+class/i, // "+1 Armor Class"
    ];

    for (const pattern of acPatterns) {
      const match = description.match(pattern);
      if (match) {
        const bonus = parseInt(match[1], 10);
        acBonus = Math.max(acBonus, bonus);
        break;
      }
    }
  });

  return acBonus;
}

/**
 * Extract weapon properties from equipped weapons
 */
export function getWeaponProperties(
  equippedItems: EnrichedInventoryItem[]
): string[] {
  const properties: string[] = [];

  equippedItems.forEach((item) => {
    if (
      item.equipped &&
      item.equipmentData?.weapon_category &&
      item.equipmentData.properties
    ) {
      if (Array.isArray(item.equipmentData.properties)) {
        properties.push(...item.equipmentData.properties);
      } else if (typeof item.equipmentData.properties === "string") {
        properties.push(item.equipmentData.properties);
      }
    }
  });

  return [...new Set(properties)]; // Remove duplicates
}

/**
 * Calculate all equipment effects for a character
 */
export function calculateEquipmentEffects(
  character: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    armor_class?: number;
    speed?: number;
  },
  inventory: EnrichedInventoryItem[]
): EquipmentEffects {
  const equippedItems = inventory.filter((item) => item.equipped);
  const attunedItems = inventory.filter((item) => item.attuned);

  const abilityScoreBonuses = getAbilityScoreBonuses(
    equippedItems,
    attunedItems
  );

  const acBonus = getACBonus(equippedItems, attunedItems);

  const { ac, breakdown } = calculateArmorClass(
    equippedItems,
    character.dexterity,
    character.armor_class || 10,
    acBonus
  );

  const stealthDisadvantage = getStealthDisadvantage(equippedItems);

  const strengthRequirements = getStrengthRequirements(
    equippedItems,
    character.strength
  );

  const speedModifier = getSpeedModifiers(
    equippedItems,
    character.speed || 30,
    character.strength
  );

  const weaponProperties = getWeaponProperties(equippedItems);

  return {
    armorClass: ac,
    stealthDisadvantage,
    speedModifier,
    strengthRequirements,
    abilityScoreBonuses,
    acBonus,
    weaponProperties,
    acBreakdown: breakdown,
  };
}
