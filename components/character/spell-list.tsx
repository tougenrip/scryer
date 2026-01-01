"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Spell } from "@/hooks/useDndContent";

interface CharacterSpell {
  spell: Spell;
  prepared: boolean;
  alwaysPrepared: boolean;
}

interface SpellListProps {
  spells: CharacterSpell[];
  onSpellToggle?: (spellIndex: string, prepared: boolean) => void;
  onSpellClick?: (spell: Spell) => void;
  editable?: boolean;
}

export function SpellList({ spells, onSpellToggle, onSpellClick, editable = false }: SpellListProps) {
  const spellsByLevel = spells.reduce((acc, cs) => {
    const level = cs.spell.level;
    if (!acc[level]) {
      acc[level] = [];
    }
    acc[level].push(cs);
    return acc;
  }, {} as Record<number, CharacterSpell[]>);

  const levelNames: Record<number, string> = {
    0: "Cantrips",
    1: "1st Level",
    2: "2nd Level",
    3: "3rd Level",
    4: "4th Level",
    5: "5th Level",
    6: "6th Level",
    7: "7th Level",
    8: "8th Level",
    9: "9th Level",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spells</CardTitle>
      </CardHeader>
      <CardContent>
        {spells.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No spells known. Add spells to your character.
          </p>
        ) : (
          <div className="space-y-6">
            {Object.entries(spellsByLevel)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([level, levelSpells]) => (
                <div key={level}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    {levelNames[parseInt(level)]}
                  </h4>
                  <div className="space-y-2">
                    {levelSpells.map((cs) => (
                      <div
                        key={`${cs.spell.source}-${cs.spell.index}`}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50"
                      >
                        {editable && (
                          <Checkbox
                            id={`spell-${cs.spell.index}`}
                            checked={cs.prepared || cs.alwaysPrepared}
                            onCheckedChange={(checked) => {
                              if (!cs.alwaysPrepared) {
                                onSpellToggle?.(cs.spell.index, checked === true);
                              }
                            }}
                            disabled={cs.alwaysPrepared}
                          />
                        )}
                        <Label
                          htmlFor={`spell-${cs.spell.index}`}
                          className={`cursor-pointer flex-1 hover:text-primary transition-colors ${
                            cs.prepared || cs.alwaysPrepared ? "font-medium" : ""
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            onSpellClick?.(cs.spell);
                          }}
                        >
                          {cs.spell.name}
                        </Label>
                        <div className="flex gap-1">
                          <Badge variant="outline">{cs.spell.school}</Badge>
                          {cs.spell.concentration && (
                            <Badge variant="secondary">C</Badge>
                          )}
                          {cs.spell.ritual && (
                            <Badge variant="secondary">R</Badge>
                          )}
                          {cs.alwaysPrepared && (
                            <Badge variant="default">Always</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

