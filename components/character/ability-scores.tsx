"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAbilityModifierString } from "@/lib/utils/character";

interface AbilityScoresProps {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  onAbilityClick?: (name: string, short: string, score: number) => void;
}

export function AbilityScores({
  strength,
  dexterity,
  constitution,
  intelligence,
  wisdom,
  charisma,
  onAbilityClick,
}: AbilityScoresProps) {
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
            return (
              <div 
                key={ability.short} 
                className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => onAbilityClick?.(ability.name, ability.short, ability.score)}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {ability.short}
                </div>
                <div className="text-2xl font-bold mb-1">{ability.score}</div>
                <div className="text-sm font-medium">{modifier}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

