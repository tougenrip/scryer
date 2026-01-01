"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { AbilityScoreImprovementChoice } from "@/types/feature-choices";
import { validateASI, applyASI, formatAbilityScoreChange, type AbilityScores } from "@/lib/utils/ability-scores";

interface AbilityScoreImprovementSelectorProps {
  currentScores: AbilityScores;
  choice: AbilityScoreImprovementChoice;
  onChoiceChange: (choice: AbilityScoreImprovementChoice['selected']) => void;
  initialSelection?: AbilityScoreImprovementChoice['selected'];
}

const ABILITY_NAMES: Record<keyof AbilityScores, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export function AbilityScoreImprovementSelector({
  currentScores,
  choice,
  onChoiceChange,
  initialSelection,
}: AbilityScoreImprovementSelectorProps) {
  const [option, setOption] = useState<'one_score' | 'two_scores'>(
    initialSelection?.option || 'one_score'
  );
  const [abilityScores, setAbilityScores] = useState<Partial<AbilityScores>>(
    initialSelection?.ability_scores || {}
  );

  useEffect(() => {
    // Update parent when selection changes
    onChoiceChange({
      option,
      ability_scores: abilityScores,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option, abilityScores]);

  const handleOptionChange = (newOption: 'one_score' | 'two_scores') => {
    setOption(newOption);
    // Reset ability scores when switching options
    setAbilityScores({});
  };

  const handleAbilityChange = (ability: keyof AbilityScores, value: number) => {
    if (value < 0) return;

    const newScores = { ...abilityScores };

    if (option === 'one_score') {
      // Only one score can be increased by 2
      // Clear all others and set this one
      setAbilityScores({ [ability]: value === 2 ? 2 : 0 });
    } else {
      // Two scores can be increased by 1 each
      if (value === 1) {
        newScores[ability] = 1;
      } else {
        delete newScores[ability];
      }
      // Ensure only 2 scores are selected
      const selectedCount = Object.values(newScores).filter(v => v === 1).length;
      if (selectedCount > 2) {
        // Remove the first non-current ability
        const keys = Object.keys(newScores) as (keyof AbilityScores)[];
        const toRemove = keys.find(k => k !== ability && newScores[k] === 1);
        if (toRemove) {
          delete newScores[toRemove];
        }
      }
      setAbilityScores(newScores);
    }
  };

  const validation = validateASI(currentScores, { option, ability_scores: abilityScores });
  const previewScores = applyASI(currentScores, { option, ability_scores: abilityScores });

  const selectedCount = Object.values(abilityScores).filter(v => v && v > 0).length;
  const requiredCount = option === 'one_score' ? 1 : 2;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Choose Your Improvement</CardTitle>
          <CardDescription>
            You can increase one ability score by 2, or two ability scores by 1 each.
            Ability scores cannot exceed 20.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={option} onValueChange={handleOptionChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="one_score" id="one_score" />
              <Label htmlFor="one_score" className="cursor-pointer flex-1">
                Increase one ability score by 2
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="two_scores" id="two_scores" />
              <Label htmlFor="two_scores" className="cursor-pointer flex-1">
                Increase two ability scores by 1 each
              </Label>
            </div>
          </RadioGroup>

          <div className="space-y-3 pt-4 border-t">
            <div className="text-sm font-medium">
              Select {option === 'one_score' ? 'one' : 'two'} ability score{option === 'two_scores' ? 's' : ''}:
              {selectedCount > 0 && (
                <Badge variant="outline" className="ml-2">
                  {selectedCount} / {requiredCount} selected
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(ABILITY_NAMES) as Array<keyof AbilityScores>).map((ability) => {
                const currentScore = currentScores[ability];
                const increase = abilityScores[ability] || 0;
                const newScore = Math.min(currentScore + increase, 20);
                const isSelected = increase > 0;
                const maxIncrease = option === 'one_score' ? 2 : 1;

                return (
                  <Card
                    key={ability}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => {
                      if (option === 'one_score') {
                        handleAbilityChange(ability, isSelected ? 0 : 2);
                      } else {
                        handleAbilityChange(ability, isSelected ? 0 : 1);
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{ABILITY_NAMES[ability]}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Current: {currentScore}
                            {isSelected && (
                              <span className="ml-2 text-primary font-medium">
                                → {newScore} (+{increase})
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {validation.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {validation.valid && selectedCount === requiredCount && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-2">Preview of changes:</div>
                <div className="space-y-1 text-sm">
                  {Object.entries(abilityScores)
                    .filter(([_, val]) => val && val > 0)
                    .map(([ability, increase]) => (
                      <div key={ability}>
                        {formatAbilityScoreChange(
                          ABILITY_NAMES[ability as keyof AbilityScores],
                          currentScores[ability as keyof AbilityScores],
                          increase || 0
                        )}
                      </div>
                    ))}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
