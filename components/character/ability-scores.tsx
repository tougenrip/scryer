"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAbilityModifier, getAbilityModifierString } from "@/lib/utils/character";
import { useDiceRoller } from "@/contexts/dice-roller-context";

interface AbilityScoresProps {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  onAbilityClick?: (name: string, short: string, score: number) => void;
  characterId?: string;
  characterName?: string;
  campaignId?: string;
}

export function AbilityScores({
  strength,
  dexterity,
  constitution,
  intelligence,
  wisdom,
  charisma,
  onAbilityClick,
  characterId,
  characterName,
  campaignId,
}: AbilityScoresProps) {
  const { rollDice, rollWithAdvantage } = useDiceRoller();
  
  const abilities = [
    { name: "Strength", short: "STR", score: strength },
    { name: "Dexterity", short: "DEX", score: dexterity },
    { name: "Constitution", short: "CON", score: constitution },
    { name: "Intelligence", short: "INT", score: intelligence },
    { name: "Wisdom", short: "WIS", score: wisdom },
    { name: "Charisma", short: "CHA", score: charisma },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ability Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {abilities.map((ability) => {
            const modifier = getAbilityModifierString(ability.score);
            const modifierValue = getAbilityModifier(ability.score);
            return (
              <div 
                key={ability.short} 
                className="text-center"
                onClick={() => {
                  if (!characterId) {
                    onAbilityClick?.(ability.name, ability.short, ability.score);
                  }
                }}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {ability.short}
                </div>
                <div className="text-2xl font-bold mb-1">{ability.score}</div>
                {characterId ? (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center w-full px-2 py-1 text-sm font-semibold rounded border transition-all bg-muted/50 border-border/50 text-foreground hover:bg-muted hover:border-border"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        await rollWithAdvantage(modifierValue, {
                          label: `${ability.name} Check`,
                          characterId,
                          characterName,
                          campaignId,
                        });
                      } else {
                        await rollDice(`1d20${modifierValue >= 0 ? '+' : ''}${modifierValue}`, {
                          label: `${ability.name} Check`,
                          characterId,
                          characterName,
                          campaignId,
                        });
                      }
                    }}
                    onContextMenu={async (e) => {
                      e.preventDefault();
                      await rollWithAdvantage(modifierValue, {
                        label: `${ability.name} Check (Advantage)`,
                        characterId,
                        characterName,
                        campaignId,
                      });
                    }}
                  >
                    {modifier}
                  </button>
                ) : (
                  <div className="text-sm font-medium">{modifier}</div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

