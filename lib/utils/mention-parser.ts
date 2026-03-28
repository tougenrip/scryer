/**
 * Mention parser utility for extracting and resolving @mentions in text
 */

export type MentionType = 'npc' | 'location' | 'quest' | 'faction';

export interface Mention {
  match: string;        // Full match including @ (e.g., "@MainCity")
  name: string;         // Name without @ (e.g., "MainCity")
  startIndex: number;
  endIndex: number;
}

export interface MentionMetadata {
  mentions: Array<{
    type: MentionType;
    id: string;
    name: string;
  }>;
}

export interface ResolvedEntity {
  id: string;
  type: MentionType;
  name: string;
  description: string | null;
  details: any; // Type-specific details
}

export interface MentionableEntity {
  id: string;
  type: MentionType;
  name: string;
  description: string | null;
  details: any;
}

/**
 * Extract all @mentions from text
 * Pattern: @followed by word characters (letters, numbers, underscores)
 * Supports: @MainCity, @Gandalf, @Quest_1, @TheRedFaction
 */
export function extractMentions(text: string): Mention[] {
  const mentions: Mention[] = [];
  // Match @ followed by alphanumeric, underscores, hyphens, and spaces
  // Stop at punctuation or special chars (except hyphen/underscore/space in the middle)
  const mentionRegex = /@([\w\-]+(?:\s+[\w\-]+)*)/g;
  
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      match: match[0],           // "@MainCity"
      name: match[1].trim(),     // "MainCity"
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  
  return mentions;
}

/**
 * Find unique mention names from text
 */
export function getUniqueMentionNames(text: string): string[] {
  const mentions = extractMentions(text);
  const uniqueNames = new Set(mentions.map(m => m.name));
  return Array.from(uniqueNames);
}

/**
 * Resolve mention names to actual entities from available mentionables
 * Returns array of resolved entities with full details
 */
export function resolveMentions(
  text: string,
  mentionables: MentionableEntity[]
): ResolvedEntity[] {
  const mentionNames = getUniqueMentionNames(text);
  const resolved: ResolvedEntity[] = [];

  for (const mentionName of mentionNames) {
    // Find all entities with matching name (case-insensitive)
    const matches = mentionables.filter(
      entity => entity.name.toLowerCase() === mentionName.toLowerCase()
    );

    // Add all matches (could be multiple entities with same name)
    resolved.push(...matches);
  }

  return resolved;
}

/**
 * Group resolved entities by type for metadata storage
 */
export function groupMentionsByType(entities: ResolvedEntity[]): MentionMetadata {
  const grouped: MentionMetadata = {
    mentions: []
  };

  entities.forEach(entity => {
    grouped.mentions.push({
      type: entity.type,
      id: entity.id,
      name: entity.name,
    });
  });

  return grouped;
}

/**
 * Extract mentions from multiple text fields and combine them
 */
export function extractAllMentions(
  fields: Array<string | null | undefined>,
  mentionables: MentionableEntity[]
): MentionMetadata {
  const allText = fields.filter(Boolean).join(' ');
  const resolved = resolveMentions(allText, mentionables);
  return groupMentionsByType(resolved);
}

/**
 * Check if a text contains any mentions
 */
export function hasMentions(text: string): boolean {
  return /@[\w\-]+/.test(text);
}

/**
 * Get mention at cursor position (for autocomplete)
 */
export function getMentionAtCursor(text: string, cursorPosition: number): Mention | null {
  const mentions = extractMentions(text);
  
  // Find mention that contains or is right before cursor
  for (const mention of mentions) {
    if (cursorPosition >= mention.startIndex && cursorPosition <= mention.endIndex) {
      return mention;
    }
  }
  
  // Check if cursor is right after @ (for autocomplete trigger)
  if (cursorPosition > 0 && text[cursorPosition - 1] === '@') {
    return {
      match: '@',
      name: '',
      startIndex: cursorPosition - 1,
      endIndex: cursorPosition,
    };
  }
  
  return null;
}

/**
 * Get the current word being typed (for autocomplete filtering)
 */
export function getCurrentMentionQuery(text: string, cursorPosition: number): string | null {
  // Look backward from cursor to find @
  let start = cursorPosition - 1;
  while (start >= 0 && text[start] !== '@' && /[\w\s\-]/.test(text[start])) {
    start--;
  }
  
  if (start >= 0 && text[start] === '@') {
    // Extract text from @ to cursor
    const query = text.substring(start + 1, cursorPosition);
    // Only return if it's a valid mention pattern (no spaces at start, no special chars)
    if (/^[\w\-\s]*$/.test(query)) {
      return query;
    }
  }
  
  return null;
}

/**
 * Insert a mention at cursor position
 */
export function insertMention(
  text: string,
  cursorPosition: number,
  mentionName: string
): { text: string; newCursorPosition: number } {
  const query = getCurrentMentionQuery(text, cursorPosition);
  
  if (query !== null) {
    // Find the @ symbol position
    const atPos = cursorPosition - query.length - 1;
    
    // Replace from @ to cursor with @MentionName
    const before = text.substring(0, atPos);
    const after = text.substring(cursorPosition);
    const newText = before + '@' + mentionName + ' ' + after;
    const newCursorPos = (before + '@' + mentionName + ' ').length;
    
    return {
      text: newText,
      newCursorPosition: newCursorPos,
    };
  }
  
  // Fallback: insert at cursor position
  const before = text.substring(0, cursorPosition);
  const after = text.substring(cursorPosition);
  const newText = before + '@' + mentionName + ' ' + after;
  
  return {
    text: newText,
    newCursorPosition: cursorPosition + mentionName.length + 2, // @ + name + space
  };
}

/**
 * Highlight mentions in text by wrapping them with markers
 * Used for syntax highlighting in display
 */
export function highlightMentions(
  text: string,
  mentionables: MentionableEntity[]
): string {
  const mentions = extractMentions(text);
  const resolved = resolveMentions(text, mentionables);
  const resolvedNames = new Set(resolved.map(e => e.name.toLowerCase()));
  
  let result = text;
  let offset = 0;
  
  for (const mention of mentions) {
    const isResolved = resolvedNames.has(mention.name.toLowerCase());
    const className = isResolved ? 'mention-valid' : 'mention-invalid';
    
    const highlighted = `<span class="${className}">${mention.match}</span>`;
    const startIdx = mention.startIndex + offset;
    const endIdx = mention.endIndex + offset;
    
    result = result.substring(0, startIdx) + highlighted + result.substring(endIdx);
    offset += highlighted.length - mention.match.length;
  }
  
  return result;
}
