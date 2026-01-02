import { Character } from "@/hooks/useDndContent";
import type { Race, DndClass } from "@/hooks/useDndContent";

/**
 * Resolves race name from character data using provided race data
 */
export function getCharacterRaceName(
  character: Character,
  races: Race[]
): string {
  if (!character.race_index) return "Unknown";
  
  const race = races.find(
    (r) => r.source === character.race_source && r.index === character.race_index
  );
  
  return race?.name || character.race_index;
}

/**
 * Resolves class name from character data using provided class data
 */
export function getCharacterClassName(
  character: Character,
  classes: DndClass[]
): string {
  if (!character.class_index) return "Unknown";
  
  const classData = classes.find(
    (c) => c.source === character.class_source && c.index === character.class_index
  );
  
  return classData?.name || character.class_index;
}

/**
 * Resolves subclass name from character data using provided class data
 */
export function getCharacterSubclassName(
  character: Character,
  classes: DndClass[]
): string | null {
  if (!character.subclass_index || !character.class_index) return null;
  
  const classData = classes.find(
    (c) => c.source === character.class_source && c.index === character.class_index
  );
  
  if (!classData) return null;
  
  // For SRD classes, subclasses are referenced by index in subclasses array
  // For homebrew, we might need to look it up differently
  // For now, return the subclass_index as a fallback
  // TODO: Implement proper subclass lookup if needed
  return character.subclass_index || null;
}

/**
 * Formats character stats line: "Lvl X | Race | Class | Subclass"
 */
export function formatCharacterStats(
  character: Character,
  races: Race[],
  classes: DndClass[]
): string {
  const level = character.level || 1;
  const raceName = getCharacterRaceName(character, races);
  const className = getCharacterClassName(character, classes);
  const subclassName = getCharacterSubclassName(character, classes);
  
  const parts = [
    `Lvl ${level}`,
    raceName,
    className,
    ...(subclassName ? [subclassName] : [])
  ];
  
  return parts.join(" | ");
}

