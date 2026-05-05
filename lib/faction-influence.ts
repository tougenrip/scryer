import type { Faction } from "@/hooks/useForgeContent";

/** Ordered tiers (slider steps 1–5); 0 = unset / null. */
export const FACTION_INFLUENCE_ORDER = [
  "local",
  "regional",
  "continental",
  "global",
  "multiverse",
] as const satisfies readonly NonNullable<Faction["influence_level"]>[];

export type FactionInfluenceTier = (typeof FACTION_INFLUENCE_ORDER)[number];

/** Bar width on faction cards (matches forge UI). */
export const FACTION_INFLUENCE_PCT: Record<FactionInfluenceTier, number> = {
  local: 20,
  regional: 45,
  continental: 68,
  global: 88,
  multiverse: 100,
};

export function factionInfluenceSliderIndex(
  level: Faction["influence_level"],
): number {
  if (!level) return 0;
  const i = FACTION_INFLUENCE_ORDER.indexOf(level);
  return i >= 0 ? i + 1 : 0;
}

export function factionInfluenceFromSliderIndex(
  index: number,
): Faction["influence_level"] {
  if (index <= 0) return null;
  return FACTION_INFLUENCE_ORDER[index - 1] ?? null;
}
