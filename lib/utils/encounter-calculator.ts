import { Monster } from "@/hooks/useDndContent";

export interface EncounterMonster {
  monster: Monster;
  quantity: number;
}

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Deadly';

/**
 * Party level XP thresholds per character (from D&D 5e DMG)
 */
const PARTY_LEVEL_THRESHOLDS: Record<number, number> = {
  1: 25,
  2: 50,
  3: 75,
  4: 100,
  5: 200,
  6: 300,
  7: 400,
  8: 500,
  9: 600,
  10: 800,
  11: 1000,
  12: 1200,
  13: 1600,
  14: 2000,
  15: 2400,
  16: 3000,
  17: 3600,
  18: 4500,
  19: 5400,
  20: 6400,
};

/**
 * Get the XP threshold for a given party level
 */
export function getPartyLevelThreshold(level: number): number {
  if (level < 1) return PARTY_LEVEL_THRESHOLDS[1];
  if (level > 20) return PARTY_LEVEL_THRESHOLDS[20];
  return PARTY_LEVEL_THRESHOLDS[level] || 0;
}

/**
 * Calculate total XP for an encounter
 * Sums up all monster XP values multiplied by their quantities
 */
export function calculateEncounterXP(monsters: EncounterMonster[]): number {
  return monsters.reduce((total, { monster, quantity }) => {
    return total + (monster.xp * quantity);
  }, 0);
}

/**
 * Get the XP multiplier based on number of monsters
 * Based on D&D 5e encounter building rules
 */
function getXPMultiplier(monsterCount: number): number {
  if (monsterCount === 1) return 1;
  if (monsterCount === 2) return 1.5;
  if (monsterCount >= 3 && monsterCount <= 6) return 2;
  if (monsterCount >= 7 && monsterCount <= 10) return 2.5;
  if (monsterCount >= 11 && monsterCount <= 14) return 3;
  if (monsterCount >= 15) return 4;
  return 1;
}

/**
 * Calculate total number of monsters in the encounter
 */
function getTotalMonsterCount(monsters: EncounterMonster[]): number {
  return monsters.reduce((total, { quantity }) => total + quantity, 0);
}

/**
 * Calculate adjusted XP for an encounter
 * Applies multipliers based on number of monsters
 */
export function calculateAdjustedXP(totalXP: number, monsterCount: number): number {
  const multiplier = getXPMultiplier(monsterCount);
  return Math.floor(totalXP * multiplier);
}

/**
 * Calculate encounter difficulty based on adjusted XP, party size, and party level
 * Returns 'Easy', 'Medium', 'Hard', or 'Deadly'
 */
export function calculateDifficulty(
  adjustedXP: number,
  partySize: number,
  partyLevel: number
): Difficulty {
  if (partySize <= 0 || partyLevel < 1) return 'Easy';
  
  const threshold = getPartyLevelThreshold(partyLevel);
  const totalThreshold = threshold * partySize;
  
  // Easy: adjusted XP <= threshold
  if (adjustedXP <= totalThreshold) return 'Easy';
  
  // Medium: adjusted XP <= threshold * 2
  if (adjustedXP <= totalThreshold * 2) return 'Medium';
  
  // Hard: adjusted XP <= threshold * 3
  if (adjustedXP <= totalThreshold * 3) return 'Hard';
  
  // Deadly: adjusted XP > threshold * 3
  return 'Deadly';
}

/**
 * Calculate all encounter statistics at once
 */
export function calculateEncounterStats(
  monsters: EncounterMonster[],
  partySize: number,
  partyLevel: number
) {
  const totalXP = calculateEncounterXP(monsters);
  const monsterCount = getTotalMonsterCount(monsters);
  const adjustedXP = calculateAdjustedXP(totalXP, monsterCount);
  const difficulty = calculateDifficulty(adjustedXP, partySize, partyLevel);
  
  return {
    totalXP,
    monsterCount,
    adjustedXP,
    difficulty,
  };
}


