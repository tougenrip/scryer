/**
 * Parser utilities for extracting structured data from AI-generated content
 */

// Re-export types for backward compatibility
export interface ParsedNPCData {
  name?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  description?: string;
  notes?: string;
  customSpecies?: string;
  customClass?: string;
  combatStats?: any;
}

export interface ParsedLocationData {
  name?: string;
  description?: string;
  dmNotes?: string;
}

export interface ParsedFactionData {
  name?: string;
  description?: string;
  goals?: string;
  structure?: string;
  resources?: string;
  relationships?: string;
}

export interface ParsedMagicItemData {
  name?: string;
  type?: string;
  rarity?: string;
  description?: string;
  properties?: string;
  history?: string;
  attunement?: string;
  quirk?: string;
}

/**
 * Format JSON content to Markdown for display
 */
export function formatJsonToMarkdown(content: string): string {
  const jsonData = extractJson<any>(content);
  
  if (!jsonData) {
    return content;
  }

  // Generic JSON to Markdown converter
  let markdown = '';
  
  // Handle specific types if we can detect them
  if (jsonData.name && (jsonData.race || jsonData.class || jsonData.appearance)) {
    // NPC-like structure
    markdown += `# ${jsonData.name}\n\n`;
    if (jsonData.race || jsonData.class) {
      markdown += `*${[jsonData.race, jsonData.class].filter(Boolean).join(' ')}*\n\n`;
    }
    
    // Iterate through other keys
    Object.entries(jsonData).forEach(([key, value]) => {
      if (['name', 'race', 'class'].includes(key)) return;
      if (typeof value === 'string' || typeof value === 'number') {
        // Convert camelCase to Title Case
        const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        markdown += `### ${title}\n${value}\n\n`;
      }
    });
    
    return markdown;
  }

  // Generic fallback for other JSON
  Object.entries(jsonData).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      markdown += `### ${title}\n${value}\n\n`;
    } else if (Array.isArray(value)) {
      const title = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      markdown += `### ${title}\n`;
      value.forEach(item => {
        if (typeof item === 'object' && item !== null) {
           markdown += `- **${item.name || 'Item'}**: ${JSON.stringify(item)}\n`;
        } else {
           markdown += `- ${item}\n`;
        }
      });
      markdown += '\n';
    }
  });

  return markdown || content;
}

/**
 * Extract JSON object from a string that might contain markdown code blocks
 */
function extractJson<T>(content: string): T | null {
  try {
    // 1. Try parsing directly
    try {
      return JSON.parse(content);
    } catch (e) {
      // ignore
    }

    // 2. Try extracting from code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch && codeBlockMatch[1]) {
      return JSON.parse(codeBlockMatch[1]);
    }

    // 3. Try finding the first { and last }
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonString = content.substring(firstBrace, lastBrace + 1);
      return JSON.parse(jsonString);
    }

    return null;
  } catch (error) {
    console.warn('[AI Parser] JSON parsing failed:', error);
    return null;
  }
}

/**
 * Legacy regex-based section extractor fallback
 */
function extractSectionLegacy(content: string, sectionNames: string[]): string | undefined {
  const normalizedContent = content.replace(/\r\n/g, '\n');
  
  for (const sectionName of sectionNames) {
    const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const patterns = [
      new RegExp(`\\d+\\.\\s*\\*\\*${escapedName}\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\d+\\.\\s*\\*\\*|\\n#{1,3}\\s|$)`, 'i'),
      new RegExp(`\\*\\*${escapedName}\\*\\*:?\\s*([\\s\\S]*?)(?=\\n\\*\\*[A-Z]|\\n\\d+\\.\\s*\\*\\*|\\n#{1,3}\\s|$)`, 'i'),
      new RegExp(`#{2,3}\\s*${escapedName}\\s*\\n([\\s\\S]*?)(?=\\n#{2,3}\\s|\\n\\*\\*[A-Z]|\\n\\d+\\.\\s*\\*\\*|$)`, 'i'),
      new RegExp(`^${escapedName}:\\s*(.+?)$`, 'im'),
    ];

    for (const pattern of patterns) {
      const match = normalizedContent.match(pattern);
      if (match && match[1] && match[1].trim()) {
        let extracted = match[1].trim();
        extracted = extracted.replace(/^["']|["']$/g, '');
        extracted = extracted.replace(/\*{3,}/g, '**');
        return extracted;
      }
    }
  }
  return undefined;
}

// --- Parser Functions ---

/**
 * Helper to convert basic markdown text to HTML for TipTap rich text editors.
 */
function parseMarkdownToHtml(text?: string): string {
  if (!text) return '';
  
  // Convert bold and italic
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>');
    
  // Convert newlines to paragraphs
  const paragraphs = html.split(/\n+/).filter(p => p.trim());
  if (paragraphs.length > 0) {
    return paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
  }
  
  return `<p>${html.trim()}</p>`;
}

/**
 * Parse AI-generated NPC content into structured form data
 */
export function parseNPCContent(content: string): ParsedNPCData {
  console.log('[AI Parser] Parsing NPC content...');
  
  // Try JSON parsing first
  const jsonData = extractJson<any>(content);
  if (jsonData) {
    console.log('[AI Parser] Successfully parsed JSON');
    
    // Construct notes from various fields
    let notes = '';
    if (jsonData.quote) notes += `<p><strong>Quote:</strong> "${jsonData.quote}"</p>`;
    if (jsonData.plotHook) notes += `<p><strong>Plot Hook:</strong> ${jsonData.plotHook}</p>`;
    if (jsonData.secret) notes += `<p><strong>Secret:</strong> ${jsonData.secret}</p>`;

    // Combine motivation into background if needed, or keep separate
    let background = jsonData.background ? parseMarkdownToHtml(jsonData.background) : '';
    if (jsonData.motivation) {
      background = `<p><strong>Motivation:</strong> ${jsonData.motivation}</p>${background}`;
    }

    // Process combatStats to ensure it follows the correct schema
    let combatStats = jsonData.combatStats || null;
    if (combatStats) {
      // Clean up strings to numbers for attributes
      ['hp', 'maxHp', 'ac', 'str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(key => {
        if (typeof combatStats[key] === 'string') {
          combatStats[key] = parseInt(combatStats[key], 10) || 10;
        }
      });
      // Ensure maxHp matches hp if only hp was provided
      if (combatStats.hp && !combatStats.maxHp) {
        combatStats.maxHp = combatStats.hp;
      }
    }

    return {
      name: jsonData.name,
      appearance: parseMarkdownToHtml(jsonData.appearance),
      personality: parseMarkdownToHtml(jsonData.personality),
      background: background.trim(),
      notes: notes.trim(),
      customSpecies: jsonData.race,
      customClass: jsonData.class,
      description: parseMarkdownToHtml(jsonData.description),
      combatStats
    };
  }

  // Fallback to legacy regex parsing
  console.log('[AI Parser] JSON parsing failed, falling back to regex');
  return parseNPCContentLegacy(content);
}

function parseNPCContentLegacy(content: string): ParsedNPCData {
  const result: ParsedNPCData = {};
  
  const name = extractSectionLegacy(content, ['Name', 'NPC Name', 'Character Name']);
  if (name) {
    result.name = name.split('\n')[0].replace(/\*+/g, '').replace(/^["']|["']$/g, '').trim();
  } else {
    const firstLine = content.trim().split('\n')[0].trim();
    if (firstLine && firstLine.length < 50 && !firstLine.includes(':')) {
      result.name = firstLine.replace(/\*+|#{1,6}/g, '').trim();
    }
  }

  const appearance = extractSectionLegacy(content, ['Appearance', 'Physical Description', 'Physical Appearance', 'Looks']);
  if (appearance) result.appearance = appearance.replace(/\*+/g, '').trim();

  const personality = extractSectionLegacy(content, ['Personality', 'Personality Traits', 'Traits', 'Mannerisms', 'Character Traits']);
  if (personality) result.personality = personality.replace(/\*+/g, '').trim();

  const motivation = extractSectionLegacy(content, ['Motivation', 'Motivations', 'Goals', 'Backstory', 'Background', 'History']);
  const secret = extractSectionLegacy(content, ['Secret', 'Secrets', 'Hidden Secret', 'Dark Secret']);
  
  let background = '';
  if (motivation) background += motivation.replace(/\*+/g, '').trim();
  if (secret) {
    if (background) background += '\n\n**Secret:** ';
    background += secret.replace(/\*+/g, '').trim();
  }
  if (background) result.background = background;

  const quote = extractSectionLegacy(content, ['Quote', 'Characteristic Quote', 'Catchphrase', 'Signature Quote']);
  const plotHook = extractSectionLegacy(content, ['Plot Hook', 'Plot Hooks', 'Adventure Hook', 'Hook', 'Story Hook']);
  const stats = extractSectionLegacy(content, ['Stats', 'Statistics', 'Stat Block', 'Combat Stats']);

  let notes = '';
  if (quote) notes += `**Quote:** "${quote.replace(/^["']|["']$/g, '').replace(/\*+/g, '').trim()}"\n\n`;
  if (plotHook) notes += `**Plot Hook:** ${plotHook.replace(/\*+/g, '').trim()}\n\n`;
  if (stats) notes += `**Stats:** ${stats.replace(/\*+/g, '').trim()}`;
  
  if (!result.appearance && !result.personality && !result.background) {
    notes += `\n\n---\n**Full Generated Content:**\n${content}`;
  }
  
  if (notes) result.notes = notes.trim();

  const raceMatch = content.match(/(?:Race|Species|Race\/Species):\s*([A-Za-z\-\s]+?)(?:\n|,|\.|;|$)/i);
  if (raceMatch) result.customSpecies = raceMatch[1].trim();

  const classMatch = content.match(/(?:Class|Occupation|Class\/Occupation|Profession):\s*([A-Za-z\-\s]+?)(?:\n|,|\.|;|$)/i);
  if (classMatch) result.customClass = classMatch[1].trim();

  return result;
}

/**
 * Parse AI-generated Location content
 */
export function parseLocationContent(content: string): ParsedLocationData {
  const jsonData = extractJson<any>(content);
  if (jsonData) {
    let description = jsonData.overview || jsonData.description || '';
    if (jsonData.atmosphere) description += `\n\n**Atmosphere:**\n${jsonData.atmosphere}`;
    if (jsonData.history) description += `\n\n**History:**\n${jsonData.history}`;
    if (jsonData.inhabitants) description += `\n\n**Inhabitants:**\n${jsonData.inhabitants}`;
    if (jsonData.notableFeatures || jsonData.features) description += `\n\n**Notable Features:**\n${jsonData.notableFeatures || jsonData.features}`;

    let dmNotes = '';
    if (jsonData.secrets) dmNotes += `**Secrets:**\n${jsonData.secrets}\n\n`;
    if (jsonData.dangers) dmNotes += `**Dangers:**\n${jsonData.dangers}\n\n`;
    if (jsonData.treasures) dmNotes += `**Treasures:**\n${jsonData.treasures}\n\n`;
    if (jsonData.connections) dmNotes += `**Connections:**\n${jsonData.connections}\n\n`;
    if (jsonData.adventureHooks) dmNotes += `**Adventure Hooks:**\n${jsonData.adventureHooks}\n\n`;

    return {
      name: jsonData.name,
      description: parseMarkdownToHtml(description.trim()),
      dmNotes: parseMarkdownToHtml(dmNotes.trim()),
    };
  }

  // Legacy fallback
  const result: ParsedLocationData = {};
  const name = extractSectionLegacy(content, ['Name', 'Location Name']);
  if (name) result.name = name.replace(/^["']|["']$/g, '').replace(/\*+/g, '').split('\n')[0].trim();

  const description = extractSectionLegacy(content, ['Description', 'Overview', 'Appearance']);
  if (description) result.description = parseMarkdownToHtml(description.replace(/\*+/g, '').trim());

  return result;
}

/**
 * Parse AI-generated Faction content
 */
export function parseFactionContent(content: string): ParsedFactionData {
  const jsonData = extractJson<any>(content);
  if (jsonData) {
    let description = jsonData.purpose || jsonData.description || '';
    if (jsonData.trueAgenda) description += `\n\n**True Agenda:** ${jsonData.trueAgenda}`;

    return {
      name: jsonData.name,
      description: description.trim(),
      goals: jsonData.purpose, // mapped to purpose/goals
      structure: jsonData.structure,
      resources: jsonData.resources,
      relationships: jsonData.relationships
    };
  }

  // Legacy fallback
  const result: ParsedFactionData = {};
  const name = extractSectionLegacy(content, ['Name', 'Faction Name', 'Organization Name']);
  if (name) result.name = name.replace(/^["']|["']$/g, '').replace(/\*+/g, '').split('\n')[0].trim();

  const description = extractSectionLegacy(content, ['Description', 'Overview', 'About']);
  if (description) result.description = description.replace(/\*+/g, '').trim();

  const goals = extractSectionLegacy(content, ['Goals', 'Objectives', 'Aims', 'Motivation']);
  if (goals) result.goals = goals.replace(/\*+/g, '').trim();

  const structure = extractSectionLegacy(content, ['Structure', 'Organization', 'Hierarchy', 'Leadership']);
  if (structure) result.structure = structure.replace(/\*+/g, '').trim();

  const resources = extractSectionLegacy(content, ['Resources', 'Assets', 'Power']);
  if (resources) result.resources = resources.replace(/\*+/g, '').trim();

  const relationships = extractSectionLegacy(content, ['Relationships', 'Allies', 'Enemies', 'Relations']);
  if (relationships) result.relationships = relationships.replace(/\*+/g, '').trim();

  return result;
}

/**
 * Parse AI-generated Magic Item content
 */
export function parseMagicItemContent(content: string): ParsedMagicItemData {
  const jsonData = extractJson<any>(content);
  if (jsonData) {
    return {
      name: jsonData.name,
      type: jsonData.typeAndRarity || jsonData.type,
      rarity: jsonData.rarity, // Might be included in typeAndRarity
      description: jsonData.description,
      properties: jsonData.properties,
      history: jsonData.history,
      attunement: jsonData.attunement,
      quirk: jsonData.quirk
    };
  }

  // Legacy fallback
  const result: ParsedMagicItemData = {};
  const name = extractSectionLegacy(content, ['Name', 'Item Name']);
  if (name) result.name = name.replace(/^["']|["']$/g, '').replace(/\*+/g, '').split('\n')[0].trim();

  const typeAndRarity = extractSectionLegacy(content, ['Type & Rarity', 'Type and Rarity', 'Type']);
  if (typeAndRarity) result.type = typeAndRarity.replace(/\*+/g, '').trim();

  const description = extractSectionLegacy(content, ['Description', 'Appearance']);
  if (description) result.description = description.replace(/\*+/g, '').trim();

  const history = extractSectionLegacy(content, ['History', 'Lore', 'Origin']);
  if (history) result.history = history.replace(/\*+/g, '').trim();

  const properties = extractSectionLegacy(content, ['Properties', 'Abilities', 'Effects', 'Mechanics']);
  if (properties) result.properties = properties.replace(/\*+/g, '').trim();

  const attunement = extractSectionLegacy(content, ['Attunement', 'Requires Attunement']);
  if (attunement) result.attunement = attunement.replace(/\*+/g, '').trim();

  const quirk = extractSectionLegacy(content, ['Quirk', 'Minor Effect', 'Personality']);
  if (quirk) result.quirk = quirk.replace(/\*+/g, '').trim();

  return result;
}
