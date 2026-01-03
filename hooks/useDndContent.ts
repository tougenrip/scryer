import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface SrdSpell {
  id: string;
  index: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string[];
  material: string | null;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  description: string;
  higher_level: string | null;
  classes: string[];
  created_at: string;
}

export interface HomebrewSpell extends Omit<SrdSpell, 'index' | 'created_at'> {
  campaign_id: string;
  based_on_srd: string | null;
  created_by: string;
  created_at: string;
}

export interface Spell extends SrdSpell {
  source: 'srd' | 'homebrew';
}

export interface SrdClass {
  id: string;
  index: string;
  name: string;
  hit_die: number;
  proficiency_choices: any;
  proficiencies: any;
  saving_throws: string[];
  starting_equipment: any;
  class_levels: any;
  spellcasting: any;
  subclasses: string[];
  created_at: string;
}

export interface HomebrewClass extends Omit<SrdClass, 'index' | 'created_at'> {
  campaign_id: string;
  based_on_srd: string | null;
  created_by: string;
  created_at: string;
}

export interface DndClass extends SrdClass {
  source: 'srd' | 'homebrew';
}

export interface SrdSubclass {
  id: string;
  index: string;
  name: string;
  class_index: string;
  subclass_flavor?: string;
  description?: string;
  features?: any;
  created_at: string;
}

export interface HomebrewSubclass extends Omit<SrdSubclass, 'index' | 'created_at'> {
  campaign_id: string;
  based_on_srd: string | null;
  created_by: string;
  created_at: string;
}

export interface Subclass extends SrdSubclass {
  source: 'srd' | 'homebrew';
}

export interface SrdRace {
  id: string;
  index: string;
  name: string;
  speed: number;
  ability_bonuses: any;
  size: string;
  size_description: string;
  languages: any;
  language_desc: string;
  traits: any;
  subraces: string[];
  created_at: string;
}

export interface HomebrewRace extends Omit<SrdRace, 'index' | 'created_at'> {
  campaign_id: string;
  based_on_srd: string | null;
  created_by: string;
  created_at: string;
}

export interface SrdRacialTrait {
  id: string;
  index: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface HomebrewRacialTrait {
  id: string;
  campaign_id: string;
  based_on_srd: string | null;
  index: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface Race extends SrdRace {
  source: 'srd' | 'homebrew';
}

export interface SrdMonster {
  id: string;
  index: string;
  name: string;
  size: string;
  type: string;
  subtype: string | null;
  alignment: string;
  armor_class: number;
  hit_points: number;
  hit_dice: string;
  speed: any;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  proficiencies: any;
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: string[];
  senses: any;
  languages: string;
  challenge_rating: number;
  xp: number;
  special_abilities: any;
  actions: any;
  legendary_actions: any;
  reactions: any;
  created_at: string;
}

export interface HomebrewMonster extends Omit<SrdMonster, 'index' | 'created_at'> {
  campaign_id: string;
  based_on_srd: string | null;
  created_by: string;
  created_at: string;
}

export interface Monster extends SrdMonster {
  source: 'srd' | 'homebrew';
}

export interface SrdEquipment {
  id: string;
  index: string;
  name: string;
  equipment_category: string;
  gear_category: string;
  cost: any;
  weight: number | null;
  description: string;
  weapon_category: string | null;
  weapon_range: string | null;
  category_range: string | null;
  damage: any;
  two_handed_damage: any;
  range: any;
  properties: any;
  armor_category: string | null;
  armor_class: any;
  str_minimum: number | null;
  stealth_disadvantage: boolean;
  created_at: string;
}

export interface HomebrewEquipment extends Omit<SrdEquipment, 'index' | 'created_at'> {
  campaign_id: string;
  based_on_srd: string | null;
  created_by: string;
  created_at: string;
}

export interface Equipment extends SrdEquipment {
  source: 'srd' | 'homebrew';
}

export type ProficiencyType = 'language' | 'tool' | 'weapon' | 'armor';

export interface SrdProficiencyTraining {
  id: string;
  index: string;
  name: string;
  type: ProficiencyType;
  description: string | null;
  category: string | null;
  created_at: string;
}

export interface HomebrewProficiencyTraining extends Omit<SrdProficiencyTraining, 'created_at'> {
  campaign_id: string;
  based_on_srd: string | null;
  created_by: string;
  created_at: string;
}

export interface ProficiencyTraining extends SrdProficiencyTraining {
  source: 'srd' | 'homebrew';
}

export interface CharacterProficiency {
  character_id: string;
  proficiency_source: 'srd' | 'homebrew';
  proficiency_index: string;
  source_type: 'race' | 'background' | 'class' | 'custom';
}

export interface CharacterClass {
  id?: string;
  character_id: string;
  class_source: 'srd' | 'homebrew';
  class_index: string;
  level: number;
  subclass_source?: 'srd' | 'homebrew' | null;
  subclass_index?: string | null;
  is_primary_class?: boolean;
  level_acquired_at?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CharacterClassFeature {
  id?: string;
  character_id: string;
  class_source: 'srd' | 'homebrew';
  class_index: string;
  class_level: number;
  feature_index?: string | null;
  feature_name: string;
  feature_description?: string | null;
  feature_specific?: any;
  acquired_at_character_level: number;
  created_at?: string;
}

export interface Character {
  id: string;
  campaign_id: string | null;
  user_id: string;
  name: string;
  race_source: 'srd' | 'homebrew';
  race_index: string;
  class_source: 'srd' | 'homebrew' | null;
  class_index: string | null;
  subclass_source: 'srd' | 'homebrew' | null;
  subclass_index: string | null;
  uses_multiclass?: boolean;
  level: number;
  experience_points: number;
  background: string | null;
  alignment: string | null;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  armor_class: number;
  initiative: number;
  speed: number;
  hp_max: number;
  hp_current: number;
  hp_temp: number;
  hit_dice_total: string;
  hit_dice_current: string;
  proficiency_bonus: number;
  inspiration: boolean;
  conditions: string[];
  notes: string | null;
  strength_save_prof: boolean;
  dexterity_save_prof: boolean;
  constitution_save_prof: boolean;
  intelligence_save_prof: boolean;
  wisdom_save_prof: boolean;
  charisma_save_prof: boolean;
  image_url: string | null;
  senses?: any;
  spells?: Array<{
    source: 'srd' | 'homebrew';
    index: string;
    prepared: boolean;
    always_prepared: boolean;
  }>;
  inventory?: Array<{
    source: 'srd' | 'homebrew';
    index: string;
    quantity: number;
    equipped: boolean;
    attuned: boolean;
    notes?: string | null;
  }>;
  class_features?: Array<{
    level: number;
    name: string;
    description: string;
  }>;
  background_details?: {
    personality_traits?: string[];
    ideals?: string[];
    bonds?: string[];
    flaws?: string[];
    appearance?: string;
    characteristics?: {
      alignment?: string;
      gender?: string;
      eyes?: string;
      size?: string;
      height?: string;
      faith?: string;
      hair?: string;
      skin?: string;
      age?: string;
      weight?: string;
    };
  };
  extras?: {
    custom_actions?: Array<{
      name: string;
      type: 'action' | 'bonus-action' | 'reaction' | 'other';
      description: string;
      uses?: string;
    }>;
    custom_features?: Array<{
      name: string;
      description: string;
    }>;
    notes?: Record<string, string>;
  };
  money?: {
    cp: number;
    sp: number;
    ep: number;
    gp: number;
    pp: number;
  };
  created_at: string;
  updated_at: string;
}

// ============================================
// SPELLS HOOKS
// ============================================

export function useSpells(campaignId: string | null) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSpells() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch SRD spells
        const { data: srdSpells, error: srdError } = await supabase
          .from('srd_spells')
          .select('*')
          .order('level', { ascending: true })
          .order('name', { ascending: true });

        if (srdError) throw srdError;

        let homebrewSpells: HomebrewSpell[] = [];
        
        // Fetch homebrew spells if campaignId provided
        if (campaignId) {
          const { data, error: homebrewError } = await supabase
            .from('homebrew_spells')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('level', { ascending: true })
            .order('name', { ascending: true });

          if (homebrewError) throw homebrewError;
          homebrewSpells = data || [];
        }

        // Combine and mark source
        const combined: Spell[] = [
          ...(srdSpells || []).map(s => ({ ...s, source: 'srd' as const })),
          ...(homebrewSpells || []).map(s => ({ ...s, index: s.id, source: 'homebrew' as const }))
        ];

        setSpells(combined);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchSpells();
  }, [campaignId]);

  return { spells, loading, error };
}

export function useSpell(source: 'srd' | 'homebrew', indexOrId: string) {
  const [spell, setSpell] = useState<Spell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSpell() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        if (source === 'srd') {
          const { data, error: fetchError } = await supabase
            .from('srd_spells')
            .select('*')
            .eq('index', indexOrId)
            .single();

          if (fetchError) throw fetchError;
          setSpell(data ? { ...data, source: 'srd' } : null);
        } else {
          const { data, error: fetchError } = await supabase
            .from('homebrew_spells')
            .select('*')
            .eq('id', indexOrId)
            .single();

          if (fetchError) throw fetchError;
          setSpell(data ? { ...data, index: data.id, source: 'homebrew' } : null);
        }

        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchSpell();
  }, [source, indexOrId]);

  return { spell, loading, error };
}

// ============================================
// CLASSES HOOKS
// ============================================

export function useClasses(campaignId: string | null, sourceVersion: "2014" | "2024" | null = null) {
  const [classes, setClasses] = useState<DndClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchClasses() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Determine which SRD table to query based on source version
        const srdTable = sourceVersion === "2024" ? "srd2024_classes" : "srd_classes";
        
        const { data: srdClasses, error: srdError } = await supabase
          .from(srdTable)
          .select('*')
          .order('name', { ascending: true });

        if (srdError) throw srdError;

        let homebrewClasses: HomebrewClass[] = [];
        
        if (campaignId) {
          const { data, error: homebrewError } = await supabase
            .from('homebrew_classes')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('name', { ascending: true });

          if (homebrewError) throw homebrewError;
          homebrewClasses = data || [];
        }

        const combined: DndClass[] = [
          ...(srdClasses || []).map(c => ({ ...c, source: 'srd' as const })),
          ...(homebrewClasses || []).map(c => ({ ...c, index: c.id, source: 'homebrew' as const }))
        ];

        setClasses(combined);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [campaignId, sourceVersion]);

  return { classes, loading, error };
}

// ============================================
// RACES HOOKS
// ============================================

export function useRaces(campaignId: string | null, sourceVersion: "2014" | "2024" | null = null) {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRaces() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Determine which SRD table to query based on source version
        const srdTable = sourceVersion === "2024" ? "srd2024_races" : "srd_races";
        
        const { data: srdRaces, error: srdError } = await supabase
          .from(srdTable)
          .select('*')
          .order('name', { ascending: true });

        if (srdError) throw srdError;

        let homebrewRaces: HomebrewRace[] = [];
        
        if (campaignId) {
          const { data, error: homebrewError } = await supabase
            .from('homebrew_races')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('name', { ascending: true });

          if (homebrewError) throw homebrewError;
          homebrewRaces = data || [];
        }

        const combined: Race[] = [
          ...(srdRaces || []).map(r => ({ ...r, source: 'srd' as const })),
          ...(homebrewRaces || []).map(r => ({ ...r, index: r.id, source: 'homebrew' as const }))
        ];

        setRaces(combined);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchRaces();
  }, [campaignId, sourceVersion]);

  return { races, loading, error };
}

// ============================================
// SUBCLASSES HOOKS
// ============================================

export function useSubclasses(classIndex: string | null, classSource: 'srd' | 'homebrew' | null, campaignId: string | null, sourceVersion: "2014" | "2024" | null = null) {
  const [subclasses, setSubclasses] = useState<Subclass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchSubclasses() {
      if (!classIndex || !classSource) {
        setSubclasses([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();
        
        if (classSource === 'srd') {
          // Determine which SRD table to query based on source version
          const srdTable = sourceVersion === "2024" ? "srd2024_subclasses" : "srd_subclasses";
          
          const { data: srdSubclasses, error: srdError } = await supabase
            .from(srdTable)
            .select('*')
            .eq('class_index', classIndex)
            .order('name', { ascending: true });

          if (srdError) throw srdError;

          const combined: Subclass[] = (srdSubclasses || []).map(s => ({ ...s, source: 'srd' as const }));
          setSubclasses(combined);
        } else {
          // Homebrew subclasses
          if (!campaignId) {
            setSubclasses([]);
            setLoading(false);
            return;
          }

          const { data: homebrewSubclasses, error: homebrewError } = await supabase
            .from('homebrew_subclasses')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('class_index', classIndex)
            .order('name', { ascending: true });

          if (homebrewError) throw homebrewError;

          const combined: Subclass[] = (homebrewSubclasses || []).map(s => ({ ...s, index: s.id, source: 'homebrew' as const }));
          setSubclasses(combined);
        }

        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubclasses();
  }, [classIndex, classSource, campaignId, sourceVersion]);

  return { subclasses, loading, error };
}

// ============================================
// FEATURES HOOKS
// ============================================

export interface SrdFeature {
  id: string;
  index: string;
  name: string;
  level: number;
  class_index: string;
  subclass_index: string | null;
  description: string;
  feature_specific: any;
  created_at: string;
}

export function useClassFeatures(classIndex: string | null) {
  const [features, setFeatures] = useState<SrdFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFeatures() {
      if (!classIndex) {
        setFeatures([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch class features (excluding subclass-specific features)
        const { data, error: fetchError } = await supabase
          .from('srd_features')
          .select('*')
          .eq('class_index', classIndex)
          .is('subclass_index', null)
          .order('level', { ascending: true })
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;

        setFeatures(data || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatures();
  }, [classIndex]);

  return { features, loading, error };
}

export function useSubclassFeatures(classIndex: string | null, subclassIndex: string | null) {
  const [features, setFeatures] = useState<SrdFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchFeatures() {
      if (!classIndex || !subclassIndex) {
        setFeatures([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch subclass-specific features
        const { data, error: fetchError } = await supabase
          .from('srd_features')
          .select('*')
          .eq('class_index', classIndex)
          .eq('subclass_index', subclassIndex)
          .order('level', { ascending: true })
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;

        setFeatures(data || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatures();
  }, [classIndex, subclassIndex]);

  return { features, loading, error };
}

// ============================================
// MONSTERS HOOKS
// ============================================

export function useMonsters(campaignId: string | null) {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchMonsters() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        const { data: srdMonsters, error: srdError } = await supabase
          .from('srd_monsters')
          .select('*')
          .order('challenge_rating', { ascending: true })
          .order('name', { ascending: true });

        if (srdError) throw srdError;

        let homebrewMonsters: HomebrewMonster[] = [];
        
        if (campaignId) {
          const { data, error: homebrewError } = await supabase
            .from('homebrew_monsters')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('challenge_rating', { ascending: true })
            .order('name', { ascending: true });

          if (homebrewError) throw homebrewError;
          homebrewMonsters = data || [];
        }

        const combined: Monster[] = [
          ...(srdMonsters || []).map(m => ({ ...m, source: 'srd' as const })),
          ...(homebrewMonsters || []).map(m => ({ ...m, index: m.id, source: 'homebrew' as const }))
        ];

        setMonsters(combined);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchMonsters();
  }, [campaignId]);

  return { monsters, loading, error };
}

// ============================================
// EQUIPMENT HOOKS
// ============================================

export function useEquipment(campaignId: string | null) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchEquipment() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        const { data: srdEquipment, error: srdError } = await supabase
          .from('srd_equipment')
          .select('*')
          .order('equipment_category', { ascending: true })
          .order('name', { ascending: true });

        if (srdError) throw srdError;

        let homebrewEquipment: HomebrewEquipment[] = [];
        
        if (campaignId) {
          const { data, error: homebrewError } = await supabase
            .from('homebrew_equipment')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('equipment_category', { ascending: true })
            .order('name', { ascending: true });

          if (homebrewError) throw homebrewError;
          homebrewEquipment = data || [];
        }

        const combined: Equipment[] = [
          ...(srdEquipment || []).map(e => ({ ...e, source: 'srd' as const })),
          ...(homebrewEquipment || []).map(e => ({ ...e, index: e.id, source: 'homebrew' as const }))
        ];

        setEquipment(combined);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchEquipment();
  }, [campaignId]);

  return { equipment, loading, error };
}

export interface Background {
  id: string;
  index: string;
  name: string;
  description: string | null;
  skill_proficiencies: string | null;
  tool_proficiencies: string | null;
  languages: string | null;
  equipment: string | null;
  feature: string | null;
  ability_score_increase: string | null;
  created_at: string;
}

export function useBackgrounds(sourceVersion: "2014" | "2024" | null = null) {
  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchBackgrounds() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Determine which SRD table to query based on source version
        const srdTable = sourceVersion === "2024" ? "srd2024_backgrounds" : "srd_backgrounds";
        
        const { data, error: fetchError } = await supabase
          .from(srdTable)
          .select('*')
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;
        setBackgrounds(data || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchBackgrounds();
  }, [sourceVersion]);

  return { backgrounds, loading, error };
}

// ============================================
// CHARACTER HOOKS
// ============================================

export function useCharacter(characterId: string) {
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    async function fetchCharacter() {
      try {
        setLoading(true);
        
        const { data, error: fetchError } = await supabase
          .from('characters')
          .select('*')
          .eq('id', characterId)
          .single();

        if (fetchError) throw fetchError;
        setCharacter(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchCharacter();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`character-${characterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `id=eq.${characterId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCharacter(payload.new as Character);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [characterId]);

  const updateCharacter = async (updates: Partial<Character>) => {
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', characterId)
        .select()
        .single();

      if (updateError) throw updateError;
      setCharacter(data);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  };

  return { character, loading, error, updateCharacter };
}

export function useCampaignCharacters(campaignId: string) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCharacters = useCallback(async () => {
    const supabase = createClient();
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCharacters(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCharacters();
    
    const supabase = createClient();

    // Subscribe to real-time updates
    // Note: We listen to all character updates and filter by campaign_id in the handler
    // because Supabase real-time filters don't catch transitions (null -> campaignId)
    const channel = supabase
      .channel(`campaign-characters-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newChar = payload.new as Character;
            if (newChar.campaign_id === campaignId) {
              setCharacters(prev => [...prev, newChar]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedChar = payload.new as Character;
            if (updatedChar.campaign_id === campaignId) {
              // Character is in this campaign, add or update it
              setCharacters(prev => {
                const exists = prev.find(c => c.id === updatedChar.id);
                if (exists) {
                  return prev.map(c => c.id === updatedChar.id ? updatedChar : c);
                } else {
                  return [...prev, updatedChar];
                }
              });
            } else {
              // Character is no longer in this campaign, remove it
              setCharacters(prev => prev.filter(c => c.id !== updatedChar.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setCharacters(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchCharacters]);

  return { characters, loading, error, refetch: fetchCharacters };
}

export function useUserCharacters(userId: string | null) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    
    async function fetchCharacters() {
      try {
        setLoading(true);
        
        const { data, error: fetchError } = await supabase
          .from('characters')
          .select('*')
          .eq('user_id', userId)
          .order('name', { ascending: true });

        if (fetchError) throw fetchError;
        setCharacters(data || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchCharacters();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`user-characters-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCharacters(prev => [...prev, payload.new as Character]);
          } else if (payload.eventType === 'UPDATE') {
            setCharacters(prev =>
              prev.map(c => c.id === payload.new.id ? payload.new as Character : c)
            );
          } else if (payload.eventType === 'DELETE') {
            setCharacters(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { characters, loading, error };
}

export function useUnassignedCharacters(userId: string | null) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCharacters = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();
    try {
      setLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('characters')
        .select('*')
        .eq('user_id', userId)
        .is('campaign_id', null)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCharacters(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchCharacters();
    
    const supabase = createClient();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`unassigned-characters-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Only include characters with null campaign_id
          if (payload.eventType === 'INSERT') {
            const newChar = payload.new as Character;
            if (!newChar.campaign_id) {
              setCharacters(prev => [...prev, newChar]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedChar = payload.new as Character;
            if (!updatedChar.campaign_id) {
              setCharacters(prev =>
                prev.map(c => c.id === updatedChar.id ? updatedChar : c)
              );
            } else {
              // Character was assigned to a campaign, remove from list
              setCharacters(prev => prev.filter(c => c.id !== updatedChar.id));
            }
          } else if (payload.eventType === 'DELETE') {
            setCharacters(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchCharacters]);

  return { characters, loading, error, refetch: fetchCharacters };
}

// ============================================
// MUTATION HOOKS (for creating homebrew content)
// ============================================

export function useCreateHomebrewSpell() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSpell = async (spell: Omit<HomebrewSpell, 'id' | 'created_at'>) => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error: createError } = await supabase
        .from('homebrew_spells')
        .insert(spell)
        .select()
        .single();

      if (createError) throw createError;
      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createSpell, loading, error };
}

export function useCreateHomebrewMonster() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMonster = async (monster: Omit<HomebrewMonster, 'id' | 'created_at'>) => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error: createError } = await supabase
        .from('homebrew_monsters')
        .insert(monster)
        .select()
        .single();

      if (createError) throw createError;
      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createMonster, loading, error };
}

export function useCreateHomebrewEquipment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createEquipment = async (equipment: Omit<HomebrewEquipment, 'id' | 'created_at'>) => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error: createError } = await supabase
        .from('homebrew_equipment')
        .insert(equipment)
        .select()
        .single();

      if (createError) throw createError;
      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createEquipment, loading, error };
}

// ============================================
// CHARACTER CREATION HOOK
// ============================================

export function useCreateCharacter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCharacter = async (characterData: Omit<Character, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Create the character
      const { data, error: createError } = await supabase
        .from('characters')
        .insert(characterData)
        .select()
        .single();

      if (createError) throw createError;

      const characterId = data.id;
      const proficienciesToInsert: Array<{
        character_id: string;
        proficiency_source: 'srd' | 'homebrew';
        proficiency_index: string;
        source_type: 'race' | 'class' | 'background' | 'custom';
      }> = [];

      // Fetch race proficiencies
      if (characterData.race_source && characterData.race_index) {
        if (characterData.race_source === 'srd') {
          // Get proficiencies from SRD race
          const { data: raceProficiencies, error: raceProfError } = await supabase
            .from('srd_race_proficiencies_training')
            .select('proficiency_index')
            .eq('race_index', characterData.race_index);

          if (!raceProfError && raceProficiencies) {
            raceProficiencies.forEach(prof => {
              proficienciesToInsert.push({
                character_id: characterId,
                proficiency_source: 'srd',
                proficiency_index: prof.proficiency_index,
                source_type: 'race',
              });
            });
          }
        } else {
          // Get proficiencies from homebrew race
          const { data: raceProficiencies, error: raceProfError } = await supabase
            .from('homebrew_race_proficiencies_training')
            .select('proficiency_source, proficiency_index')
            .eq('race_id', characterData.race_index);

          if (!raceProfError && raceProficiencies) {
            raceProficiencies.forEach(prof => {
              proficienciesToInsert.push({
                character_id: characterId,
                proficiency_source: prof.proficiency_source as 'srd' | 'homebrew',
                proficiency_index: prof.proficiency_index,
                source_type: 'race',
              });
            });
          }
        }
      }

      // Fetch class proficiencies
      if (characterData.class_source && characterData.class_index) {
        if (characterData.class_source === 'srd') {
          // Get proficiencies from SRD class
          const { data: classProficiencies, error: classProfError } = await supabase
            .from('srd_class_proficiencies_training')
            .select('proficiency_index')
            .eq('class_index', characterData.class_index);

          if (!classProfError && classProficiencies) {
            classProficiencies.forEach(prof => {
              proficienciesToInsert.push({
                character_id: characterId,
                proficiency_source: 'srd',
                proficiency_index: prof.proficiency_index,
                source_type: 'class',
              });
            });
          }
        } else {
          // Get proficiencies from homebrew class
          const { data: classProficiencies, error: classProfError } = await supabase
            .from('homebrew_class_proficiencies_training')
            .select('proficiency_source, proficiency_index')
            .eq('class_id', characterData.class_index);

          if (!classProfError && classProficiencies) {
            classProficiencies.forEach(prof => {
              proficienciesToInsert.push({
                character_id: characterId,
                proficiency_source: prof.proficiency_source as 'srd' | 'homebrew',
                proficiency_index: prof.proficiency_index,
                source_type: 'class',
              });
            });
          }
        }
      }

      // Insert all proficiencies at once
      if (proficienciesToInsert.length > 0) {
        const { error: profError } = await supabase
          .from('character_proficiencies_training')
          .insert(proficienciesToInsert);

        if (profError) {
          console.error('Failed to attach proficiencies:', profError);
          // Don't throw - character was created successfully, proficiencies are optional
        }
      }

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createCharacter, loading, error };
}

// ============================================
// PROFICIENCIES & TRAINING HOOKS
// ============================================

export function useProficiencies(campaignId: string | null, type?: ProficiencyType) {
  const [proficiencies, setProficiencies] = useState<ProficiencyTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProficiencies() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        // Fetch SRD proficiencies
        let query = supabase
          .from('srd_proficiencies_training')
          .select('*')
          .order('type', { ascending: true })
          .order('name', { ascending: true });

        if (type) {
          query = query.eq('type', type);
        }

        const { data: srdProfs, error: srdError } = await query;

        if (srdError) throw srdError;

        let homebrewProfs: HomebrewProficiencyTraining[] = [];
        
        // Fetch homebrew proficiencies if campaignId provided
        if (campaignId) {
          let homebrewQuery = supabase
            .from('homebrew_proficiencies_training')
            .select('*')
            .eq('campaign_id', campaignId)
            .order('type', { ascending: true })
            .order('name', { ascending: true });

          if (type) {
            homebrewQuery = homebrewQuery.eq('type', type);
          }

          const { data, error: homebrewError } = await homebrewQuery;

          if (homebrewError) throw homebrewError;
          homebrewProfs = data || [];
        }

        // Combine and mark source
        const combined: ProficiencyTraining[] = [
          ...(srdProfs || []).map(p => ({ ...p, source: 'srd' as const })),
          ...(homebrewProfs || []).map(p => ({ ...p, source: 'homebrew' as const }))
        ];

        setProficiencies(combined);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchProficiencies();
  }, [campaignId, type]);

  return { proficiencies, loading, error };
}

export function useCharacterProficiencies(characterId: string) {
  const [proficiencies, setProficiencies] = useState<CharacterProficiency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCharacterProficiencies() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        const { data, error: fetchError } = await supabase
          .from('character_proficiencies_training')
          .select('*')
          .eq('character_id', characterId);

        if (fetchError) throw fetchError;
        setProficiencies(data || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchCharacterProficiencies();
  }, [characterId]);

  return { proficiencies, loading, error };
}

/**
 * Hook to fetch all classes for a character (multiclass support)
 */
export function useCharacterClasses(characterId: string) {
  const [characterClasses, setCharacterClasses] = useState<CharacterClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchCharacterClasses() {
      try {
        setLoading(true);
        const supabase = createClient();
        
        const { data, error: fetchError } = await supabase
          .from('character_classes')
          .select('*')
          .eq('character_id', characterId)
          .order('is_primary_class', { ascending: false })
          .order('level_acquired_at', { ascending: true });

        if (fetchError) throw fetchError;
        setCharacterClasses(data || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    if (characterId) {
      fetchCharacterClasses();
      
      // Subscribe to real-time updates
      const supabase = createClient();
      const channel = supabase
        .channel(`character-classes-${characterId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'character_classes',
            filter: `character_id=eq.${characterId}`
          },
          () => {
            fetchCharacterClasses();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [characterId]);

  return { characterClasses, loading, error };
}

/**
 * Hook to fetch features for a specific character class
 */
export function useCharacterClassFeatures(
  characterId: string,
  classSource: 'srd' | 'homebrew' | null,
  classIndex: string | null
) {
  const [features, setFeatures] = useState<CharacterClassFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchClassFeatures() {
      if (!characterId || !classSource || !classIndex) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();
        
        const { data, error: fetchError } = await supabase
          .from('character_class_features')
          .select('*')
          .eq('character_id', characterId)
          .eq('class_source', classSource)
          .eq('class_index', classIndex)
          .order('class_level', { ascending: true });

        if (fetchError) throw fetchError;
        setFeatures(data || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchClassFeatures();
  }, [characterId, classSource, classIndex]);

  return { features, loading, error };
}