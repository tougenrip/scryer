"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getAbilityModifier, getAbilityModifierString } from "@/lib/utils/character";
import { Strength as StrengthIcon, Dexterity as DexterityIcon, Constitution as ConstitutionIcon, Intelligence as IntelligenceIcon, Wisdom as WisdomIcon, Charisma as CharismaIcon } from "dnd-icons/ability";
import { SavingThrow as SavingThrowIcon } from "dnd-icons/attribute";

interface SavingThrowsProps {
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  proficiencies: {
    strength: boolean;
    dexterity: boolean;
    constitution: boolean;
    intelligence: boolean;
    wisdom: boolean;
    charisma: boolean;
  };
  proficiencyBonus: number;
  onProficiencyChange?: (ability: string, proficient: boolean) => void;
  onSavingThrowClick?: (ability: string, short: string, score: number, proficient: boolean, description: string, examples: readonly string[] | undefined) => void;
  editable?: boolean;
}

export function SavingThrows({
  abilityScores,
  proficiencies,
  proficiencyBonus,
  onProficiencyChange,
  onSavingThrowClick,
  editable = false,
}: SavingThrowsProps) {
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
    const profMod = proficiencies[ability] ? proficiencyBonus : 0;
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
            const isProficient = proficiencies[ability.key];
            const AbilityIcon = abilityIcons[ability.key];

            return (
              <div
                key={ability.key}
                className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-muted/50 text-sm"
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {editable && (
                    <Checkbox
                      id={`save-${ability.key}`}
                      checked={isProficient}
                      onCheckedChange={(checked) => {
                        onProficiencyChange?.(ability.key, checked === true);
                      }}
                      className="h-3 w-3 shrink-0"
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
                <div className={`text-sm font-semibold shrink-0 ${isProficient ? "text-primary" : ""}`}>
                  {modifier >= 0 ? `+${modifier}` : `${modifier}`}
                  {isProficient && <span className="text-[10px] ml-0.5 text-primary">●</span>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          ● = Proficient
        </p>
      </CardContent>
    </Card>
  );
}

