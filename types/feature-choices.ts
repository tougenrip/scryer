/**
 * Type definitions for class feature choices
 */

export type ChoiceType = 
  | 'ability_score_improvement'
  | 'feature_selection'
  | 'skill_selection'
  | 'string_selection'
  | 'proficiency_selection';

/**
 * Base interface for all feature choices
 */
export interface FeatureChoice {
  type: ChoiceType;
  required: boolean;
  choose?: number; // Number of options to choose (default: 1)
}

/**
 * Ability Score Improvement choice
 * Player can choose: one score +2 OR two scores +1 each
 */
export interface AbilityScoreImprovementChoice extends FeatureChoice {
  type: 'ability_score_improvement';
  selected?: {
    option: 'one_score' | 'two_scores';
    ability_scores: Partial<{
      strength: number;
      dexterity: number;
      constitution: number;
      intelligence: number;
      wisdom: number;
      charisma: number;
    }>;
  };
}

/**
 * Feature selection choice (e.g., Fighting Style, Circle of the Land)
 * Player chooses from a list of subfeatures
 */
export interface FeatureSelectionChoice extends FeatureChoice {
  type: 'feature_selection';
  options: Array<{
    index: string;
    name: string;
    description?: string;
    url?: string;
  }>;
  selected?: string[]; // Array of selected feature indices
}

/**
 * Skill/proficiency selection choice (e.g., Expertise)
 * Player chooses skills to gain expertise in
 */
export interface SkillSelectionChoice extends FeatureChoice {
  type: 'skill_selection' | 'proficiency_selection';
  options: Array<{
    index: string;
    name: string;
    description?: string;
  }>;
  selected?: string[]; // Array of selected skill indices
}

/**
 * String-based choice (e.g., enemy type, terrain type)
 * Player chooses from a list of string options
 */
export interface StringSelectionChoice extends FeatureChoice {
  type: 'string_selection';
  options: string[];
  selected?: string[]; // Array of selected strings
}

/**
 * Union type for all choice types
 */
export type AnyFeatureChoice = 
  | AbilityScoreImprovementChoice
  | FeatureSelectionChoice
  | SkillSelectionChoice
  | StringSelectionChoice;

/**
 * Extended feature interface that includes choice information
 */
export interface FeatureWithChoices {
  index: string;
  name: string;
  level: number;
  class_index?: string;
  subclass_index?: string;
  description: string | null;
  feature_specific: any; // Raw JSONB from database
  choice?: AnyFeatureChoice | null; // Parsed choice data
  requiresChoice: boolean; // Whether this feature requires a choice
}

/**
 * Stored feature choice in character.class_features JSONB
 */
export interface StoredFeatureChoice {
  level: number;
  name: string;
  description: string;
  feature_index: string;
  choice?: AnyFeatureChoice;
  acquired?: boolean; // Whether the feature has been fully acquired
}

/**
 * Choice option for UI display
 */
export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}
