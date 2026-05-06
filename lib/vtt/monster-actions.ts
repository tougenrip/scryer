/**
 * Parsing helpers for SRD monster actions / abilities. The SRD JSON shape
 * (5e-bits) for an attack action looks like:
 *
 *   {
 *     name: "Bite",
 *     desc: "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.",
 *     attack_bonus: 5,
 *     damage: [
 *       { damage_dice: "1d8 + 3", damage_type: { name: "Piercing", index: "piercing" } }
 *     ],
 *     dc?: { dc_type: { index: "dex" }, dc_value: 13, success_type: "half" },
 *     usage?: { type: "recharge on roll", dice: "1d6", min_value: 5 }
 *   }
 *
 * Other shapes: multiattack (`actions` field listing component attacks),
 * passive abilities (only desc), legendary actions (often reference an
 * existing action by name).
 */

export interface ParsedDamage {
  dice: string;
  type: string | null;
}

export interface ParsedAction {
  name: string;
  desc: string;
  /** Raw +N attack bonus, null for passives / save-only / multiattack. */
  attackBonus: number | null;
  /** "1d20+5" if the action has an attack roll. Null for passives / save-only. */
  attackRoll: string | null;
  damages: ParsedDamage[];
  saveDc: { ability: string; value: number; success?: string } | null;
  usage: string | null;
  /** True if this is a "Multiattack" header with no attack roll of its own. */
  isMultiattack: boolean;
}

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function asObject(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * Normalize a damage_dice expression for our roller. The SRD often emits
 * "1d8 + 3" with spaces; Math.js / our roller tolerates spaces but tightening
 * is cheap. Also strip any leading sign.
 */
function normalizeDiceExpr(expr: string): string {
  return expr.replace(/\s+/g, "").replace(/^\+/, "");
}

function parseDamage(raw: unknown): ParsedDamage[] {
  const out: ParsedDamage[] = [];
  for (const entry of asArray(raw)) {
    const obj = asObject(entry);
    if (!obj) continue;
    const dice = asString(obj.damage_dice);
    if (!dice) continue;
    const typeObj = asObject(obj.damage_type);
    const type = typeObj ? asString(typeObj.name) ?? asString(typeObj.index) : null;
    out.push({ dice: normalizeDiceExpr(dice), type });
  }
  return out;
}

function parseDc(
  raw: unknown
): { ability: string; value: number; success?: string } | null {
  const obj = asObject(raw);
  if (!obj) return null;
  const value = asNumber(obj.dc_value);
  if (value === null) return null;
  const dcTypeObj = asObject(obj.dc_type);
  const ability =
    (dcTypeObj && (asString(dcTypeObj.name) ?? asString(dcTypeObj.index))) ??
    "save";
  const success = asString(obj.success_type) ?? undefined;
  return { ability: ability.toUpperCase(), value, success };
}

function parseUsage(raw: unknown): string | null {
  const obj = asObject(raw);
  if (!obj) return null;
  const type = asString(obj.type);
  if (!type) return null;
  const dice = asString(obj.dice);
  const minValue = asNumber(obj.min_value);
  const times = asNumber(obj.times);
  if (type.toLowerCase().includes("recharge") && dice) {
    return minValue && minValue < 6
      ? `Recharge ${minValue}-6`
      : minValue
        ? `Recharge ${minValue}`
        : `Recharge (${dice})`;
  }
  if (type.toLowerCase().includes("per day") && times) {
    return `${times}/Day`;
  }
  return type;
}

export function parseMonsterAction(raw: unknown): ParsedAction | null {
  const obj = asObject(raw);
  if (!obj) return null;
  const name = asString(obj.name);
  if (!name) return null;
  const desc = asString(obj.desc) ?? "";
  const attackBonus = asNumber(obj.attack_bonus);
  const damages = parseDamage(obj.damage);
  const saveDc = parseDc(obj.dc);
  const usage = parseUsage(obj.usage);

  const isMultiattack = /^multiattack/i.test(name) || asArray(obj.actions).length > 0;

  let attackRoll: string | null = null;
  if (attackBonus !== null && !isMultiattack) {
    attackRoll =
      attackBonus >= 0 ? `1d20+${attackBonus}` : `1d20${attackBonus}`;
  }

  return {
    name,
    desc,
    attackBonus: isMultiattack ? null : attackBonus,
    attackRoll,
    damages,
    saveDc,
    usage,
    isMultiattack,
  };
}

export function parseActions(raw: unknown): ParsedAction[] {
  return asArray(raw)
    .map(parseMonsterAction)
    .filter((a): a is ParsedAction => a !== null);
}

/**
 * SRD 5.1 doesn't have a bonus_actions field — bonus actions are folded into
 * the actions array and signalled by phrasing in the description ("As a bonus
 * action, ...", "...uses a bonus action..."). This detects those entries so
 * the UI can render a dedicated Bonus Actions section.
 */
export function isBonusActionDesc(desc: string): boolean {
  const d = desc.trim().toLowerCase();
  if (!d) return false;
  return (
    /^as a bonus action\b/.test(d) ||
    /\bas a bonus action\b/.test(d.slice(0, 80)) ||
    /\buses? (?:a|its) bonus action\b/.test(d.slice(0, 120))
  );
}

export function isBonusAction(action: ParsedAction): boolean {
  return isBonusActionDesc(action.desc);
}

/**
 * Convenience: split a raw actions array into ordinary actions and bonus
 * actions. Bonus-flavoured entries are removed from the first list.
 */
export function partitionActions(raw: unknown): {
  actions: ParsedAction[];
  bonusActions: ParsedAction[];
} {
  const all = parseActions(raw);
  const bonusActions: ParsedAction[] = [];
  const actions: ParsedAction[] = [];
  for (const a of all) {
    if (isBonusAction(a)) bonusActions.push(a);
    else actions.push(a);
  }
  return { actions, bonusActions };
}
