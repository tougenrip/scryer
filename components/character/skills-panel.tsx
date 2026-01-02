"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  getSkillModifier,
  DND_SKILLS,
  calculateSkillProficiencies,
  type SkillName,
} from "@/lib/utils/character";
import { getAbilityModifierString } from "@/lib/utils/character";
import { Acrobatics, AnimalHandling, Arcana, Athletics, Deception, History, Insight, Intimidation, Investigation, Medicine, Nature, Perception, Performance, Persuasion, Religion, SleightOfHand, Stealth, Survival } from "dnd-icons/skill";
import { Skillcheck } from "dnd-icons/attribute";
import { useDiceRoller } from "@/contexts/dice-roller-context";
import { SkillProficiencyIndicator } from "./skill-proficiency-indicator";
import { Star } from "lucide-react";

interface SkillsPanelProps {
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  /**
   * Pre-calculated skill proficiencies. If raceTraits or backgroundSkillProficiencies
   * are provided, they will be merged with these values.
   */
  skillProficiencies: Record<SkillName, { proficient: boolean; expertise: boolean }>;
  proficiencyBonus: number;
  stealthDisadvantage?: boolean;
  /**
   * Optional: Race traits with descriptions for calculating skill proficiencies.
   */
  raceTraits?: Array<{ name?: string; description?: string; index?: string }>;
  /**
   * Optional: Background skill proficiencies string (e.g., "Insight, Religion").
   */
  backgroundSkillProficiencies?: string | null;
  /**
   * Optional: Class features that may grant skill proficiencies.
   */
  classFeatures?: Array<{ name?: string; description?: string; choice?: any }>;
  onSkillChange?: (skill: SkillName, proficient: boolean, expertise: boolean) => void;
  onSkillClick?: (skill: SkillName, description: string, examples: readonly string[] | undefined, ability: string, score: number, proficient: boolean, expertise: boolean) => void;
  editable?: boolean;
  characterId?: string;
  characterName?: string;
  campaignId?: string;
}

export function SkillsPanel({
  abilityScores,
  skillProficiencies,
  proficiencyBonus,
  stealthDisadvantage = false,
  raceTraits,
  backgroundSkillProficiencies,
  classFeatures,
  onSkillChange,
  onSkillClick,
  editable = false,
  characterId,
  characterName,
  campaignId,
}: SkillsPanelProps) {
  const { rollDice, rollWithAdvantage, rollWithDisadvantage } = useDiceRoller();
  
  // Calculate effective skill proficiencies by merging race/background/class with provided values
  const effectiveSkillProficiencies = useMemo(() => {
    // If any additional sources are provided, recalculate
    if (raceTraits || backgroundSkillProficiencies || classFeatures) {
      // Convert skillProficiencies to manual skills format for the function
      const manualSkills = Object.entries(skillProficiencies).map(([name, prof]) => ({
        skill_name: name,
        proficient: prof.proficient,
        expertise: prof.expertise,
      }));
      
      return calculateSkillProficiencies(
        manualSkills,
        classFeatures,
        undefined, // classProficiencyChoices - not passed here
        raceTraits,
        backgroundSkillProficiencies
      );
    }
    return skillProficiencies;
  }, [skillProficiencies, raceTraits, backgroundSkillProficiencies, classFeatures]);
  
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
                  const prof = effectiveSkillProficiencies[skill.name] || {
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
                          <SkillProficiencyIndicator
                            proficient={prof.proficient}
                            expertise={prof.expertise}
                            editable={true}
                            onToggle={() => {
                              // Cycle: not proficient -> proficient -> expertise -> not proficient
                              if (!prof.proficient) {
                                onSkillChange?.(skill.name, true, false);
                              } else if (prof.proficient && !prof.expertise) {
                                onSkillChange?.(skill.name, true, true);
                              } else {
                                onSkillChange?.(skill.name, false, false);
                              }
                            }}
                          />
                        )}
                        {!editable && (
                          <SkillProficiencyIndicator
                            proficient={prof.proficient}
                            expertise={prof.expertise}
                            editable={false}
                          />
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
                      <button
                        type="button"
                        className={`inline-flex items-center justify-center shrink-0 px-1.5 py-0.5 text-xs font-semibold rounded border transition-all ${
                          prof.proficient || prof.expertise 
                            ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50" 
                            : "bg-muted/50 border-border/50 text-foreground hover:bg-muted hover:border-border"
                        }`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (characterId) {
                            const skillName = skill.name
                              .split("-")
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(" ");
                            
                            // Right click or Ctrl+Click for advantage/disadvantage
                            if (e.ctrlKey || e.metaKey || e.button === 2) {
                              e.preventDefault();
                              await rollWithAdvantage(modifier, {
                                label: `${skillName} Check`,
                                characterId,
                                characterName,
                                campaignId,
                              });
                            } else {
                              // Check if stealth has disadvantage
                              const useDisadvantage = skill.name === 'stealth' && stealthDisadvantage;
                              
                              if (useDisadvantage) {
                                await rollWithDisadvantage(modifier, {
                                  label: `${skillName} Check (Disadvantage)`,
                                  characterId,
                                  characterName,
                                  campaignId,
                                });
                              } else {
                                await rollDice(`1d20${modifier >= 0 ? '+' : ''}${modifier}`, {
                                  label: `${skillName} Check`,
                                  characterId,
                                  characterName,
                                  campaignId,
                                });
                              }
                            }
                          }
                        }}
                        onContextMenu={async (e) => {
                          e.preventDefault();
                          if (characterId) {
                            const skillName = skill.name
                              .split("-")
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                              .join(" ");
                            await rollWithAdvantage(modifier, {
                              label: `${skillName} Check (Advantage)`,
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
            </div>
          ))}
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
          <div className="flex items-center gap-1">
            <Star size={12} className="text-primary fill-primary" strokeWidth={2} />
            <span>Expertise</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

