// Multiclass utility functions for D&D 5e multiclassing support

export interface CharacterClass {
  class_source: 'srd' | 'homebrew';
  class_index: string;
  level: number;
  subclass_source?: 'srd' | 'homebrew' | null;
  subclass_index?: string | null;
  is_primary_class?: boolean;
  level_acquired_at?: number;
}

export type CasterType = 'full' | 'half' | 'third' | 'warlock' | 'none';

/**
 * Get the caster type for a given class
 * Determines how spell slots are calculated for multiclassing
 */
export function getCasterType(classIndex: string): CasterType {
  const classLower = classIndex.toLowerCase();
  
  // Full casters: 1 level = 1 caster level
  const fullCasters = ['bard', 'cleric', 'druid', 'sorcerer', 'wizard'];
  if (fullCasters.includes(classLower)) {
    return 'full';
  }
  
  // Half casters: 1 level = 0.5 caster level (rounded down)
  const halfCasters = ['paladin', 'ranger'];
  if (halfCasters.includes(classLower)) {
    return 'half';
  }
  
  // Third casters: 1 level = 0.33 caster level (rounded down)
  // Note: These are subclasses, but we'll check for them if needed
  // For now, we'll need subclass info to determine this
  
  // Warlock: Pact Magic (separate from spell slot progression)
  if (classLower === 'warlock') {
    return 'warlock';
  }
  
  return 'none';
}

/**
 * Get the caster type for a subclass (for third casters like Eldritch Knight)
 */
export function getSubclassCasterType(subclassIndex: string): CasterType | null {
  const subclassLower = subclassIndex.toLowerCase();
  
  // Third caster subclasses
  const thirdCasterSubclasses = [
    'eldritch-knight', // Fighter
    'arcane-trickster', // Rogue
  ];
  
  if (thirdCasterSubclasses.includes(subclassLower)) {
    return 'third';
  }
  
  return null;
}

/**
 * Calculate combined caster level for multiclass spell slot calculation
 * Returns the total effective caster level based on D&D 5e multiclass rules
 */
export function calculateCombinedCasterLevel(
  characterClasses: CharacterClass[]
): number {
  let totalCasterLevel = 0;
  
  for (const charClass of characterClasses) {
    const casterType = getCasterType(charClass.class_index);
    
    switch (casterType) {
      case 'full':
        totalCasterLevel += charClass.level;
        break;
      case 'half':
        totalCasterLevel += Math.floor(charClass.level / 2);
        break;
      case 'third':
        // Check if subclass is a third caster
        if (charClass.subclass_index) {
          const subclassType = getSubclassCasterType(charClass.subclass_index);
          if (subclassType === 'third') {
            totalCasterLevel += Math.floor(charClass.level / 3);
          }
        }
        break;
      case 'warlock':
        // Warlock doesn't contribute to multiclass spell slots
        break;
      case 'none':
        break;
    }
  }
  
  return totalCasterLevel;
}

/**
 * Multiclass spell slot table (from D&D 5e Player's Handbook)
 * Index represents combined caster level (1-20)
 * Array represents spell slots: [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, 9th]
 */
const MULTICLASS_SPELL_SLOT_TABLE: Record<number, number[]> = {
  1:  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  2:  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  3:  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  4:  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  5:  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  6:  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  7:  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  8:  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  9:  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

/**
 * Get multiclass spell slots based on combined caster level
 * Returns array of spell slot objects: [{level: 1, total: 4, used: 0}, ...]
 */
export function getMulticlassSpellSlots(
  combinedCasterLevel: number
): Array<{ level: number; total: number; used: number }> {
  const cappedLevel = Math.min(Math.max(combinedCasterLevel, 1), 20);
  const slots = MULTICLASS_SPELL_SLOT_TABLE[cappedLevel] || [];
  
  return slots
    .map((total, index) => ({
      level: index + 1,
      total,
      used: 0,
    }))
    .filter(slot => slot.total > 0);
}

/**
 * Multiclass prerequisites for each class
 * A character must have at least 13 in the specified ability to multiclass into that class
 */
const MULTICLASS_PREREQUISITES: Record<string, string> = {
  barbarian: 'strength',
  paladin: 'strength',
  monk: 'dexterity',
  ranger: 'dexterity',
  rogue: 'dexterity',
  wizard: 'intelligence',
  cleric: 'wisdom',
  druid: 'wisdom',
  bard: 'charisma',
  sorcerer: 'charisma',
  warlock: 'charisma',
  fighter: null, // Fighter doesn't have prerequisites
  wizard: 'intelligence',
};

/**
 * Check if a character meets the prerequisites to multiclass into a given class
 * Returns null if prerequisites are met, or an error message if not
 */
export function checkMulticlassPrerequisites(
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  },
  classToAdd: string
): string | null {
  const classLower = classToAdd.toLowerCase();
  const requiredAbility = MULTICLASS_PREREQUISITES[classLower];
  
  if (!requiredAbility) {
    // No prerequisites (e.g., Fighter)
    return null;
  }
  
  const abilityScore = abilityScores[requiredAbility as keyof typeof abilityScores];
  
  if (abilityScore < 13) {
    const abilityName = requiredAbility.charAt(0).toUpperCase() + requiredAbility.slice(1);
    return `Requires ${abilityName} 13 or higher (Current: ${abilityScore})`;
  }
  
  return null;
}

/**
 * Calculate hit dice breakdown for multiclass characters
 * Returns object with hit dice counts: {d6: 2, d8: 3, d10: 1}
 */
export function getHitDiceBreakdown(
  characterClasses: CharacterClass[],
  classDataMap?: Map<string, { hit_die: number }>
): Record<string, number> {
  const hitDice: Record<string, number> = {};
  
  for (const charClass of characterClasses) {
    // Get hit die for this class
    let hitDie: number;
    
    if (classDataMap) {
      const classData = classDataMap.get(`${charClass.class_source}:${charClass.class_index}`);
      hitDie = classData?.hit_die || 8; // Default to d8 if not found
    } else {
      // Fallback: use common hit die values
      const hitDieMap: Record<string, number> = {
        wizard: 6,
        sorcerer: 6,
        bard: 8,
        cleric: 8,
        druid: 8,
        monk: 8,
        rogue: 8,
        ranger: 10,
        paladin: 10,
        fighter: 10,
        barbarian: 12,
        warlock: 8,
      };
      hitDie = hitDieMap[charClass.class_index.toLowerCase()] || 8;
    }
    
    const dieKey = `d${hitDie}`;
    hitDice[dieKey] = (hitDice[dieKey] || 0) + charClass.level;
  }
  
  return hitDice;
}

/**
 * Get total character level from all classes
 */
export function getTotalCharacterLevel(characterClasses: CharacterClass[]): number {
  return characterClasses.reduce((sum, charClass) => sum + charClass.level, 0);
}

/**
 * Get primary class (first class selected)
 */
export function getPrimaryClass(characterClasses: CharacterClass[]): CharacterClass | null {
  return characterClasses.find(c => c.is_primary_class) || characterClasses[0] || null;
}

/**
 * Check if character already has a specific class
 */
export function hasClass(
  characterClasses: CharacterClass[],
  classSource: 'srd' | 'homebrew',
  classIndex: string
): boolean {
  return characterClasses.some(
    c => c.class_source === classSource && c.class_index === classIndex
  );
}
