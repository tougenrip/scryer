"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, X, Book, Wrench, Sword, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/hooks/useDndContent";
import type { Race, DndClass } from "@/hooks/useDndContent";
import { toast } from "sonner";

export type ProficiencyType = 'language' | 'tool' | 'weapon' | 'armor';

export interface ProficiencyTraining {
  id: string;
  index: string;
  name: string;
  type: ProficiencyType;
  description: string | null;
  category: string | null;
  source: 'srd' | 'homebrew';
}

export interface CharacterProficiency {
  character_id: string;
  proficiency_source: 'srd' | 'homebrew';
  proficiency_index: string;
  source_type: 'race' | 'background' | 'class' | 'custom';
  proficiency?: ProficiencyTraining;
}

interface ProficienciesTrainingProps {
  character: Character;
  race: Race | null;
  class: DndClass | null;
  campaignId: string | null;
  onProficienciesChange?: (proficiencies: CharacterProficiency[]) => Promise<void>;
  editable?: boolean;
}

const TYPE_ICONS = {
  language: Book,
  tool: Wrench,
  weapon: Sword,
  armor: Shield,
};

const TYPE_LABELS = {
  language: 'Languages',
  tool: 'Tools',
  weapon: 'Weapons',
  armor: 'Armor',
};

const SOURCE_BADGE_VARIANTS = {
  race: 'default',
  background: 'secondary',
  class: 'outline',
  custom: 'destructive',
} as const;

export function ProficienciesTraining({
  character,
  race,
  class: characterClass,
  campaignId,
  onProficienciesChange,
  editable = false,
}: ProficienciesTrainingProps) {
  const [proficiencies, setProficiencies] = useState<CharacterProficiency[]>([]);
  const [availableProficiencies, setAvailableProficiencies] = useState<ProficiencyTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ProficiencyType | 'all'>('all');

  useEffect(() => {
    async function fetchProficiencies() {
      const supabase = createClient();
      
      // Fetch character proficiencies
      const { data: charProfs } = await supabase
        .from('character_proficiencies_training')
        .select('*')
        .eq('character_id', character.id);

      if (charProfs) {
        // Fetch proficiency details
        const profsWithDetails: CharacterProficiency[] = await Promise.all(
          charProfs.map(async (cp) => {
            if (cp.proficiency_source === 'srd') {
              const { data } = await supabase
                .from('srd_proficiencies_training')
                .select('*')
                .eq('index', cp.proficiency_index)
                .single();
              
              if (data) {
                return {
                  ...cp,
                  proficiency: { ...data, source: 'srd' as const },
                };
              }
            } else {
              const { data } = await supabase
                .from('homebrew_proficiencies_training')
                .select('*')
                .eq('index', cp.proficiency_index)
                .eq('campaign_id', campaignId || '')
                .single();
              
              if (data) {
                return {
                  ...cp,
                  proficiency: { ...data, source: 'homebrew' as const },
                };
              }
            }
            return cp;
          })
        );
        
        setProficiencies(profsWithDetails.filter(p => p.proficiency));
      }

      // Fetch available proficiencies for adding
      const { data: srdProfs } = await supabase
        .from('srd_proficiencies_training')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      let allProfs: ProficiencyTraining[] = (srdProfs || []).map(p => ({ ...p, source: 'srd' as const }));

      if (campaignId) {
        const { data: homebrewProfs } = await supabase
          .from('homebrew_proficiencies_training')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('type', { ascending: true })
          .order('name', { ascending: true });

        if (homebrewProfs) {
          allProfs = [
            ...allProfs,
            ...homebrewProfs.map(p => ({ ...p, source: 'homebrew' as const })),
          ];
        }
      }

      setAvailableProficiencies(allProfs);
      setLoading(false);
    }

    fetchProficiencies();
  }, [character.id, campaignId]);

  const handleAddProficiency = async (proficiency: ProficiencyTraining, sourceType: 'race' | 'background' | 'class' | 'custom' = 'custom') => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('character_proficiencies_training')
      .insert({
        character_id: character.id,
        proficiency_source: proficiency.source,
        proficiency_index: proficiency.index,
        source_type: sourceType,
      });

    if (error) {
      toast.error('Failed to add proficiency');
      return;
    }

    const newProficiency: CharacterProficiency = {
      character_id: character.id,
      proficiency_source: proficiency.source,
      proficiency_index: proficiency.index,
      source_type: sourceType,
      proficiency,
    };

    const updated = [...proficiencies, newProficiency];
    setProficiencies(updated);
    
    if (onProficienciesChange) {
      await onProficienciesChange(updated);
    }
  };

  const handleRemoveProficiency = async (proficiency: CharacterProficiency) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('character_proficiencies_training')
      .delete()
      .eq('character_id', character.id)
      .eq('proficiency_source', proficiency.proficiency_source)
      .eq('proficiency_index', proficiency.proficiency_index)
      .eq('source_type', proficiency.source_type);

    if (error) {
      toast.error('Failed to remove proficiency');
      return;
    }

    const updated = proficiencies.filter(
      p => !(
        p.proficiency_source === proficiency.proficiency_source &&
        p.proficiency_index === proficiency.proficiency_index &&
        p.source_type === proficiency.source_type
      )
    );
    setProficiencies(updated);
    
    if (onProficienciesChange) {
      await onProficienciesChange(updated);
    }
  };

  if (loading) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Proficiencies & Training</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xs text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  // Group proficiencies by type
  const groupedProficiencies = proficiencies.reduce((acc, prof) => {
    if (!prof.proficiency) return acc;
    const type = prof.proficiency.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(prof);
    return acc;
  }, {} as Record<ProficiencyType, CharacterProficiency[]>);

  const filteredProficiencies = selectedType === 'all' 
    ? proficiencies 
    : proficiencies.filter(p => p.proficiency?.type === selectedType);

  const filteredAvailable = selectedType === 'all'
    ? availableProficiencies
    : availableProficiencies.filter(p => p.type === selectedType);

  const alreadyAdded = new Set(
    proficiencies.map(p => `${p.proficiency_source}:${p.proficiency_index}`)
  );

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Proficiencies & Training</CardTitle>
          {editable && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">
                  <Plus className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Manage Proficiencies</SheetTitle>
                  <SheetDescription>
                    Add or remove proficiencies for this character.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Filter by Type</Label>
                    <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ProficiencyType | 'all')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="language">Languages</SelectItem>
                        <SelectItem value="tool">Tools</SelectItem>
                        <SelectItem value="weapon">Weapons</SelectItem>
                        <SelectItem value="armor">Armor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Add Proficiency</Label>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredAvailable
                        .filter(p => !alreadyAdded.has(`${p.source}:${p.index}`))
                        .map((prof) => {
                          const Icon = TYPE_ICONS[prof.type];
                          return (
                            <div
                              key={`${prof.source}-${prof.index}`}
                              className="flex items-center justify-between p-2 border rounded-md"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Icon size={16} className="shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{prof.name}</div>
                                  {prof.category && (
                                    <div className="text-xs text-muted-foreground">{prof.category}</div>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-[10px] shrink-0">
                                  {prof.type}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddProficiency(prof)}
                                className="h-8 w-8 p-0 ml-2"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      {filteredAvailable.filter(p => !alreadyAdded.has(`${p.source}:${p.index}`)).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No available proficiencies to add
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-3">
          {(['language', 'tool', 'weapon', 'armor'] as ProficiencyType[]).map((type) => {
            const typeProfs = groupedProficiencies[type] || [];
            if (typeProfs.length === 0) return null;

            const Icon = TYPE_ICONS[type];
            return (
              <div key={type} className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon size={14} />
                  <Label className="text-xs font-medium text-muted-foreground">
                    {TYPE_LABELS[type]}
                  </Label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {typeProfs.map((prof) => {
                    if (!prof.proficiency) return null;
                    return (
                      <Badge
                        key={`${prof.proficiency_source}-${prof.proficiency_index}-${prof.source_type}`}
                        variant={SOURCE_BADGE_VARIANTS[prof.source_type] as any}
                        className="text-[10px] px-1.5 py-0 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1"
                      >
                        {prof.proficiency.name}
                        {editable && prof.source_type === 'custom' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveProficiency(prof);
                            }}
                            className="ml-0.5 hover:bg-destructive/20 rounded p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {proficiencies.length === 0 && (
            <p className="text-xs text-muted-foreground">No proficiencies</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

