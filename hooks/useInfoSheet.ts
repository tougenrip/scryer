"use client";

import { useState, useCallback } from "react";
import type { InfoSheetContent } from "@/components/shared/info-sheet";
import type { Spell, Equipment, Race, DndClass } from "@/hooks/useDndContent";
import { getAbilityModifier } from "@/lib/utils/character";

export function useInfoSheet() {
  const [content, setContent] = useState<InfoSheetContent | null>(null);
  const [open, setOpen] = useState(false);

  const showSpell = useCallback((spell: Spell) => {
    setContent({ type: "spell", data: spell });
    setOpen(true);
  }, []);

  const showEquipment = useCallback((equipment: Equipment) => {
    setContent({ type: "equipment", data: equipment });
    setOpen(true);
  }, []);

  const showAbility = useCallback((name: string, short: string, score: number) => {
    setContent({ type: "ability", data: { name, short, score } });
    setOpen(true);
  }, []);

  const showSavingThrow = useCallback((
    ability: string,
    short: string,
    score: number,
    proficient: boolean,
    proficiencyBonus: number,
    description: string,
    examples?: readonly string[]
  ) => {
    setContent({
      type: "saving-throw",
      data: { ability, short, score, proficient, proficiencyBonus, description, examples: examples && Array.isArray(examples) ? [...examples] : [] }
    });
    setOpen(true);
  }, []);

  const showSkill = useCallback((
    name: string,
    ability: string,
    score: number,
    proficient: boolean,
    expertise: boolean,
    proficiencyBonus: number,
    description: string,
    examples?: readonly string[]
  ) => {
    setContent({
      type: "skill",
      data: { 
        name, 
        ability, 
        score, 
        proficient, 
        expertise, 
        proficiencyBonus, 
        description, 
        examples: examples && Array.isArray(examples) ? [...examples] : [] 
      }
    });
    setOpen(true);
  }, []);

  const showCondition = useCallback((name: string) => {
    setContent({ type: "condition", data: { name } });
    setOpen(true);
  }, []);

  const showRace = useCallback((race: Race) => {
    setContent({ type: "race", data: race });
    setOpen(true);
  }, []);

  const showClass = useCallback((classData: DndClass) => {
    setContent({ type: "class", data: classData });
    setOpen(true);
  }, []);

  const showTrait = useCallback((name: string, description: string) => {
    setContent({ type: "trait", data: { name, description } });
    setOpen(true);
  }, []);

  const showFeature = useCallback((
    name: string,
    description: string,
    level?: number,
    className?: string
  ) => {
    setContent({ type: "feature", data: { name, description, level, class: className } });
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    content,
    open,
    setOpen,
    showSpell,
    showEquipment,
    showAbility,
    showSavingThrow,
    showSkill,
    showCondition,
    showRace,
    showClass,
    showTrait,
    showFeature,
    close,
  };
}

