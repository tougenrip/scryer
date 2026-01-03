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
  classes?: Array<{
    characterClass: {
      class_source: 'srd' | 'homebrew';
      class_index: string;
      level: number;
      subclass_source?: 'srd' | 'homebrew' | null;
      subclass_index?: string | null;
    };
    classData?: {
      name: string;
      index: string;
      source: 'srd' | 'homebrew';
      classLevels?: any;
    } | null;
  }>;
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
  onFeatureChoice?: (featureIndex: string, choice: any, classSource?: 'srd' | 'homebrew', classIndex?: string) => void;
}

interface Trait {
  index: string;
  name: string;
  description: string | null;
}

export function FeaturesTraits({
  race,
  class: characterClass,
  classes: multiclassClasses,
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
  const [subFeatures, setSubFeatures] = useState<Map<string, FeatureWithChoices>>(new Map());
  const [multiclassAcquiredFeatures, setMulticlassAcquiredFeatures] = useState<Map<string, any>>(new Map());

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

  // Fetch class features from srd_features table or character_class_features for multiclass
  useEffect(() => {
    async function fetchClassFeatures() {
      // For multiclass, fetch from character_class_features table
      if (multiclassClasses && multiclassClasses.length > 0 && character?.id) {
        try {
          setFeaturesLoading(true);
          const supabase = createClient();
          
          // Fetch features for all classes from character_class_features
          const { data: classFeaturesData, error: featuresError } = await supabase
            .from('character_class_features')
            .select('*')
            .eq('character_id', character.id)
            .order('acquired_at_character_level', { ascending: true });
          
          if (featuresError) {
            console.error('Error fetching multiclass features:', featuresError);
            setFeaturesLoading(false);
            return;
          }
          
          if (classFeaturesData) {
            const formattedFeatures: FeatureWithChoices[] = classFeaturesData.map((f: any) => {
              const hasChoices = f.feature_specific && (hasFeatureChoices(f.feature_specific) || isAbilityScoreImprovement(f.feature_name));
              const choice = hasChoices && f.feature_specific?.choice ? parseFeatureChoices(f.feature_specific, f.feature_name) : null;
              
              return {
                level: f.class_level || f.acquired_at_character_level || 1,
                name: f.feature_name,
                description: f.feature_description || '',
                index: f.feature_index || '',
                class_index: f.class_index,
                subclass_index: null,
                feature_specific: f.feature_specific,
                choice: choice,
                requiresChoice: hasChoices && choice !== null,
              };
            });
            
            setClassFeatures(formattedFeatures);
          }
        } catch (error) {
          console.error('Error fetching multiclass features:', error);
        } finally {
          setFeaturesLoading(false);
        }
        return;
      }
      
      // Legacy: single class
      if (!characterClass || !characterClass.classLevels) {
        setFeaturesLoading(false);
        return;
      }

      try {
        setFeaturesLoading(true);
        const supabase = createClient();
        
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
  }, [characterClass, multiclassClasses, level, character?.id]);

  // Fetch acquired features for multiclass and selected sub-features for feature_selection choices
  useEffect(() => {
    async function fetchMulticlassAndSubFeatures() {
      if (!character?.id) {
        return;
      }

      const supabase = createClient();
      const subFeaturesMap = new Map<string, FeatureWithChoices>();
      const acquiredFeaturesMap = new Map<string, any>();
      const indicesToFetch: string[] = [];

      // For multiclass, fetch acquired features from character_class_features
      if (multiclassClasses && multiclassClasses.length > 0) {
        try {
          const { data: classFeaturesData, error } = await supabase
            .from('character_class_features')
            .select('*')
            .eq('character_id', character.id);

          if (!error && classFeaturesData) {
            classFeaturesData.forEach((f: any) => {
              const key = `${f.class_source}-${f.class_index}-${f.feature_index || f.feature_name}`;
              const hasChoices = f.feature_specific && (hasFeatureChoices(f.feature_specific) || isAbilityScoreImprovement(f.feature_name));
              const choice = hasChoices && f.feature_specific?.choice ? parseFeatureChoices(f.feature_specific, f.feature_name) : null;
              
              // If choice exists in feature_specific, use it
              if (f.feature_specific?.choice) {
                choice && (choice.selected = f.feature_specific.choice.selected);
              }
              
              acquiredFeaturesMap.set(key, {
                feature_index: f.feature_index,
                choice: choice,
                acquired: true,
              });

              // Collect sub-feature indices from feature_selection choices
              if (
                choice &&
                choice.type === 'feature_selection' &&
                choice.selected &&
                Array.isArray(choice.selected)
              ) {
                indicesToFetch.push(...choice.selected);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching multiclass acquired features:', error);
        }
      }

      // Collect all selected sub-feature indices from feature_selection choices (legacy single class)
      if (character.class_features) {
        character.class_features.forEach((acquiredFeature) => {
          if (
            acquiredFeature.choice &&
            acquiredFeature.choice.type === 'feature_selection' &&
            acquiredFeature.choice.selected &&
            Array.isArray(acquiredFeature.choice.selected)
          ) {
            indicesToFetch.push(...acquiredFeature.choice.selected);
          }
        });
      }

      // Also check classFeatures for any feature_selection choices with selections
      classFeatures.forEach((feature) => {
        if (
          feature.choice &&
          feature.choice.type === 'feature_selection' &&
          feature.choice.selected &&
          Array.isArray(feature.choice.selected)
        ) {
          indicesToFetch.push(...feature.choice.selected);
        }
      });

      setMulticlassAcquiredFeatures(acquiredFeaturesMap);

      if (indicesToFetch.length === 0) {
        return;
      }

      // Remove duplicates
      const uniqueIndices = [...new Set(indicesToFetch)];

      try {
        // Fetch sub-features from srd_features table
        const { data: subFeaturesData, error } = await supabase
          .from('srd_features')
          .select('*')
          .in('index', uniqueIndices);

        if (error) {
          console.error('Error fetching sub-features:', error);
          return;
        }

        if (subFeaturesData) {
          subFeaturesData.forEach((subFeat: any) => {
            const hasChoices = hasFeatureChoices(subFeat.feature_specific) || isAbilityScoreImprovement(subFeat.name);
            const choice = hasChoices ? parseFeatureChoices(subFeat.feature_specific, subFeat.name) : null;
            
            subFeaturesMap.set(subFeat.index, {
              level: subFeat.level || 1,
              name: subFeat.name,
              description: subFeat.description || '',
              index: subFeat.index,
              class_index: subFeat.class_index,
              subclass_index: subFeat.subclass_index,
              feature_specific: subFeat.feature_specific,
              choice: choice,
              requiresChoice: hasChoices && choice !== null,
            });
          });

          setSubFeatures(subFeaturesMap);
        }
      } catch (error) {
        console.error('Error in fetchSubFeatures:', error);
      }
    }

    fetchMulticlassAndSubFeatures();
  }, [character?.id, character?.class_features, classFeatures, multiclassClasses]);

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

            {(activeFilter === "all" || activeFilter === "class-features") && (characterClass || (multiclassClasses && multiclassClasses.length > 0)) && (
        <div className="space-y-4">
          {multiclassClasses && multiclassClasses.length > 0 ? (
            // Multiclass: show features grouped by class
            multiclassClasses.map(({ characterClass: charClass, classData }, classIdx) => {
              const classFeaturesForClass = classFeatures.filter(f => 
                f.class_index === charClass.class_index
              );
              
              // Get acquired features for this class from character_class_features
              const classAcquiredFeatures = character?.id ? (async () => {
                const supabase = createClient();
                const { data } = await supabase
                  .from('character_class_features')
                  .select('*')
                  .eq('character_id', character.id)
                  .eq('class_source', charClass.class_source)
                  .eq('class_index', charClass.class_index);
                return data || [];
              })() : Promise.resolve([]);
              
              return (
                <Card key={classIdx}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {classData?.name || charClass.class_index} Features (Level {charClass.level})
                      <Badge variant={charClass.is_primary_class ? "default" : "secondary"}>
                        {charClass.is_primary_class ? "Primary" : ""}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      if (featuresLoading) {
                        return <p className="text-muted-foreground">Loading features...</p>;
                      }
                      
                      if (classFeaturesForClass.length === 0) {
                        return (
                          <p className="text-muted-foreground">
                            No features found for this class level.
                          </p>
                        );
                      }
                      
                      // Group by class level
                      const featuresByLevel = classFeaturesForClass.reduce((acc, feat) => {
                        if (!acc[feat.level]) acc[feat.level] = [];
                        acc[feat.level].push(feat);
                        return acc;
                      }, {} as Record<number, typeof classFeaturesForClass>);
                      
                      return Object.entries(featuresByLevel)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([lvl, features]) => (
                          <div key={lvl} className="space-y-2 mb-4">
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                              Level {lvl} Features
                            </h4>
                            <div className="space-y-2 pl-2 border-l-2 border-border/30">
                              {features.map((feature, idx) => {
                                const featureKey = `${charClass.class_source}-${charClass.class_index}-${feature.index || feature.name}`;
                                const acquiredData = multiclassAcquiredFeatures.get(featureKey);
                                
                                // Check if this is a feature_selection choice with selected sub-features
                                const isFeatureSelection = 
                                  feature.choice?.type === 'feature_selection' &&
                                  acquiredData?.choice?.type === 'feature_selection' &&
                                  acquiredData.choice.selected &&
                                  Array.isArray(acquiredData.choice.selected) &&
                                  acquiredData.choice.selected.length > 0;
                                
                                // If feature_selection with selections, show selected sub-features instead
                                if (isFeatureSelection) {
                                  const selectedSubFeatures = acquiredData.choice.selected
                                    .map((subIndex: string) => subFeatures.get(subIndex))
                                    .filter((subFeat): subFeat is FeatureWithChoices => subFeat !== undefined);
                                  
                                  // If we have fetched sub-features, display them
                                  if (selectedSubFeatures.length > 0) {
                                    return (
                                      <div key={feature.index || idx} className="space-y-2">
                                        {selectedSubFeatures.map((subFeat, subIdx) => (
                                          <div
                                            key={subFeat.index || subIdx}
                                            className="border-b border-border/30 pb-2 last:border-0"
                                          >
                                            <div className="font-semibold mb-1 flex items-center gap-2">
                                              {subFeat.name}
                                              <Badge variant="outline" className="text-xs">
                                                {feature.name}
                                              </Badge>
                                            </div>
                                            {subFeat.description && (
                                              <div className="text-muted-foreground whitespace-pre-wrap text-sm">
                                                {subFeat.description}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }
                                  
                                  // Fallback: show base feature with selected names if sub-features not found
                                  // Get options from the original feature's choice if available, otherwise from acquired choice
                                  const choiceOptions = feature.choice?.type === 'feature_selection' 
                                    ? feature.choice.options 
                                    : (acquiredData.choice.options || []);
                                  const selectedNames = choiceOptions
                                    .filter((opt: any) => acquiredData.choice.selected?.includes(opt.index))
                                    .map((opt: any) => opt.name)
                                    .join(', ');
                                  
                                  return (
                                    <div key={feature.index || idx} className="border-b border-border/30 pb-2 last:border-0">
                                      <div className="font-semibold mb-1 flex items-center gap-2">
                                        {feature.name}
                                        {selectedNames && (
                                          <Badge variant="outline" className="text-xs">
                                            ({selectedNames})
                                          </Badge>
                                        )}
                                      </div>
                                      {feature.description && (
                                        <div className="text-muted-foreground whitespace-pre-wrap text-sm">
                                          {feature.description}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                
                                // Default: show base feature
                                return (
                                  <div key={idx} className="border-b border-border/30 pb-2 last:border-0">
                                    <div className="font-semibold mb-1">{feature.name}</div>
                                    {feature.description && (
                                      <div className="text-muted-foreground whitespace-pre-wrap text-sm">
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
              );
            })
          ) : characterClass ? (
            // Single class: original display
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
                        
                        // Check if this is a feature_selection choice with selected sub-features
                        const isFeatureSelection = 
                          feature.choice?.type === 'feature_selection' &&
                          acquiredData?.choice?.type === 'feature_selection' &&
                          acquiredData.choice.selected &&
                          Array.isArray(acquiredData.choice.selected) &&
                          acquiredData.choice.selected.length > 0;
                        
                        // If feature_selection with selections, show selected sub-features instead
                        if (isFeatureSelection) {
                          const selectedSubFeatures = acquiredData.choice.selected
                            .map((subIndex: string) => subFeatures.get(subIndex))
                            .filter((subFeat): subFeat is FeatureWithChoices => subFeat !== undefined);
                          
                          // If we have fetched sub-features, display them
                          if (selectedSubFeatures.length > 0) {
                            return (
                              <div key={feature.index || idx} className="space-y-2">
                                {selectedSubFeatures.map((subFeat, subIdx) => (
                                  <div
                                    key={subFeat.index || subIdx}
                                    className="pb-2 last:pb-0 rounded-md p-2 bg-background/50"
                                  >
                                    <div className="flex items-start gap-2 mb-1">
                                      <div className="flex-1">
                                        <div className="font-medium flex items-center gap-2">
                                          {subFeat.name}
                                          <Badge variant="outline" className="text-xs">
                                            {feature.name}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>
                                    {subFeat.description && (
                                      <div className="text-muted-foreground whitespace-pre-wrap text-xs">
                                        {subFeat.description}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          
                          // Fallback: show base feature with selected names if sub-features not found
                          // Get options from the original feature's choice if available, otherwise from acquired choice
                          const choiceOptions = feature.choice?.type === 'feature_selection' 
                            ? feature.choice.options 
                            : (acquiredData.choice.options || []);
                          const selectedNames = choiceOptions
                            .filter((opt: any) => acquiredData.choice.selected?.includes(opt.index))
                            .map((opt: any) => opt.name)
                            .join(', ');
                          
                          return (
                            <div 
                              key={feature.index || idx} 
                              className="pb-2 last:pb-0 rounded-md p-2 bg-background/50"
                            >
                              <div className="flex items-start gap-2 mb-1">
                                <div className="flex-1">
                                  <div className="font-medium flex items-center gap-2">
                                    {feature.name}
                                    <Badge variant="outline" className="text-xs">
                                      ({selectedNames})
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              {feature.description && (
                                <div className="text-muted-foreground whitespace-pre-wrap text-xs">
                                  {feature.description}
                                </div>
                              )}
                            </div>
                          );
                        }
                        
                        // Get selected choice display text for other choice types
                        let choiceDisplay = '';
                        if (acquiredData?.choice) {
                          const choice = acquiredData.choice;
                          if (choice.type === 'ability_score_improvement' && choice.selected) {
                            const scores = Object.entries(choice.selected.ability_scores || {})
                              .filter(([_, val]) => val && val > 0)
                              .map(([ability, val]) => `${ability.substring(0, 3).toUpperCase()}+${val}`)
                              .join(', ');
                            choiceDisplay = `(${choice.selected.option === 'one_score' ? 'One score +2' : 'Two scores +1'}: ${scores})`;
                          } else if (choice.type === 'skill_selection' && choice.selected) {
                            const selectedNames = choice.options
                              .filter((opt: any) => choice.selected?.includes(opt.index))
                              .map((opt: any) => opt.name)
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
          ) : null}
        </div>
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

