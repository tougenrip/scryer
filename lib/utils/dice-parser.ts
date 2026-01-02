/**
 * Dice expression parser for converting D&D dice notation to DiceBox format
 * Supports: 1d20, 2d6, 5d8, 1d20+5, 2d6+3, 1d20-2, etc.
 */

export interface ParsedDiceExpression {
  dice: Array<{ sides: number; count: number }>;
  modifier: number;
  expression: string;
  isValid: boolean;
}

/**
 * Validates a dice expression
 * @param expression - Dice expression like "1d20+5", "2d6", "5d8"
 * @returns true if valid, false otherwise
 */
export function validateExpression(expression: string): boolean {
  if (!expression || typeof expression !== 'string') {
    return false;
  }

  // Remove whitespace
  const cleaned = expression.trim().toLowerCase();

  // Pattern: optional number, 'd', number, optional +/- modifier
  // Examples: "1d20", "2d6", "5d8", "1d20+5", "2d6+3", "1d20-2"
  const dicePattern = /^(\d+)d(\d+)([+-]\d+)?$/;
  
  // Also support expressions with multiple dice types: "2d6+1d4+3"
  const complexPattern = /^(\d+d\d+([+-]\d+)?)([+-]\d+d\d+([+-]\d+)?)*([+-]\d+)?$/;

  return dicePattern.test(cleaned) || complexPattern.test(cleaned);
}

/**
 * Parses a simple dice expression (single die type)
 * @param expression - Dice expression like "1d20+5", "2d6", "5d8"
 * @returns Parsed expression with dice and modifier
 */
export function parseDiceExpression(expression: string): ParsedDiceExpression {
  const defaultResult: ParsedDiceExpression = {
    dice: [],
    modifier: 0,
    expression: expression,
    isValid: false,
  };

  if (!expression || typeof expression !== 'string') {
    return defaultResult;
  }

  const cleaned = expression.trim().toLowerCase();

  // Simple pattern: (\d+)d(\d+)([+-]\d+)?
  const match = cleaned.match(/^(\d+)d(\d+)(?:([+-]\d+))?$/);
  
  if (!match) {
    return defaultResult;
  }

  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3], 10) : 0;

  // Validate dice sides (D&D supports d4, d6, d8, d10, d12, d20, d100)
  const validSides = [4, 6, 8, 10, 12, 20, 100];
  if (!validSides.includes(sides)) {
    return defaultResult;
  }

  // Validate count
  if (count < 1 || count > 100) {
    return defaultResult;
  }

  return {
    dice: [{ sides, count }],
    modifier,
    expression: cleaned,
    isValid: true,
  };
}

/**
 * Converts parsed expression to DiceBox roll format
 * DiceBox expects: { qty: number, sides: number }[]
 * @param parsed - Parsed dice expression
 * @returns Array of dice objects for DiceBox
 */
export function toDiceBoxFormat(parsed: ParsedDiceExpression): Array<{ qty: number; sides: number }> {
  if (!parsed.isValid) {
    return [];
  }

  return parsed.dice.map(d => ({
    qty: d.count,
    sides: d.sides,
  }));
}

/**
 * Calculates the result of a dice roll
 * @param rolls - Array of individual die results
 * @param modifier - Modifier to add/subtract
 * @returns Total result
 */
export function calculateRollResult(rolls: number[], modifier: number): number {
  const diceTotal = rolls.reduce((sum, roll) => sum + roll, 0);
  return diceTotal + modifier;
}

/**
 * Extracts hit dice expression from character
 * @param hitDiceCurrent - Character's current hit dice (e.g., "5d8")
 * @returns Parsed hit dice expression or null
 */
export function extractHitDice(hitDiceCurrent: string | null | undefined): ParsedDiceExpression | null {
  if (!hitDiceCurrent) {
    return null;
  }

  const parsed = parseDiceExpression(hitDiceCurrent);
  return parsed.isValid ? parsed : null;
}

/**
 * Formats a dice expression for display
 * @param expression - Dice expression
 * @param result - Optional roll result
 * @returns Formatted string like "1d20+5 = 18"
 */
export function formatDiceRoll(expression: string, result?: number): string {
  if (result !== undefined) {
    return `${expression} = ${result}`;
  }
  return expression;
}

/**
 * Creates a roll label from context
 * @param type - Type of roll (e.g., "check", "save", "hit-dice")
 * @param name - Name of the ability/skill/etc.
 * @returns Formatted label
 */
export function createRollLabel(type: 'check' | 'save' | 'hit-dice' | 'attack' | 'damage', name: string): string {
  const typeLabels = {
    check: 'Check',
    save: 'Save',
    'hit-dice': 'Hit Dice Recovery',
    attack: 'Attack',
    damage: 'Damage',
  };

  return `${name} ${typeLabels[type]}`;
}
