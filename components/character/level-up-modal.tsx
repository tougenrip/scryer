"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FeatureChoiceDialog } from "./feature-choice-dialog";
import type { AnyFeatureChoice } from "@/types/feature-choices";
import type { AbilityScores } from "@/lib/utils/ability-scores";

export interface NewFeature {
  level: number;
  name: string;
  description: string;
  type: 'feature' | 'asi' | 'skill' | 'equipment' | 'spell_slot' | 'spell_known';
  requiresChoice?: boolean;
  choices?: Array<{ name: string; description?: string }>;
  selectedChoice?: string;
  feature_index?: string;
  choice?: AnyFeatureChoice;
  feature_specific?: any;
}

interface LevelUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newLevel: number;
  features: NewFeature[];
  onConfirm: () => void;
  onFeatureChoice?: (featureIndex: string, choice: any) => void;
  currentAbilityScores?: AbilityScores;
  multiclassClasses?: Array<{
    characterClass: {
      class_source: 'srd' | 'homebrew';
      class_index: string;
      level: number;
      subclass_source?: 'srd' | 'homebrew' | null;
      subclass_index?: string | null;
      is_primary_class?: boolean;
    };
    classData?: {
      name: string;
      index: string;
      source: 'srd' | 'homebrew';
    } | null;
  }>;
  selectedClassForLevelUp?: {
    class_source: 'srd' | 'homebrew';
    class_index: string;
  } | null;
  onClassSelectForLevelUp?: (class_source: 'srd' | 'homebrew', class_index: string) => void;
}

export function LevelUpModal({
  open,
  onOpenChange,
  newLevel,
  features: initialFeatures,
  onConfirm,
  onFeatureChoice,
  currentAbilityScores,
  multiclassClasses,
  selectedClassForLevelUp,
  onClassSelectForLevelUp,
}: LevelUpModalProps) {
  const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<NewFeature | null>(null);
  const [features, setFeatures] = useState<NewFeature[]>(initialFeatures);

  // Update features when initialFeatures changes
  useEffect(() => {
    setFeatures(initialFeatures);
  }, [initialFeatures]);

  const featuresNeedingChoice = features.filter(f => {
    if (f.choice) {
      // Check if choice has been made
      if (f.choice.type === 'ability_score_improvement') {
        const selected = f.choice.selected;
        return !selected || !selected.ability_scores || Object.keys(selected.ability_scores).length === 0;
      } else {
        const selected = (f.choice as any).selected;
        return !selected || (Array.isArray(selected) && selected.length === 0);
      }
    }
    return f.requiresChoice && !f.selectedChoice;
  });
  const canConfirm = featuresNeedingChoice.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Level Up! - Level {newLevel}
          </DialogTitle>
          <DialogDescription>
            {multiclassClasses && multiclassClasses.length > 1 ? (
              <div className="space-y-2">
                <p>Choose which class to level up, then review the new features below.</p>
                {onClassSelectForLevelUp && (
                  <Select
                    value={selectedClassForLevelUp ? `${selectedClassForLevelUp.class_source}:${selectedClassForLevelUp.class_index}` : undefined}
                    onValueChange={(value) => {
                      const [source, index] = value.split(':');
                      onClassSelectForLevelUp(source as 'srd' | 'homebrew', index);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select class to level" />
                    </SelectTrigger>
                    <SelectContent>
                      {multiclassClasses.map(({ characterClass, classData }, idx) => (
                        <SelectItem
                          key={idx}
                          value={`${characterClass.class_source}:${characterClass.class_index}`}
                        >
                          {classData?.name || characterClass.class_index} (Level {characterClass.level} → {characterClass.level + 1})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              "Your character has gained new abilities and features. Review them below."
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {features.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground text-center">
                    No specific features listed for this level. Check your class description for general improvements.
                  </p>
                </CardContent>
              </Card>
            ) : (
              features.map((feature, index) => (
                <Card 
                  key={index}
                  className={feature.requiresChoice && !feature.selectedChoice 
                    ? "border-yellow-500/50 bg-yellow-500/10" 
                    : ""}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {feature.name}
                          {feature.requiresChoice && !feature.selectedChoice && (
                            <Badge variant="outline" className="text-xs">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Choice Required
                            </Badge>
                          )}
                          {feature.selectedChoice && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {feature.type === 'asi' && 'Ability Score Improvement'}
                          {feature.type === 'skill' && 'Skill Improvement'}
                          {feature.type === 'equipment' && 'New Equipment'}
                          {feature.type === 'spell_slot' && 'Spell Slot Increase'}
                          {feature.type === 'spell_known' && 'New Spell Known'}
                          {feature.type === 'feature' && 'Class Feature'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {feature.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {feature.description}
                      </p>
                    )}

                    {feature.choice && (
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedFeature(feature);
                            setChoiceDialogOpen(true);
                          }}
                        >
                          {(() => {
                            if (feature.choice?.type === 'ability_score_improvement') {
                              const selected = feature.choice.selected;
                              if (selected) {
                                const scores = Object.entries(selected.ability_scores || {})
                                  .filter(([_, val]) => val && val > 0)
                                  .map(([ability, val]) => `${ability.substring(0, 3).toUpperCase()}+${val}`)
                                  .join(', ');
                                return `Selected: ${selected.option === 'one_score' ? 'One score +2' : 'Two scores +1'} (${scores})`;
                              }
                            } else if (feature.choice) {
                              const selected = (feature.choice as any).selected;
                              if (selected && (Array.isArray(selected) ? selected.length > 0 : selected)) {
                                return `Choice Made`;
                              }
                            }
                            return "Make Choice";
                          })()}
                        </Button>
                      </div>
                    )}

                    {feature.requiresChoice && feature.choices && !feature.choice && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Choose one:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {feature.choices.map((choice, choiceIndex) => (
                            <Button
                              key={choiceIndex}
                              variant={feature.selectedChoice === choice.name ? "default" : "outline"}
                              className="justify-start text-left h-auto py-2"
                              onClick={() => onFeatureChoice?.(feature.feature_index || feature.name, choice.name)}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{choice.name}</div>
                                {choice.description && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {choice.description}
                                  </div>
                                )}
                              </div>
                              {feature.selectedChoice === choice.name && (
                                <CheckCircle2 className="h-4 w-4 ml-2" />
                              )}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {featuresNeedingChoice.length > 0 && (
              <span className="text-yellow-500">
                {featuresNeedingChoice.length} feature{featuresNeedingChoice.length > 1 ? 's' : ''} require{featuresNeedingChoice.length === 1 ? 's' : ''} a choice
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Review Later
            </Button>
            <Button 
              onClick={onConfirm} 
              disabled={!canConfirm}
            >
              Confirm Level Up
            </Button>
          </div>
        </div>
      </DialogContent>

      {selectedFeature && selectedFeature.choice && (
        <FeatureChoiceDialog
          open={choiceDialogOpen}
          onOpenChange={setChoiceDialogOpen}
          featureName={selectedFeature.name}
          featureDescription={selectedFeature.description}
          choice={selectedFeature.choice}
          currentAbilityScores={currentAbilityScores}
          onConfirm={(choice) => {
            if (onFeatureChoice && selectedFeature.feature_index) {
              onFeatureChoice(selectedFeature.feature_index, choice);
              // Update the feature in the local state
              const updatedFeature = {
                ...selectedFeature,
                choice: {
                  ...selectedFeature.choice!,
                  selected: choice,
                },
              };
              // Update features array
              const updatedFeatures = features.map(f =>
                f.feature_index === selectedFeature.feature_index ? updatedFeature : f
              );
              setFeatures(updatedFeatures);
            }
            setChoiceDialogOpen(false);
          }}
          initialSelection={
            selectedFeature.choice.type === 'ability_score_improvement'
              ? selectedFeature.choice.selected
              : (selectedFeature.choice as any).selected
          }
        />
      )}
    </Dialog>
  );
}

