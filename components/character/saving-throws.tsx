"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getAbilityModifier, getAbilityModifierString, calculateSavingThrowProficiencies } from "@/lib/utils/character";
import { Strength as StrengthIcon, Dexterity as DexterityIcon, Constitution as ConstitutionIcon, Intelligence as IntelligenceIcon, Wisdom as WisdomIcon, Charisma as CharismaIcon } from "dnd-icons/ability";
import { SavingThrow as SavingThrowIcon } from "dnd-icons/attribute";
import { useDiceRoller } from "@/contexts/dice-roller-context";
import { SkillProficiencyIndicator } from "./skill-proficiency-indicator";

interface SavingThrowsProps {
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  /** 
   * Direct proficiency values. If classSavingThrows is provided, 
   * proficiencies will be calculated automatically and merged with these values.
   */
  proficiencies: {
    strength: boolean;
    dexterity: boolean;
    constitution: boolean;
    intelligence: boolean;
    wisdom: boolean;
    charisma: boolean;
  };
  proficiencyBonus: number;
  /** 
   * Optional: Class saving throw proficiencies (e.g., ['STR', 'CON']).
   * If provided, these will be used to calculate proficiencies automatically.
   */
  classSavingThrows?: string[] | null;
  /**
   * Optional: Race traits that might grant saving throw proficiencies.
   */
  raceTraits?: any;
  onProficiencyChange?: (ability: string, proficient: boolean) => void;
  onSavingThrowClick?: (ability: string, short: string, score: number, proficient: boolean, description: string, examples: readonly string[] | undefined) => void;
  editable?: boolean;
  characterId?: string;
  characterName?: string;
  campaignId?: string;
}

export function SavingThrows({
  abilityScores,
  proficiencies,
  proficiencyBonus,
  classSavingThrows,
  raceTraits,
  onProficiencyChange,
  onSavingThrowClick,
  editable = false,
  characterId,
  characterName,
  campaignId,
}: SavingThrowsProps) {
  const { rollDice, rollWithAdvantage, rollWithDisadvantage } = useDiceRoller();
  
  // Calculate effective proficiencies by merging class/race-based with manual overrides
  const effectiveProficiencies = useMemo(() => {
    // If classSavingThrows is provided, calculate from class/race
    if (classSavingThrows || raceTraits) {
      return calculateSavingThrowProficiencies(
        classSavingThrows,
        raceTraits,
        proficiencies
      );
    }
    // Otherwise, just use the provided proficiencies
    return proficiencies;
  }, [classSavingThrows, raceTraits, proficiencies]);
  
  const abilities = [
    {
      name: "Strength",
      key: "strength" as const,
      short: "STR",
      description:
        "Strength measures physical power, athletic training, and the ability to lift, push, or break things. It impacts all checks and saving throws involving brute force and physical prowess.",
      examples: [
        "Resisting being moved or pushed by an enemy (e.g., shoving match)",
        "Breaking free of a grapple using sheer force",
        "Holding onto a ledge or object to avoid being pulled away"
      ]
    },
    {
      name: "Dexterity",
      key: "dexterity" as const,
      short: "DEX",
      description:
        "Dexterity reflects agility, reflexes, and balance. Dexterity saving throws help you avoid dangers like explosions, traps, and attacks that require quick movement or dodging.",
      examples: [
        "Dodging a dragon’s breath weapon",
        "Avoiding a trap (such as a pit or swinging blade)",
        "Leaping out of the way of a falling object"
      ]
    },
    {
      name: "Constitution",
      key: "constitution" as const,
      short: "CON",
      description:
        "Constitution represents endurance, stamina, and health. Saving throws based on constitution protect you from threats that afflict the body, such as poison, exhaustion, or holding your breath.",
      examples: [
        "Resisting a paralytic poison",
        "Enduring a disease or magical sickness",
        "Surviving extreme temperatures or dehydration"
      ]
    },
    {
      name: "Intelligence",
      key: "intelligence" as const,
      short: "INT",
      description:
        "Intelligence indicates reasoning and memory. Intelligence saving throws withstand efforts to deceive or confuse your mind, including illusions, certain magical effects, or mental traps.",
      examples: [
        "Resisting a mind-altering spell like feeblemind",
        "Overcoming an illusion that clouds your senses",
        "Recalling crucial lore under stress"
      ]
    },
    {
      name: "Wisdom",
      key: "wisdom" as const,
      short: "WIS",
      description:
        "Wisdom reflects perceptiveness and willpower. Wisdom saves help you resist effects that charm, frighten, or otherwise influence your spirit and senses.",
      examples: [
        "Resisting a charm or fear spell",
        "Shaking off a compulsion to act against your will",
        "Not being caught off guard by a hidden threat"
      ]
    },
    {
      name: "Charisma",
      key: "charisma" as const,
      short: "CHA",
      description:
        "Charisma embodies force of personality and persuasiveness. Charisma saving throws protect you against effects that would erode your sense of self or control your actions, such as possession or certain magical commands.",
      examples: [
        "Shaking off the effects of a banishment spell",
        "Resisting a magic that would dominate your will",
        "Retaining your true form against a polymorph effect"
      ]
    },
  ];

  const getSaveModifier = (ability: typeof abilities[number]["key"]) => {
    const abilityMod = getAbilityModifier(abilityScores[ability]);
    const profMod = effectiveProficiencies[ability] ? proficiencyBonus : 0;
    return abilityMod + profMod;
  };

  const abilityIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    strength: StrengthIcon,
    dexterity: DexterityIcon,
    constitution: ConstitutionIcon,
    intelligence: IntelligenceIcon,
    wisdom: WisdomIcon,
    charisma: CharismaIcon,
  };

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <SavingThrowIcon size={16} />
          Saving Throws
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-0.5">
          {abilities.map((ability) => {
            const modifier = getSaveModifier(ability.key);
            const isProficient = effectiveProficiencies[ability.key];
            const AbilityIcon = abilityIcons[ability.key];

            return (
              <div
                key={ability.key}
                className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-muted/50 text-sm"
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {editable && (
                    <SkillProficiencyIndicator
                      proficient={isProficient}
                      expertise={false}
                      editable={true}
                      onToggle={() => {
                        onProficiencyChange?.(ability.key, !isProficient);
                      }}
                    />
                  )}
                  {!editable && (
                    <SkillProficiencyIndicator
                      proficient={isProficient}
                      expertise={false}
                      editable={false}
                    />
                  )}
                  {AbilityIcon && <AbilityIcon size={14} className="shrink-0" />}
                  <Label
                    htmlFor={`save-${ability.key}`}
                    className={`cursor-pointer flex-1 hover:text-primary transition-colors text-xs truncate ${isProficient ? "font-medium" : ""}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSavingThrowClick?.(ability.key, ability.short, abilityScores[ability.key], isProficient, ability.description, ability.examples);
                    }}
                  >
                    {ability.name}
                  </Label>
                </div>
                <button
                  type="button"
                  className={`inline-flex items-center justify-center shrink-0 px-1.5 py-0.5 text-xs font-semibold rounded border transition-all ${
                    isProficient 
                      ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50" 
                      : "bg-muted/50 border-border/50 text-foreground hover:bg-muted hover:border-border"
                  }`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (characterId) {
                      // Right click or Ctrl+Click for advantage/disadvantage
                      if (e.ctrlKey || e.metaKey || e.button === 2) {
                        e.preventDefault();
                        // Toggle between advantage and disadvantage on repeated clicks
                        // For now, just roll with advantage
                        await rollWithAdvantage(modifier, {
                          label: `${ability.name} Save`,
                          characterId,
                          characterName,
                          campaignId,
                        });
                      } else {
                        await rollDice(`1d20${modifier >= 0 ? '+' : ''}${modifier}`, {
                          label: `${ability.name} Save`,
                          characterId,
                          characterName,
                          campaignId,
                        });
                      }
                    }
                  }}
                  onContextMenu={async (e) => {
                    e.preventDefault();
                    if (characterId) {
                      await rollWithAdvantage(modifier, {
                        label: `${ability.name} Save (Advantage)`,
                        characterId,
                        characterName,
                        campaignId,
                      });
                    }
                  }}
                >
                  {modifier >= 0 ? `+${modifier}` : `${modifier}`}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-border/50 bg-muted/30" />
            <span>Not proficient</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border border-primary bg-primary" />
            <span>Proficient</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

