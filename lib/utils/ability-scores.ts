/**
 * Utility functions for handling Ability Score Improvement (ASI)
 */

import type { AbilityScoreImprovementChoice } from '@/types/feature-choices';

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

/**
 * Validates if an ability score can be increased
 * Cannot exceed 20
 */
export function canIncreaseScore(score: number, increase: number): boolean {
  return score + increase <= 20;
}

/**
 * Validates an ASI choice
 */
export function validateASI(
  abilityScores: AbilityScores,
  choice: AbilityScoreImprovementChoice['selected']
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!choice) {
    return { valid: false, errors: ['No choice selected'] };
  }

  if (choice.option === 'one_score') {
    // Must increase exactly one score by 2
    const increases = Object.values(choice.ability_scores || {});
    const totalIncrease = increases.reduce((sum, val) => sum + (val || 0), 0);

    if (totalIncrease !== 2) {
      errors.push('Must increase one ability score by exactly 2');
    }

    const increasedScores = Object.entries(choice.ability_scores || {}).filter(
      ([_, val]) => val && val > 0
    );

    if (increasedScores.length !== 1) {
      errors.push('Must select exactly one ability score to increase');
    }

    // Check if any score would exceed 20
    for (const [ability, increase] of increasedScores) {
      const currentScore = abilityScores[ability as keyof AbilityScores];
      if (!canIncreaseScore(currentScore, increase || 0)) {
        errors.push(
          `${ability} cannot exceed 20 (current: ${currentScore}, increase: ${increase})`
        );
      }
    }
  } else if (choice.option === 'two_scores') {
    // Must increase exactly two scores by 1 each
    const increases = Object.values(choice.ability_scores || {});
    const totalIncrease = increases.reduce((sum, val) => sum + (val || 0), 0);

    if (totalIncrease !== 2) {
      errors.push('Must increase two ability scores by 1 each (total: 2)');
    }

    const increasedScores = Object.entries(choice.ability_scores || {}).filter(
      ([_, val]) => val && val > 0
    );

    if (increasedScores.length !== 2) {
      errors.push('Must select exactly two ability scores to increase');
    }

    // Check each increased score
    for (const [ability, increase] of increasedScores) {
      if (increase !== 1) {
        errors.push(`${ability} must be increased by exactly 1`);
      }

      const currentScore = abilityScores[ability as keyof AbilityScores];
      if (!canIncreaseScore(currentScore, increase || 0)) {
        errors.push(
          `${ability} cannot exceed 20 (current: ${currentScore}, increase: ${increase})`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Applies an ASI choice to ability scores
 * Returns new ability scores object
 */
export function applyASI(
  abilityScores: AbilityScores,
  choice: AbilityScoreImprovementChoice['selected']
): AbilityScores {
  if (!choice) {
    return { ...abilityScores };
  }

  const newScores = { ...abilityScores };

  for (const [ability, increase] of Object.entries(choice.ability_scores || {})) {
    if (increase && increase > 0) {
      const currentScore = newScores[ability as keyof AbilityScores];
      const newScore = Math.min(currentScore + increase, 20); // Cap at 20
      newScores[ability as keyof AbilityScores] = newScore;
    }
  }

  return newScores;
}

/**
 * Gets the maximum possible increase for an ability score
 */
export function getMaxIncrease(score: number): number {
  return Math.max(0, 20 - score);
}

/**
 * Formats ability score change for display
 */
export function formatAbilityScoreChange(
  ability: string,
  currentScore: number,
  increase: number
): string {
  const newScore = Math.min(currentScore + increase, 20);
  return `${ability}: ${currentScore} → ${newScore} (+${increase})`;
}
