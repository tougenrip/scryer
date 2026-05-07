/**
 * Reusable helper for deriving PC weapon-attack actions in the VTT layer.
 *
 * The core logic mirrors `getWeaponAction` from
 * `components/character/actions-tab.tsx` but returns a simpler shape that
 * matches the inspector / actions-bar rendering needs (attackRoll string + damages
 * array), rather than the character-sheet's ActionItem shape.
 *
 * DO NOT import from actions-tab.tsx — that file owns its own internal logic.
 */

export interface ParsedPcAction {
  /** Display name (weapon name). */
  name: string;
  /** Free-text descriptor like "Martial Melee Weapon (Versatile)". */
  description: string;
  /** "1d20+5" attack roll string, or null for actions with no attack. */
  attackRoll: string | null;
  /** "+5" formatted hit bonus string, or null. */
  hitBonus: string | null;
  /** Damage rolls with type. Empty for non-damage actions. */
  damages: { dice: string; type: string | null }[];
}

export interface MinimalAbilityScores {
  strength: number;
  dexterity: number;
}

/**
 * Returns the proficiency bonus for a given character level.
 * 1-4 → +2, 5-8 → +3, 9-12 → +4, 13-16 → +5, 17-20 → +6.
 */
export function proficiencyBonusForLevel(level: number): number {
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

/**
 * Build a `ParsedPcAction` from an equipped weapon's enriched inventory item.
 *
 * Returns null if the item has no `weapon_category` (i.e., is not a weapon).
 * The weapon parameter accepts any object that has `name` and `equipmentData`
 * matching the SrdEquipment / HomebrewEquipment shape (all `any` fields on
 * equipment are typed as unknown here for robustness).
 */
export function deriveWeaponAction(
  weapon: { name: string; equipmentData: unknown },
  abilityScores: MinimalAbilityScores,
  proficiencyBonus: number
): ParsedPcAction | null {
  const eq = weapon.equipmentData as Record<string, unknown> | null | undefined;
  if (!eq?.weapon_category) return null;

  // --- damage ---
  const damageRaw = eq.damage as {
    damage_dice?: string;
    damage_type?: { name?: string; index?: string };
  } | null;

  // --- properties (finesse / thrown detection) ---
  const properties = eq.properties as Array<
    { index?: string; name?: string } | string
  > | null;

  const hasProperty = (key: string): boolean =>
    properties?.some((p) => {
      if (typeof p === "string") return p.toLowerCase() === key;
      return (
        p.index?.toLowerCase() === key || p.name?.toLowerCase() === key
      );
    }) ?? false;

  const isFinesse = hasProperty("finesse");
  const isRanged = eq.weapon_range === "Ranged";

  // --- ability modifier ---
  const strMod = Math.floor((abilityScores.strength - 10) / 2);
  const dexMod = Math.floor((abilityScores.dexterity - 10) / 2);
  const abilityMod = isRanged
    ? dexMod
    : isFinesse
    ? Math.max(strMod, dexMod)
    : strMod;

  const hitBonusNum = abilityMod + proficiencyBonus;
  const hitBonusStr =
    hitBonusNum >= 0 ? `+${hitBonusNum}` : `${hitBonusNum}`;
  const attackRoll =
    hitBonusNum >= 0
      ? `1d20+${hitBonusNum}`
      : `1d20${hitBonusNum}`;

  // --- damage string ---
  const damageDice = damageRaw?.damage_dice ?? null;
  let damageStr: string | null = null;
  if (damageDice) {
    // Strip spaces from the SRD dice expression (e.g. "1d8 + 3" → "1d8+3")
    const normalised = damageDice.replace(/\s+/g, "");
    if (abilityMod !== 0) {
      damageStr =
        normalised +
        (abilityMod > 0 ? `+${abilityMod}` : `${abilityMod}`);
    } else {
      damageStr = normalised;
    }
  }

  const damageTypeName =
    damageRaw?.damage_type?.name?.toLowerCase() ??
    damageRaw?.damage_type?.index ??
    null;

  const damages: ParsedPcAction["damages"] = damageStr
    ? [{ dice: damageStr, type: damageTypeName }]
    : [];

  // --- description ---
  const propertyNames =
    properties
      ?.map((p) => {
        if (typeof p === "string") return p;
        return p.name ?? p.index ?? "";
      })
      .filter(Boolean)
      .join(", ") ?? "";

  const description = `${eq.weapon_category} ${eq.weapon_range ?? ""} Weapon${
    propertyNames ? ` (${propertyNames})` : ""
  }`.trim();

  return {
    name: weapon.name,
    description,
    attackRoll,
    hitBonus: hitBonusStr,
    damages,
  };
}

/**
 * Default unarmed strike — every PC has one. Damage is 1 + STR modifier
 * (5e PHB). Hit bonus is STR mod + proficiency.
 */
export function unarmedStrikeAction(
  abilityScores: MinimalAbilityScores,
  proficiencyBonus: number
): ParsedPcAction {
  const strMod = Math.floor((abilityScores.strength - 10) / 2);
  const hitBonusNum = strMod + proficiencyBonus;
  const hitBonusStr =
    hitBonusNum >= 0 ? `+${hitBonusNum}` : `${hitBonusNum}`;
  const attackRoll =
    hitBonusNum >= 0 ? `1d20+${hitBonusNum}` : `1d20${hitBonusNum}`;
  // 1 + STR bludgeoning. Express as "1d1+strMod" so the dice roller treats
  // it uniformly. Falls through to a flat number if you'd rather hardcode.
  const damageNum = 1 + strMod;
  const damages: ParsedPcAction["damages"] = [
    {
      dice: damageNum >= 0 ? `${damageNum}` : `${damageNum}`,
      type: "bludgeoning",
    },
  ];
  return {
    name: "Unarmed Strike",
    description: "Melee Weapon Attack — fists, feet, headbutts.",
    attackRoll,
    hitBonus: hitBonusStr,
    damages,
  };
}
