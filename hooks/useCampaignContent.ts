import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Map {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string | null;
  grid_size: number;
  grid_type: 'square' | 'hex';
  width: number | null;
  height: number | null;
  created_at: string | null;
}

export interface NPC {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  appearance: string | null;
  personality: string | null;
  background: string | null;
  location: string | null;
  notes: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface Encounter {
  id: string;
  campaign_id: string;
  map_id: string | null;
  name: string | null;
  active: boolean;
  round_number: number;
  current_turn_index: number;
  created_at: string | null;
}

export interface Quest {
  id: string;
  campaign_id: string;
  title: string;
  content: string;
  source: string | null;
  location: string | null;
  verified: boolean;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

// ============================================
// MAPS HOOKS
// ============================================

export function useCampaignMaps(campaignId: string | null) {
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMaps = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('maps')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMaps(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  return { maps, loading, error, refetch: fetchMaps };
}

export function useCreateMap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMap = async (mapData: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    grid_size?: number;
    grid_type?: 'square' | 'hex';
    width?: number | null;
    height?: number | null;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('maps')
        .insert({
          ...mapData,
          grid_size: mapData.grid_size ?? 5,
          grid_type: mapData.grid_type ?? 'square',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createMap, loading, error };
}

export function useUpdateMap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateMap = async (
    mapId: string,
    updates: {
      name?: string;
      image_url?: string | null;
      grid_size?: number;
      grid_type?: 'square' | 'hex';
      width?: number | null;
      height?: number | null;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('maps')
        .update(updates)
        .eq('id', mapId)
        .select()
        .single();

      if (updateError) throw updateError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { updateMap, loading, error };
}

export function useDeleteMap() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteMap = async (mapId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('maps')
        .delete()
        .eq('id', mapId);

      if (deleteError) throw deleteError;

      setError(null);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { deleteMap, loading, error };
}

// ============================================
// NPCs HOOKS
// ============================================

export function useCampaignNPCs(campaignId: string | null) {
  const [npcs, setNPCs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNPCs = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('npcs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNPCs(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchNPCs();
  }, [fetchNPCs]);

  return { npcs, loading, error, refetch: fetchNPCs };
}

export function useCreateNPC() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createNPC = async (npcData: {
    campaign_id: string;
    name: string;
    description?: string | null;
    appearance?: string | null;
    personality?: string | null;
    background?: string | null;
    location?: string | null;
    notes?: string | null;
    created_by: string;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('npcs')
        .insert(npcData)
        .select()
        .single();

      if (insertError) throw insertError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createNPC, loading, error };
}

export function useUpdateNPC() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateNPC = async (
    npcId: string,
    updates: {
      name?: string;
      description?: string | null;
      appearance?: string | null;
      personality?: string | null;
      background?: string | null;
      location?: string | null;
      notes?: string | null;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('npcs')
        .update(updates)
        .eq('id', npcId)
        .select()
        .single();

      if (updateError) throw updateError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { updateNPC, loading, error };
}

export function useDeleteNPC() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteNPC = async (npcId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('npcs')
        .delete()
        .eq('id', npcId);

      if (deleteError) throw deleteError;

      setError(null);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { deleteNPC, loading, error };
}

// ============================================
// ENCOUNTERS HOOKS
// ============================================

export function useCampaignEncounters(campaignId: string | null) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEncounters = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('combat_encounters')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEncounters(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  return { encounters, loading, error, refetch: fetchEncounters };
}

export function useCreateEncounter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createEncounter = async (encounterData: {
    campaign_id: string;
    name?: string | null;
    map_id?: string | null;
    active?: boolean;
    round_number?: number;
    current_turn_index?: number;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('combat_encounters')
        .insert({
          ...encounterData,
          active: encounterData.active ?? false,
          round_number: encounterData.round_number ?? 1,
          current_turn_index: encounterData.current_turn_index ?? 0,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createEncounter, loading, error };
}

export function useUpdateEncounter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateEncounter = async (
    encounterId: string,
    updates: {
      name?: string | null;
      map_id?: string | null;
      active?: boolean;
      round_number?: number;
      current_turn_index?: number;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('combat_encounters')
        .update(updates)
        .eq('id', encounterId)
        .select()
        .single();

      if (updateError) throw updateError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { updateEncounter, loading, error };
}

export function useDeleteEncounter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteEncounter = async (encounterId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('combat_encounters')
        .delete()
        .eq('id', encounterId);

      if (deleteError) throw deleteError;

      setError(null);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { deleteEncounter, loading, error };
}

// ============================================
// QUESTS HOOKS
// ============================================

export function useCampaignQuests(campaignId: string | null) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuests = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('quests')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setQuests(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  return { quests, loading, error, refetch: fetchQuests };
}

export function useCreateQuest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createQuest = async (questData: {
    campaign_id: string;
    title: string;
    content: string;
    source?: string | null;
    location?: string | null;
    verified?: boolean;
    created_by: string;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('quests')
        .insert({
          ...questData,
          verified: questData.verified ?? false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createQuest, loading, error };
}

export function useUpdateQuest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateQuest = async (
    questId: string,
    updates: {
      title?: string;
      content?: string;
      source?: string | null;
      location?: string | null;
      verified?: boolean;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('quests')
        .update(updates)
        .eq('id', questId)
        .select()
        .single();

      if (updateError) throw updateError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { updateQuest, loading, error };
}

export function useDeleteQuest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteQuest = async (questId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('quests')
        .delete()
        .eq('id', questId);

      if (deleteError) throw deleteError;

      setError(null);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { deleteQuest, loading, error };
}

