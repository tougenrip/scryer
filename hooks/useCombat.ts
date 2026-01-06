import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface CombatEncounter {
  id: string;
  campaign_id: string;
  map_id: string | null;
  name: string | null;
  active: boolean;
  round_number: number;
  current_turn_index: number;
  created_at: string;
}

export interface CombatParticipant {
  id: string;
  encounter_id: string;
  token_id: string;
  initiative_roll: number;
  turn_order: number;
  conditions: string[];
  notes: string | null;
  token?: TokenData;
}

export interface TokenData {
  id: string;
  name: string | null;
  character_id: string | null;
  monster_source: string | null;
  monster_index: string | null;
  hp_current: number;
  hp_max: number;
  character?: {
    name: string;
    image_url: string | null;
  };
}

export function useCombat(campaignId: string, mapId?: string) {
  const [activeEncounter, setActiveEncounter] = useState<CombatEncounter | null>(null);
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  // Fetch the active encounter for the campaign (and optionally map)
  const fetchEncounter = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('combat_encounters')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('active', true);

      if (mapId) {
        query = query.eq('map_id', mapId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      setActiveEncounter(data);
      
      if (data) {
        await fetchParticipants(data.id);
      } else {
        setParticipants([]);
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, mapId]);

  // Fetch participants for an encounter
  const fetchParticipants = async (encounterId: string) => {
    try {
      const { data, error } = await supabase
        .from('combat_participants')
        .select(`
          *,
          token:tokens (
            id,
            name,
            character_id,
            monster_source,
            monster_index,
            hp_current,
            hp_max,
            character:characters (
              name,
              image_url
            )
          )
        `)
        .eq('encounter_id', encounterId)
        .order('turn_order', { ascending: true });

      if (error) throw error;
      
      // Transform data to match interface if needed
      // Supabase returns nested objects, which matches our TokenData structure roughly
      setParticipants(data as unknown as CombatParticipant[]);
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError(err as Error);
    }
  };

  // Start a new encounter
  const startEncounter = async (name: string, mapId: string) => {
    try {
      // First, deactivate any existing active encounters for this map
      await supabase
        .from('combat_encounters')
        .update({ active: false })
        .eq('campaign_id', campaignId)
        .eq('map_id', mapId);

      const { data, error } = await supabase
        .from('combat_encounters')
        .insert({
          campaign_id: campaignId,
          map_id: mapId,
          name,
          active: true,
          round_number: 1,
          current_turn_index: 0
        })
        .select()
        .single();

      if (error) throw error;
      setActiveEncounter(data);
      setParticipants([]);
      return data;
    } catch (err) {
      setError(err as Error);
      return null;
    }
  };

  // End the current encounter
  const endEncounter = async () => {
    if (!activeEncounter) return;
    try {
      const { error } = await supabase
        .from('combat_encounters')
        .update({ active: false })
        .eq('id', activeEncounter.id);

      if (error) throw error;
      setActiveEncounter(null);
      setParticipants([]);
    } catch (err) {
      setError(err as Error);
    }
  };

  // Add a participant (token) to the encounter
  const addParticipant = async (tokenId: string, initiative: number) => {
    if (!activeEncounter) return;
    try {
      // Calculate turn order (simple sort for now, can be reordered later)
      // For now, just append or sort by initiative
      const newParticipant = {
        encounter_id: activeEncounter.id,
        token_id: tokenId,
        initiative_roll: initiative,
        turn_order: 0, // Should be calculated
      };

      const { error } = await supabase
        .from('combat_participants')
        .insert(newParticipant);

      if (error) throw error;
      // Realtime subscription will update the list
    } catch (err) {
      setError(err as Error);
    }
  };

  // Update participant (e.g. hp, initiative)
  const updateParticipant = async (id: string, updates: Partial<CombatParticipant>) => {
    try {
      const { error } = await supabase
        .from('combat_participants')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      setError(err as Error);
    }
  };

  // Remove participant
  const removeParticipant = async (id: string) => {
    try {
      const { error } = await supabase
        .from('combat_participants')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      setError(err as Error);
    }
  };

  // Update token (e.g. HP)
  const updateToken = async (id: string, updates: Partial<TokenData>) => {
    try {
      const { error } = await supabase
        .from('tokens')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      setError(err as Error);
    }
  };

  // Next turn logic
  const nextTurn = async () => {
    if (!activeEncounter || participants.length === 0) return;

    let nextIndex = activeEncounter.current_turn_index + 1;
    let nextRound = activeEncounter.round_number;

    if (nextIndex >= participants.length) {
      nextIndex = 0;
      nextRound++;
    }

    try {
      const { data, error } = await supabase
        .from('combat_encounters')
        .update({
          current_turn_index: nextIndex,
          round_number: nextRound
        })
        .eq('id', activeEncounter.id)
        .select()
        .single();

      if (error) throw error;
      setActiveEncounter(data);
    } catch (err) {
      setError(err as Error);
    }
  };

  // Previous turn logic
  const prevTurn = async () => {
    if (!activeEncounter || participants.length === 0) return;

    let prevIndex = activeEncounter.current_turn_index - 1;
    let prevRound = activeEncounter.round_number;

    if (prevIndex < 0) {
      prevIndex = participants.length - 1;
      prevRound = Math.max(1, prevRound - 1);
    }

    try {
      const { data, error } = await supabase
        .from('combat_encounters')
        .update({
          current_turn_index: prevIndex,
          round_number: prevRound
        })
        .eq('id', activeEncounter.id)
        .select()
        .single();

      if (error) throw error;
      setActiveEncounter(data);
    } catch (err) {
      setError(err as Error);
    }
  };

  // Subscribe to changes
  useEffect(() => {
    fetchEncounter();

    const channel = supabase.channel(`combat-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'combat_encounters',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
             // If we are looking for specific map, filter
             const newEncounter = payload.new as CombatEncounter;
             if (newEncounter.active && (!mapId || newEncounter.map_id === mapId)) {
               setActiveEncounter(newEncounter);
               // If it's a new encounter or ID changed, fetch participants
               if (!activeEncounter || activeEncounter.id !== newEncounter.id) {
                 fetchParticipants(newEncounter.id);
               }
             } else if (!newEncounter.active && activeEncounter && activeEncounter.id === newEncounter.id) {
               setActiveEncounter(null);
               setParticipants([]);
             }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'combat_participants',
        },
        async (payload) => {
          // If we have an active encounter, check if this participant belongs to it
          if (activeEncounter) {
            const participant = (payload.new || payload.old) as CombatParticipant;
            if (participant.encounter_id === activeEncounter.id) {
              await fetchParticipants(activeEncounter.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, mapId, fetchEncounter]); // Added fetchEncounter to dependencies, need to be careful with infinite loops.
  // Note: activeEncounter in dependency might cause issues if not handled carefully in effect. 
  // actually fetchEncounter updates state, so it shouldn't be in dependency of the effect that calls it if it causes loop, 
  // but here fetchEncounter is memoized on [campaignId, mapId].

  return {
    activeEncounter,
    participants,
    loading,
    error,
    startEncounter,
    endEncounter,
    addParticipant,
    updateParticipant,
    removeParticipant,
    updateToken,
    nextTurn,
    prevTurn
  };
}
