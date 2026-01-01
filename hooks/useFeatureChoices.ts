"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { Character } from "@/hooks/useDndContent";
import type { StoredFeatureChoice, AnyFeatureChoice } from "@/types/feature-choices";
import { applyASI, type AbilityScores } from "@/lib/utils/ability-scores";

/**
 * Hook for managing feature choices for characters
 */
export function useFeatureChoices() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Gets all feature choices for a character
   */
  const getFeatureChoices = useCallback(
    async (characterId: string): Promise<StoredFeatureChoice[]> => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from("characters")
          .select("class_features")
          .eq("id", characterId)
          .single();

        if (fetchError) throw fetchError;

        return (data?.class_features as StoredFeatureChoice[]) || [];
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch feature choices");
        setError(error);
        console.error("Error fetching feature choices:", error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Saves a feature choice for a character
   */
  const saveFeatureChoice = useCallback(
    async (
      characterId: string,
      featureIndex: string,
      choice: AnyFeatureChoice,
      featureData: {
        level: number;
        name: string;
        description: string;
      }
    ): Promise<{ success: boolean; error?: Error }> => {
      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        // Get current character data
        const { data: character, error: fetchError } = await supabase
          .from("characters")
          .select("*")
          .eq("id", characterId)
          .single();

        if (fetchError) throw fetchError;
        if (!character) throw new Error("Character not found");

        // Get existing class_features
        const currentFeatures = (character.class_features as StoredFeatureChoice[]) || [];

        // Find if feature already exists
        const existingIndex = currentFeatures.findIndex(
          (f) => f.feature_index === featureIndex
        );

        const storedChoice: StoredFeatureChoice = {
          level: featureData.level,
          name: featureData.name,
          description: featureData.description,
          feature_index: featureIndex,
          choice: choice,
          acquired: true,
        };

        let updatedFeatures: StoredFeatureChoice[];
        if (existingIndex >= 0) {
          // Update existing feature
          updatedFeatures = [...currentFeatures];
          updatedFeatures[existingIndex] = storedChoice;
        } else {
          // Add new feature
          updatedFeatures = [...currentFeatures, storedChoice];
        }

        // Update character
        const { error: updateError } = await supabase
          .from("characters")
          .update({ class_features: updatedFeatures })
          .eq("id", characterId);

        if (updateError) throw updateError;

        toast.success("Feature choice saved");
        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to save feature choice");
        setError(error);
        console.error("Error saving feature choice:", error);
        toast.error(error.message);
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Checks if a character has unresolved choices at a specific level
   */
  const hasUnresolvedChoices = useCallback(
    async (
      characterId: string,
      level: number
    ): Promise<boolean> => {
      try {
        const features = await getFeatureChoices(characterId);
        return features.some(
          (f) =>
            f.level === level &&
            f.requiresChoice &&
            !f.choice &&
            !f.acquired
        );
      } catch (err) {
        console.error("Error checking unresolved choices:", err);
        return false;
      }
    },
    [getFeatureChoices]
  );

  /**
   * Applies Ability Score Improvement to a character
   */
  const applyAbilityScoreImprovement = useCallback(
    async (
      character: Character,
      choice: AnyFeatureChoice
    ): Promise<{ success: boolean; error?: Error }> => {
      if (choice.type !== "ability_score_improvement") {
        return { success: false, error: new Error("Not an ASI choice") };
      }

      if (!choice.selected) {
        return { success: false, error: new Error("No selection made") };
      }

      try {
        setLoading(true);
        setError(null);
        const supabase = createClient();

        const currentScores: AbilityScores = {
          strength: character.strength || 10,
          dexterity: character.dexterity || 10,
          constitution: character.constitution || 10,
          intelligence: character.intelligence || 10,
          wisdom: character.wisdom || 10,
          charisma: character.charisma || 10,
        };

        const newScores = applyASI(currentScores, choice.selected);

        // Update character with new ability scores
        const { error: updateError } = await supabase
          .from("characters")
          .update({
            strength: newScores.strength,
            dexterity: newScores.dexterity,
            constitution: newScores.constitution,
            intelligence: newScores.intelligence,
            wisdom: newScores.wisdom,
            charisma: newScores.charisma,
          })
          .eq("id", character.id);

        if (updateError) throw updateError;

        toast.success("Ability scores updated");
        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to apply ASI");
        setError(error);
        console.error("Error applying ASI:", error);
        toast.error(error.message);
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Gets a specific feature choice for a character
   */
  const getFeatureChoice = useCallback(
    async (
      characterId: string,
      featureIndex: string
    ): Promise<StoredFeatureChoice | null> => {
      try {
        const features = await getFeatureChoices(characterId);
        return features.find((f) => f.feature_index === featureIndex) || null;
      } catch (err) {
        console.error("Error getting feature choice:", err);
        return null;
      }
    },
    [getFeatureChoices]
  );

  return {
    loading,
    error,
    getFeatureChoices,
    saveFeatureChoice,
    hasUnresolvedChoices,
    applyAbilityScoreImprovement,
    getFeatureChoice,
  };
}
