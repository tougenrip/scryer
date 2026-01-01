"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { parseFeatureChoices, hasFeatureChoices, isAbilityScoreImprovement } from "@/lib/utils/feature-parser";
import { FeatureChoiceDialog } from "./feature-choice-dialog";
import type { FeatureWithChoices, StoredFeatureChoice } from "@/types/feature-choices";
import type { AbilityScores } from "@/lib/utils/ability-scores";

interface FeaturesTraitsProps {
  race?: {
    name: string;
    index?: string;
    id?: string;
    campaign_id?: string; // Needed for homebrew trait fetching
    traits?: any; // JSONB fallback
    source: "srd" | "homebrew";
  };
  class?: {
    name: string;
    index?: string;
    classLevels?: any;
    source: "srd" | "homebrew";
  };
  level: number;
  character?: {
    id?: string;
    class_features?: StoredFeatureChoice[];
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
  };
  onFeatureChoice?: (featureIndex: string, choice: any) => void;
}

interface Trait {
  index: string;
  name: string;
  description: string | null;
}

export function FeaturesTraits({
  race,
  class: characterClass,
  level,
  character,
  onFeatureChoice,
}: FeaturesTraitsProps) {
  const [traits, setTraits] = useState<Trait[]>([]);
  const [classFeatures, setClassFeatures] = useState<FeatureWithChoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureWithChoices | null>(null);

  useEffect(() => {
    async function fetchTraits() {
      if (!race) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();

        if (race.source === "srd" && race.index) {
          // Fetch SRD traits from normalized tables
          const { data: mappings, error: mappingError } = await supabase
            .from("srd_race_traits")
            .select("trait_index")
            .eq("race_index", race.index);

          if (!mappingError && mappings && mappings.length > 0) {
            const traitIndices = mappings.map((m) => m.trait_index);
            const { data: traitsData, error: traitsError } = await supabase
              .from("srd_racial_traits")
              .select("index, name, description")
              .in("index", traitIndices)
              .order("name", { ascending: true });

            if (!traitsError && traitsData) {
              setTraits(traitsData);
              setLoading(false);
              return;
            }
          }
        } else if (race.source === "homebrew" && race.id) {
          // Fetch homebrew traits from normalized tables
          const { data: mappings, error: mappingError } = await supabase
            .from("homebrew_race_traits")
            .select("trait_source, trait_index")
            .eq("race_id", race.id);

          if (!mappingError && mappings && mappings.length > 0) {
            const srdIndices = mappings
              .filter((m) => m.trait_source === "srd")
              .map((m) => m.trait_index);
            const homebrewIndices = mappings
              .filter((m) => m.trait_source === "homebrew")
              .map((m) => m.trait_index);

            const allTraits: Trait[] = [];

            // Fetch SRD traits
            if (srdIndices.length > 0) {
              const { data: srdTraits } = await supabase
                .from("srd_racial_traits")
                .select("index, name, description")
                .in("index", srdIndices);

              if (srdTraits) {
                allTraits.push(...srdTraits);
              }
            }

            // Fetch homebrew traits if campaign_id is available
            if (homebrewIndices.length > 0 && race.campaign_id) {
              const { data: homebrewTraits } = await supabase
                .from("homebrew_racial_traits")
                .select("index, name, description")
                .eq("campaign_id", race.campaign_id)
                .in("index", homebrewIndices);

              if (homebrewTraits) {
                allTraits.push(...homebrewTraits);
              }
            }

            if (allTraits.length > 0) {
              setTraits(allTraits);
              setLoading(false);
              return;
            }
          }
        }

        // Fall back to JSONB traits if normalized fetch fails or not available
        if (race.traits && Array.isArray(race.traits)) {
          const fallbackTraits: Trait[] = race.traits.map((t: any) => ({
            index: t.index || "",
            name: t.name || "",
            description: t.desc || t.description || null,
          }));
          setTraits(fallbackTraits);
        }
      } catch (error) {
        console.error("Error fetching traits:", error);
        // Fall back to JSONB traits on error
        if (race.traits && Array.isArray(race.traits)) {
          const fallbackTraits: Trait[] = race.traits.map((t: any) => ({
            index: t.index || "",
            name: t.name || "",
            description: t.desc || t.description || null,
          }));
          setTraits(fallbackTraits);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTraits();
  }, [race]);

  // Fetch class features from srd_features table
  useEffect(() => {
    async function fetchClassFeatures() {
      if (!characterClass || !characterClass.classLevels) {
        setFeaturesLoading(false);
        return;
      }

      try {
        setFeaturesLoading(true);
        const supabase = createClient();

        // Get class index from the class object
        // We need to find the class index - it might be in the class object
        // For now, we'll try to get it from the class name or we need to pass it
        // Let's check if we can get it from the class data structure
        
        // Since we don't have direct access to class index here, we'll need to pass it
        // But for now, let's try to fetch by class name or we need to update the props
        console.log('Fetching class features for:', characterClass);
        
        // Filter by class_index if available
        let query = supabase
          .from("srd_features")
          .select("*")
          .not("level", "is", null)
          .lte("level", level);
        
        // If we have class index, filter by it
        if (characterClass.index) {
          query = query.eq("class_index", characterClass.index);
        }
        
        const { data: featuresData, error: featuresError } = await query.order("level", { ascending: true });

        if (featuresError) {
          console.error("Error fetching class features:", featuresError);
          setFeaturesLoading(false);
          return;
        }

        if (featuresData) {
          // Filter by class_index if we have it, otherwise show all
          // Parse feature_specific to detect choices
          const filteredFeatures: FeatureWithChoices[] = featuresData
            .filter((f: any) => f.level !== null && f.level <= level)
            .map((f: any) => {
              const hasChoices = hasFeatureChoices(f.feature_specific) || isAbilityScoreImprovement(f.name);
              const choice = hasChoices ? parseFeatureChoices(f.feature_specific, f.name) : null;
              
              return {
                level: f.level || 1,
                name: f.name,
                description: f.description || '',
                index: f.index,
                class_index: f.class_index,
                subclass_index: f.subclass_index,
                feature_specific: f.feature_specific,
                choice: choice,
                requiresChoice: hasChoices && choice !== null,
              };
            });
          
          setClassFeatures(filteredFeatures);
          console.log('Fetched class features with choices:', filteredFeatures);
        }
      } catch (error) {
        console.error("Error fetching class features:", error);
      } finally {
        setFeaturesLoading(false);
      }
    }

    fetchClassFeatures();
  }, [characterClass, level]);

  // Features are now fetched from srd_features table in useEffect above

  return (
    <div className="space-y-2">
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="all" className="text-xs">ALL</TabsTrigger>
          <TabsTrigger value="class-features" className="text-xs">CLASS FEATURES</TabsTrigger>
          <TabsTrigger value="species-traits" className="text-xs">SPECIES TRAITS</TabsTrigger>
          <TabsTrigger value="feats" className="text-xs">FEATS</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-2">
          <div className="space-y-4">
            {(activeFilter === "all" || activeFilter === "species-traits") && race && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Racial Traits
              <Badge variant={race.source === "srd" ? "default" : "secondary"}>
                {race.name}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading traits...</p>
            ) : traits.length > 0 ? (
              <div className="space-y-3 text-sm">
                {traits.map((trait) => (
                  <div key={trait.index} className="border-b border-border/30 pb-2 last:border-0 last:pb-0">
                    <div className="font-semibold mb-1">{trait.name}</div>
                    {trait.description && (
                      <div className="text-muted-foreground whitespace-pre-wrap">
                        {trait.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No racial traits available.
              </p>
            )}
          </CardContent>
        </Card>
            )}

            {(activeFilter === "all" || activeFilter === "class-features") && characterClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Class Features (Level {level})
              <Badge
                variant={characterClass.source === "srd" ? "default" : "secondary"}
              >
                {characterClass.name}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Use features from srd_features table
              let allAvailableFeatures: Array<{ level: number; name: string; description: string; index: string }> = [];
              
              if (featuresLoading) {
                return <p className="text-muted-foreground">Loading class features...</p>;
              }
              
              // Use features from database
              allAvailableFeatures = classFeatures;
              
              // Get acquired features from character
              const acquiredFeatures = character?.class_features || [];
              const acquiredFeatureMap = new Map(
                acquiredFeatures.map((f: StoredFeatureChoice) => [f.feature_index || `${f.level}-${f.name}`, f])
              );
              
              if (allAvailableFeatures.length === 0) {
                return (
                  <p className="text-muted-foreground">
                    No class features found for this level. Features may be available at higher levels.
                  </p>
                );
              }

              // Group by level
              const featuresByLevel = allAvailableFeatures.reduce((acc, feat) => {
                if (!acc[feat.level]) acc[feat.level] = [];
                acc[feat.level].push(feat);
                return acc;
              }, {} as Record<number, typeof allAvailableFeatures>);

              return Object.entries(featuresByLevel)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([lvl, features]) => (
                  <div key={lvl} className="space-y-2">
                    <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      Level {lvl} Features
                    </h4>
                    <div className="space-y-2 pl-2 border-l-2 border-border/30">
                      {features.map((feature, idx) => {
                        const featureKey = feature.index || `${feature.level}-${feature.name}`;
                        const acquired = acquiredFeatureMap.has(featureKey);
                        const acquiredData = acquiredFeatureMap.get(featureKey);
                        const hasChoice = feature.requiresChoice && feature.choice;
                        const choiceMade = acquiredData?.choice && acquiredData?.acquired;
                        const needsAction = hasChoice && !choiceMade;
                        
                        // Get selected choice display text
                        let choiceDisplay = '';
                        if (acquiredData?.choice) {
                          const choice = acquiredData.choice;
                          if (choice.type === 'ability_score_improvement' && choice.selected) {
                            const scores = Object.entries(choice.selected.ability_scores || {})
                              .filter(([_, val]) => val && val > 0)
                              .map(([ability, val]) => `${ability.substring(0, 3).toUpperCase()}+${val}`)
                              .join(', ');
                            choiceDisplay = `(${choice.selected.option === 'one_score' ? 'One score +2' : 'Two scores +1'}: ${scores})`;
                          } else if (choice.type === 'feature_selection' && choice.selected) {
                            const selectedNames = choice.options
                              .filter(opt => choice.selected?.includes(opt.index))
                              .map(opt => opt.name)
                              .join(', ');
                            choiceDisplay = `(${selectedNames})`;
                          } else if (choice.type === 'skill_selection' && choice.selected) {
                            const selectedNames = choice.options
                              .filter(opt => choice.selected?.includes(opt.index))
                              .map(opt => opt.name)
                              .join(', ');
                            choiceDisplay = `(${selectedNames})`;
                          } else if (choice.type === 'string_selection' && choice.selected) {
                            choiceDisplay = `(${Array.isArray(choice.selected) ? choice.selected.join(', ') : choice.selected})`;
                          }
                        }
                        
                        return (
                          <div 
                            key={feature.index || idx} 
                            className={`pb-2 last:pb-0 rounded-md p-2 transition-colors ${
                              needsAction 
                                ? 'bg-yellow-500/10 border border-yellow-500/30' 
                                : 'bg-background/50'
                            }`}
                          >
                            <div className="flex items-start gap-2 mb-1">
                              <div className="flex-1">
                                <div className="font-medium flex items-center gap-2">
                                  {feature.name}
                                  {choiceDisplay && (
                                    <Badge variant="outline" className="text-xs">
                                      {choiceDisplay}
                                    </Badge>
                                  )}
                                  {needsAction && (
                                    <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                                      Choice Required
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {needsAction && onFeatureChoice && (
                                <div className="flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedFeature(feature);
                                      setChoiceDialogOpen(true);
                                    }}
                                  >
                                    Make Choice
                                  </Button>
                                </div>
                              )}
                            </div>
                            {feature.description && (
                              <div className="text-muted-foreground whitespace-pre-wrap text-xs">
                                {feature.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
            })()}
          </CardContent>
        </Card>
            )}

            {activeFilter === "feats" && (
              <Card>
                <CardHeader>
                  <CardTitle>Feats</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    No feats available. Feats can be added as custom features in the Extras tab.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {selectedFeature && selectedFeature.choice && (
        <FeatureChoiceDialog
          open={choiceDialogOpen}
          onOpenChange={setChoiceDialogOpen}
          featureName={selectedFeature.name}
          featureDescription={selectedFeature.description || undefined}
          choice={selectedFeature.choice}
          currentAbilityScores={character ? {
            strength: character.strength || 10,
            dexterity: character.dexterity || 10,
            constitution: character.constitution || 10,
            intelligence: character.intelligence || 10,
            wisdom: character.wisdom || 10,
            charisma: character.charisma || 10,
          } : undefined}
          onConfirm={(choice) => {
            if (onFeatureChoice && selectedFeature) {
              onFeatureChoice(selectedFeature.index, choice);
            }
            setChoiceDialogOpen(false);
          }}
          initialSelection={
            character?.class_features?.find(f => f.feature_index === selectedFeature.index)?.choice?.selected
          }
        />
      )}
    </div>
  );
}

