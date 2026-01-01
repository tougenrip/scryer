/**
 * Utility functions for parsing feature_specific JSONB data
 * to extract choice requirements and options
 */

import type {
  AnyFeatureChoice,
  FeatureSelectionChoice,
  SkillSelectionChoice,
  StringSelectionChoice,
  AbilityScoreImprovementChoice,
} from '@/types/feature-choices';

/**
 * Detects if a feature has choice requirements based on feature_specific JSONB
 */
export function hasFeatureChoices(feature_specific: any): boolean {
  if (!feature_specific || typeof feature_specific !== 'object') {
    return false;
  }

  // Check for common choice patterns
  return !!(
    feature_specific.expertise_options ||
    feature_specific.subfeature_options ||
    feature_specific.enemy_type_options ||
    feature_specific.terrain_type_options ||
    feature_specific.ability_score_bonuses
  );
}

/**
 * Gets the type of choice required by a feature
 */
export function getChoiceType(feature_specific: any): string | null {
  if (!feature_specific || typeof feature_specific !== 'object') {
    return null;
  }

  if (feature_specific.expertise_options) return 'skill_selection';
  if (feature_specific.subfeature_options) return 'feature_selection';
  if (feature_specific.enemy_type_options) return 'string_selection';
  if (feature_specific.terrain_type_options) return 'string_selection';
  if (feature_specific.ability_score_bonuses) return 'ability_score_improvement';

  return null;
}

/**
 * Parses feature_specific JSONB to extract choice data
 */
export function parseFeatureChoices(
  feature_specific: any,
  featureName?: string
): AnyFeatureChoice | null {
  // Check for Ability Score Improvement first (even if feature_specific is null)
  if (featureName && isAbilityScoreImprovement(featureName)) {
    return parseAbilityScoreImprovement(feature_specific);
  }

  if (!feature_specific || typeof feature_specific !== 'object') {
    return null;
  }

  // Check for expertise options (skill selection)
  if (feature_specific.expertise_options) {
    return parseExpertiseOptions(feature_specific.expertise_options);
  }

  // Check for subfeature options (feature selection)
  if (feature_specific.subfeature_options) {
    return parseSubfeatureOptions(feature_specific.subfeature_options);
  }

  // Check for enemy type options
  if (feature_specific.enemy_type_options) {
    return parseStringOptions(feature_specific.enemy_type_options);
  }

  // Check for terrain type options
  if (feature_specific.terrain_type_options) {
    return parseStringOptions(feature_specific.terrain_type_options);
  }

  return null;
}

/**
 * Parses Ability Score Improvement choice
 * ASI allows: one score +2 OR two scores +1 each
 */
function parseAbilityScoreImprovement(
  feature_specific: any
): AbilityScoreImprovementChoice {
  return {
    type: 'ability_score_improvement',
    required: true,
    choose: 1, // Player chooses one option (one score +2 OR two scores +1)
  };
}

/**
 * Parses expertise options (skill selection)
 */
function parseExpertiseOptions(
  expertiseOptions: any
): SkillSelectionChoice {
  const options: Array<{ index: string; name: string; description?: string }> = [];
  const choose = expertiseOptions.choose || 2; // Default to 2 skills for Expertise

  if (expertiseOptions.from?.options) {
    for (const option of expertiseOptions.from.options) {
      if (option.item) {
        // Reference format: { item: { index: "...", name: "..." } }
        const index = option.item.index || option.item.url?.split('/').pop() || '';
        const name = option.item.name || '';
        options.push({
          index: index.replace('skill-', ''), // Remove 'skill-' prefix for consistency
          name: name.replace('Skill: ', ''), // Remove 'Skill: ' prefix
        });
      } else if (typeof option === 'string') {
        // Simple string format
        options.push({
          index: option,
          name: option,
        });
      }
    }
  }

  return {
    type: 'skill_selection',
    required: true,
    choose,
    options,
  };
}

/**
 * Parses subfeature options (feature selection like Fighting Styles)
 */
function parseSubfeatureOptions(
  subfeatureOptions: any
): FeatureSelectionChoice {
  const options: Array<{
    index: string;
    name: string;
    description?: string;
    url?: string;
  }> = [];
  const choose = subfeatureOptions.choose || 1;

  if (subfeatureOptions.from?.options) {
    for (const option of subfeatureOptions.from.options) {
      if (option.item) {
        // Reference format: { item: { index: "...", name: "...", url: "..." } }
        const index = option.item.index || option.item.url?.split('/').pop() || '';
        const name = option.item.name || '';
        options.push({
          index,
          name: name.replace(/^(Fighting Style|Circle of the Land|Hunter's Prey):\s*/, ''), // Clean up prefixes
          description: option.item.description,
          url: option.item.url,
        });
      } else if (typeof option === 'string') {
        options.push({
          index: option,
          name: option,
        });
      }
    }
  }

  return {
    type: 'feature_selection',
    required: true,
    choose,
    options,
  };
}

/**
 * Parses string-based options (enemy types, terrain types, etc.)
 */
function parseStringOptions(
  stringOptions: any
): StringSelectionChoice {
  const options: string[] = [];
  const choose = stringOptions.choose || 1;

  if (stringOptions.from?.options) {
    for (const option of stringOptions.from.options) {
      if (typeof option === 'string') {
        options.push(option);
      } else if (option.item?.name) {
        options.push(option.item.name);
      }
    }
  }

  return {
    type: 'string_selection',
    required: true,
    choose,
    options,
  };
}

/**
 * Checks if a feature name indicates Ability Score Improvement
 */
export function isAbilityScoreImprovement(featureName: string): boolean {
  return /ability\s*score\s*improvement/i.test(featureName);
}

/**
 * Extracts choice options for UI display
 */
export function extractChoiceOptions(choice: AnyFeatureChoice): Array<{
  value: string;
  label: string;
  description?: string;
}> {
  switch (choice.type) {
    case 'ability_score_improvement':
      return [
        { value: 'one_score', label: 'Increase one ability score by 2' },
        { value: 'two_scores', label: 'Increase two ability scores by 1 each' },
      ];

    case 'feature_selection':
      return choice.options.map((opt) => ({
        value: opt.index,
        label: opt.name,
        description: opt.description,
      }));

    case 'skill_selection':
    case 'proficiency_selection':
      return choice.options.map((opt) => ({
        value: opt.index,
        label: opt.name,
        description: opt.description,
      }));

    case 'string_selection':
      return choice.options.map((opt) => ({
        value: opt,
        label: opt.charAt(0).toUpperCase() + opt.slice(1).replace(/-/g, ' '),
      }));

    default:
      return [];
  }
}
