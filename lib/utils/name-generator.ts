// Markov chain-based fantasy name generator for D&D
// Uses character-level Markov chains trained on fantasy name datasets

export type NameCategory = 'character' | 'npc' | 'location' | 'faction' | 'tavern' | 'shop';

// Training data for different name types
const ELVEN_FIRST_NAMES = [
  'Aelar', 'Aerendyl', 'Alandris', 'Alustriel', 'Aravaris', 'Arwen', 'Caladrel', 'Celdorn',
  'Daevan', 'Elaith', 'Elenwe', 'Faelar', 'Faelwen', 'Galadriel', 'Ithilwen', 'Laelith',
  'Legolas', 'Liriel', 'Lothiriel', 'Maelwen', 'Naevys', 'Nimue', 'Raeleth', 'Saelihn',
  'Thaedris', 'Thaeris', 'Thranduil', 'Valaeth', 'Varis', 'Aeris', 'Caelith',
  'Daenys', 'Eira', 'Elaria', 'Faye', 'Lirael', 'Lysara', 'Mirael', 'Nimloth', 'Rillifane',
  'Saelwen', 'Sylphie', 'Taelia', 'Valeria', 'Ylthari', 'Zephyrine', 'Alatariel', 'Aranel',
  'Celeborn', 'Celebrimbor', 'Erestor', 'Gil-galad', 'Glorfindel', 'Lindir', 'Melian', 'Nimrodel'
];

const ELVEN_LAST_NAMES = [
  'Moonwhisper', 'Starweaver', 'Windrider', 'Leafwhisper', 'Silverleaf', 'Goldenleaf',
  'Shadowdancer', 'Stardust', 'Moonbeam', 'Sunfire', 'Nightbreeze', 'Dawnsong', 'Eveningstar',
  'Riverflow', 'Forestborn', 'Treewalker', 'Skyweaver', 'Clouddancer', 'Starborn', 'Moonborn',
  'Lightbringer', 'Shadowsong', 'Silvermoon', 'Goldensun', 'Starfall', 'Moonfall', 'Rainbow',
  'Dreamweaver', 'Songweaver', 'Spellweaver', 'Magicborn', 'Natureborn', 'Earthborn', 'Waterborn',
  'Fireborn', 'Airborn', 'Elemental', 'Mystic', 'Arcane', 'Ancient', 'Eternal', 'Timeless',
  'Ageless', 'Immortal', 'Celestial', 'Divine', 'Sacred', 'Blessed', 'Pure', 'Radiant'
];

const ELVEN_NAMES = [...ELVEN_FIRST_NAMES, ...ELVEN_LAST_NAMES];

const DWARVEN_FIRST_NAMES = [
  'Balin', 'Barduk', 'Bofur', 'Bombur', 'Dain', 'Durin', 'Fargrim', 'Fili', 'Gimli',
  'Glondar', 'Gorak', 'Grimnir', 'Harbek', 'Kili', 'Korak', 'Mordek', 'Nain', 'Norak',
  'Oin', 'Ori', 'Orin', 'Thorin', 'Thrain', 'Thror', 'Tormak', 'Urist', 'Vondal',
  'Waldis', 'Balderk', 'Barak', 'Berdrak', 'Bifur', 'Dolgrin', 'Durgeddin', 'Faragrim',
  'Garrick', 'Grimbold', 'Kildrak', 'Morgran', 'Ragnar', 'Torvald', 'Ulfgar', 'Volund',
  'Zagrak', 'Bofurr', 'Thorin', 'Harbek', 'Dwalin', 'Balin', 'Oin', 'Glóin', 'Bifur',
  'Bombur', 'Dori', 'Nori', 'Ori', 'Fíli', 'Kíli'
];

const DWARVEN_LAST_NAMES = [
  'Ironforge', 'Stonebreaker', 'Goldaxe', 'Silverhammer', 'Bronzebeard', 'Ironfist',
  'Steelbeard', 'Copperforge', 'Ironheart', 'Stoneheart', 'Goldheart', 'Ironwill',
  'Stonewill', 'Mountainborn', 'Deepdelver', 'Cavernborn', 'Undermountain', 'Underforge',
  'Deepforge', 'Mountainforge', 'Stoneforge', 'Ironforge', 'Fireforge', 'Steelforge',
  'Anvilborn', 'Hammerborn', 'Axehand', 'Pickaxe', 'Shieldbreaker', 'Mountaincrag',
  'Stonecrag', 'Ironcrag', 'Deepcrag', 'Mountainpeak', 'Stonepeak', 'Ironpeak',
  'Deepdweller', 'Mountaindweller', 'Stonedweller', 'Ironsmith', 'Goldsmith', 'Silversmith',
  'Stonesmith', 'Deepdigger', 'Mountaindigger', 'Stonedigger', 'Ironbeard', 'Goldbeard'
];

const DWARVEN_NAMES = [...DWARVEN_FIRST_NAMES, ...DWARVEN_LAST_NAMES];

const HUMAN_FIRST_NAMES = [
  'Aldric', 'Bartholomew', 'Cedric', 'Derek', 'Edmund', 'Fenris', 'Gareth', 'Hector',
  'Ivan', 'Jareth', 'Kael', 'Luther', 'Marcus', 'Nathan', 'Owen', 'Percy', 'Quinn',
  'Roland', 'Sebastian', 'Tristan', 'Ulric', 'Victor', 'William', 'Xavier', 'Yorick',
  'Zachary', 'Adelaide', 'Brienne', 'Catherine', 'Diana', 'Eleanor', 'Fiona', 'Gwen',
  'Helena', 'Isabella', 'Jasmine', 'Katherine', 'Lillian', 'Morgan', 'Natalie', 'Ophelia',
  'Penelope', 'Rosalind', 'Seraphina', 'Theresa', 'Ursula', 'Victoria', 'Wendy',
  'Xara', 'Yvonne', 'Zara', 'Alden', 'Bram', 'Cassian', 'Dorian', 'Elias', 'Felix',
  'Gideon', 'Hugo', 'Julian', 'Kieran', 'Lucian', 'Magnus', 'Nolan', 'Orion', 'Phoenix',
  'Quincy', 'Rhys', 'Silas', 'Theodore', 'Vincent', 'Warren', 'Zephyr'
];

const HUMAN_LAST_NAMES = [
  'Blackwood', 'Brightwater', 'Crimson', 'Darkwood', 'Elderbrook', 'Frostbane', 'Goldleaf',
  'Hawthorne', 'Ironforge', 'Kingsley', 'Lightfoot', 'Moonwhisper', 'Nightshade', 'Oakenshield',
  'Pinecrest', 'Ravenwood', 'Shadowmere', 'Stonebrook', 'Thornfield', 'Valefor', 'Westbrook',
  'Wintersong', 'Ashford', 'Barrow', 'Crestwood', 'Dunwich', 'Evergreen', 'Fairfax', 'Greystone',
  'Holloway', 'Ironside', 'Jasper', 'Kingsbridge', 'Longfellow', 'Meadows', 'Northwood', 'Osgood',
  'Pendragon', 'Quill', 'Redford', 'Stormborn', 'Thornhill', 'Underwood', 'Vale', 'Westerly',
  'York', 'Zephyr', 'Ashworth', 'Blackthorne', 'Caldwell', 'Devon', 'Ellsworth', 'Frost',
  'Grayson', 'Hartford', 'Iverson', 'Johnson', 'Kendrick', 'Lockwood', 'Merrill', 'Nash',
  'Parker', 'Quinn', 'Randall', 'Sutherland', 'Thorne', 'Vaughn', 'Walsh', 'Yates'
];

const HUMAN_NAMES = [...HUMAN_FIRST_NAMES, ...HUMAN_LAST_NAMES];

const LOCATION_NAMES = [
  'Blackwood', 'Brightvale', 'Dragonreach', 'Elderwood', 'Frosthold', 'Goldenshire',
  'Highgate', 'Ironforge', 'Mistywood', 'Northwatch', 'Oakhaven', 'Ravenhold',
  'Shadowmere', 'Silvermoon', 'Stormwind', 'Thornfield', 'Westmarch', 'Winterfell',
  'Brightwater', 'Crimsonvale', 'Deepwood', 'Ebonhold', 'Fairharbor', 'Greymoor',
  'Hollowbrook', 'Ivorytower', 'Jadepass', 'Kingsbridge', 'Lionsgate', 'Moonshadow',
  'Northwood', 'Oldstone', 'Pinecrest', 'Quietvale', 'Redcliff', 'Stonemoor',
  'Twinpeaks', 'Uphill', 'Valleybrook', 'Whitecliff', 'Yellowstone', 'Zenithpeak'
];

const FACTION_NAMES = [
  'Order of the Silver Hand', 'Guild of Shadow', 'Circle of Mages', 'Knights of the Round',
  'The Red Company', 'The Black Order', 'Guardians of Light', 'Brotherhood of Steel',
  'The Crimson Covenant', 'Golden Circle', 'The Hidden Blade', 'League of Merchants',
  'The Sacred Flame', 'Brothers of the Moon', 'The Iron Fist', 'Order of the Phoenix',
  'The Sapphire Guard', 'The Emerald Council', 'The Dark Pact', 'The White Rose',
  'Thieves Guild', 'Mages Guild', 'Warriors Guild', 'Traders Guild', 'Artisans Guild'
];

const TAVERN_NAMES = [
  'The Prancing Pony', 'The Rusty Anchor', 'The Drunken Dragon', 'The Silver Spoon',
  'The Broken Blade', 'The Crooked Staff', 'The Laughing Gnome', 'The Weeping Willow',
  'The Three Feathers', 'The Golden Griffon', 'The Blue Moon', 'The Red Lion',
  'The Quiet Quill', 'The Boisterous Badger', 'The Traveler\'s Rest', 'The Wayfarer\'s Inn',
  'The Staggering Stag', 'The Merry Merchant', 'The Tipsy Tavern', 'The Wandering Wizard',
  'The Thirsty Goblin', 'The Prancing Unicorn', 'The Singing Sword', 'The Dancing Bear',
  'The Winking Eye', 'The Broken Arrow', 'The Green Dragon', 'The White Hart'
];

const SHOP_NAMES = [
  'The Enchanted Emporium', 'The Curious Curio', 'The Mystical Merchant', 'The Artisan\'s Alley',
  'The Wondrous Wares', 'The Magical Market', 'The Trusty Trade', 'The Grand Goods',
  'The Fine Finds', 'The Rare Relics', 'The Golden Goods', 'The Silver Smith',
  'The Ironworks', 'The Alchemist\'s Shop', 'The Wizard\'s Tower', 'The Thieves\' Den'
];

/**
 * Markov Chain implementation for name generation
 */
class MarkovChain {
  private transitions: Map<string, Map<string, number>> = new Map();
  private startChars: Map<string, number> = new Map();
  private endChars: Set<string> = new Set();
  private order: number;

  constructor(order: number = 2) {
    this.order = order;
  }

  /**
   * Train the Markov chain on a dataset of names
   */
  train(names: string[]): void {
    this.transitions.clear();
    this.startChars.clear();
    this.endChars.clear();

    for (const name of names) {
      const normalized = name.toLowerCase().trim();
      if (normalized.length < this.order) continue;

      // Track start sequences
      const start = normalized.substring(0, this.order);
      this.startChars.set(start, (this.startChars.get(start) || 0) + 1);

      // Track end characters
      this.endChars.add(normalized[normalized.length - 1]);

      // Build transition map
      for (let i = 0; i <= normalized.length - this.order; i++) {
        const current = normalized.substring(i, i + this.order);
        const next = i + this.order < normalized.length 
          ? normalized[i + this.order] 
          : null;

        if (!this.transitions.has(current)) {
          this.transitions.set(current, new Map());
        }

        const transitions = this.transitions.get(current)!;
        
        if (next) {
          transitions.set(next, (transitions.get(next) || 0) + 1);
        }
      }
    }
  }

  /**
   * Generate a name using the Markov chain
   */
  generate(minLength: number = 3, maxLength: number = 12, allowSpaces: boolean = false): string {
    if (this.startChars.size === 0) {
      throw new Error('Markov chain has not been trained yet');
    }

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      attempts++;

      // Choose a random start sequence with temperature for variety
      // Use higher temperature to favor less common starts sometimes
      let startTemperature = 1.5 + Math.random() * 1.5; // 1.5 to 3.0 (more random by default)
      
      // More often (35% chance) pick a completely random start for maximum variety
      let start: string;
      if (Math.random() < 0.35) {
        const allStarts = Array.from(this.startChars.keys());
        start = allStarts[Math.floor(Math.random() * allStarts.length)];
      } else {
        start = this.chooseWeightedRandom(this.startChars, startTemperature);
      }
      
      // If we picked a very common start (like "the"), try again with very high temperature
      // Do this multiple times if needed to get variety
      let retries = 0;
      while (start.toLowerCase().startsWith('the') && retries < 3 && Math.random() < 0.6) {
        startTemperature = 4.0 + Math.random() * 2.0; // Very high temperature (4.0 to 6.0)
        start = this.chooseWeightedRandom(this.startChars, startTemperature);
        retries++;
        
        // If still "the", try completely random
        if (start.toLowerCase().startsWith('the') && retries >= 2) {
          const allStarts = Array.from(this.startChars.keys());
          const nonTheStarts = allStarts.filter(s => !s.toLowerCase().startsWith('the'));
          if (nonTheStarts.length > 0) {
            start = nonTheStarts[Math.floor(Math.random() * nonTheStarts.length)];
            break;
          }
        }
      }
      
      let name = start;
      
      // Track recent characters to detect repetition
      const recentChars: string[] = [];
      const maxRecent = 4;
      
      // Build the name character by character
      while (name.length < maxLength) {
        const current = name.substring(name.length - this.order);
        const transitions = this.transitions.get(current);

        if (!transitions || transitions.size === 0) {
          break;
        }

        // Detect repetitive patterns
        const isRepetitive = recentChars.length >= 2 && 
          recentChars[recentChars.length - 1] === recentChars[recentChars.length - 2];
        
        // Vary temperature during generation for more variety
        // Early in name: more random (explore), later: more deterministic (exploit)
        const positionRatio = name.length / maxLength;
        let baseTemperature = 1.2; // Base randomness
        
        // Increase temperature if we detect repetition
        if (isRepetitive) {
          baseTemperature += 0.8; // More randomness to break patterns
        }
        
        const temperature = baseTemperature + (1.0 - positionRatio) * 0.8; // 1.2 to 2.0 (or higher if repetitive)
        
        // Occasionally (10% chance) use very high temperature for exploration
        // More likely if we're seeing repetition
        const explorationChance = isRepetitive ? 0.25 : 0.1;
        const useHighTemp = Math.random() < explorationChance;
        const finalTemp = useHighTemp ? 3.0 : temperature;
        
        // Choose next character with temperature-based randomness
        let nextChar = this.chooseWeightedRandom(transitions, finalTemp);
        
        // If we're in a repetitive pattern, occasionally pick a completely random character
        if (isRepetitive && Math.random() < 0.3 && transitions.size > 1) {
          const allChars = Array.from(transitions.keys());
          // Prefer characters we haven't used recently
          const unusedChars = allChars.filter(c => !recentChars.includes(c));
          if (unusedChars.length > 0) {
            nextChar = unusedChars[Math.floor(Math.random() * unusedChars.length)];
          } else {
            // If all chars were used, just pick randomly
            nextChar = allChars[Math.floor(Math.random() * allChars.length)];
          }
        }
        
        // Update recent characters tracking
        recentChars.push(nextChar);
        if (recentChars.length > maxRecent) {
          recentChars.shift();
        }
        
        // Don't add character if it would exceed maxLength (unless we're way under minLength)
        if (name.length + 1 > maxLength && name.length >= minLength) {
          break;
        }
        
        name += nextChar;

        // Check if we should stop (hit an end character and have minimum length)
        if (name.length >= minLength && this.endChars.has(nextChar)) {
          // For multi-word names (factions), never stop on spaces - only stop at actual end
          if (allowSpaces && nextChar === ' ') {
            // Continue after spaces - don't stop mid-phrase
            continue;
          }
          
          // Special check: Don't stop if we're in "The [single letter]" pattern
          // This prevents cutoffs like "The S", "The E", "The M"
          if (allowSpaces) {
            const lastSpaceIndex = name.lastIndexOf(' ');
            if (lastSpaceIndex >= 0) {
              const wordAfterSpace = name.substring(lastSpaceIndex + 1);
              // If we just added a character after a space and it's a single letter, continue
              if (wordAfterSpace.length <= 1 && name.length < maxLength * 0.6) {
                continue;
              }
            }
          }
          
          // Calculate stopping probability based on current length and target maxLength
          // For longer target lengths, be much less aggressive about stopping
          const lengthRatio = name.length / maxLength;
          let continueProbability: number;
          
          if (maxLength >= 18) {
            // For long names (locations, factions), be very lenient
            // For factions with spaces, be even more lenient
            if (allowSpaces) {
              // For very short names, almost never stop (to avoid "The S" type cutoffs)
              if (name.length < 12) {
                continueProbability = 0.98; // 98% chance to continue
              } else if (name.length < 18) {
                continueProbability = 0.85; // 85% chance to continue
              } else {
                continueProbability = lengthRatio < 0.6 ? 0.1 : lengthRatio < 0.75 ? 0.25 : lengthRatio < 0.9 ? 0.4 : 0.5;
              }
            } else {
              continueProbability = lengthRatio < 0.4 ? 0.05 : lengthRatio < 0.6 ? 0.15 : lengthRatio < 0.8 ? 0.3 : 0.5;
            }
          } else if (maxLength >= 14) {
            // For medium-long names
            continueProbability = lengthRatio < 0.5 ? 0.1 : lengthRatio < 0.7 ? 0.25 : 0.4;
          } else {
            // For shorter names, use original logic but be less aggressive
            continueProbability = name.length < 6 ? 0.1 : name.length < 10 ? 0.3 : 0.5;
          }
          
          if (Math.random() > continueProbability) {
            break;
          }
        }
      }
      
      // For multi-word names, if we ended on a space, try to continue or trim it
      if (allowSpaces && name.endsWith(' ')) {
        // Try to add one more word if we have room
        const current = name.trimEnd().substring(name.trimEnd().length - this.order);
        const transitions = this.transitions.get(current);
        if (transitions && transitions.size > 0 && name.length < maxLength) {
          const nextChar = this.chooseWeightedRandom(transitions);
          if (nextChar !== ' ') {
            name = name.trimEnd() + nextChar;
          }
        } else {
          // Trim trailing space if we can't continue
          name = name.trimEnd();
        }
      }

      // Validate the generated name
      if (name.length >= minLength && name.length <= maxLength) {
        const capitalized = this.capitalizeName(name);
        // For multi-word names (factions), if we're reasonably long but have no space, try again
        // This prevents single-word faction names when they should be phrases
        if (allowSpaces && !capitalized.includes(' ') && capitalized.length >= 8 && attempts < maxAttempts - 10) {
          // Only reject if we have plenty of attempts left
          continue;
        }
        return capitalized;
      }
    }

    // Fallback if generation failed
    return this.capitalizeName(this.chooseWeightedRandom(this.startChars));
  }

  /**
   * Choose a random key from a weighted map with temperature for variety
   */
  private chooseWeightedRandom<T>(weightMap: Map<T, number>, temperature: number = 1.0): T {
    const items: T[] = [];
    const weights: number[] = [];

    for (const [item, weight] of weightMap.entries()) {
      items.push(item);
      // Apply temperature: higher temperature = more randomness, less weight on frequency
      // Temperature < 1 makes it more deterministic, > 1 makes it more random
      weights.push(Math.pow(weight, 1.0 / temperature));
    }

    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1];
  }

  /**
   * Capitalize a generated name appropriately
   */
  private capitalizeName(name: string): string {
    // Handle apostrophes and hyphens
    return name
      .split(/[\s'-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(name.includes("'") ? "'" : name.includes("-") ? "-" : " ");
  }
}

// Pre-trained Markov chains for each category
const chains: Map<NameCategory, MarkovChain> = new Map();
const raceChains: Map<string, MarkovChain> = new Map();
const firstNameChains: Map<string, MarkovChain> = new Map();
const lastNameChains: Map<string, MarkovChain> = new Map();

// Initialize chains for first and last names separately (for NPCs)
function getFirstNameChain(race?: string): MarkovChain {
  const key = race || 'default';
  
  if (firstNameChains.has(key)) {
    return firstNameChains.get(key)!;
  }

  const chain = new MarkovChain(2);
  let trainingData: string[] = [];

  const raceLower = (race || '').toLowerCase();
  if (raceLower.includes('elf') || raceLower.includes('elven')) {
    trainingData = ELVEN_FIRST_NAMES;
  } else if (raceLower.includes('dwarf') || raceLower.includes('dwarven')) {
    trainingData = DWARVEN_FIRST_NAMES;
  } else {
    trainingData = HUMAN_FIRST_NAMES;
  }

  chain.train(trainingData);
  firstNameChains.set(key, chain);
  return chain;
}

function getLastNameChain(race?: string): MarkovChain {
  const key = race || 'default';
  
  if (lastNameChains.has(key)) {
    return lastNameChains.get(key)!;
  }

  const chain = new MarkovChain(2);
  let trainingData: string[] = [];

  const raceLower = (race || '').toLowerCase();
  if (raceLower.includes('elf') || raceLower.includes('elven')) {
    trainingData = ELVEN_LAST_NAMES;
  } else if (raceLower.includes('dwarf') || raceLower.includes('dwarven')) {
    trainingData = DWARVEN_LAST_NAMES;
  } else {
    trainingData = HUMAN_LAST_NAMES;
  }

  chain.train(trainingData);
  lastNameChains.set(key, chain);
  return chain;
}

// Initialize chains
function getChain(category: NameCategory, race?: string): MarkovChain {
  const key = race ? `${category}-${race}` : category;

  if (race && raceChains.has(key)) {
    return raceChains.get(key)!;
  }

  if (!race && chains.has(category)) {
    return chains.get(category)!;
  }

  const chain = new MarkovChain(2);
  let trainingData: string[] = [];

  // Determine training data based on category and race
  if (race) {
    const raceLower = race.toLowerCase();
    if (raceLower.includes('elf') || raceLower.includes('elven')) {
      trainingData = ELVEN_NAMES;
    } else if (raceLower.includes('dwarf') || raceLower.includes('dwarven')) {
      trainingData = DWARVEN_NAMES;
    } else {
      trainingData = HUMAN_NAMES;
    }
  } else {
    switch (category) {
      case 'character':
      case 'npc':
        trainingData = [...HUMAN_NAMES, ...ELVEN_NAMES, ...DWARVEN_NAMES];
        break;
      case 'location':
        trainingData = LOCATION_NAMES;
        break;
      case 'faction':
        trainingData = FACTION_NAMES;
        break;
      case 'tavern':
        trainingData = TAVERN_NAMES;
        break;
      case 'shop':
        trainingData = SHOP_NAMES;
        break;
      default:
        trainingData = HUMAN_NAMES;
    }
  }

  chain.train(trainingData);
  
  if (race) {
    raceChains.set(key, chain);
  } else {
    chains.set(category, chain);
  }

  return chain;
}

/**
 * Generate a single name using Markov chains
 */
export function generateName(category: NameCategory, race?: string, minLength?: number, maxLength?: number): string {
  // For NPCs, generate first + last name combination
  if (category === 'npc') {
    try {
      const firstNameChain = getFirstNameChain(race);
      const lastNameChain = getLastNameChain(race);
      
      // Generate first name with variation (4-12 characters, sometimes longer)
      const firstNameMin = 4;
      const firstNameMax = Math.random() > 0.3 ? 12 : 16; // 30% chance for longer names
      const firstName = firstNameChain.generate(firstNameMin, firstNameMax);
      
      // Generate last name with variation (5-15 characters, sometimes longer)
      const lastNameMin = 5;
      const lastNameMax = Math.random() > 0.3 ? 15 : 20; // 30% chance for longer names
      const lastName = lastNameChain.generate(lastNameMin, lastNameMax);
      
      return `${firstName} ${lastName}`;
    } catch {
      console.warn('NPC name generation failed, using fallback');
      return generateFallbackNPCName(race);
    }
  }
  
  // For other categories, use single name generation
  const chain = getChain(category, race);
  
  // Set appropriate length constraints based on category
  const defaultMin = category === 'faction' ? 8 : category === 'location' ? 7 : category === 'character' ? 4 : 3;
  let defaultMax: number;
  let allowSpaces = false;
  
  if (category === 'faction') {
    // Factions are multi-word phrases, need much longer max length
    defaultMax = 50; // Increased from 30 to allow full phrases
    allowSpaces = true; // Allow spaces and don't stop on them
  } else if (category === 'location') {
    // For locations, use longer max lengths more often to match training data
    // 70% chance for longer names (up to 22 chars), 30% for standard (up to 18 chars)
    defaultMax = Math.random() > 0.3 ? 22 : 18;
  } else if (category === 'tavern' || category === 'shop') {
    defaultMax = 30; // Increased from 25
    allowSpaces = true; // These can also be multi-word
  } else {
    // For character names, add variation - sometimes generate longer names
    // 50% chance for longer names (up to 16 chars), 50% for medium (up to 12 chars)
    // But always at least 4 characters minimum
    defaultMax = Math.random() > 0.5 ? 16 : 12;
  }

  try {
    // Add some randomness to length constraints for more variety
    let finalMin = minLength || defaultMin;
    let finalMax = maxLength || defaultMax;
    
    // Occasionally vary the length slightly for more diversity
    if (!minLength && !maxLength && Math.random() < 0.3) {
      // 30% chance to vary length by ±1-2 characters
      const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
      finalMin = Math.max(3, defaultMin + variation);
      finalMax = Math.min(50, defaultMax + variation);
    }
    
    return chain.generate(finalMin, finalMax, allowSpaces);
  } catch {
    // Fallback to simple generation
    console.warn('Markov chain generation failed, using fallback');
    return generateFallbackName(category, race);
  }
}

/**
 * Generate multiple unique names
 */
export function generateMultipleNames(
  category: NameCategory,
  count: number = 5,
  race?: string,
  minLength?: number,
  maxLength?: number
): string[] {
  const names = new Set<string>();
  const nameStarts = new Set<string>(); // Track start patterns for variety
  const maxAttempts = count * 20; // Increased attempts for more variety
  let attempts = 0;
  
  // Hard limit on "The" starts - max 30% of names can start with "The"
  const maxTheStarts = Math.max(1, Math.floor(count * 0.3));
  let theStartCount = 0;

  while (names.size < count && attempts < maxAttempts) {
    attempts++;
    const name = generateName(category, race, minLength, maxLength);
    if (name && name.trim().length > 0) {
      // Check if this name is too similar to existing ones (same start)
      const nameStart = name.substring(0, Math.min(4, name.length)).toLowerCase();
      const namePrefix = name.substring(0, Math.min(6, name.length)).toLowerCase();
      
      // Be more strict about "The" starts - we don't want all names starting with "The"
      const isCommonPrefix = namePrefix.startsWith('the ');
      
      // Hard limit: reject if we've hit the max "The" starts
      if (isCommonPrefix && theStartCount >= maxTheStarts) {
        continue;
      }
      
      const hasCommonPrefix = Array.from(nameStarts).some(s => s.startsWith('the'));
      
      // Allow some names with same start, but prefer diversity
      // If we have many names already, be more strict about starts
      const strictness = names.size / count;
      const rejectThreshold = isCommonPrefix && hasCommonPrefix ? 0.2 : 0.5;
      
      if (nameStarts.has(nameStart) && strictness > rejectThreshold && Math.random() < strictness) {
        // Skip this name if we already have one with similar start and we're getting close to target
        continue;
      }
      
      // If we already have many "The" names, reject new ones more aggressively
      if (isCommonPrefix && hasCommonPrefix && theStartCount >= maxTheStarts * 0.7) {
        const theRatio = theStartCount / Math.max(1, names.size);
        
        // Reject "The" names more aggressively as we approach the limit
        let rejectChance = 0.6;
        if (theRatio > 0.25) rejectChance = 0.8;
        if (theRatio > 0.28) rejectChance = 0.95; // Almost always reject near limit
        
        if (Math.random() < rejectChance) {
          continue;
        }
      }
      
      names.add(name);
      nameStarts.add(nameStart);
      if (isCommonPrefix) {
        theStartCount++;
      }
    }
  }

  return Array.from(names);
}

/**
 * Fallback NPC name generator with first + last name
 */
function generateFallbackNPCName(race?: string): string {
  const raceLower = (race || '').toLowerCase();
  
  let firstName: string;
  let lastName: string;
  
  if (raceLower.includes('elf') || raceLower.includes('elven')) {
    firstName = ELVEN_FIRST_NAMES[Math.floor(Math.random() * ELVEN_FIRST_NAMES.length)];
    lastName = ELVEN_LAST_NAMES[Math.floor(Math.random() * ELVEN_LAST_NAMES.length)];
  } else if (raceLower.includes('dwarf') || raceLower.includes('dwarven')) {
    firstName = DWARVEN_FIRST_NAMES[Math.floor(Math.random() * DWARVEN_FIRST_NAMES.length)];
    lastName = DWARVEN_LAST_NAMES[Math.floor(Math.random() * DWARVEN_LAST_NAMES.length)];
  } else {
    firstName = HUMAN_FIRST_NAMES[Math.floor(Math.random() * HUMAN_FIRST_NAMES.length)];
    lastName = HUMAN_LAST_NAMES[Math.floor(Math.random() * HUMAN_LAST_NAMES.length)];
  }
  
  return `${firstName} ${lastName}`;
}

/**
 * Fallback name generator for edge cases
 */
function generateFallbackName(category: NameCategory, race?: string): string {
  const raceLower = race?.toLowerCase() || '';
  
  if (raceLower.includes('elf') || raceLower.includes('elven')) {
    return ELVEN_NAMES[Math.floor(Math.random() * ELVEN_NAMES.length)];
  } else if (raceLower.includes('dwarf') || raceLower.includes('dwarven')) {
    return DWARVEN_NAMES[Math.floor(Math.random() * DWARVEN_NAMES.length)];
  }

  switch (category) {
    case 'location':
      return LOCATION_NAMES[Math.floor(Math.random() * LOCATION_NAMES.length)];
    case 'faction':
      return FACTION_NAMES[Math.floor(Math.random() * FACTION_NAMES.length)];
    case 'tavern':
      return TAVERN_NAMES[Math.floor(Math.random() * TAVERN_NAMES.length)];
    case 'shop':
      return SHOP_NAMES[Math.floor(Math.random() * SHOP_NAMES.length)];
    default:
      return HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)];
  }
}

/**
 * Get race suggestions for name generation
 */
export function getRaceSuggestions(): string[] {
  return [
    'Human', 'Elf', 'High Elf', 'Wood Elf', 'Drow', 'Dwarf', 'Mountain Dwarf', 'Hill Dwarf',
    'Halfling', 'Lightfoot Halfling', 'Stout Halfling', 'Dragonborn', 'Gnome', 'Forest Gnome',
    'Rock Gnome', 'Tiefling', 'Half-Elf', 'Half-Orc', 'Aasimar', 'Genasi', 'Firbolg', 'Goliath',
    'Tabaxi', 'Triton', 'Kenku', 'Lizardfolk', 'Tortle', 'Warforged'
  ];
}

/**
 * Get available name categories
 */
export function getNameCategories(): NameCategory[] {
  return ['character', 'npc', 'location', 'faction', 'tavern', 'shop'];
}

