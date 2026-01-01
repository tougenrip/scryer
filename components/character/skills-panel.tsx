"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getSkillModifier,
  DND_SKILLS,
  type SkillName,
} from "@/lib/utils/character";
import { getAbilityModifierString } from "@/lib/utils/character";
import { Acrobatics, AnimalHandling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, Persuasion, Religion, SleightOfHand, Stealth, Survival } from "dnd-icons/skill";
import { Skillcheck } from "dnd-icons/attribute";

interface SkillsPanelProps {
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  skillProficiencies: Record<SkillName, { proficient: boolean; expertise: boolean }>;
  proficiencyBonus: number;
  stealthDisadvantage?: boolean;
  onSkillChange?: (skill: SkillName, proficient: boolean, expertise: boolean) => void;
  onSkillClick?: (skill: SkillName, description: string, examples: readonly string[] | undefined, ability: string, score: number, proficient: boolean, expertise: boolean) => void;
  editable?: boolean;
}

export function SkillsPanel({
  abilityScores,
  skillProficiencies,
  proficiencyBonus,
  stealthDisadvantage = false,
  onSkillChange,
  onSkillClick,
  editable = false,
}: SkillsPanelProps) {
  const skillGroups = DND_SKILLS.reduce((acc, skill) => {
    const ability = skill.ability;
    if (!acc[ability]) {
      acc[ability] = [];
    }
    acc[ability].push(skill);
    return acc;
  }, {} as Record<string, Array<typeof DND_SKILLS[number]>>);

  const skillIconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    acrobatics: Acrobatics,
    'animal-handling': AnimalHandling,
    arcana: Arcana,
    athletics: Athletics,
    deception: Deception,
    history: History,
    insight: Insight,
    intimidation: Intimidation,
    investigation: Investigation,
    medicine: Medicine,
    nature: Nature,
    perception: Perception,
    performance: Performance,
    persuasion: Persuasion,
    religion: Religion,
    'sleight-of-hand': SleightOfHand,
    stealth: Stealth,
    survival: Survival,
  };

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Skillcheck size={16} />
          Skills
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-2">
          {Object.entries(skillGroups).map(([ability, skills]) => (
            <div key={ability}>
              <h4 className="font-medium text-xs text-muted-foreground mb-1 capitalize">
                {ability}
              </h4>
              <div className="space-y-0.5">
                {skills.map((skill) => {
                  const prof = skillProficiencies[skill.name] || {
                    proficient: false,
                    expertise: false,
                  };
                  const modifier = getSkillModifier(
                    skill.name,
                    abilityScores,
                    prof.proficient,
                    prof.expertise,
                    proficiencyBonus
                  );

                  return (
                    <div
                      key={skill.name}
                      className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {editable && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Checkbox
                              id={`skill-${skill.name}`}
                              checked={prof.proficient || prof.expertise}
                              onCheckedChange={(checked) => {
                                onSkillChange?.(skill.name, checked === true, false);
                              }}
                              className="h-3 w-3"
                            />
                            {prof.proficient && (
                              <Checkbox
                                id={`skill-expertise-${skill.name}`}
                                checked={prof.expertise}
                                onCheckedChange={(checked) => {
                                  onSkillChange?.(skill.name, true, checked === true);
                                }}
                                className="h-2.5 w-2.5"
                              />
                            )}
                          </div>
                        )}
                        {(() => {
                          const SkillIcon = skillIconMap[skill.name];
                          return SkillIcon ? <SkillIcon size={12} className="shrink-0" /> : null;
                        })()}
                        <Label
                          htmlFor={`skill-${skill.name}`}
                          className={`cursor-pointer flex-1 hover:text-primary transition-colors text-xs truncate ${
                            prof.proficient || prof.expertise ? "font-medium" : ""
                          } ${skill.name === 'stealth' && stealthDisadvantage ? "text-destructive" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            const abilityScore = abilityScores[skill.ability as keyof typeof abilityScores];
                            onSkillClick?.(skill.name, skill.description, skill.examples, skill.ability, abilityScore, prof.proficient, prof.expertise);
                          }}
                        >
                          <span className="text-[10px] text-muted-foreground uppercase mr-1">
                            {skill.ability.substring(0, 3)}
                          </span>
                          {skill.name
                            .split("-")
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                            .join(" ")}
                          {skill.name === 'stealth' && stealthDisadvantage && (
                            <span className="ml-1 text-destructive" title="Disadvantage on Stealth checks due to armor">
                              ⚠️
                            </span>
                          )}
                        </Label>
                      </div>
                      <div
                        className={`text-sm font-semibold shrink-0 ${
                          prof.proficient || prof.expertise ? "text-primary" : ""
                        }`}
                      >
                        {modifier >= 0 ? `+${modifier}` : `${modifier}`}
                        {prof.expertise && (
                          <span className="text-[10px] ml-0.5 text-primary">●●</span>
                        )}
                        {prof.proficient && !prof.expertise && (
                          <span className="text-[10px] ml-0.5 text-primary">●</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          ● = Proficient, ●● = Expertise
        </p>
      </CardContent>
    </Card>
  );
}

