"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Character } from "@/hooks/useDndContent";
import { useRaces, useClasses, useCharacterClasses } from "@/hooks/useDndContent";
import { AbilityScores } from "./ability-scores";
import { CombatStats } from "./combat-stats";
import { SavingThrows } from "./saving-throws";
import { SensesCard } from "./senses-card";
import { SkillsPanel } from "./skills-panel";
import { SpellsTab } from "./spells-tab";
import { Inventory } from "./inventory";
import { FeaturesTraits } from "./features-traits";
import { Notes } from "./notes";
import { Conditions } from "./conditions";
import { Defenses } from "./defenses";
import { CharacterPortrait } from "./character-portrait";
import { ProficienciesTraining } from "./proficiencies-training";
import { ActionsTab } from "./actions-tab";
import { BackgroundTab } from "./background-tab";
import { ExtrasTab } from "./extras-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DND_SKILLS, type SkillName, getAbilityModifierString } from "@/lib/utils/character";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useInfoSheet } from "@/hooks/useInfoSheet";
import { InfoSheetDialog } from "@/components/shared/info-sheet-dialog";
import { useDiceRoller } from "@/contexts/dice-roller-context";
import { getAbilityModifier } from "@/lib/utils/character";
import { Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma } from "dnd-icons/ability";
import { Ac, SavingThrow } from "dnd-icons/attribute";
import { Initiative } from "dnd-icons/combat";
import { Action } from "dnd-icons/combat";
import { Spell } from "dnd-icons/game";
import { Weapon, Armor, Book } from "dnd-icons/entity";
import { Blinded, Charmed, Deafened, Exhaustion, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious } from "dnd-icons/condition";
import { Acid, Bludgeoning, Cold, Fire, Force, Lightning, Necrotic, Piercing, Poison, Psychic, Radiant, Slashing, Thunder } from "dnd-icons/damage";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getProficiencyBonus, extractFeaturesForLevel, getAllFeaturesUpToLevel, calculateSpellSlots, calculateSkillProficiencies, calculateSavingThrowProficiencies, type ExtractedFeature } from "@/lib/utils/character";
import { Plus, Minus, Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { LevelUpModal, type NewFeature } from "./level-up-modal";
import { useFeatureChoices } from "@/hooks/useFeatureChoices";
import { parseFeatureChoices, hasFeatureChoices, isAbilityScoreImprovement } from "@/lib/utils/feature-parser";
import type { AnyFeatureChoice } from "@/types/feature-choices";
import type { EnrichedInventoryItem } from "@/lib/utils/equipment-effects";
import type { SrdEquipment, HomebrewEquipment, Equipment } from "@/hooks/useDndContent";
import { useEquipmentEffects } from "@/hooks/useEquipmentEffects";

interface CharacterSheetProps {
  character: Character;
  onUpdate?: (updates: Partial<Character>) => Promise<void>;
  editable?: boolean;
}

export function CharacterSheet({
  character,
  onUpdate,
  editable = false,
}: CharacterSheetProps) {
  const router = useRouter();
  const [skills, setSkills] = useState<Record<SkillName, { proficient: boolean; expertise: boolean }>>({} as Record<SkillName, { proficient: boolean; expertise: boolean }>);
  const [spellSlots, setSpellSlots] = useState<Array<{ level: number; total: number; used: number }>>([]);
  const [characterSpells, setCharacterSpells] = useState<Array<{ spell: any; prepared: boolean; alwaysPrepared: boolean }>>([]);
  const [inventory, setInventory] = useState<EnrichedInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousLevel, setPreviousLevel] = useState(character.level || 1);
  const [levelUpModalOpen, setLevelUpModalOpen] = useState(false);
  const [newLevelFeatures, setNewLevelFeatures] = useState<NewFeature[]>([]);
  const [selectedClassForLevelUp, setSelectedClassForLevelUp] = useState<{class_source: 'srd' | 'homebrew', class_index: string} | null>(null);
  const { saveFeatureChoice, applyAbilityScoreImprovement } = useFeatureChoices();

  const { races } = useRaces(character.campaign_id || null);
  const { classes } = useClasses(character.campaign_id || null);
  const { characterClasses } = useCharacterClasses(character.id);
  const infoSheet = useInfoSheet();
  const { rollDice, rollWithAdvantage } = useDiceRoller();
  
  // Calculate equipment effects
  const equipmentEffects = useEquipmentEffects(character, inventory);

  // Detect level changes from external updates
  useEffect(() => {
    async function checkLevelUp() {
      const currentLevel = character.level || 1;
      if (currentLevel > previousLevel && editable && classes.length > 0) {
        // Level increased - check for new features
        const selectedClass = classes.find(
          (c) => c.source === character.class_source && c.index === character.class_index
        );
        
        console.log('Level up detected via useEffect:', { 
          currentLevel, 
          previousLevel, 
          selectedClass,
          hasIndex: !!selectedClass?.index 
        });
        
        if (selectedClass?.index) {
          // Fetch features from srd_features table
          const supabase = createClient();
          const { data: featuresData, error: featuresError } = await supabase
            .from("srd_features")
            .select("*")
            .eq("class_index", selectedClass.index)
            .eq("level", currentLevel)
            .order("name", { ascending: true });
          
          if (featuresError) {
            console.error('Error fetching features in useEffect:', featuresError);
          }
          
          if (featuresData && featuresData.length > 0) {
            const formattedFeatures: NewFeature[] = featuresData.map(feat => {
              const hasChoices = hasFeatureChoices(feat.feature_specific) || isAbilityScoreImprovement(feat.name);
              const choice = hasChoices ? parseFeatureChoices(feat.feature_specific, feat.name) : null;
              
              return {
                level: feat.level || currentLevel,
                name: feat.name,
                description: feat.description || '',
                type: isAbilityScoreImprovement(feat.name) ? 'asi' : 'feature',
                requiresChoice: hasChoices && choice !== null,
                feature_index: feat.index,
                choice: choice,
                feature_specific: feat.feature_specific,
              };
            });
            
            console.log('Fetched features from database in useEffect:', formattedFeatures);
            setNewLevelFeatures(formattedFeatures);
            setLevelUpModalOpen(true);
          }
        }
        
        setPreviousLevel(currentLevel);
      } else if (currentLevel !== previousLevel) {
        setPreviousLevel(currentLevel);
      }
    }
    
    checkLevelUp();
  }, [character.level, previousLevel, editable, classes, character.class_source, character.class_index]);

  const selectedRace = races.find(
    (r) => r.source === character.race_source && r.index === character.race_index
  );
  
  // Get classes for multiclass support - prefer character_classes table, fallback to legacy fields
  const multiclassClasses = characterClasses && characterClasses.length > 0
    ? characterClasses.map(cc => ({
        characterClass: cc,
        classData: classes.find(c => c.source === cc.class_source && c.index === cc.class_index)
      })).filter(item => item.classData)
    : null;
  
  // For backward compatibility, use legacy fields if no multiclass
  const selectedClass = multiclassClasses 
    ? multiclassClasses.find(c => c.characterClass.is_primary_class)?.classData || multiclassClasses[0]?.classData
    : classes.find(
        (c) => c.source === character.class_source && c.index === character.class_index
      );

  // Helper function to get damage type icon
  const getDamageIcon = (damageType: string) => {
    const type = damageType.toLowerCase();
    const iconProps = { size: 14, className: "inline-block mr-1" };
    
    switch (type) {
      case 'acid':
        return <Acid {...iconProps} />;
      case 'bludgeoning':
        return <Bludgeoning {...iconProps} />;
      case 'cold':
        return <Cold {...iconProps} />;
      case 'fire':
        return <Fire {...iconProps} />;
      case 'force':
        return <Force {...iconProps} />;
      case 'lightning':
        return <Lightning {...iconProps} />;
      case 'necrotic':
        return <Necrotic {...iconProps} />;
      case 'piercing':
        return <Piercing {...iconProps} />;
      case 'poison':
        return <Poison {...iconProps} />;
      case 'psychic':
        return <Psychic {...iconProps} />;
      case 'radiant':
        return <Radiant {...iconProps} />;
      case 'slashing':
        return <Slashing {...iconProps} />;
      case 'thunder':
        return <Thunder {...iconProps} />;
      default:
        return null;
    }
  };

  useEffect(() => {
    async function fetchCharacterData() {
      const supabase = createClient();
      console.log('Fetching data for character:', character.id);
      console.log('Character object:', character);
      
      // Add a small delay to ensure data is committed (especially after character creation)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch skills
      const { data: skillsData } = await supabase
        .from("character_skills")
        .select("*")
        .eq("character_id", character.id);

      // Calculate skill proficiencies from all sources
      // Get class proficiency choices
      const classProficiencyChoices = selectedClass?.proficiency_choices;
      
      // Get race traits with full descriptions from srd_racial_traits
      let raceTraitsWithDescriptions: Array<{ name: string; description: string; index: string }> = [];
      if (selectedRace?.traits && Array.isArray(selectedRace.traits)) {
        const traitIndices = selectedRace.traits.map((t: any) => t.index).filter(Boolean);
        if (traitIndices.length > 0) {
          const { data: traitDetails } = await supabase
            .from('srd_racial_traits')
            .select('index, name, description')
            .in('index', traitIndices);
          
          if (traitDetails) {
            raceTraitsWithDescriptions = traitDetails;
          }
        }
      }
      
      // Get background skill proficiencies
      let backgroundSkillProficiencies: string | null = null;
      if (character.background) {
        const { data: backgroundData } = await supabase
          .from('srd_backgrounds')
          .select('skill_proficiencies')
          .or(`name.eq.${character.background},index.eq.${character.background.toLowerCase().replace(/\s+/g, '-')}`)
          .single();
        
        if (backgroundData?.skill_proficiencies) {
          backgroundSkillProficiencies = backgroundData.skill_proficiencies;
        }
      }
      
      // Get class features with choices
      const classFeatures = character.class_features || [];
      
      const skillsMap = calculateSkillProficiencies(
        skillsData || [],
        classFeatures,
        classProficiencyChoices,
        raceTraitsWithDescriptions,
        backgroundSkillProficiencies
      );
      
      setSkills(skillsMap);

      // Fetch spell slots
      const { data: slotsData } = await supabase
        .from("character_spell_slots")
        .select("*")
        .eq("character_id", character.id)
        .order("spell_level", { ascending: true });

      if (slotsData && slotsData.length > 0) {
        // Use database spell slots
        setSpellSlots(
          slotsData.map((slot) => ({
            level: slot.spell_level,
            total: slot.slots_total || 0,
            used: slot.slots_used || 0,
          }))
        );
      } else {
        // Calculate spell slots - use multiclass calculation if multiclass
        let calculatedSlots: Array<{ level: number; total: number; used: number }> = [];
        
        if (multiclassClasses && multiclassClasses.length > 0) {
          const { calculateMulticlassSpellSlots } = require('@/lib/utils/character');
          const classArray = multiclassClasses.map(({ characterClass }) => ({
            class_source: characterClass.class_source,
            class_index: characterClass.class_index,
            level: characterClass.level,
            subclass_source: characterClass.subclass_source,
            subclass_index: characterClass.subclass_index,
          }));
          const { spellSlots: multiclassSlots, warlockSlots } = calculateMulticlassSpellSlots(classArray);
          // Combine regular and warlock slots for now
          calculatedSlots = [...multiclassSlots];
          if (warlockSlots.length > 0) {
            // Warlock slots are separate, but we'll merge for display
            calculatedSlots = [...calculatedSlots, ...warlockSlots];
          }
        } else {
          // Single class fallback
          calculatedSlots = calculateSpellSlots(character.class_index, character.level || 1);
        }
        
        setSpellSlots(calculatedSlots);
        
        // Optionally persist the calculated slots to the database
        if (calculatedSlots.length > 0) {
          const slotsToInsert = calculatedSlots.map(slot => ({
            character_id: character.id,
            spell_level: slot.level,
            slots_total: slot.total,
            slots_used: 0,
          }));
          
          await supabase
            .from("character_spell_slots")
            .upsert(slotsToInsert, { onConflict: 'character_id,spell_level' });
        }
      }

      // Fetch spells - check JSONB column first, fall back to junction table
      console.log('Fetching spells for character ID:', character.id);
      let spellsWithData: Array<{ spell: any; prepared: boolean; alwaysPrepared: boolean }> = [];
      
      // Check if character has spells in JSONB column
      if (character.spells && Array.isArray(character.spells) && character.spells.length > 0) {
        console.log(`Found ${character.spells.length} spells in JSONB column`);
        const spellsJsonb = character.spells as Array<{
          source: 'srd' | 'homebrew';
          index: string;
          prepared: boolean;
          always_prepared: boolean;
        }>;
        
        // Separate SRD and homebrew spells for batch fetching
        const srdSpellIndices = spellsJsonb
          .filter(s => s.source === 'srd')
          .map(s => s.index);
        const homebrewSpellIds = spellsJsonb
          .filter(s => s.source === 'homebrew')
          .map(s => s.index);

        // Batch fetch SRD spells
        if (srdSpellIndices.length > 0) {
          const { data: srdSpellsData } = await supabase
            .from('srd_spells')
            .select('*')
            .in('index', srdSpellIndices);
          
          if (srdSpellsData) {
            srdSpellsData.forEach(spellData => {
              const charSpell = spellsJsonb.find(s => 
                s.source === 'srd' && s.index === spellData.index
              );
              if (charSpell) {
                spellsWithData.push({
                  spell: { ...spellData, source: 'srd' },
                  prepared: charSpell.prepared || false,
                  alwaysPrepared: charSpell.always_prepared || false,
                });
              }
            });
          }
        }

        // Batch fetch homebrew spells
        if (homebrewSpellIds.length > 0) {
          const { data: homebrewSpellsData } = await supabase
            .from('homebrew_spells')
            .select('*')
            .in('id', homebrewSpellIds);
          
          if (homebrewSpellsData) {
            homebrewSpellsData.forEach(spellData => {
              const charSpell = spellsJsonb.find(s => 
                s.source === 'homebrew' && s.index === spellData.id
              );
              if (charSpell) {
                spellsWithData.push({
                  spell: { ...spellData, index: spellData.id, source: 'homebrew' },
                  prepared: charSpell.prepared || false,
                  alwaysPrepared: charSpell.always_prepared || false,
                });
              }
            });
          }
        }
        
        console.log(`Loaded ${spellsWithData.length} spells with full data from JSONB`);
      } else {
        // Fall back to junction table for backwards compatibility
        console.log('No spells in JSONB, checking junction table...');
        const { data: characterSpellsData, error: spellsFetchError } = await supabase
          .from("character_spells")
          .select("*")
          .eq("character_id", character.id);

        if (spellsFetchError) {
          console.error('Error fetching character spells:', spellsFetchError);
        }

        if (characterSpellsData && characterSpellsData.length > 0) {
          console.log(`Found ${characterSpellsData.length} spells in junction table`);
          
          // Separate SRD and homebrew spells for batch fetching
          const srdSpellIndices = characterSpellsData
            .filter(cs => cs.spell_source === 'srd')
            .map(cs => cs.spell_index);
          const homebrewSpellIds = characterSpellsData
            .filter(cs => cs.spell_source === 'homebrew')
            .map(cs => cs.spell_index);

          // Batch fetch SRD spells
          if (srdSpellIndices.length > 0) {
            const { data: srdSpellsData } = await supabase
              .from('srd_spells')
              .select('*')
              .in('index', srdSpellIndices);
            
            if (srdSpellsData) {
              srdSpellsData.forEach(spellData => {
                const charSpell = characterSpellsData.find(cs => 
                  cs.spell_source === 'srd' && cs.spell_index === spellData.index
                );
                if (charSpell) {
                  spellsWithData.push({
                    spell: { ...spellData, source: 'srd' },
                    prepared: charSpell.prepared || false,
                    alwaysPrepared: charSpell.always_prepared || false,
                  });
                }
              });
            }
          }

          // Batch fetch homebrew spells
          if (homebrewSpellIds.length > 0) {
            const { data: homebrewSpellsData } = await supabase
              .from('homebrew_spells')
              .select('*')
              .in('id', homebrewSpellIds);
            
            if (homebrewSpellsData) {
              homebrewSpellsData.forEach(spellData => {
                const charSpell = characterSpellsData.find(cs => 
                  cs.spell_source === 'homebrew' && cs.spell_index === spellData.id
                );
                if (charSpell) {
                  spellsWithData.push({
                    spell: { ...spellData, index: spellData.id, source: 'homebrew' },
                    prepared: charSpell.prepared || false,
                    alwaysPrepared: charSpell.always_prepared || false,
                  });
                }
              });
            }
          }
          
          console.log(`Loaded ${spellsWithData.length} spells with full data from junction table`);
        }
      }
      
      setCharacterSpells(spellsWithData);

      // Fetch inventory - check JSONB column first, fall back to junction table
      console.log('Fetching inventory for character ID:', character.id);
      let inventoryWithNames: EnrichedInventoryItem[] = [];
      
      // Check if character has inventory in JSONB column
      if (character.inventory && Array.isArray(character.inventory) && character.inventory.length > 0) {
        console.log(`Found ${character.inventory.length} inventory items in JSONB column`);
        const inventoryJsonb = character.inventory as Array<{
          source: 'srd' | 'homebrew';
          index: string;
          quantity: number;
          equipped: boolean;
          attuned: boolean;
          notes?: string | null;
        }>;
        
        // Separate SRD and homebrew items for batch fetching
        const srdItemIndices = inventoryJsonb
          .filter(item => item.source === 'srd')
          .map(item => item.index);
        const homebrewItemIds = inventoryJsonb
          .filter(item => item.source === 'homebrew')
          .map(item => item.index);

        // Batch fetch SRD equipment with full data
        if (srdItemIndices.length > 0) {
          const { data: srdEquipmentData } = await supabase
            .from('srd_equipment')
            .select('*')
            .in('index', srdItemIndices);
          
          if (srdEquipmentData) {
            srdEquipmentData.forEach(eqData => {
              const invItem = inventoryJsonb.find(item => 
                item.source === 'srd' && item.index === eqData.index
              );
              if (invItem) {
                inventoryWithNames.push({
                  id: `${invItem.source}-${invItem.index}`, // Generate ID for display
                  name: eqData.name,
                  source: 'srd',
                  quantity: invItem.quantity || 1,
                  equipped: invItem.equipped || false,
                  attuned: invItem.attuned || false,
                  notes: invItem.notes || undefined,
                  equipmentData: eqData as SrdEquipment,
                });
              }
            });
          }

          // For items not found in equipment, try magic items
          const foundEquipmentIndices = new Set(srdEquipmentData?.map(e => e.index) || []);
          const missingIndices = srdItemIndices.filter(idx => !foundEquipmentIndices.has(idx));
          
          if (missingIndices.length > 0) {
            const { data: magicItemsData } = await supabase
              .from('srd_magic_items')
              .select('*')
              .in('index', missingIndices);
            
            if (magicItemsData) {
              magicItemsData.forEach(miData => {
                const invItem = inventoryJsonb.find(item => 
                  item.source === 'srd' && item.index === miData.index
                );
                if (invItem) {
                  // Convert magic item to equipment-like structure for compatibility
                  const equipmentData: Partial<SrdEquipment> = {
                    id: miData.id,
                    index: miData.index,
                    name: miData.name,
                    equipment_category: miData.equipment_category || 'Wondrous Item',
                    gear_category: '',
                    cost: null,
                    weight: null,
                    description: miData.description || '',
                    weapon_category: null,
                    weapon_range: null,
                    category_range: null,
                    damage: null,
                    two_handed_damage: null,
                    range: null,
                    properties: null,
                    armor_category: null,
                    armor_class: null,
                    str_minimum: null,
                    stealth_disadvantage: false,
                    created_at: miData.created_at || '',
                  };
                  inventoryWithNames.push({
                    id: `${invItem.source}-${invItem.index}`,
                    name: miData.name,
                    source: 'srd',
                    quantity: invItem.quantity || 1,
                    equipped: invItem.equipped || false,
                    attuned: invItem.attuned || false,
                    notes: invItem.notes || undefined,
                    equipmentData: equipmentData as SrdEquipment,
                  });
                }
              });
            }
          }
        }

        // Batch fetch homebrew equipment with full data
        if (homebrewItemIds.length > 0) {
          const { data: homebrewEquipmentData } = await supabase
            .from('homebrew_equipment')
            .select('*')
            .in('id', homebrewItemIds);
          
          if (homebrewEquipmentData) {
            homebrewEquipmentData.forEach(eqData => {
              const invItem = inventoryJsonb.find(item => 
                item.source === 'homebrew' && item.index === eqData.id
              );
              if (invItem) {
                inventoryWithNames.push({
                  id: `${invItem.source}-${invItem.index}`,
                  name: eqData.name,
                  source: 'homebrew',
                  quantity: invItem.quantity || 1,
                  equipped: invItem.equipped || false,
                  attuned: invItem.attuned || false,
                  notes: invItem.notes || undefined,
                  equipmentData: eqData as HomebrewEquipment,
                });
              }
            });
          }
        }
        
        console.log(`Loaded ${inventoryWithNames.length} inventory items with full equipment data from JSONB`);
      } else {
        // Fall back to junction table for backwards compatibility
        console.log('No inventory in JSONB, checking junction table...');
        const { data: inventoryData, error: inventoryFetchError } = await supabase
          .from("character_inventory")
          .select("*")
          .eq("character_id", character.id);

        if (inventoryFetchError) {
          console.error('Error fetching inventory:', inventoryFetchError);
        }

        if (inventoryData && inventoryData.length > 0) {
          console.log(`Found ${inventoryData.length} inventory items in junction table`);
          
          // Separate SRD and homebrew items for batch fetching
          const srdItemIndices = inventoryData
            .filter(item => item.item_source === 'srd')
            .map(item => item.item_index);
          const homebrewItemIds = inventoryData
            .filter(item => item.item_source === 'homebrew')
            .map(item => item.item_index);

          // Batch fetch SRD equipment with full data
          if (srdItemIndices.length > 0) {
            const { data: srdEquipmentData } = await supabase
              .from('srd_equipment')
              .select('*')
              .in('index', srdItemIndices);
            
            if (srdEquipmentData) {
              srdEquipmentData.forEach(eqData => {
                const invItem = inventoryData.find(item => 
                  item.item_source === 'srd' && item.item_index === eqData.index
                );
                if (invItem) {
                  inventoryWithNames.push({
                    id: invItem.id,
                    name: eqData.name,
                    source: 'srd',
                    quantity: invItem.quantity || 1,
                    equipped: invItem.equipped || false,
                    attuned: invItem.attuned || false,
                    notes: invItem.notes || undefined,
                    equipmentData: eqData as SrdEquipment,
                  });
                }
              });
            }

            // For items not found in equipment, try magic items
            const foundEquipmentIndices = new Set(srdEquipmentData?.map(e => e.index) || []);
            const missingIndices = srdItemIndices.filter(idx => !foundEquipmentIndices.has(idx));
            
            if (missingIndices.length > 0) {
              const { data: magicItemsData } = await supabase
                .from('srd_magic_items')
                .select('*')
                .in('index', missingIndices);
              
              if (magicItemsData) {
                magicItemsData.forEach(miData => {
                  const invItem = inventoryData.find(item => 
                    item.item_source === 'srd' && item.item_index === miData.index
                  );
                  if (invItem) {
                    // Convert magic item to equipment-like structure for compatibility
                    const equipmentData: Partial<SrdEquipment> = {
                      id: miData.id,
                      index: miData.index,
                      name: miData.name,
                      equipment_category: miData.equipment_category || 'Wondrous Item',
                      gear_category: '',
                      cost: null,
                      weight: null,
                      description: miData.description || '',
                      weapon_category: null,
                      weapon_range: null,
                      category_range: null,
                      damage: null,
                      two_handed_damage: null,
                      range: null,
                      properties: null,
                      armor_category: null,
                      armor_class: null,
                      str_minimum: null,
                      stealth_disadvantage: false,
                      created_at: miData.created_at || '',
                    };
                    inventoryWithNames.push({
                      id: invItem.id,
                      name: miData.name,
                      source: 'srd',
                      quantity: invItem.quantity || 1,
                      equipped: invItem.equipped || false,
                      attuned: invItem.attuned || false,
                      notes: invItem.notes || undefined,
                      equipmentData: equipmentData as SrdEquipment,
                    });
                  }
                });
              }
            }
          }

          // Batch fetch homebrew equipment with full data
          if (homebrewItemIds.length > 0) {
            const { data: homebrewEquipmentData } = await supabase
              .from('homebrew_equipment')
              .select('*')
              .in('id', homebrewItemIds);
            
            if (homebrewEquipmentData) {
              homebrewEquipmentData.forEach(eqData => {
                const invItem = inventoryData.find(item => 
                  item.item_source === 'homebrew' && item.item_index === eqData.id
                );
                if (invItem) {
                  inventoryWithNames.push({
                    id: invItem.id,
                    name: eqData.name,
                    source: 'homebrew',
                    quantity: invItem.quantity || 1,
                    equipped: invItem.equipped || false,
                    attuned: invItem.attuned || false,
                    notes: invItem.notes || undefined,
                    equipmentData: eqData as HomebrewEquipment,
                  });
                }
              });
            }
          }
          
          console.log(`Loaded ${inventoryWithNames.length} inventory items with full equipment data from junction table`);
        }
      }
      
      setInventory(inventoryWithNames);

      setLoading(false);
    }

    fetchCharacterData();
  }, [character.id]);

  const handleHpChange = async (hpCurrent: number, hpTemp?: number) => {
    if (!onUpdate) return;
    await onUpdate({
      hp_current: hpCurrent,
      hp_temp: hpTemp !== undefined ? hpTemp : character.hp_temp,
    });
  };

  const handleStatChange = async (stat: string, value: number) => {
    if (!onUpdate) return;
    await onUpdate({ [stat]: value } as Partial<Character>);
  };

  const handleSaveProficiencyChange = async (ability: string, proficient: boolean) => {
    if (!onUpdate) return;
    const field = `${ability}_save_prof` as keyof Character;
    await onUpdate({ [field]: proficient } as Partial<Character>);
  };

  const handleSkillChange = async (skill: SkillName, proficient: boolean, expertise: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("character_skills")
      .upsert({
        character_id: character.id,
        skill_name: skill,
        proficient,
        expertise: expertise && proficient,
      });

    if (error) {
      toast.error("Failed to update skill");
    } else {
      setSkills((prev) => ({
        ...prev,
        [skill]: { proficient, expertise },
      }));
    }
  };

  const handleSlotChange = async (level: number, used: number) => {
    const supabase = createClient();
    
    // Find the current slot to get total
    const currentSlot = spellSlots.find(s => s.level === level);
    const slotsTotal = currentSlot?.total || 0;
    
    const { error } = await supabase
      .from("character_spell_slots")
      .upsert({
        character_id: character.id,
        spell_level: level,
        slots_total: slotsTotal,
        slots_used: used,
      }, { onConflict: 'character_id,spell_level' });

    if (error) {
      console.error("Spell slot update error:", error);
      toast.error("Failed to update spell slots");
    } else {
      setSpellSlots((prev) =>
        prev.map((slot) =>
          slot.level === level ? { ...slot, used } : slot
        )
      );
    }
  };

  const handleImageUpdate = async (imageUrl: string | null) => {
    if (!onUpdate) return;
    await onUpdate({ image_url: imageUrl });
  };

  // Apply ability score bonuses from equipment
  const abilityScores = {
    strength: (character.strength || 10) + (equipmentEffects.abilityScoreBonuses.strength || 0),
    dexterity: (character.dexterity || 10) + (equipmentEffects.abilityScoreBonuses.dexterity || 0),
    constitution: (character.constitution || 10) + (equipmentEffects.abilityScoreBonuses.constitution || 0),
    intelligence: (character.intelligence || 10) + (equipmentEffects.abilityScoreBonuses.intelligence || 0),
    wisdom: (character.wisdom || 10) + (equipmentEffects.abilityScoreBonuses.wisdom || 0),
    charisma: (character.charisma || 10) + (equipmentEffects.abilityScoreBonuses.charisma || 0),
  };

  // Calculate saving throw proficiencies from class (and potentially race)
  const saveProficiencies = calculateSavingThrowProficiencies(
    selectedClass?.saving_throws,
    selectedRace?.traits,
    {
      // Include any manual overrides from character data
      strength: character.strength_save_prof || false,
      dexterity: character.dexterity_save_prof || false,
      constitution: character.constitution_save_prof || false,
      intelligence: character.intelligence_save_prof || false,
      wisdom: character.wisdom_save_prof || false,
      charisma: character.charisma_save_prof || false,
    }
  );

  if (loading) {
    return <div>Loading character data...</div>;
  }

  // Calculate XP progress (assuming 300 XP per level for simplicity)
  const xpForNextLevel = character.level * 300;
  const xpProgress = character.experience_points % 300;
  const xpPercentage = (xpProgress / 300) * 100;

  const handleXpChange = async (newXp: number) => {
    if (!onUpdate) return;
    const clampedXp = Math.max(0, newXp);
    await onUpdate({ experience_points: clampedXp });
  };

  const handleLevelChange = async (newLevel: number) => {
    if (!onUpdate) return;
    const clampedLevel = Math.max(1, Math.min(20, newLevel));
    const newProficiencyBonus = getProficiencyBonus(clampedLevel);
    const oldLevel = character.level || 1;
    
    // Update level first
    await onUpdate({ 
      level: clampedLevel,
      proficiency_bonus: newProficiencyBonus
    });
    
    // Check if level increased AFTER update
    if (clampedLevel > oldLevel) {
      // Use the selectedClass that's already computed
      const selectedClass = classes.find(
        (c) => c.source === character.class_source && c.index === character.class_index
      );
      
      console.log('Level up detected:', { 
        oldLevel, 
        newLevel: clampedLevel, 
        selectedClass,
        classesCount: classes.length,
        classSource: character.class_source,
        classIndex: character.class_index
      });
      
      if (selectedClass?.index) {
        // Fetch features from srd_features table
        const supabase = createClient();
        const { data: featuresData, error: featuresError } = await supabase
          .from("srd_features")
          .select("*")
          .eq("class_index", selectedClass.index)
          .eq("level", clampedLevel)
          .order("name", { ascending: true });
        
        if (featuresError) {
          console.error('Error fetching features:', featuresError);
        }
        
        if (featuresData && featuresData.length > 0) {
          const formattedFeatures: NewFeature[] = featuresData.map(feat => ({
            level: feat.level || clampedLevel,
            name: feat.name,
            description: feat.description || '',
            type: 'feature',
            requiresChoice: false,
          }));
          
          console.log('Fetched features from database:', formattedFeatures);
          setNewLevelFeatures(formattedFeatures);
          setLevelUpModalOpen(true);
        } else {
          console.log('No features found for level', clampedLevel);
          // Still show modal with a message
          setNewLevelFeatures([{
            level: clampedLevel,
            name: 'Level Up',
            description: 'You have reached level ' + clampedLevel + '. Check your class description for any new features or abilities.',
            type: 'feature',
          }]);
          setLevelUpModalOpen(true);
        }
      } else {
        console.log('No class index found for selected class:', selectedClass);
        // Show modal anyway to acknowledge level up
        setNewLevelFeatures([{
          level: clampedLevel,
          name: 'Level Up',
          description: 'You have reached level ' + clampedLevel + '. Check your class description for any new features or abilities.',
          type: 'feature',
        }]);
        setLevelUpModalOpen(true);
      }
    }
    
    setPreviousLevel(clampedLevel);
  };

  const handleXpAdjust = async (delta: number) => {
    const newXp = (character.experience_points || 0) + delta;
    await handleXpChange(newXp);
  };

  const handleLevelAdjust = async (delta: number) => {
    const newLevel = (character.level || 1) + delta;
    await handleLevelChange(newLevel);
  };

  const handleLevelUpConfirm = async () => {
    if (!onUpdate) return;
    
    // For multiclass, need to update character_classes table
    if (multiclassClasses && multiclassClasses.length > 0 && selectedClassForLevelUp) {
      const supabase = createClient();
      const classToLevel = multiclassClasses.find(
        c => c.characterClass.class_source === selectedClassForLevelUp.class_source &&
             c.characterClass.class_index === selectedClassForLevelUp.class_index
      );
      
      if (classToLevel) {
        // Update the class level in character_classes
        const { error: updateError } = await supabase
          .from('character_classes')
          .update({ level: classToLevel.characterClass.level + 1 })
          .eq('character_id', character.id)
          .eq('class_source', selectedClassForLevelUp.class_source)
          .eq('class_index', selectedClassForLevelUp.class_index);
        
        if (updateError) {
          console.error('Error updating class level:', updateError);
          toast.error('Failed to update class level');
          return;
        }
      }
    }
    
    // For multiclass, save to character_class_features table
    if (multiclassClasses && multiclassClasses.length > 0 && selectedClassForLevelUp) {
      const supabase = createClient();
      const classToLevel = multiclassClasses.find(
        c => c.characterClass.class_source === selectedClassForLevelUp.class_source &&
             c.characterClass.class_index === selectedClassForLevelUp.class_index
      );
      
      if (classToLevel) {
        const newClassLevel = classToLevel.characterClass.level + 1;
        
        for (const feat of newLevelFeatures) {
          // Save feature choice if it has one
          if (feat.choice && feat.feature_index) {
            const choiceWithSelection = {
              ...feat.choice,
              selected: feat.choice.type === 'ability_score_improvement'
                ? feat.choice.selected
                : (feat.choice as any).selected,
            };
            
            // Save the choice
            await saveFeatureChoice(
              character.id,
              feat.feature_index,
              choiceWithSelection as AnyFeatureChoice,
              {
                level: feat.level,
                name: feat.name,
                description: feat.description,
              }
            );
            
            // Apply ASI if it's an ability score improvement
            if (feat.choice.type === 'ability_score_improvement' && feat.choice.selected) {
              await applyAbilityScoreImprovement(character, choiceWithSelection as AnyFeatureChoice);
            }
          }
          
          // Insert into character_class_features
          await supabase
            .from('character_class_features')
            .insert({
              character_id: character.id,
              class_source: selectedClassForLevelUp.class_source,
              class_index: selectedClassForLevelUp.class_index,
              class_level: newClassLevel,
              feature_index: feat.feature_index || null,
              feature_name: feat.name,
              feature_description: feat.description,
              feature_specific: feat.choice ? { choice: feat.choice } : null,
              acquired_at_character_level: character.level || 1,
            });
        }
      }
    } else {
      // Legacy: single class - update class_features array
      const classToUse = selectedClass;
      if (!classToUse) return;
      
      const currentFeatures = character.class_features || [];
      const updatedFeatures = [...currentFeatures];
      
      for (const feat of newLevelFeatures) {
        // Save feature choice if it has one
        if (feat.choice && feat.feature_index) {
          const choiceWithSelection = {
            ...feat.choice,
            selected: feat.choice.type === 'ability_score_improvement'
              ? feat.choice.selected
              : (feat.choice as any).selected,
          };
          
          // Save the choice
          await saveFeatureChoice(
            character.id,
            feat.feature_index,
            choiceWithSelection as AnyFeatureChoice,
            {
              level: feat.level,
              name: feat.name,
              description: feat.description,
            }
          );
          
          // Apply ASI if it's an ability score improvement
          if (feat.choice.type === 'ability_score_improvement' && feat.choice.selected) {
            await applyAbilityScoreImprovement(character, choiceWithSelection as AnyFeatureChoice);
          }
        }
        
        // Update class_features array
        const existingIndex = updatedFeatures.findIndex((f: any) => 
          f.feature_index === feat.feature_index || (f.level === feat.level && f.name === feat.name)
        );
        
        if (existingIndex >= 0) {
          // Update existing feature
          const existing = updatedFeatures[existingIndex] as any;
          updatedFeatures[existingIndex] = {
            ...existing,
            level: feat.level,
            name: feat.name,
            description: feat.description,
            feature_index: feat.feature_index,
            choice: feat.choice,
            acquired: true,
          };
        } else {
          // Add new feature
          updatedFeatures.push({
            level: feat.level,
            name: feat.name,
            description: feat.description,
            feature_index: feat.feature_index,
            choice: feat.choice,
            acquired: true,
          });
        }
      }
      
      await onUpdate({
        class_features: updatedFeatures,
      });
    }
    
    setLevelUpModalOpen(false);
    setNewLevelFeatures([]);
    setSelectedClassForLevelUp(null);
  };

  const handleFeatureChoice = (featureIndex: string, choice: any) => {
    setNewLevelFeatures(prev => prev.map(feat => {
      if (feat.feature_index === featureIndex && feat.choice) {
        const updatedChoice = {
          ...feat.choice,
          selected: choice,
        };
        return { ...feat, choice: updatedChoice };
      }
      return feat;
    }));
  };

  return (
    <div className="space-y-2">
      {/* Top Section: Portrait, Name, Basic Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Portrait and Basic Info */}
        <div className="lg:col-span-2 space-y-2">
          {/* Portrait with Glow Effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10" />
            <CharacterPortrait
              characterId={character.id}
              imageUrl={character.image_url}
              characterName={character.name}
              onImageUpdate={handleImageUpdate}
              editable={editable}
              size="lg"
            />
          </div>

          {/* Character Name and Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold font-serif">{character.name}</h1>
              {editable && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => router.push(`/character-creator?editId=${character.id}`)}
                  title="Edit Character"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedRace && (
                <Badge 
                  variant="outline" 
                  className="text-sm cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => infoSheet.showRace(selectedRace)}
                >
                  {selectedRace.name}
                </Badge>
              )}
              {/* Display multiclass badges if multiclass, otherwise single class */}
              {multiclassClasses && multiclassClasses.length > 0 ? (
                multiclassClasses.map(({ characterClass, classData }, idx) => (
                  <Badge 
                    key={idx}
                    variant={characterClass.is_primary_class ? "default" : "secondary"}
                    className="text-sm cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => classData && infoSheet.showClass(classData)}
                  >
                    {classData?.name || characterClass.class_index} {characterClass.level}
                    {characterClass.is_primary_class && " (Primary)"}
                  </Badge>
                ))
              ) : selectedClass && (
                <Badge 
                  variant="outline" 
                  className="text-sm cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => infoSheet.showClass(selectedClass)}
                >
                  {selectedClass.name}
                </Badge>
              )}
              <Badge variant="outline" className="text-sm">Level {character.level}</Badge>
            </div>
            
            {/* XP & Level Management */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm">Experience & Level</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                {/* Level Control */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Level</label>
                  <div className="flex items-center gap-1">
                    {editable && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleLevelAdjust(-1)}
                        disabled={(character.level || 1) <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}
                    {editable ? (
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        value={character.level || 1}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          handleLevelChange(value);
                        }}
                        className="h-7 text-center text-sm font-semibold"
                      />
                    ) : (
                      <div className="flex-1 text-center text-sm font-semibold py-1.5">
                        {character.level || 1}
                      </div>
                    )}
                    {editable && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleLevelAdjust(1)}
                        disabled={(character.level || 1) >= 20}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* XP Control */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Experience Points</label>
                  <div className="flex items-center gap-1">
                    {editable && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleXpAdjust(-50)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                    )}
                    {editable ? (
                      <Input
                        type="number"
                        min={0}
                        value={character.experience_points || 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          handleXpChange(value);
                        }}
                        className="h-7 text-center text-sm"
                      />
                    ) : (
                      <div className="flex-1 text-center text-sm py-1.5">
                        {character.experience_points || 0}
                      </div>
                    )}
                    {editable && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleXpAdjust(50)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div className="space-y-0.5 pt-1 border-t border-border/50">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{xpProgress} / 300 XP</span>
                    <span>towards LVL {character.level + 1}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${xpPercentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ability Scores - Compact Grid Layout */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm">Ability Scores</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  { name: "Strength", short: "STR", score: abilityScores.strength, Icon: Strength },
                  { name: "Dexterity", short: "DEX", score: abilityScores.dexterity, Icon: Dexterity },
                  { name: "Constitution", short: "CON", score: abilityScores.constitution, Icon: Constitution },
                  { name: "Intelligence", short: "INT", score: abilityScores.intelligence, Icon: Intelligence },
                  { name: "Wisdom", short: "WIS", score: abilityScores.wisdom, Icon: Wisdom },
                  { name: "Charisma", short: "CHA", score: abilityScores.charisma, Icon: Charisma },
                ].map((ability) => {
                  const modifier = getAbilityModifierString(ability.score);
                  const modifierValue = getAbilityModifier(ability.score);
                  const IconComponent = ability.Icon;
                  return (
                    <div 
                      key={ability.short} 
                      className="text-center p-2 bg-background/50 rounded-md border border-border/50"
                      onClick={() => {
                        infoSheet.showAbility(ability.name, ability.short, ability.score);
                      }}
                    >
                      <IconComponent size={16} className="mx-auto mb-0.5" />
                      <div className="text-[10px] text-muted-foreground mb-0.5">
                        {ability.short}
                      </div>
                      <div className="text-xl font-bold leading-none mb-0.5">{ability.score}</div>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-full px-1.5 py-0.5 text-xs font-semibold rounded border transition-all bg-muted/50 border-border/50 text-foreground hover:bg-muted hover:border-border mt-0.5"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            await rollWithAdvantage(modifierValue, {
                              label: `${ability.name} Check`,
                              characterId: character.id,
                              characterName: character.name,
                              campaignId: character.campaign_id || undefined,
                            });
                          } else {
                            await rollDice(`1d20${modifierValue >= 0 ? '+' : ''}${modifierValue}`, {
                              label: `${ability.name} Check`,
                              characterId: character.id,
                              characterName: character.name,
                              campaignId: character.campaign_id || undefined,
                            });
                          }
                        }}
                        onContextMenu={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await rollWithAdvantage(modifierValue, {
                            label: `${ability.name} Check (Advantage)`,
                            characterId: character.id,
                            characterName: character.name,
                            campaignId: character.campaign_id || undefined,
                          });
                        }}
                      >
                        {modifier}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="pt-1.5 border-t border-border/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Proficiency Bonus</span>
                  <span className="font-semibold">+{character.proficiency_bonus || 2}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saving Throws - Moved under Ability Scores */}
          <SavingThrows
            abilityScores={abilityScores}
            proficiencies={saveProficiencies}
            proficiencyBonus={character.proficiency_bonus || 2}
            onProficiencyChange={handleSaveProficiencyChange}
            onSavingThrowClick={(ability: string, short: string, score: number, proficient: boolean, description: string, examples: readonly string[] | undefined) => {
              infoSheet.showSavingThrow(ability, short, score, proficient, character.proficiency_bonus || 2, description, examples);
            }}
            editable={editable}
            characterId={character.id}
            characterName={character.name}
            campaignId={character.campaign_id || undefined}
          />

          {/* Senses Card */}
          <SensesCard
            wisdom={abilityScores.wisdom}
            intelligence={abilityScores.intelligence}
            perceptionProficient={skills.perception?.proficient || false}
            investigationProficient={skills.investigation?.proficient || false}
            insightProficient={skills.insight?.proficient || false}
            proficiencyBonus={character.proficiency_bonus || 2}
            raceTraits={selectedRace?.traits}
            editable={editable}
          />

          {/* Proficiencies & Training Card */}
          <ProficienciesTraining
            character={character}
            race={selectedRace || null}
            class={selectedClass || null}
            campaignId={character.campaign_id}
            editable={editable}
          />
        </div>

        {/* Right Column: Combat Stats and Main Content */}
        <div className="lg:col-span-10 space-y-2">
          {/* Combat Stats Row - Made Shorter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <CombatStats
              hpMax={character.hp_max || 0}
              hpCurrent={character.hp_current || 0}
              hpTemp={character.hp_temp || 0}
              armorClass={equipmentEffects.armorClass || character.armor_class || 10}
              acBreakdown={equipmentEffects.acBreakdown}
              initiative={character.initiative || 0}
              speed={(character.speed || 30) + equipmentEffects.speedModifier}
              speedModifier={equipmentEffects.speedModifier}
              hitDiceCurrent={character.hit_dice_current}
              hitDiceTotal={character.hit_dice_total}
              onHpChange={handleHpChange}
              onStatChange={handleStatChange}
              editable={editable}
              characterId={character.id}
              characterName={character.name}
              campaignId={character.campaign_id || undefined}
            />

            {/* Conditions Card - Made Shorter */}
            <Card className="bg-muted/30">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm">Conditions & Defenses</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-1.5">
                <Conditions
                  conditions={character.conditions || []}
                  onConditionsChange={async (conditions) => {
                    if (onUpdate) await onUpdate({ conditions });
                  }}
                  onConditionClick={(condition) => {
                    infoSheet.showCondition(condition);
                  }}
                  editable={editable}
                />
                <Defenses raceTraits={selectedRace?.traits} />
              </CardContent>
            </Card>
          </div>

          {/* Skills + Main Content Tabs - Inside Right Column */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            {/* Skills Panel - Narrowed, On Left Side */}
            <div className="md:col-span-3">
              <SkillsPanel
                abilityScores={abilityScores}
                skillProficiencies={skills}
                proficiencyBonus={character.proficiency_bonus || 2}
                stealthDisadvantage={equipmentEffects.stealthDisadvantage}
                onSkillChange={handleSkillChange}
                onSkillClick={(skillName, description, examples, ability, score, proficient, expertise) => {
                  infoSheet.showSkill(skillName, ability, score, proficient, expertise, character.proficiency_bonus || 2, description, examples);
                }}
                editable={editable}
                characterId={character.id}
                characterName={character.name}
                campaignId={character.campaign_id || undefined}
              />
            </div>

            {/* Main Content Tabs - On Right Side */}
            <div className="md:col-span-9">
              <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid w-full grid-cols-7 h-9">
              <TabsTrigger value="actions" className="text-xs flex items-center gap-1">
                <Action size={14} />
                Actions
              </TabsTrigger>
              <TabsTrigger value="spells" className="text-xs flex items-center gap-1">
                <Spell size={14} />
                Spells
              </TabsTrigger>
              <TabsTrigger value="inventory" className="text-xs flex items-center gap-1">
                <Armor size={14} />
                Inventory
              </TabsTrigger>
              <TabsTrigger value="features" className="text-xs flex items-center gap-1">
                <Book size={14} />
                Features & Traits
              </TabsTrigger>
              <TabsTrigger value="background" className="text-xs flex items-center gap-1">
                <Book size={14} />
                Background
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs flex items-center gap-1">
                <Book size={14} />
                Notes
              </TabsTrigger>
              <TabsTrigger value="extras" className="text-xs flex items-center gap-1">
                <Book size={14} />
                Extras
              </TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="mt-2">
              <ActionsTab
                character={character}
                abilityScores={abilityScores}
                inventory={inventory}
                proficiencyBonus={character.proficiency_bonus || 2}
                classFeatures={character.class_features || []}
                characterId={character.id}
                characterName={character.name}
                campaignId={character.campaign_id || undefined}
              />
            </TabsContent>

            <TabsContent value="spells" className="space-y-2 mt-2">
              <SpellsTab
                spells={characterSpells}
                spellSlots={spellSlots}
                characterId={character.id}
                characterName={character.name}
                campaignId={character.campaign_id || undefined}
                onSpellToggle={async (spellIndex, prepared) => {
                  const supabase = createClient();
                  const charSpell = characterSpells.find(cs => cs.spell.index === spellIndex);
                  if (charSpell) {
                    const { error } = await supabase
                      .from('character_spells')
                      .update({ prepared })
                      .eq('character_id', character.id)
                      .eq('spell_source', charSpell.spell.source)
                      .eq('spell_index', spellIndex);
                    
                    if (!error) {
                      setCharacterSpells(prev => prev.map(cs => 
                        cs.spell.index === spellIndex ? { ...cs, prepared } : cs
                      ));
                    }
                  }
                }}
                onSpellClick={(spell) => {
                  infoSheet.showSpell(spell);
                }}
                onSlotChange={handleSlotChange}
                editable={editable}
              />
            </TabsContent>

            <TabsContent value="inventory" className="mt-2">
              <Inventory
                items={inventory}
                characterStrength={character.strength || 10}
                characterDexterity={character.dexterity || 10}
                campaignId={character.campaign_id}
                characterId={character.id}
                money={character.money || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }}
                onMoneyUpdate={async (money) => {
                  if (onUpdate) {
                    await onUpdate({ money });
                  } else {
                    toast.error('Update function not available');
                  }
                }}
                onItemAdd={async (item: Equipment, quantity: number, notes?: string) => {
                  const supabase = createClient();
                  
                  // Get current inventory from JSONB column
                  const currentInventory = (character.inventory as Array<{
                    source: 'srd' | 'homebrew';
                    index: string;
                    quantity: number;
                    equipped: boolean;
                    attuned: boolean;
                    notes?: string | null;
                  }>) || [];
                  
                  // Check if item already exists (same source and index)
                  const existingItemIndex = currentInventory.findIndex(
                    inv => inv.source === item.source && inv.index === item.index
                  );
                  
                  let updatedInventory: typeof currentInventory;
                  
                  if (existingItemIndex >= 0) {
                    // Update quantity of existing item
                    updatedInventory = [...currentInventory];
                    updatedInventory[existingItemIndex] = {
                      ...updatedInventory[existingItemIndex],
                      quantity: updatedInventory[existingItemIndex].quantity + quantity,
                    };
                  } else {
                    // Add new item
                    updatedInventory = [
                      ...currentInventory,
                      {
                        source: item.source,
                        index: item.index,
                        quantity: quantity,
                        equipped: false,
                        attuned: false,
                        notes: notes || null,
                      },
                    ];
                  }
                  
                  // Update JSONB column in database
                  const { error } = await supabase
                    .from('characters')
                    .update({ inventory: updatedInventory })
                    .eq('id', character.id);
                  
                  if (error) {
                    console.error('Error adding item to inventory:', error);
                    toast.error('Failed to add item to inventory');
                    throw error;
                  }
                  
                  // Fetch full equipment data and create enriched item
                  let equipmentData: SrdEquipment | HomebrewEquipment | undefined;
                  
                  if (item.source === 'srd') {
                    const { data: srdData } = await supabase
                      .from('srd_equipment')
                      .select('*')
                      .eq('index', item.index)
                      .single();
                    
                    if (!srdData) {
                      // Try magic items
                      const { data: magicData } = await supabase
                        .from('srd_magic_items')
                        .select('*')
                        .eq('index', item.index)
                        .single();
                      
                      if (magicData) {
                        equipmentData = {
                          ...magicData,
                          equipment_category: magicData.equipment_category || 'Wondrous Item',
                        } as any;
                      }
                    } else {
                      equipmentData = srdData as SrdEquipment;
                    }
                  } else {
                    const { data: homebrewData } = await supabase
                      .from('homebrew_equipment')
                      .select('*')
                      .eq('id', item.index)
                      .single();
                    
                    if (homebrewData) {
                      equipmentData = homebrewData as HomebrewEquipment;
                    }
                  }
                  
                  // Add to local state
                  const newItem: EnrichedInventoryItem = {
                    id: `${item.source}-${item.index}`,
                    name: item.name,
                    source: item.source,
                    quantity: existingItemIndex >= 0 
                      ? currentInventory[existingItemIndex].quantity + quantity 
                      : quantity,
                    equipped: false,
                    attuned: false,
                    notes: notes,
                    equipmentData: equipmentData as SrdEquipment | HomebrewEquipment,
                  };
                  
                  // Update local state - replace existing or add new
                  if (existingItemIndex >= 0) {
                    setInventory(prev => prev.map(inv => 
                      inv.id === newItem.id ? newItem : inv
                    ));
                  } else {
                    setInventory(prev => [...prev, newItem]);
                  }
                  
                  // Update character prop via callback
                  if (onUpdate) {
                    await onUpdate({ inventory: updatedInventory });
                  }
                  
                  toast.success(`Added ${quantity}x ${item.name} to inventory`);
                }}
                onItemToggle={async (itemId, field, value) => {
                  const item = inventory.find(i => i.id === itemId);
                  if (!item) return;
                  
                  if (field === 'equipped' && value === true) {
                    // Validation when equipping
                    const equipmentData = item.equipmentData;
                    const isArmor = equipmentData?.armor_category && equipmentData.armor_category !== 'Shield';
                    const isShield = equipmentData?.armor_category === 'Shield';
                    
                    // Check strength requirement
                    if (equipmentData?.str_minimum) {
                      const strReq = equipmentData.str_minimum;
                      const charStr = character.strength || 10;
                      if (charStr < strReq) {
                        toast.error(`${item.name} requires Strength ${strReq} (Current: ${charStr})`);
                        return;
                      }
                    }
                    
                    // Check if trying to equip multiple armor pieces
                    if (isArmor) {
                      const otherEquippedArmor = inventory.find(i => 
                        i.id !== itemId && 
                        i.equipped && 
                        i.equipmentData?.armor_category && 
                        i.equipmentData.armor_category !== 'Shield'
                      );
                      if (otherEquippedArmor) {
                        toast.error(`Cannot equip multiple armor pieces. Unequip ${otherEquippedArmor.name} first.`);
                        return;
                      }
                    }
                    
                    // Shields can stack with armor, but check for multiple shields
                    if (isShield) {
                      const otherEquippedShields = inventory.filter(i => 
                        i.id !== itemId && 
                        i.equipped && 
                        i.equipmentData?.armor_category === 'Shield'
                      );
                      if (otherEquippedShields.length > 0) {
                        toast.error(`Cannot equip multiple shields. Unequip other shields first.`);
                        return;
                      }
                    }
                  }
                  
                  const supabase = createClient();
                  
                  // Get current inventory from JSONB column
                  const currentInventory = (character.inventory as Array<{
                    source: 'srd' | 'homebrew';
                    index: string;
                    quantity: number;
                    equipped: boolean;
                    attuned: boolean;
                    notes?: string | null;
                  }>) || [];
                  
                  // Find and update the item in the inventory array
                  const updatedInventory = currentInventory.map(inv => {
                    if (inv.source === item.source && inv.index === item.index) {
                      return { ...inv, [field]: value };
                    }
                    return inv;
                  });
                  
                  // Update JSONB column in database
                  const { error } = await supabase
                    .from('characters')
                    .update({ inventory: updatedInventory })
                    .eq('id', character.id);
                  
                  if (!error) {
                    setInventory(prev => prev.map(inv => 
                      inv.id === itemId ? { ...inv, [field]: value } : inv
                    ));
                    
                    // Update character prop via callback
                    if (onUpdate) {
                      await onUpdate({ inventory: updatedInventory });
                    }
                  } else {
                    console.error('Error updating inventory:', error);
                    toast.error(`Failed to update ${field === 'equipped' ? 'equipment' : 'attunement'} status`);
                  }
                }}
                onItemDelete={async (itemId) => {
                  const item = inventory.find(i => i.id === itemId);
                  if (!item) return;
                  
                  const supabase = createClient();
                  
                  // Get current inventory from JSONB column
                  const currentInventory = (character.inventory as Array<{
                    source: 'srd' | 'homebrew';
                    index: string;
                    quantity: number;
                    equipped: boolean;
                    attuned: boolean;
                    notes?: string | null;
                  }>) || [];
                  
                  // Remove the item from the inventory array
                  const updatedInventory = currentInventory.filter(
                    inv => !(inv.source === item.source && inv.index === item.index)
                  );
                  
                  // Update JSONB column in database
                  const { error } = await supabase
                    .from('characters')
                    .update({ inventory: updatedInventory })
                    .eq('id', character.id);
                  
                  if (!error) {
                    setInventory(prev => prev.filter(inv => inv.id !== itemId));
                    
                    // Update character prop via callback
                    if (onUpdate) {
                      await onUpdate({ inventory: updatedInventory });
                    }
                    
                    toast.success(`Removed ${item.name} from inventory`);
                  } else {
                    console.error('Error deleting item:', error);
                    toast.error('Failed to remove item from inventory');
                  }
                }}
                onItemQuantityUpdate={async (itemId, quantity) => {
                  const item = inventory.find(i => i.id === itemId);
                  if (!item) return;
                  
                  if (quantity < 0) {
                    toast.error('Quantity cannot be negative');
                    return;
                  }
                  
                  const supabase = createClient();
                  
                  // Get current inventory from JSONB column
                  const currentInventory = (character.inventory as Array<{
                    source: 'srd' | 'homebrew';
                    index: string;
                    quantity: number;
                    equipped: boolean;
                    attuned: boolean;
                    notes?: string | null;
                  }>) || [];
                  
                  // If quantity is 0, remove the item
                  let updatedInventory: typeof currentInventory;
                  if (quantity === 0) {
                    updatedInventory = currentInventory.filter(
                      inv => !(inv.source === item.source && inv.index === item.index)
                    );
                  } else {
                    // Find and update the item quantity in the inventory array
                    updatedInventory = currentInventory.map(inv => {
                      if (inv.source === item.source && inv.index === item.index) {
                        return { ...inv, quantity };
                      }
                      return inv;
                    });
                  }
                  
                  // Update JSONB column in database
                  const { error } = await supabase
                    .from('characters')
                    .update({ inventory: updatedInventory })
                    .eq('id', character.id);
                  
                  if (!error) {
                    if (quantity === 0) {
                      setInventory(prev => prev.filter(inv => inv.id !== itemId));
                      toast.success(`Removed ${item.name} from inventory`);
                    } else {
                      setInventory(prev => prev.map(inv => 
                        inv.id === itemId ? { ...inv, quantity } : inv
                      ));
                      toast.success(`Updated ${item.name} quantity to ${quantity}`);
                    }
                    
                    // Update character prop via callback
                    if (onUpdate) {
                      await onUpdate({ inventory: updatedInventory });
                    }
                  } else {
                    console.error('Error updating item quantity:', error);
                    toast.error('Failed to update item quantity');
                  }
                }}
                editable={editable}
              />
            </TabsContent>

            <TabsContent value="features" className="mt-2">
              <FeaturesTraits
                classes={multiclassClasses}
                onFeatureChoice={async (featureIndex, choice, classSource, classIndex) => {
                  // Find the feature to get its details
                  const supabase = createClient();
                  const { data: featureData } = await supabase
                    .from("srd_features")
                    .select("*")
                    .eq("index", featureIndex)
                    .single();
                  
                  if (featureData) {
                    const choiceWithSelection = parseFeatureChoices(featureData.feature_specific, featureData.name);
                    if (choiceWithSelection) {
                      choiceWithSelection.selected = choice;
                      
                      await saveFeatureChoice(
                        character.id,
                        featureIndex,
                        choiceWithSelection as AnyFeatureChoice,
                        {
                          level: featureData.level || character.level || 1,
                          name: featureData.name,
                          description: featureData.description || '',
                        }
                      );
                      
                      // Apply ASI if needed
                      if (choiceWithSelection.type === 'ability_score_improvement') {
                        await applyAbilityScoreImprovement(character, choiceWithSelection as AnyFeatureChoice);
                      }
                      
                      // Refresh character data
                      if (onUpdate) {
                        const currentFeatures = character.class_features || [];
                        const existingIndex = currentFeatures.findIndex((f: any) => f.feature_index === featureIndex);
                        const updatedFeature = {
                          level: featureData.level || character.level || 1,
                          name: featureData.name,
                          description: featureData.description || '',
                          feature_index: featureIndex,
                          choice: choiceWithSelection,
                          acquired: true,
                        };
                        
                        const updatedFeatures = existingIndex >= 0
                          ? currentFeatures.map((f: any, idx) => idx === existingIndex ? updatedFeature : f)
                          : [...currentFeatures, updatedFeature];
                        
                        await onUpdate({ class_features: updatedFeatures });
                      }
                    }
                  }
                }}
                race={selectedRace ? {
                  name: selectedRace.name,
                  index: selectedRace.index,
                  id: selectedRace.source === 'homebrew' ? selectedRace.index : undefined,
                  campaign_id: character.campaign_id || undefined,
                  traits: selectedRace.traits,
                  source: selectedRace.source,
                } : undefined}
                class={selectedClass ? {
                  name: selectedClass.name,
                  index: selectedClass.index,
                  classLevels: selectedClass.class_levels,
                  source: selectedClass.source,
                } : undefined}
                level={character.level || 1}
                character={{
                  class_features: character.class_features || [],
                }}
              />
            </TabsContent>

            <TabsContent value="background" className="mt-2">
              <BackgroundTab
                character={character}
                editable={editable}
                onUpdate={onUpdate}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-2">
              <Notes
                notes={character.notes || ""}
                onNotesChange={async (notes) => {
                  if (onUpdate) await onUpdate({ notes });
                }}
                editable={editable}
              />
            </TabsContent>

            <TabsContent value="extras" className="mt-2">
              <ExtrasTab
                character={character}
                editable={editable}
                onUpdate={onUpdate}
              />
            </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Info Sheet Dialog */}
      <InfoSheetDialog
        open={infoSheet.open}
        onOpenChange={infoSheet.setOpen}
        content={infoSheet.content}
      />

      {/* Level Up Modal */}
      <LevelUpModal
        open={levelUpModalOpen}
        onOpenChange={setLevelUpModalOpen}
        newLevel={character.level || 1}
        features={newLevelFeatures}
        onConfirm={handleLevelUpConfirm}
        onFeatureChoice={handleFeatureChoice}
        currentAbilityScores={{
          strength: character.strength || 10,
          dexterity: character.dexterity || 10,
          constitution: character.constitution || 10,
          intelligence: character.intelligence || 10,
          wisdom: character.wisdom || 10,
          charisma: character.charisma || 10,
        }}
        multiclassClasses={multiclassClasses?.map(({ characterClass, classData }) => ({
          characterClass,
          classData: classData || null,
        }))}
        selectedClassForLevelUp={selectedClassForLevelUp}
        onClassSelectForLevelUp={(source, index) => {
          setSelectedClassForLevelUp({ class_source: source, class_index: index });
          // Fetch features for selected class
          const selectedCharClass = multiclassClasses?.find(
            c => c.characterClass.class_source === source && c.characterClass.class_index === index
          );
          if (selectedCharClass) {
            // Refetch features for this class level
            const supabase = createClient();
            supabase
              .from("srd_features")
              .select("*")
              .eq("class_index", index)
              .eq("level", selectedCharClass.characterClass.level + 1)
              .then(({ data, error }) => {
                if (!error && data) {
                  const formattedFeatures: NewFeature[] = data.map(feat => {
                    const hasChoices = hasFeatureChoices(feat.feature_specific) || isAbilityScoreImprovement(feat.name);
                    const choice = hasChoices ? parseFeatureChoices(feat.feature_specific, feat.name) : null;
                    return {
                      level: feat.level || selectedCharClass.characterClass.level + 1,
                      name: feat.name,
                      description: feat.description || '',
                      type: isAbilityScoreImprovement(feat.name) ? 'asi' : 'feature',
                      requiresChoice: hasChoices && choice !== null,
                      feature_index: feat.index,
                      choice: choice,
                      feature_specific: feat.feature_specific,
                    };
                  });
                  setNewLevelFeatures(formattedFeatures);
                }
              });
          }
        }}
      />
    </div>
  );
}

