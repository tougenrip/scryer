import { useMemo } from "react";
import type { Character } from "./useDndContent";
import {
  calculateEquipmentEffects,
  type EnrichedInventoryItem,
  type EquipmentEffects,
} from "@/lib/utils/equipment-effects";

/**
 * Hook to calculate equipment effects on character stats
 * Automatically recalculates when character or inventory changes
 */
export function useEquipmentEffects(
  character: Character,
  inventory: EnrichedInventoryItem[]
): EquipmentEffects {
  return useMemo(() => {
    return calculateEquipmentEffects(
      {
        strength: character.strength || 10,
        dexterity: character.dexterity || 10,
        constitution: character.constitution || 10,
        intelligence: character.intelligence || 10,
        wisdom: character.wisdom || 10,
        charisma: character.charisma || 10,
        armor_class: character.armor_class,
        speed: character.speed,
      },
      inventory
    );
  }, [
    character.strength,
    character.dexterity,
    character.constitution,
    character.intelligence,
    character.wisdom,
    character.charisma,
    character.armor_class,
    character.speed,
    inventory,
  ]);
}
