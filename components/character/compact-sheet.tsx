"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/hooks/useDndContent";
import { useCharacter } from "@/hooks/useDndContent";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useDiceRoller } from "@/contexts/dice-roller-context";
import { getAbilityModifier, getAbilityModifierString, calculateSkillProficiencies, type SkillName } from "@/lib/utils/character";
import { Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma } from "dnd-icons/ability";
import { Sword, Shield, Heart, Zap, Scroll, Book, X } from "lucide-react";
import { useEquipmentEffects } from "@/hooks/useEquipmentEffects";
import type { EnrichedInventoryItem } from "@/lib/utils/equipment-effects";
import { CharacterPortrait } from "./character-portrait";

interface CompactSheetProps {
  characterId: string;
  onClose?: () => void;
}

export function CompactSheet({ characterId, onClose }: CompactSheetProps) {
  const { character, loading, error } = useCharacter(characterId);
  const [skills, setSkills] = useState<Record<SkillName, { proficient: boolean; expertise: boolean }>>({} as Record<SkillName, { proficient: boolean; expertise: boolean }>);
  const { rollDice } = useDiceRoller();
  
  // We need to fetch inventory for equipment effects
  // This is a simplified fetch compared to the full sheet
  const [inventory] = useState<EnrichedInventoryItem[]>([]);
  const equipmentEffects = useEquipmentEffects(character || {} as Character, inventory);

  useEffect(() => {
    if (!character) return;

    const fetchDetails = async () => {
      const supabase = createClient();
      
      // Fetch skills
      const { data: skillsData } = await supabase
        .from("character_skills")
        .select("*")
        .eq("character_id", character.id);

      // Basic skill calculation - in a real app we'd fetch race/class/background data too
      // For compact sheet, we might just rely on stored skills or basic calculation
      // For now, let's use what we have in the DB + basic stats
      const skillsMap = calculateSkillProficiencies(
         skillsData || [],
         character.class_features || [],
         undefined, // missing class choices
         undefined, // missing race traits
         undefined  // missing background
      );
      setSkills(skillsMap);
    };

    fetchDetails();
  }, [character]);

  if (loading) return <div className="p-4 text-center">Loading character...</div>;
  if (error || !character) return <div className="p-4 text-center text-red-500">Error loading character</div>;

  const abilityScores = {
    strength: (character.strength || 10) + (equipmentEffects.abilityScoreBonuses.strength || 0),
    dexterity: (character.dexterity || 10) + (equipmentEffects.abilityScoreBonuses.dexterity || 0),
    constitution: (character.constitution || 10) + (equipmentEffects.abilityScoreBonuses.constitution || 0),
    intelligence: (character.intelligence || 10) + (equipmentEffects.abilityScoreBonuses.intelligence || 0),
    wisdom: (character.wisdom || 10) + (equipmentEffects.abilityScoreBonuses.wisdom || 0),
    charisma: (character.charisma || 10) + (equipmentEffects.abilityScoreBonuses.charisma || 0),
  };

  const rollAbility = async (abilityName: string, score: number) => {
    const mod = getAbilityModifier(score);
    await rollDice(`1d20${mod >= 0 ? '+' : ''}${mod}`, {
      label: `${abilityName} Check`,
      characterId: character.id,
      characterName: character.name,
    });
  };

  const rollSave = async (abilityName: string, score: number, proficient: boolean) => {
    const mod = getAbilityModifier(score) + (proficient ? (character.proficiency_bonus || 2) : 0);
    await rollDice(`1d20${mod >= 0 ? '+' : ''}${mod}`, {
      label: `${abilityName} Save`,
      characterId: character.id,
      characterName: character.name,
    });
  };

  const rollSkill = async (skillName: string, abilityScore: number, proficiency: { proficient: boolean; expertise: boolean }) => {
    let mod = getAbilityModifier(abilityScore);
    if (proficiency.proficient) mod += (character.proficiency_bonus || 2);
    if (proficiency.expertise) mod += (character.proficiency_bonus || 2);

    await rollDice(`1d20${mod >= 0 ? '+' : ''}${mod}`, {
      label: `${skillName} Check`,
      characterId: character.id,
      characterName: character.name,
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <CharacterPortrait 
          characterId={character.id} 
          imageUrl={character.image_url} 
          characterName={character.name}
          size="sm"
        />
        <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{character.name}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="h-5 px-1.5">Lvl {character.level}</Badge>
                <span className="truncate">{character.race_index} {character.class_index}</span>
            </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
            {/* Vitals */}
            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 border">
                    <Shield className="w-4 h-4 mb-1 text-muted-foreground" />
                    <span className="text-lg font-bold">{character.armor_class || 10}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">AC</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 border">
                    <Heart className="w-4 h-4 mb-1 text-red-500/70" />
                    <span className="text-lg font-bold">{character.hp_current}/{character.hp_max}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">HP</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-md bg-muted/50 border">
                    <Zap className="w-4 h-4 mb-1 text-yellow-500/70" />
                    <span className="text-lg font-bold">{(character.initiative || 0) >= 0 ? '+' : ''}{character.initiative}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Init</span>
                </div>
            </div>

            {/* HP Bar */}
            <div className="space-y-1">
                <Progress value={(character.hp_current / character.hp_max) * 100} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Temp: {character.hp_temp || 0}</span>
                    <span>Speed: {character.speed}ft</span>
                </div>
            </div>

            {/* Ability Scores */}
            <div className="grid grid-cols-6 gap-1">
                {[
                    { name: 'STR', score: abilityScores.strength, icon: Strength },
                    { name: 'DEX', score: abilityScores.dexterity, icon: Dexterity },
                    { name: 'CON', score: abilityScores.constitution, icon: Constitution },
                    { name: 'INT', score: abilityScores.intelligence, icon: Intelligence },
                    { name: 'WIS', score: abilityScores.wisdom, icon: Wisdom },
                    { name: 'CHA', score: abilityScores.charisma, icon: Charisma },
                ].map((stat) => {
                    const modStr = getAbilityModifierString(stat.score);
                    return (
                        <button 
                            key={stat.name}
                            className="flex flex-col items-center p-1 rounded hover:bg-muted transition-colors"
                            onClick={() => rollAbility(stat.name, stat.score)}
                        >
                            <span className="text-[10px] font-bold text-muted-foreground">{stat.name}</span>
                            <span className="text-sm font-bold">{modStr}</span>
                            <span className="text-[8px] text-muted-foreground">{stat.score}</span>
                        </button>
                    );
                })}
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs defaultValue="actions" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="actions"><Sword className="w-4 h-4 mr-2" />Actions</TabsTrigger>
                    <TabsTrigger value="skills"><Book className="w-4 h-4 mr-2" />Skills</TabsTrigger>
                    <TabsTrigger value="spells"><Scroll className="w-4 h-4 mr-2" />Spells</TabsTrigger>
                </TabsList>

                <TabsContent value="actions" className="mt-3 space-y-3">
                    {/* Placeholder for Actions */}
                    <div className="text-sm text-center text-muted-foreground py-4">
                        Weapons and Actions will appear here.
                        <br/>
                        (Not yet implemented in compact view)
                    </div>
                </TabsContent>

                <TabsContent value="skills" className="mt-3 space-y-4">
                    {/* Saving Throws */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saving Throws</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { name: 'Strength', short: 'STR', score: abilityScores.strength, prof: character.strength_save_prof },
                                { name: 'Dexterity', short: 'DEX', score: abilityScores.dexterity, prof: character.dexterity_save_prof },
                                { name: 'Constitution', short: 'CON', score: abilityScores.constitution, prof: character.constitution_save_prof },
                                { name: 'Intelligence', short: 'INT', score: abilityScores.intelligence, prof: character.intelligence_save_prof },
                                { name: 'Wisdom', short: 'WIS', score: abilityScores.wisdom, prof: character.wisdom_save_prof },
                                { name: 'Charisma', short: 'CHA', score: abilityScores.charisma, prof: character.charisma_save_prof },
                            ].map(save => {
                                const mod = getAbilityModifier(save.score) + (save.prof ? (character.proficiency_bonus || 2) : 0);
                                const modStr = (mod >= 0 ? '+' : '') + mod;
                                return (
                                    <button 
                                        key={save.name}
                                        className="flex items-center justify-between p-2 text-sm border rounded hover:bg-muted"
                                        onClick={() => rollSave(save.name, save.score, save.prof || false)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${save.prof ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                                            <span>{save.short}</span>
                                        </div>
                                        <span className="font-mono font-medium">{modStr}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    
                    <Separator />

                    {/* Skills List */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills</h3>
                         <div className="grid grid-cols-1 gap-1">
                            {Object.entries(skills).sort((a, b) => a[0].localeCompare(b[0])).map(([name, info]) => {
                                // Map skill to ability
                                let abilityScore = abilityScores.wisdom; // default
                                let abilityName = 'Wisdom';
                                
                                switch(name) {
                                    case 'athletics': abilityScore = abilityScores.strength; abilityName = 'Strength'; break;
                                    case 'acrobatics': case 'sleight_of_hand': case 'stealth': abilityScore = abilityScores.dexterity; abilityName = 'Dexterity'; break;
                                    case 'arcana': case 'history': case 'investigation': case 'nature': case 'religion': abilityScore = abilityScores.intelligence; abilityName = 'Intelligence'; break;
                                    case 'animal_handling': case 'insight': case 'medicine': case 'perception': case 'survival': abilityScore = abilityScores.wisdom; abilityName = 'Wisdom'; break;
                                    case 'deception': case 'intimidation': case 'performance': case 'persuasion': abilityScore = abilityScores.charisma; abilityName = 'Charisma'; break;
                                }

                                const mod = getAbilityModifier(abilityScore) + (info.proficient ? (character.proficiency_bonus || 2) : 0) + (info.expertise ? (character.proficiency_bonus || 2) : 0);
                                const modStr = (mod >= 0 ? '+' : '') + mod;
                                const displayName = name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                                return (
                                    <button 
                                        key={name} 
                                        className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-muted rounded"
                                        onClick={() => rollSkill(displayName, abilityScore, info)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`w-1.5 h-1.5 rounded-full ${info.expertise ? 'bg-purple-500' : info.proficient ? 'bg-primary' : 'bg-transparent'}`} />
                                            <span className="text-muted-foreground w-8 text-[10px]">{abilityName.substring(0,3).toUpperCase()}</span>
                                            <span>{displayName}</span>
                                        </div>
                                        <span className="font-mono text-muted-foreground">{modStr}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="spells" className="mt-3">
                    <div className="text-sm text-center text-muted-foreground py-4">
                        Spell list will appear here.
                        <br/>
                        (Not yet implemented in compact view)
                    </div>
                </TabsContent>
            </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
