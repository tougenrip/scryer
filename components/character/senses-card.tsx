"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAbilityModifier } from "@/lib/utils/character";
import { extractSensesFromTraits } from "@/lib/utils/character";
import { Perception, Investigation, Insight } from "dnd-icons/skill";

interface SensesCardProps {
  wisdom: number;
  intelligence: number;
  perceptionProficient: boolean;
  investigationProficient: boolean;
  insightProficient: boolean;
  proficiencyBonus: number;
  raceTraits?: any;
  editable?: boolean;
}

export function SensesCard({
  wisdom,
  intelligence,
  perceptionProficient,
  investigationProficient,
  insightProficient,
  proficiencyBonus,
  raceTraits,
  editable = false,
}: SensesCardProps) {
  // Calculate Passive Perception: 10 + Wisdom modifier + (proficiency bonus if proficient)
  const wisdomModifier = getAbilityModifier(wisdom);
  const passivePerception = 10 + wisdomModifier + (perceptionProficient ? proficiencyBonus : 0);

  // Calculate Passive Investigation: 10 + Intelligence modifier + (proficiency bonus if proficient)
  const intelligenceModifier = getAbilityModifier(intelligence);
  const passiveInvestigation = 10 + intelligenceModifier + (investigationProficient ? proficiencyBonus : 0);

  // Calculate Passive Insight: 10 + Wisdom modifier + (proficiency bonus if proficient)
  const passiveInsight = 10 + wisdomModifier + (insightProficient ? proficiencyBonus : 0);

  // Extract special senses from race traits
  const specialSenses = extractSensesFromTraits(raceTraits);

  const hasSpecialSenses = Object.values(specialSenses).some(value => value !== undefined && value !== '');

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Perception size={16} />
          Senses
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-2">
          {/* Passive Perception */}
          <div className="flex items-center justify-between px-1.5 py-0.5 rounded">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Perception size={14} className="shrink-0" />
              <span className="text-xs text-muted-foreground">Passive Perception</span>
            </div>
            <div className="text-sm font-semibold shrink-0">
              {passivePerception}
            </div>
          </div>

          {/* Passive Investigation */}
          <div className="flex items-center justify-between px-1.5 py-0.5 rounded">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Investigation size={14} className="shrink-0" />
              <span className="text-xs text-muted-foreground">Passive Investigation</span>
            </div>
            <div className="text-sm font-semibold shrink-0">
              {passiveInvestigation}
            </div>
          </div>

          {/* Passive Insight */}
          <div className="flex items-center justify-between px-1.5 py-0.5 rounded">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Insight size={14} className="shrink-0" />
              <span className="text-xs text-muted-foreground">Passive Insight</span>
            </div>
            <div className="text-sm font-semibold shrink-0">
              {passiveInsight}
            </div>
          </div>

          {/* Special Senses */}
          {hasSpecialSenses && (
            <div className="pt-1 border-t border-border/50 space-y-1">
              {specialSenses.darkvision && (
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded text-xs">
                  <span className="text-muted-foreground">Darkvision</span>
                  <span className="font-medium">{specialSenses.darkvision}</span>
                </div>
              )}
              {specialSenses.blindsight && (
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded text-xs">
                  <span className="text-muted-foreground">Blindsight</span>
                  <span className="font-medium">{specialSenses.blindsight || "—"}</span>
                </div>
              )}
              {specialSenses.tremorsense && (
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded text-xs">
                  <span className="text-muted-foreground">Tremorsense</span>
                  <span className="font-medium">{specialSenses.tremorsense || "—"}</span>
                </div>
              )}
              {specialSenses.truesight && (
                <div className="flex items-center justify-between px-1.5 py-0.5 rounded text-xs">
                  <span className="text-muted-foreground">Truesight</span>
                  <span className="font-medium">{specialSenses.truesight || "—"}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

