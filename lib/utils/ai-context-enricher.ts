/**
 * AI Context Enrichment Utility
 * Enriches user-provided context with detailed information about mentioned entities
 */

import type { MentionableEntity, ResolvedEntity } from './mention-parser';
import { resolveMentions } from './mention-parser';

/**
 * Format a single entity for AI context
 */
function formatEntityForAI(entity: ResolvedEntity): string {
  switch (entity.type) {
    case 'npc':
      return formatNPCForAI(entity);
    case 'location':
      return formatLocationForAI(entity);
    case 'quest':
      return formatQuestForAI(entity);
    case 'faction':
      return formatFactionForAI(entity);
    default:
      return `${entity.type}: ${entity.name}\nDescription: ${entity.description || 'No description'}`;
  }
}

/**
 * Format NPC details for AI
 */
function formatNPCForAI(entity: ResolvedEntity): string {
  const { name, description, details } = entity;
  const sections = [`**NPC: ${name}**`];

  if (description) sections.push(`Description: ${description}`);
  if (details.appearance) sections.push(`Appearance: ${details.appearance}`);
  if (details.personality) sections.push(`Personality: ${details.personality}`);
  if (details.background) sections.push(`Background: ${details.background}`);
  if (details.location) sections.push(`Current Location: ${details.location}`);
  if (details.class) sections.push(`Class: ${details.class}`);
  if (details.species) sections.push(`Species/Race: ${details.species}`);

  return sections.join('\n');
}

/**
 * Format Location details for AI
 */
function formatLocationForAI(entity: ResolvedEntity): string {
  const { name, description, details } = entity;
  const sections = [`**Location: ${name}** (${details.locationType || 'Unknown Type'})`];

  if (description) sections.push(`Description: ${description}`);
  if (details.population) sections.push(`Population: ${details.population}`);
  if (details.ruler) sections.push(`Ruler/Leader: ${details.ruler}`);
  if (details.dmNotes) sections.push(`Notes: ${details.dmNotes}`);
  if (details.coordinates?.x !== null && details.coordinates?.y !== null) {
    sections.push(`Coordinates: (${details.coordinates.x}, ${details.coordinates.y})`);
  }

  return sections.join('\n');
}

/**
 * Format Quest details for AI
 */
function formatQuestForAI(entity: ResolvedEntity): string {
  const { name, description, details } = entity;
  const sections = [`**Quest: ${name}**`];

  if (description) sections.push(`Description: ${description}`);
  if (details.source) sections.push(`Quest Giver: ${details.source}`);
  if (details.location) sections.push(`Location: ${details.location}`);
  if (details.verified !== undefined) sections.push(`Status: ${details.verified ? 'Verified' : 'Unverified'}`);
  
  if (details.steps && details.steps.length > 0) {
    sections.push(`Objectives:`);
    details.steps.forEach((step: any, index: number) => {
      sections.push(`  ${index + 1}. ${step.name || step.goal || 'Objective'}`);
    });
  }

  return sections.join('\n');
}

/**
 * Format Faction details for AI
 */
function formatFactionForAI(entity: ResolvedEntity): string {
  const { name, description, details } = entity;
  const sections = [`**Faction: ${name}** (${details.factionType || 'Organization'})`];

  if (description) sections.push(`Description: ${description}`);
  if (details.leader) sections.push(`Leader: ${details.leader}`);
  if (details.alignment) sections.push(`Alignment: ${details.alignment}`);
  if (details.influenceLevel) sections.push(`Influence: ${details.influenceLevel}`);
  
  if (details.goals && details.goals.length > 0) {
    sections.push(`Goals: ${details.goals.join(', ')}`);
  }
  
  if (details.resources && details.resources.length > 0) {
    sections.push(`Resources: ${details.resources.join(', ')}`);
  }
  
  if (details.publicAgenda) sections.push(`Public Agenda: ${details.publicAgenda}`);
  if (details.secretAgenda) sections.push(`Secret Agenda: ${details.secretAgenda}`);

  return sections.join('\n');
}

/**
 * Enrich user context with detailed entity information
 * Takes raw text with @mentions and returns expanded context for AI
 */
export async function enrichContextWithMentions(
  text: string,
  mentionables: MentionableEntity[]
): Promise<string> {
  if (!text || mentionables.length === 0) {
    return text;
  }

  // Resolve all mentions in the text
  const resolvedEntities = resolveMentions(text, mentionables);

  if (resolvedEntities.length === 0) {
    // No valid mentions found, return original text
    return text;
  }

  // Build enriched context
  const sections = [
    text, // Original user text
    '',
    '--- Referenced Entities (Additional Context) ---',
    ''
  ];

  // Add detailed information for each mentioned entity
  resolvedEntities.forEach((entity) => {
    sections.push(formatEntityForAI(entity));
    sections.push(''); // Blank line between entities
  });

  return sections.join('\n');
}

/**
 * Get a summary of mentioned entities (for display/validation)
 */
export function getMentionsSummary(
  text: string,
  mentionables: MentionableEntity[]
): { valid: ResolvedEntity[]; invalid: string[] } {
  const resolvedEntities = resolveMentions(text, mentionables);
  const resolvedNames = new Set(resolvedEntities.map(e => e.name.toLowerCase()));

  // Find unresolved mentions
  const mentionPattern = /@([\w\-]+(?:\s+[\w\-]+)*)/g;
  const allMentionNames = new Set<string>();
  let match;
  
  while ((match = mentionPattern.exec(text)) !== null) {
    allMentionNames.add(match[1].trim());
  }

  const invalid = Array.from(allMentionNames).filter(
    name => !resolvedNames.has(name.toLowerCase())
  );

  return {
    valid: resolvedEntities,
    invalid,
  };
}
