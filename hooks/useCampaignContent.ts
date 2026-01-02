import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MediaItem {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string | null;
  type: 'map' | 'token' | 'prop' | null;
  created_at: string | null;
}

// Legacy alias for backward compatibility during migration
export type Map = MediaItem;

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
  image_url: string | null;
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
// MEDIA ITEMS HOOKS
// ============================================

export function useCampaignMediaItems(
  campaignId: string | null,
  type?: 'map' | 'token' | 'prop' | null
) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItems = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from('media_items')
        .select('*')
        .eq('campaign_id', campaignId);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setItems(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}

// Legacy hook for backward compatibility
export function useCampaignMaps(campaignId: string | null) {
  const { items, loading, error, refetch } = useCampaignMediaItems(campaignId, 'map');
  return { maps: items, loading, error, refetch };
}

export function useCreateMediaItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMediaItem = async (itemData: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    type?: 'map' | 'token' | 'prop' | null;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('media_items')
        .insert(itemData)
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

  return { createMediaItem, loading, error };
}

// Legacy hook for backward compatibility
export function useCreateMap() {
  const { createMediaItem, loading, error } = useCreateMediaItem();
  const createMap = async (mapData: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    grid_size?: number;
    grid_type?: 'square' | 'hex';
    width?: number | null;
    height?: number | null;
  }) => {
    return createMediaItem({
      campaign_id: mapData.campaign_id,
      name: mapData.name,
      image_url: mapData.image_url,
      type: 'map',
    });
  };
  return { createMap, loading, error };
}

export function useUpdateMediaItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateMediaItem = async (
    itemId: string,
    updates: {
      name?: string;
      image_url?: string | null;
      type?: 'map' | 'token' | 'prop' | null;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('media_items')
        .update(updates)
        .eq('id', itemId)
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

  return { updateMediaItem, loading, error };
}

// Legacy hook for backward compatibility
export function useUpdateMap() {
  const { updateMediaItem, loading, error } = useUpdateMediaItem();
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
    return updateMediaItem(mapId, {
      name: updates.name,
      image_url: updates.image_url,
    });
  };
  return { updateMap, loading, error };
}

export function useDeleteMediaItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteMediaItem = async (itemId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('media_items')
        .delete()
        .eq('id', itemId);

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

  return { deleteMediaItem, loading, error };
}

// Legacy hook for backward compatibility
export function useDeleteMap() {
  const { deleteMediaItem, loading, error } = useDeleteMediaItem();
  return { deleteMap: deleteMediaItem, loading, error };
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
    image_url?: string | null;
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
      image_url?: string | null;
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

