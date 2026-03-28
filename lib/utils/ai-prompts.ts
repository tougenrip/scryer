/**
 * D&D AI Prompt Templates
 * Structured prompts for generating various D&D content using Ollama
 */

// System prompts for different generator types
export const SYSTEM_PROMPTS = {
  general: `You are a creative Dungeons & Dragons 5th Edition content creator. You create engaging, balanced, and lore-appropriate content for tabletop RPG campaigns. Always provide detailed, usable content that a Dungeon Master can immediately use in their game. Respond in valid JSON format.`,

  npc: `You are an expert NPC creator for Dungeons & Dragons 5th Edition. You create memorable, three-dimensional characters with distinct personalities, motivations, secrets, and flaws. Your NPCs feel like real people with their own goals and histories. Respond in valid JSON format.`,

  quest: `You are a quest designer for Dungeons & Dragons 5th Edition. You create engaging quests with clear objectives, interesting complications, meaningful choices, and satisfying conclusions. Your quests have hooks that draw players in and rewards that feel earned. Respond in valid JSON format.`,

  encounter: `You are an encounter designer for Dungeons & Dragons 5th Edition. You create balanced, tactical encounters that challenge players while remaining fair. You consider terrain, enemy tactics, and dramatic tension. Respond in valid JSON format.`,

  magicItem: `You are a magic item creator for Dungeons & Dragons 5th Edition. You design items that are balanced, flavorful, and have interesting lore. Your items enhance gameplay without breaking game balance. Respond in valid JSON format.`,

  tavern: `You are a tavern and establishment creator for Dungeons & Dragons. You design memorable locations with unique atmospheres, interesting staff, local rumors, and plot hooks. Your taverns feel like living places with their own stories. Respond in valid JSON format.`,

  plotHook: `You are a plot hook generator for Dungeons & Dragons. You create intriguing story seeds that capture player interest and lead to adventure. Your hooks are specific enough to use immediately but open enough to develop in many directions. Respond in valid JSON format.`,

  campaign: `You are a campaign designer for Dungeons & Dragons 5th Edition. You create compelling campaign premises with central conflicts, factions, and overarching narratives that can sustain months of play. Respond in valid JSON format.`,

  backstory: `You are a character backstory writer for Dungeons & Dragons. You create compelling personal histories that give characters depth, motivation, and connections to the world. Your backstories include hooks that DMs can use. Respond in valid JSON format.`,

  name: `You are a fantasy name generator specializing in Dungeons & Dragons. You create names that sound authentic to their race and culture, are pronounceable, and memorable. Respond in valid JSON format.`,

  character: `You are a character creator for Dungeons & Dragons 5th Edition. You create complete, playable character concepts with depth, mechanical synergy, and roleplay potential. Respond in valid JSON format.`,

  faction: `You are a faction designer for Dungeons & Dragons. You create organizations with clear goals, hierarchies, resources, and conflicts. Your factions feel like real groups that exist in the world with their own agendas. Respond in valid JSON format.`,

  location: `You are a location designer for Dungeons & Dragons. You create vivid, detailed locations with atmosphere, notable features, potential dangers, and story hooks. Your locations feel like real places worth exploring. Respond in valid JSON format.`,

  bounty: `You are a bounty board creator for Dungeons & Dragons. You create compelling bounty postings with clear targets, rewards, complications, and background information that make each hunt interesting. Respond in valid JSON format.`,
};

// Generation prompt templates
export interface GeneratorOptions {
  // NPC options
  npcRace?: string;
  npcClass?: string;
  npcRole?: string; // merchant, villain, ally, etc.
  npcAlignment?: string;

  // Quest options
  questType?: string; // rescue, retrieve, investigate, etc.
  questDifficulty?: string;
  questLocation?: string;

  // Encounter options
  partyLevel?: number;
  partySize?: number;
  encounterDifficulty?: 'easy' | 'medium' | 'hard' | 'deadly';
  encounterEnvironment?: string;
  encounterTheme?: string;

  // Magic item options
  itemType?: string; // weapon, armor, wondrous, etc.
  itemRarity?: 'common' | 'uncommon' | 'rare' | 'very rare' | 'legendary';
  itemTheme?: string;

  // Tavern options
  tavernType?: string; // inn, tavern, restaurant, etc.
  tavernQuality?: string; // seedy, modest, upscale, etc.
  tavernLocation?: string;

  // Name options
  nameRace?: string;
  nameGender?: string;
  nameStyle?: string;
  nameCount?: number;

  // Faction options
  factionType?: string; // guild, cult, military, etc.
  factionAlignment?: string;
  factionSize?: string;

  // Location options
  locationType?: string;
  locationSize?: string;
  locationDanger?: string;

  // Bounty options
  bountyTarget?: string;
  bountyDifficulty?: string;
  bountyReward?: string;

  // Campaign options
  campaignTheme?: string;
  campaignTone?: string; // dark, heroic, comedic, etc.
  campaignLength?: string; // one-shot, short, long

  // Backstory options
  characterRace?: string;
  characterClass?: string;
  characterBackground?: string;

  // General options
  setting?: string;
  additionalContext?: string;
}

/**
 * Generate NPC prompt
 */
export function generateNPCPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a detailed D&D 5e NPC in JSON format with the following fields:\n'];

  if (options.npcRace) parts.push(`Race: ${options.npcRace}`);
  if (options.npcClass) parts.push(`Class/Occupation: ${options.npcClass}`);
  if (options.npcRole) parts.push(`Role in story: ${options.npcRole}`);
  if (options.npcAlignment) parts.push(`Alignment: ${options.npcAlignment}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "name": "string",
  "race": "string",
  "class": "string",
  "appearance": "string (2-3 sentences)",
  "personality": "string",
  "motivation": "string",
  "background": "string",
  "secret": "string",
  "quote": "string",
  "plotHook": "string",
  "stats": "string (suggested stat block or CR)"
}`);

  return parts.join('\n');
}

/**
 * Generate Quest prompt
 */
export function generateQuestPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D 5e quest in JSON format with the following fields:\n'];

  if (options.questType) parts.push(`Quest type: ${options.questType}`);
  if (options.questDifficulty) parts.push(`Difficulty: ${options.questDifficulty}`);
  if (options.questLocation) parts.push(`Location: ${options.questLocation}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "title": "string",
  "hook": "string",
  "background": "string",
  "objectives": "string",
  "complications": "string",
  "keyNPCs": "string",
  "locations": "string",
  "rewards": "string",
  "consequences": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Encounter prompt
 */
export function generateEncounterPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D 5e combat encounter in JSON format with the following fields:\n'];

  if (options.partyLevel) parts.push(`Party level: ${options.partyLevel}`);
  if (options.partySize) parts.push(`Party size: ${options.partySize} players`);
  if (options.encounterDifficulty) parts.push(`Difficulty: ${options.encounterDifficulty}`);
  if (options.encounterEnvironment) parts.push(`Environment: ${options.encounterEnvironment}`);
  if (options.encounterTheme) parts.push(`Theme: ${options.encounterTheme}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "name": "string",
  "setup": "string",
  "enemies": "string",
  "terrain": "string",
  "tactics": "string",
  "complications": "string",
  "treasure": "string",
  "scaling": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Magic Item prompt
 */
export function generateMagicItemPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D 5e magic item in JSON format with the following fields:\n'];

  if (options.itemType) parts.push(`Item type: ${options.itemType}`);
  if (options.itemRarity) parts.push(`Rarity: ${options.itemRarity}`);
  if (options.itemTheme) parts.push(`Theme: ${options.itemTheme}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "name": "string",
  "typeAndRarity": "string",
  "description": "string",
  "history": "string",
  "properties": "string",
  "attunement": "string",
  "quirk": "string",
  "plotHook": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Tavern prompt
 */
export function generateTavernPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D tavern/inn in JSON format with the following fields:\n'];

  if (options.tavernType) parts.push(`Type: ${options.tavernType}`);
  if (options.tavernQuality) parts.push(`Quality: ${options.tavernQuality}`);
  if (options.tavernLocation) parts.push(`Location: ${options.tavernLocation}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "name": "string",
  "exterior": "string",
  "interior": "string",
  "proprietor": "string",
  "staff": "string",
  "regulars": "string",
  "menu": "string",
  "rumors": "string",
  "secrets": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Plot Hook prompt
 */
export function generatePlotHookPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D plot hook in JSON format with the following fields:\n'];

  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "hook": "string",
  "realStory": "string",
  "keyPlayers": "string",
  "urgency": "string",
  "complications": "string",
  "outcomes": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Campaign premise prompt
 */
export function generateCampaignPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D 5e campaign premise in JSON format with the following fields:\n'];

  if (options.campaignTheme) parts.push(`Theme: ${options.campaignTheme}`);
  if (options.campaignTone) parts.push(`Tone: ${options.campaignTone}`);
  if (options.campaignLength) parts.push(`Length: ${options.campaignLength}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "title": "string",
  "premise": "string",
  "setting": "string",
  "villain": "string",
  "factions": "string",
  "hook": "string",
  "arcs": "string",
  "themes": "string",
  "uniqueElement": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Backstory prompt
 */
export function generateBackstoryPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D character backstory in JSON format with the following fields:\n'];

  if (options.characterRace) parts.push(`Race: ${options.characterRace}`);
  if (options.characterClass) parts.push(`Class: ${options.characterClass}`);
  if (options.characterBackground) parts.push(`Background: ${options.characterBackground}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "origin": "string",
  "family": "string",
  "definingEvent": "string",
  "motivation": "string",
  "flaw": "string",
  "connections": "string",
  "goals": "string",
  "mannerisms": "string",
  "plotHooks": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Names prompt
 */
export function generateNamesPrompt(options: GeneratorOptions = {}): string {
  const count = options.nameCount || 10;
  const parts = [`Generate ${count} unique fantasy names in JSON format with the following fields:\n`];

  if (options.nameRace) parts.push(`Race/Culture: ${options.nameRace}`);
  if (options.nameGender) parts.push(`Gender: ${options.nameGender}`);
  if (options.nameStyle) parts.push(`Style: ${options.nameStyle}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "names": [
    {
      "name": "string",
      "pronunciation": "string",
      "meaning": "string (optional)"
    }
  ]
}`);

  return parts.join('\n');
}

/**
 * Generate Character prompt (full character concept)
 */
export function generateCharacterPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D 5e player character concept in JSON format with the following fields:\n'];

  if (options.characterRace) parts.push(`Race: ${options.characterRace}`);
  if (options.characterClass) parts.push(`Class: ${options.characterClass}`);
  if (options.characterBackground) parts.push(`Background: ${options.characterBackground}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "name": "string",
  "race": "string",
  "class": "string",
  "background": "string",
  "appearance": "string",
  "personalityTraits": "string",
  "ideals": "string",
  "bonds": "string",
  "flaws": "string",
  "backstorySummary": "string",
  "roleplayingTips": "string",
  "characterArc": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Faction prompt
 */
export function generateFactionPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D faction/organization in JSON format with the following fields:\n'];

  if (options.factionType) parts.push(`Type: ${options.factionType}`);
  if (options.factionAlignment) parts.push(`Alignment tendency: ${options.factionAlignment}`);
  if (options.factionSize) parts.push(`Size: ${options.factionSize}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "name": "string",
  "symbol": "string",
  "purpose": "string",
  "trueAgenda": "string",
  "history": "string",
  "structure": "string",
  "leadership": "string",
  "resources": "string",
  "methods": "string",
  "relationships": "string",
  "joining": "string",
  "plotHooks": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Location prompt
 */
export function generateLocationPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D location in JSON format with the following fields:\n'];

  if (options.locationType) parts.push(`Type: ${options.locationType}`);
  if (options.locationSize) parts.push(`Size: ${options.locationSize}`);
  if (options.locationDanger) parts.push(`Danger level: ${options.locationDanger}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "name": "string",
  "overview": "string",
  "atmosphere": "string",
  "notableFeatures": "string",
  "history": "string",
  "inhabitants": "string",
  "dangers": "string",
  "treasures": "string",
  "secrets": "string",
  "connections": "string",
  "adventureHooks": "string"
}`);

  return parts.join('\n');
}

/**
 * Generate Bounty prompt
 */
export function generateBountyPrompt(options: GeneratorOptions = {}): string {
  const parts = ['Create a D&D bounty posting in JSON format with the following fields:\n'];

  if (options.bountyTarget) parts.push(`Target type: ${options.bountyTarget}`);
  if (options.bountyDifficulty) parts.push(`Difficulty: ${options.bountyDifficulty}`);
  if (options.bountyReward) parts.push(`Reward level: ${options.bountyReward}`);
  if (options.setting) parts.push(`Setting: ${options.setting}`);
  if (options.additionalContext) parts.push(`Additional context: ${options.additionalContext}`);

  parts.push(`
Respond ONLY with a valid JSON object. Do not include markdown formatting or code blocks. The JSON structure should be:
{
  "postingTitle": "string",
  "target": "string",
  "description": "string",
  "crimes": "string",
  "lastKnownLocation": "string",
  "reward": "string",
  "specialConditions": "string",
  "complications": "string",
  "theTruth": "string",
  "resolutionOptions": "string"
}`);

  return parts.join('\n');
}

/**
 * Get the appropriate system prompt for a generator type
 */
export function getSystemPrompt(
  generatorType:
    | 'npc'
    | 'quest'
    | 'encounter'
    | 'magicItem'
    | 'tavern'
    | 'plotHook'
    | 'campaign'
    | 'backstory'
    | 'name'
    | 'character'
    | 'faction'
    | 'location'
    | 'bounty'
): string {
  return SYSTEM_PROMPTS[generatorType] || SYSTEM_PROMPTS.general;
}

/**
 * Get the prompt generator function for a generator type
 */
export function getPromptGenerator(generatorType: string) {
  const generators: Record<string, (options: GeneratorOptions) => string> = {
    npc: generateNPCPrompt,
    quest: generateQuestPrompt,
    encounter: generateEncounterPrompt,
    magicItem: generateMagicItemPrompt,
    tavern: generateTavernPrompt,
    plotHook: generatePlotHookPrompt,
    campaign: generateCampaignPrompt,
    backstory: generateBackstoryPrompt,
    name: generateNamesPrompt,
    character: generateCharacterPrompt,
    faction: generateFactionPrompt,
    location: generateLocationPrompt,
    bounty: generateBountyPrompt,
  };

  return generators[generatorType] || generators.npc;
}
