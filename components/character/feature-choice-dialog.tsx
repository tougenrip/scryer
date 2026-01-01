"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import type {
  AnyFeatureChoice,
  AbilityScoreImprovementChoice,
  FeatureSelectionChoice,
  SkillSelectionChoice,
  StringSelectionChoice,
} from "@/types/feature-choices";
import { AbilityScoreImprovementSelector } from "./ability-score-improvement-selector";
import { FeatureOptionCard } from "./feature-option-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AbilityScores } from "@/lib/utils/ability-scores";
import { DND_SKILLS } from "@/lib/utils/character";

interface FeatureChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  featureDescription?: string;
  choice: AnyFeatureChoice;
  currentAbilityScores?: AbilityScores;
  onConfirm: (selectedChoice: any) => void;
  initialSelection?: any;
}

export function FeatureChoiceDialog({
  open,
  onOpenChange,
  featureName,
  featureDescription,
  choice,
  currentAbilityScores,
  onConfirm,
  initialSelection,
}: FeatureChoiceDialogProps) {
  const [selected, setSelected] = useState<any>(initialSelection || null);
  const [isValid, setIsValid] = useState(false);

  // Memoize the ASI change handler to prevent infinite loops
  const handleASIChange = useCallback((choiceData: any) => {
    setSelected(choiceData);
  }, []);

  useEffect(() => {
    // Reset selection when dialog opens
    if (open) {
      setSelected(initialSelection || null);
    }
  }, [open, initialSelection]);

  const validateSelection = useCallback(() => {
    if (!choice) {
      setIsValid(false);
      return;
    }

    switch (choice.type) {
      case 'ability_score_improvement':
        const asiChoice = choice as AbilityScoreImprovementChoice;
        if (selected?.option && selected?.ability_scores) {
          const selectedCount = Object.values(selected.ability_scores).filter(
            (v: any) => v && v > 0
          ).length;
          const requiredCount = selected.option === 'one_score' ? 1 : 2;
          setIsValid(selectedCount === requiredCount);
        } else {
          setIsValid(false);
        }
        break;

      case 'feature_selection':
      case 'skill_selection':
      case 'proficiency_selection':
        const selectionChoice = choice as FeatureSelectionChoice | SkillSelectionChoice;
        const requiredCount = selectionChoice.choose || 1;
        const selectedCount = Array.isArray(selected) ? selected.length : (selected ? 1 : 0);
        setIsValid(selectedCount === requiredCount);
        break;

      case 'string_selection':
        const stringChoice = choice as StringSelectionChoice;
        const stringRequiredCount = stringChoice.choose || 1;
        const stringSelectedCount = Array.isArray(selected) ? selected.length : (selected ? 1 : 0);
        setIsValid(stringSelectedCount === stringRequiredCount);
        break;

      default:
        setIsValid(false);
    }
  }, [choice, selected]);

  useEffect(() => {
    // Validate selection based on choice type
    validateSelection();
  }, [selected, choice, validateSelection]);

  const handleConfirm = () => {
    if (isValid && selected) {
      onConfirm(selected);
      onOpenChange(false);
    }
  };

  const renderChoiceContent = () => {
    switch (choice.type) {
      case 'ability_score_improvement':
        if (!currentAbilityScores) {
          return (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Current ability scores are required for this choice.
              </AlertDescription>
            </Alert>
          );
        }

        return (
          <AbilityScoreImprovementSelector
            currentScores={currentAbilityScores}
            choice={choice as AbilityScoreImprovementChoice}
            onChoiceChange={handleASIChange}
            initialSelection={initialSelection}
          />
        );

      case 'feature_selection':
        const featureChoice = choice as FeatureSelectionChoice;
        const requiredCount = featureChoice.choose || 1;
        const selectedFeatures = Array.isArray(selected) ? selected : (selected ? [selected] : []);

        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Choose {requiredCount} option{requiredCount > 1 ? 's' : ''}:
              {selectedFeatures.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {selectedFeatures.length} / {requiredCount} selected
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3">
              {featureChoice.options.map((option) => {
                const isSelected = selectedFeatures.includes(option.index);
                return (
                  <FeatureOptionCard
                    key={option.index}
                    index={option.index}
                    name={option.name}
                    description={option.description}
                    selected={isSelected}
                    onClick={() => {
                      if (requiredCount === 1) {
                        setSelected(option.index);
                      } else {
                        const newSelected = isSelected
                          ? selectedFeatures.filter((s) => s !== option.index)
                          : [...selectedFeatures, option.index];
                        if (newSelected.length <= requiredCount) {
                          setSelected(newSelected);
                        }
                      }
                    }}
                    disabled={
                      requiredCount > 1 &&
                      !isSelected &&
                      selectedFeatures.length >= requiredCount
                    }
                  />
                );
              })}
            </div>
          </div>
        );

      case 'skill_selection':
      case 'proficiency_selection':
        const skillChoice = choice as SkillSelectionChoice;
        const skillRequiredCount = skillChoice.choose || 1;
        const selectedSkills = Array.isArray(selected) ? selected : (selected ? [selected] : []);

        return (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Choose {skillRequiredCount} skill{skillRequiredCount > 1 ? 's' : ''}:
              {selectedSkills.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {selectedSkills.length} / {skillRequiredCount} selected
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto">
              {skillChoice.options.map((option) => {
                const isSelected = selectedSkills.includes(option.index);
                const skillData = DND_SKILLS.find(
                  (s) => s.name === option.index || s.name === option.index.replace('skill-', '')
                );
                return (
                  <FeatureOptionCard
                    key={option.index}
                    index={option.index}
                    name={option.name || skillData?.name || option.index}
                    description={option.description || skillData?.description}
                    selected={isSelected}
                    onClick={() => {
                      if (skillRequiredCount === 1) {
                        setSelected(option.index);
                      } else {
                        const newSelected = isSelected
                          ? selectedSkills.filter((s) => s !== option.index)
                          : [...selectedSkills, option.index];
                        if (newSelected.length <= skillRequiredCount) {
                          setSelected(newSelected);
                        }
                      }
                    }}
                    disabled={
                      skillRequiredCount > 1 &&
                      !isSelected &&
                      selectedSkills.length >= skillRequiredCount
                    }
                  />
                );
              })}
            </div>
          </div>
        );

      case 'string_selection':
        const stringChoice = choice as StringSelectionChoice;
        const stringRequiredCount = stringChoice.choose || 1;

        if (stringRequiredCount === 1) {
          // Single selection - use dropdown
          return (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Choose one option:
              </div>
              <Select
                value={selected || ''}
                onValueChange={(value) => setSelected(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {stringChoice.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1).replace(/-/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        } else {
          // Multiple selection - use cards
          const selectedStrings = Array.isArray(selected) ? selected : (selected ? [selected] : []);
          return (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Choose {stringRequiredCount} option{stringRequiredCount > 1 ? 's' : ''}:
                {selectedStrings.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {selectedStrings.length} / {stringRequiredCount} selected
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {stringChoice.options.map((option) => {
                  const isSelected = selectedStrings.includes(option);
                  return (
                    <FeatureOptionCard
                      key={option}
                      index={option}
                      name={option.charAt(0).toUpperCase() + option.slice(1).replace(/-/g, ' ')}
                      selected={isSelected}
                      onClick={() => {
                        const newSelected = isSelected
                          ? selectedStrings.filter((s) => s !== option)
                          : [...selectedStrings, option];
                        if (newSelected.length <= stringRequiredCount) {
                          setSelected(newSelected);
                        }
                      }}
                      disabled={
                        !isSelected && selectedStrings.length >= stringRequiredCount
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        }

      default:
        return (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unknown choice type: {(choice as any).type}
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{featureName}</DialogTitle>
          {featureDescription && (
            <DialogDescription className="whitespace-pre-wrap">
              {featureDescription}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">{renderChoiceContent()}</div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Confirm Choice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
