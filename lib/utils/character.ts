// Utility functions for character calculations

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getAbilityModifierString(score: number): string {
  const mod = getAbilityModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function getProficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export function pointBuyCost(score: number): number {
  if (score <= 13) {
    return score - 8;
  } else if (score === 14) {
    return 7;
  } else if (score === 15) {
    return 9;
  }
  return 0; // Invalid score
}

export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export const POINT_BUY_TOTAL = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;

export const DND_SKILLS = [
  {
    name: 'acrobatics',
    ability: 'dexterity',
    description:
      "Covers physical feats of balance, agility, and coordination, such as somersaults and staying upright on slippery or unstable surfaces.",
    examples: [
      "Walking across a tightrope or balance beam.",
      "Rolling to avoid a trap or taking half damage from a fall.",
      "Dodging out of the way during a grapple or push."
    ],
  },
  {
    name: 'animal-handling',
    ability: 'wisdom',
    description:
      "Measures your ability to calm down, control, or intuit the intentions of animals.",
    examples: [
      "Calming a frightened horse.",
      "Gaining a wild animal's trust to avoid combat.",
      "Interpreting a wolf's warning growl."
    ],
  },
  {
    name: 'arcana',
    ability: 'intelligence',
    description:
      "Knowledge about magical lore, spells, magic items, or mysterious symbols.",
    examples: [
      "Identifying a magical effect or rune.",
      "Recalling lore about ancient mystical rituals.",
      "Recognizing the properties of a spell scroll."
    ]
  },
  {
    name: 'athletics',
    ability: 'strength',
    description:
      "Covers feats of physical power, such as climbing, jumping, or swimming.",
    examples: [
      "Scaling a wall or a cliff.",
      "Swimming across a churning river.",
      "Grappling or shoving an opponent."
    ]
  },
  {
    name: 'deception',
    ability: 'charisma',
    description:
      "Skill in hiding the truth, lying, or misleading others.",
    examples: [
      "Convincing a guard you are someone else.",
      "Bluffing in a high-stakes game of cards.",
      "Forging official documents."
    ]
  },
  {
    name: 'history',
    ability: 'intelligence',
    description:
      "Memory and understanding of historical events, people, or places.",
    examples: [
      "Recalling information about ancient ruins.",
      "Identifying a historical symbol on a shield.",
      "Knowing the outcome of a famous battle."
    ]
  },
  {
    name: 'insight',
    ability: 'wisdom',
    description:
      "The ability to read people and situations, to tell truth from lies or sense someone's motives.",
    examples: [
      "Reading body language to detect a lie.",
      "Sensing if someone is hiding something important.",
      "Figuring out the real intentions behind a veiled statement."
    ]
  },
  {
    name: 'intimidation',
    ability: 'charisma',
    description:
      "Ability to threaten, coerce, or frighten others with words or presence.",
    examples: [
      "Browbeating a prisoner for information.",
      "Intimidating a shopkeeper into lowering prices.",
      "Making a show of force to scatter a rabble."
    ]
  },
  {
    name: 'investigation',
    ability: 'intelligence',
    description:
      "Analyzing clues, searching for hidden details, or drawing logical conclusions from evidence.",
    examples: [
      "Searching a desk for hidden compartments.",
      "Looking for the mechanism of a trap.",
      "Piecing together clues at a crime scene."
    ]
  },
  {
    name: 'medicine',
    ability: 'wisdom',
    description:
      "Knowledge in caring for the sick and tending wounds, as well as diagnosing illnesses.",
    examples: [
      "Stabilizing a dying companion.",
      "Diagnosing a disease or poison.",
      "Tending to injuries after a battle."
    ]
  },
  {
    name: 'nature',
    ability: 'intelligence',
    description:
      "Understanding plants, animals, terrain, weather, and survival in the wilderness.",
    examples: [
      "Identifying edible plants or dangerous animals.",
      "Predicting weather patterns.",
      "Knowing safe places to make camp."
    ]
  },
  {
    name: 'perception',
    ability: 'wisdom',
    description:
      "Spotting, hearing, or otherwise detecting hidden creatures, objects, or situations.",
    examples: [
      "Noticing a hidden door or trap.",
      "Hearing an approaching enemy.",
      "Spotting something odd while on watch."
    ]
  },
  {
    name: 'performance',
    ability: 'charisma',
    description:
      "Impressing an audience with music, dance, acting, or oratory.",
    examples: [
      "Singing a ballad in a tavern.",
      "Delivering a stirring speech.",
      "Performing a complex dance routine."
    ]
  },
  {
    name: 'persuasion',
    ability: 'charisma',
    description:
      "Influencing others with tact, social grace, or convincing argument.",
    examples: [
      "Negotiating peace between warring factions.",
      "Convincing a merchant to give a better price.",
      "Diplomatically defusing a tense situation."
    ]
  },
  {
    name: 'religion',
    ability: 'intelligence',
    description:
      "Knowledge of religious lore, rituals, deities, and symbols.",
    examples: [
      "Identifying a relic's sacred significance.",
      "Remembering the tenets of a foreign faith.",
      "Recognizing the rites of a strange cult."
    ]
  },
  {
    name: 'sleight-of-hand',
    ability: 'dexterity',
    description:
      "Performing quick, precise hand movements—often to trick, pickpocket, or palm objects unnoticed.",
    examples: [
      "Pickpocketing a coin purse.",
      "Concealing a small object during a handshake.",
      "Performing a magic trick with cards."
    ]
  },
  {
    name: 'stealth',
    ability: 'dexterity',
    description:
      "The art of moving quietly and remaining unseen.",
    examples: [
      "Sneaking past guards.",
      "Hiding in shadows to avoid being spotted.",
      "Moving silently through the forest."
    ]
  },
  {
    name: 'survival',
    ability: 'wisdom',
    description:
      "The ability to track creatures, guide groups through wilderness, find food and water, and endure harsh conditions.",
    examples: [
      "Tracking a wild animal through the forest.",
      "Finding your way through a blizzard.",
      "Building shelter and foraging for food."
    ]
  },
] as const;

export type SkillName = typeof DND_SKILLS[number]['name'];

/**
 * Normalize a skill name to the internal format (lowercase with hyphens)
 * e.g., "Perception" → "perception", "Animal Handling" → "animal-handling"
 */
function normalizeSkillName(skillName: string): string {
  return skillName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/^skill-/, '');
}

/**
 * Find a skill by various name formats
 */
function findSkillByName(name: string): typeof DND_SKILLS[number] | undefined {
  const normalized = normalizeSkillName(name);
  return DND_SKILLS.find(s => s.name === normalized);
}

/**
 * Calculate skill proficiencies from all sources:
 * 1. Manual selections in character_skills table
 * 2. Class features (skill_selection choices that grant proficiency or expertise)
 * 3. Class starting proficiencies (proficiency_choices)
 * 4. Racial traits (if they grant skill proficiencies)
 * 5. Background skill proficiencies
 */
export function calculateSkillProficiencies(
  manualSkills: Array<{ skill_name: string; proficient: boolean; expertise: boolean }>,
  classFeatures?: Array<{ name?: string; description?: string; choice?: any }>,
  classProficiencyChoices?: any,
  raceTraits?: any,
  backgroundSkillProficiencies?: string | null
): Record<SkillName, { proficient: boolean; expertise: boolean }> {
  const skillsMap: Record<SkillName, { proficient: boolean; expertise: boolean }> = {} as any;
  
  // Initialize all skills as not proficient
  DND_SKILLS.forEach((skill) => {
    skillsMap[skill.name] = {
      proficient: false,
      expertise: false,
    };
  });

  // 1. Apply manual skill selections from character_skills table
  manualSkills.forEach((skillData) => {
    const skill = findSkillByName(skillData.skill_name);
    if (skill && skillsMap[skill.name]) {
      skillsMap[skill.name] = {
        proficient: skillData.proficient,
        expertise: skillData.expertise,
      };
    }
  });

  // 2. Apply skill proficiencies from class features (skill_selection choices)
  if (classFeatures && Array.isArray(classFeatures)) {
    classFeatures.forEach((feature: any) => {
      if (feature.choice && feature.choice.type === 'skill_selection' && feature.choice.selected) {
        const selectedSkills = feature.choice.selected as string[];
        const featureName = feature.name || '';
        const featureDesc = feature.description || '';
        const isExpertise = featureName.toLowerCase().includes('expertise') || 
                          featureDesc.toLowerCase().includes('expertise');
        
        selectedSkills.forEach((skillIndex) => {
          const skill = findSkillByName(skillIndex);
          if (skill && skillsMap[skill.name]) {
            if (isExpertise) {
              skillsMap[skill.name].expertise = true;
              skillsMap[skill.name].proficient = true; // Expertise requires proficiency
            } else {
              skillsMap[skill.name].proficient = true;
            }
          }
        });
      }
    });
  }

  // 3. Apply starting class skill proficiencies from proficiency_choices
  if (classProficiencyChoices && Array.isArray(classProficiencyChoices)) {
    classProficiencyChoices.forEach((choice: any) => {
      // Handle selected skills from proficiency choices
      if (choice.selected && Array.isArray(choice.selected)) {
        choice.selected.forEach((skillIndex: string) => {
          const skill = findSkillByName(skillIndex);
          if (skill && skillsMap[skill.name] && !skillsMap[skill.name].proficient) {
            skillsMap[skill.name].proficient = true;
          }
        });
      }
      // Handle direct array of skill indices
      if (choice.type === 'skills' && Array.isArray(choice.skills)) {
        choice.skills.forEach((skillIndex: string) => {
          const skill = findSkillByName(skillIndex);
          if (skill && skillsMap[skill.name] && !skillsMap[skill.name].proficient) {
            skillsMap[skill.name].proficient = true;
          }
        });
      }
    });
  }

  // 4. Apply skill proficiencies from racial traits
  if (raceTraits && Array.isArray(raceTraits)) {
    raceTraits.forEach((trait: any) => {
      const traitDesc = typeof trait === 'object' 
        ? (trait.desc || trait.description || '') 
        : String(trait);
      const traitName = typeof trait === 'object' ? (trait.name || '') : '';
      const searchText = `${traitName} ${traitDesc}`.toLowerCase();

      // Skip if no description (just a reference without details)
      if (!traitDesc && !traitName) return;

      // Check for specific skill proficiency grants
      // Pattern variations:
      // - "You have proficiency in the Perception skill"
      // - "proficiency in the Intimidation skill"
      // - "gain proficiency in the Stealth skill"
      DND_SKILLS.forEach((skill) => {
        // Create readable skill name (e.g., "animal-handling" → "animal handling")
        const readableSkillName = skill.name.replace(/-/g, ' ');
        
        // Multiple patterns to match different phrasings
        const patterns = [
          new RegExp(`proficien(?:cy|t)\\s+in\\s+(?:the\\s+)?${readableSkillName}(?:\\s+skill)?`, 'i'),
          new RegExp(`gain\\s+proficiency\\s+in\\s+(?:the\\s+)?${readableSkillName}`, 'i'),
          new RegExp(`have\\s+proficiency\\s+in\\s+(?:the\\s+)?${readableSkillName}`, 'i'),
        ];
        
        const isMatch = patterns.some(pattern => pattern.test(searchText));
        if (isMatch && !skillsMap[skill.name].proficient) {
          skillsMap[skill.name].proficient = true;
        }
      });
    });
  }

  // 5. Apply skill proficiencies from background
  if (backgroundSkillProficiencies && typeof backgroundSkillProficiencies === 'string') {
    // Background skills are comma-separated like "Insight, Religion" or "Animal Handling, Survival"
    const bgSkills = backgroundSkillProficiencies.split(',').map(s => s.trim());
    bgSkills.forEach((skillName) => {
      const skill = findSkillByName(skillName);
      if (skill && skillsMap[skill.name] && !skillsMap[skill.name].proficient) {
        skillsMap[skill.name].proficient = true;
      }
    });
  }

  return skillsMap;
}

export function getSkillModifier(
  skill: SkillName,
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  },
  proficiency: boolean,
  expertise: boolean,
  proficiencyBonus: number
): number {
  const skillData = DND_SKILLS.find(s => s.name === skill);
  if (!skillData) return 0;

  const abilityScore = abilityScores[skillData.ability as keyof typeof abilityScores];
  const abilityMod = getAbilityModifier(abilityScore);
  const profMod = (proficiency || expertise) ? proficiencyBonus * (expertise ? 2 : 1) : 0;
  
  return abilityMod + profMod;
}

export function rollAbilityScore(): number {
  const rolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
  rolls.sort((a, b) => b - a);
  return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
}

/**
 * Fetches normalized traits for an SRD race from the database
 * Falls back to JSONB traits if normalized traits are not available
 * 
 * @param raceIndex - The index of the race (e.g., "elf", "dwarf")
 * @param fallbackTraits - JSONB traits array to use as fallback
 * @returns Array of trait objects with index, name, and description
 */
export async function fetchSrdRaceTraits(
  raceIndex: string,
  fallbackTraits?: any
): Promise<any[]> {
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    
    // Fetch trait mappings for this race
    const { data: mappings, error: mappingError } = await supabase
      .from('srd_race_traits')
      .select('trait_index')
      .eq('race_index', raceIndex);
    
    if (mappingError || !mappings || mappings.length === 0) {
      // Fall back to JSONB if no normalized data
      return Array.isArray(fallbackTraits) ? fallbackTraits : [];
    }
    
    // Fetch the actual trait details
    const traitIndices = mappings.map(m => m.trait_index);
    const { data: traits, error: traitsError } = await supabase
      .from('srd_racial_traits')
      .select('index, name, description')
      .in('index', traitIndices);
    
    if (traitsError || !traits) {
      // Fall back to JSONB if fetch fails
      return Array.isArray(fallbackTraits) ? fallbackTraits : [];
    }
    
    // Return normalized traits, mapped to format compatible with extraction functions
    return traits.map(t => ({
      index: t.index,
      name: t.name,
      description: t.description || '',
      desc: t.description || '', // Also include 'desc' for compatibility
    }));
  } catch (error) {
    // Fall back to JSONB on any error
    return Array.isArray(fallbackTraits) ? fallbackTraits : [];
  }
}

/**
 * Extracts special senses from race traits
 * Supports both JSONB format (from srd_races.traits) and normalized format (from srd_racial_traits)
 * Looks for common senses like Darkvision, Blindsight, Tremorsense, and Truesight
 * 
 * @param traits - Array of trait objects (JSONB or normalized format)
 *   JSONB format: { name: string, index: string, desc?: string }
 *   Normalized format: { name: string, index: string, description?: string }
 */
export function extractSensesFromTraits(traits: any): {
  darkvision?: string;
  blindsight?: string;
  tremorsense?: string;
  truesight?: string;
} {
  const senses: {
    darkvision?: string;
    blindsight?: string;
    tremorsense?: string;
    truesight?: string;
  } = {};

  if (!traits || !Array.isArray(traits)) {
    return senses;
  }

  // Common sense patterns to look for
  const sensePatterns = {
    darkvision: /darkvision/i,
    blindsight: /blindsight/i,
    tremorsense: /tremorsense/i,
    truesight: /truesight/i,
  };

  // Range patterns (e.g., "60 ft.", "120 feet", "30'")
  const rangePattern = /(\d+)\s*(?:ft\.|feet|')/i;

  for (const trait of traits) {
    // Handle both string traits and object traits
    const traitName = typeof trait === 'string' ? trait : trait?.name || trait?.index || '';
    const traitIndex = typeof trait === 'object' ? trait?.index || '' : '';
    const traitDesc = typeof trait === 'object' ? (trait?.desc || trait?.description || '') : '';

    // Combine name, index, and description for searching
    const searchText = `${traitName} ${traitIndex} ${traitDesc}`.toLowerCase();

    // Check each sense type
    for (const [senseType, pattern] of Object.entries(sensePatterns)) {
      if (pattern.test(searchText) && !senses[senseType as keyof typeof senses]) {
        // Try to extract range
        const rangeMatch = searchText.match(rangePattern);
        if (rangeMatch) {
          senses[senseType as keyof typeof senses] = `${rangeMatch[1]} ft.`;
        } else {
          // If no range found, set a default or empty string to indicate presence
          // Common defaults: Darkvision 60 ft., Superior Darkvision 120 ft.
          if (senseType === 'darkvision') {
            senses.darkvision = searchText.includes('superior') ? '120 ft.' : '60 ft.';
          } else {
            // For other senses, just mark as present (user can specify range)
            senses[senseType as keyof typeof senses] = '';
          }
        }
      }
    }
  }

  return senses;
}

/**
 * Common damage types in D&D 5e
 */
const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 
  'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 
  'slashing', 'thunder'
];

/**
 * Extract features available at a specific level from class_levels data
 */
export interface ExtractedFeature {
  level: number;
  name: string;
  description: string;
  type: 'feature' | 'asi' | 'skill' | 'equipment' | 'spell_slot' | 'spell_known';
  requiresChoice?: boolean;
  choices?: Array<{ name: string; description?: string }>;
}

export function extractFeaturesForLevel(
  classLevels: any,
  level: number
): ExtractedFeature[] {
  const features: ExtractedFeature[] = [];

  if (!classLevels) {
    console.log('extractFeaturesForLevel: No classLevels provided');
    return features;
  }

  console.log('extractFeaturesForLevel: Looking for level', level, 'in classLevels:', classLevels);

  // Try different possible key formats
  const levelData = classLevels[level] || 
                   classLevels[`level_${level}`] || 
                   classLevels[`${level}`] ||
                   (Array.isArray(classLevels) ? classLevels[level - 1] : null);

  if (!levelData) {
    console.log('extractFeaturesForLevel: No data found for level', level);
    return features;
  }

  console.log('extractFeaturesForLevel: Found level data:', levelData);

  // Extract features
  if (levelData.features) {
    if (Array.isArray(levelData.features)) {
      levelData.features.forEach((feat: any) => {
        if (typeof feat === 'string') {
          features.push({
            level,
            name: feat,
            description: '',
            type: 'feature',
          });
        } else if (feat.name || feat.index) {
          features.push({
            level,
            name: feat.name || feat.index || 'Feature',
            description: feat.desc || feat.description || '',
            type: 'feature',
            requiresChoice: feat.choice !== undefined,
            choices: feat.choice ? (Array.isArray(feat.choice) ? feat.choice.map((c: any) => ({
              name: typeof c === 'string' ? c : (c.name || c),
              description: typeof c === 'object' ? (c.desc || c.description) : undefined,
            })) : []) : undefined,
          });
        }
      });
    } else if (typeof levelData.features === 'object') {
      Object.entries(levelData.features).forEach(([key, value]: [string, any]) => {
        features.push({
          level,
          name: value.name || key,
          description: value.desc || value.description || '',
          type: 'feature',
        });
      });
    }
  }

  // Check for Ability Score Improvement (ASI) - typically at levels 4, 8, 12, 16, 19
  if (levelData.ability_score_bonuses || levelData.asi) {
    features.push({
      level,
      name: 'Ability Score Improvement',
      description: 'You can increase one ability score of your choice by 2, or two ability scores by 1. You cannot increase an ability score above 20.',
      type: 'asi',
      requiresChoice: true,
    });
  }

  // Check for feature choices
  if (levelData.feature_choices) {
    if (Array.isArray(levelData.feature_choices)) {
      levelData.feature_choices.forEach((choice: any) => {
        features.push({
          level,
          name: choice.name || 'Feature Choice',
          description: choice.desc || choice.description || 'Choose a feature',
          type: 'feature',
          requiresChoice: true,
          choices: choice.choose_from ? (Array.isArray(choice.choose_from) ? choice.choose_from.map((c: any) => ({
            name: typeof c === 'string' ? c : (c.name || c),
            description: typeof c === 'object' ? (c.desc || c.description) : undefined,
          })) : []) : undefined,
        });
      });
    }
  }

  // Check for spell slot increases
  if (levelData.spell_slots_level_1 !== undefined || levelData.spell_slots) {
    features.push({
      level,
      name: 'Spell Slots Increase',
      description: 'Your spellcasting ability has improved. You gain additional spell slots.',
      type: 'spell_slot',
    });
  }

  // Check for spells known increases
  if (levelData.spells_known !== undefined) {
    features.push({
      level,
      name: 'New Spell Known',
      description: `You learn ${levelData.spells_known} new spell(s) of your choice.`,
      type: 'spell_known',
      requiresChoice: true,
    });
  }

  return features;
}

/**
 * Get all features available up to a specific level
 */
export function getAllFeaturesUpToLevel(
  classLevels: any,
  maxLevel: number
): ExtractedFeature[] {
  const allFeatures: ExtractedFeature[] = [];
  
  for (let lvl = 1; lvl <= maxLevel; lvl++) {
    const features = extractFeaturesForLevel(classLevels, lvl);
    allFeatures.push(...features);
  }
  
  return allFeatures;
}

/**
 * Common condition types in D&D 5e
 */
const CONDITION_TYPES = [
  'blinded', 'charmed', 'deafened', 'exhaustion', 'frightened',
  'grappled', 'incapacitated', 'invisible', 'paralyzed', 'petrified',
  'poisoned', 'prone', 'restrained', 'stunned', 'unconscious'
];

/**
 * Extracts defenses (damage resistances, immunities, vulnerabilities, condition immunities) from race traits
 * Supports both JSONB format (from srd_races.traits) and normalized format (from srd_racial_traits)
 * Looks for traits related to damage resistance/immunity/vulnerability and condition immunity
 * 
 * @param traits - Array of trait objects (JSONB or normalized format)
 *   JSONB format: { name: string, index: string, desc?: string }
 *   Normalized format: { name: string, index: string, description?: string }
 */
/**
 * Spell slot progression tables for different caster types
 */
const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1:  [2],
  2:  [3],
  3:  [4, 2],
  4:  [4, 3],
  5:  [4, 3, 2],
  6:  [4, 3, 3],
  7:  [4, 3, 3, 1],
  8:  [4, 3, 3, 2],
  9:  [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
  11: [4, 3, 3, 3, 2, 1],
  12: [4, 3, 3, 3, 2, 1],
  13: [4, 3, 3, 3, 2, 1, 1],
  14: [4, 3, 3, 3, 2, 1, 1],
  15: [4, 3, 3, 3, 2, 1, 1, 1],
  16: [4, 3, 3, 3, 2, 1, 1, 1],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1:  [],
  2:  [2],
  3:  [3],
  4:  [3],
  5:  [4, 2],
  6:  [4, 2],
  7:  [4, 3],
  8:  [4, 3],
  9:  [4, 3, 2],
  10: [4, 3, 2],
  11: [4, 3, 3],
  12: [4, 3, 3],
  13: [4, 3, 3, 1],
  14: [4, 3, 3, 1],
  15: [4, 3, 3, 2],
  16: [4, 3, 3, 2],
  17: [4, 3, 3, 3, 1],
  18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2],
  20: [4, 3, 3, 3, 2],
};

const WARLOCK_SLOTS: Record<number, { slots: number; level: number }> = {
  1:  { slots: 1, level: 1 },
  2:  { slots: 2, level: 1 },
  3:  { slots: 2, level: 2 },
  4:  { slots: 2, level: 2 },
  5:  { slots: 2, level: 3 },
  6:  { slots: 2, level: 3 },
  7:  { slots: 2, level: 4 },
  8:  { slots: 2, level: 4 },
  9:  { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
};

// Classes categorized by spellcasting type
const FULL_CASTERS = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'];
const HALF_CASTERS = ['paladin', 'ranger'];

/**
 * Calculate spell slots based on class and level
 * @param classIndex - The class index (e.g., "wizard", "paladin")
 * @param level - Character level
 * @returns Array of spell slot objects with level, total, and used (0)
 */
export function calculateSpellSlots(
  classIndex: string | null | undefined,
  level: number
): Array<{ level: number; total: number; used: number }> {
  if (!classIndex || level < 1) return [];
  
  const classLower = classIndex.toLowerCase();
  
  // Full casters
  if (FULL_CASTERS.includes(classLower)) {
    const slots = FULL_CASTER_SLOTS[Math.min(level, 20)] || [];
    return slots.map((total, index) => ({
      level: index + 1,
      total,
      used: 0,
    }));
  }
  
  // Half casters
  if (HALF_CASTERS.includes(classLower)) {
    const slots = HALF_CASTER_SLOTS[Math.min(level, 20)] || [];
    return slots.map((total, index) => ({
      level: index + 1,
      total,
      used: 0,
    }));
  }
  
  // Warlock (Pact Magic)
  if (classLower === 'warlock') {
    const pactMagic = WARLOCK_SLOTS[Math.min(level, 20)];
    if (!pactMagic) return [];
    // Warlocks have all slots at the same level
    return [{
      level: pactMagic.level,
      total: pactMagic.slots,
      used: 0,
    }];
  }
  
  // Non-casters or unknown classes
  return [];
}

export function extractDefensesFromTraits(traits: any): {
  damageResistances: string[];
  damageImmunities: string[];
  damageVulnerabilities: string[];
  conditionImmunities: string[];
} {
  const defenses = {
    damageResistances: [] as string[],
    damageImmunities: [] as string[],
    damageVulnerabilities: [] as string[],
    conditionImmunities: [] as string[],
  };

  if (!traits || !Array.isArray(traits)) {
    return defenses;
  }

  for (const trait of traits) {
    const traitName = typeof trait === 'string' ? trait : trait?.name || '';
    const traitIndex = typeof trait === 'object' ? trait?.index || '' : '';
    const traitDesc = typeof trait === 'object' ? (trait?.desc || trait?.description || '') : '';
    
    const searchText = `${traitName} ${traitIndex} ${traitDesc}`.toLowerCase();

    // Check for damage resistance trait
    if (/damage\s*resistance/i.test(searchText) || traitIndex?.includes('damage-resistance')) {
      // Try to extract damage types from description
      const damageTypes = DAMAGE_TYPES.filter(type => 
        new RegExp(`\\b${type}\\b`, 'i').test(traitDesc)
      );
      if (damageTypes.length > 0) {
        defenses.damageResistances.push(...damageTypes);
      } else if (traitIndex?.includes('damage-resistance')) {
        // If it's the damage-resistance trait but no types found, mark as having resistance
        // (specific type would need to come from draconic ancestry or other source)
        defenses.damageResistances.push('(varies)');
      }
    }

    // Check for damage immunity trait
    if (/damage\s*immunity/i.test(searchText) || /immunity.*damage/i.test(searchText)) {
      const damageTypes = DAMAGE_TYPES.filter(type => 
        new RegExp(`\\b${type}\\b`, 'i').test(traitDesc)
      );
      if (damageTypes.length > 0) {
        defenses.damageImmunities.push(...damageTypes);
      }
    }

    // Check for damage vulnerability trait
    if (/damage\s*vulnerability/i.test(searchText) || /vulnerable/i.test(searchText)) {
      const damageTypes = DAMAGE_TYPES.filter(type => 
        new RegExp(`\\b${type}\\b`, 'i').test(traitDesc)
      );
      if (damageTypes.length > 0) {
        defenses.damageVulnerabilities.push(...damageTypes);
      }
    }

    // Check for condition immunity
    if (/condition\s*immunity/i.test(searchText) || /immune.*condition/i.test(searchText)) {
      const conditions = CONDITION_TYPES.filter(condition => 
        new RegExp(`\\b${condition}\\b`, 'i').test(traitDesc)
      );
      if (conditions.length > 0) {
        defenses.conditionImmunities.push(...conditions);
      }
    }

    // Check for specific trait names that grant immunities/resistances
    // Common examples: Fey Ancestry (charm immunity), Dwarven Resilience (poison resistance)
    if (/fey\s*ancestry/i.test(searchText)) {
      if (!defenses.conditionImmunities.includes('charmed')) {
        defenses.conditionImmunities.push('charmed');
      }
      // Fey Ancestry also typically grants immunity to magical sleep, but that's not a condition
    }
    
    if (/dwarven\s*resilience/i.test(searchText) || /dwarven.*resistance/i.test(searchText)) {
      if (!defenses.damageResistances.includes('poison')) {
        defenses.damageResistances.push('poison');
      }
      if (!defenses.conditionImmunities.includes('poisoned')) {
        // Dwarven Resilience typically includes poison damage resistance and poisoned condition advantage, not immunity
        // But checking for it anyway
      }
    }
  }

  // Remove duplicates
  defenses.damageResistances = [...new Set(defenses.damageResistances)];
  defenses.damageImmunities = [...new Set(defenses.damageImmunities)];
  defenses.damageVulnerabilities = [...new Set(defenses.damageVulnerabilities)];
  defenses.conditionImmunities = [...new Set(defenses.conditionImmunities)];

  return defenses;
}

/**
 * Calculate total weight of inventory items
 * @param items - Array of enriched inventory items
 * @returns Total weight in pounds
 */
export function calculateInventoryWeight(items: Array<{ quantity: number; equipmentData?: { weight?: number | null } }>): number {
  return items.reduce((total, item) => {
    const itemWeight = item.equipmentData?.weight ?? 0;
    return total + (itemWeight * item.quantity);
  }, 0);
}

/**
 * Calculate carrying capacity based on strength
 * Standard D&D 5e rule: STR × 15 pounds
 * @param strength - Character's strength score
 * @returns Carrying capacity in pounds
 */
export function calculateCarryingCapacity(strength: number): number {
  return strength * 15;
}

/**
 * Determine encumbrance status based on weight and capacity
 * @param weight - Current weight carried in pounds
 * @param capacity - Carrying capacity in pounds
 * @returns Encumbrance status
 */
export function getEncumbranceStatus(
  weight: number,
  capacity: number
): 'unencumbered' | 'encumbered' | 'heavily_encumbered' {
  if (weight <= capacity) {
    return 'unencumbered';
  } else if (weight <= capacity * 2) {
    return 'encumbered';
  } else {
    return 'heavily_encumbered';
  }
}

/**
 * Ability score short names to full names mapping
 */
export const ABILITY_NAMES = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
} as const;

export type AbilityShort = keyof typeof ABILITY_NAMES;
export type AbilityFull = typeof ABILITY_NAMES[AbilityShort];

/**
 * Expands an ability abbreviation to a properly capitalized full name
 * Handles formats like "STR", "str", "Str", "strength", etc.
 * @param abbrev - The ability abbreviation or full name
 * @returns The full ability name capitalized (e.g., "Strength", "Dexterity")
 */
export function getFullAbilityName(abbrev: string | null | undefined): string {
  if (!abbrev) return '';
  
  const normalized = abbrev.toLowerCase().trim();
  
  // Handle abbreviations
  const shortToFull: Record<string, string> = {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  };
  
  // Check if it's an abbreviation (3 letters)
  if (normalized.length === 3 && shortToFull[normalized]) {
    return shortToFull[normalized];
  }
  
  // Handle full names - capitalize first letter
  const fullNames = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  if (fullNames.includes(normalized)) {
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }
  
  // Return original with first letter capitalized as fallback
  return abbrev.charAt(0).toUpperCase() + abbrev.slice(1).toLowerCase();
}

/**
 * Calculate saving throw proficiencies from all sources:
 * 1. Class saving throw proficiencies (primary source)
 * 2. Racial traits (some races grant saving throw advantages/proficiencies)
 * 3. Manual overrides from character data
 * 
 * @param classSavingThrows - Array of ability short names from class (e.g., ['STR', 'CON'])
 * @param raceTraits - Race traits that might grant saving throw benefits
 * @param manualProficiencies - Manual proficiency overrides from character data
 * @returns Object with proficiency status for each saving throw
 */
export function calculateSavingThrowProficiencies(
  classSavingThrows?: string[] | null,
  raceTraits?: any,
  manualProficiencies?: {
    strength?: boolean;
    dexterity?: boolean;
    constitution?: boolean;
    intelligence?: boolean;
    wisdom?: boolean;
    charisma?: boolean;
  }
): Record<AbilityFull, boolean> {
  const proficiencies: Record<AbilityFull, boolean> = {
    strength: false,
    dexterity: false,
    constitution: false,
    intelligence: false,
    wisdom: false,
    charisma: false,
  };

  // 1. Apply class saving throw proficiencies
  if (classSavingThrows && Array.isArray(classSavingThrows)) {
    classSavingThrows.forEach((saveStr) => {
      // Handle different formats: "STR", "Str", "strength", etc.
      const normalized = saveStr.toLowerCase().trim();
      
      // Map short names to full names
      if (normalized === 'str' || normalized === 'strength') {
        proficiencies.strength = true;
      } else if (normalized === 'dex' || normalized === 'dexterity') {
        proficiencies.dexterity = true;
      } else if (normalized === 'con' || normalized === 'constitution') {
        proficiencies.constitution = true;
      } else if (normalized === 'int' || normalized === 'intelligence') {
        proficiencies.intelligence = true;
      } else if (normalized === 'wis' || normalized === 'wisdom') {
        proficiencies.wisdom = true;
      } else if (normalized === 'cha' || normalized === 'charisma') {
        proficiencies.charisma = true;
      }
    });
  }

  // 2. Check race traits for saving throw proficiencies
  // Some races might grant proficiency in specific saving throws
  if (raceTraits && Array.isArray(raceTraits)) {
    raceTraits.forEach((trait: any) => {
      const traitName = typeof trait === 'string' ? trait : trait?.name || '';
      const traitDesc = typeof trait === 'object' ? (trait?.desc || trait?.description || '') : '';
      const searchText = `${traitName} ${traitDesc}`.toLowerCase();

      // Check for saving throw proficiency grants in trait descriptions
      // Pattern: "proficiency in [ability] saving throws" or "proficient in [ability] saves"
      const abilities: AbilityFull[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
      
      abilities.forEach((ability) => {
        const profPattern = new RegExp(`\\b(proficiency|proficient)\\s+(?:in\\s+)?(?:the\\s+)?${ability}\\s+(?:saving\\s+throws?|saves?)\\b`, 'i');
        if (profPattern.test(searchText) && !proficiencies[ability]) {
          proficiencies[ability] = true;
        }
      });
    });
  }

  // 3. Apply manual overrides (these take precedence if explicitly set to true)
  if (manualProficiencies) {
    Object.entries(manualProficiencies).forEach(([ability, isProficient]) => {
      if (isProficient === true) {
        proficiencies[ability as AbilityFull] = true;
      }
    });
  }

  return proficiencies;
}
