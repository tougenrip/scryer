import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { uniqueChannelTopic } from '@/lib/supabase/realtime-topic';
import {
  notifyVttCombatChanged,
  VTT_COMBAT_CHANGED_EVENT,
  type VttCombatChangedDetail,
} from '@/lib/vtt/combat-events';

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
  image_url: string | null;
  character_id: string | null;
  monster_source: string | null;
  monster_index: string | null;
  hp_current: number;
  hp_max: number;
  character?: {
    id?: string;
    name: string;
    image_url: string | null;
    user_id: string | null;
    hp_current?: number;
    hp_max?: number;
    death_save_successes?: number;
    death_save_failures?: number;
    is_stable?: boolean;
    is_concentrating?: boolean;
    concentrating_on?: string | null;
  };
  monster?: {
    index: string;
    name: string;
    armor_class: number | null;
    hit_points: number | null;
    hit_dice: string | null;
    speed: unknown;
    damage_resistances: string[] | null;
    damage_immunities: string[] | null;
    damage_vulnerabilities: string[] | null;
    condition_immunities: string[] | null;
    senses: unknown;
    type: string | null;
    subtype: string | null;
    challenge_rating: number | null;
  } | null;
}

function toCombatError(err: unknown, fallback: string) {
  if (err instanceof Error) return err;

  if (err && typeof err === "object") {
    const supabaseError = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };
    const parts = [
      supabaseError.message,
      supabaseError.details,
      supabaseError.hint,
      supabaseError.code ? `Code: ${supabaseError.code}` : null,
    ].filter(Boolean);

    return new Error(parts.join(" | ") || fallback);
  }

  return new Error(typeof err === "string" ? err : fallback);
}

export function useCombat(campaignId: string, mapId?: string, enabled: boolean = true) {
  const [activeEncounter, setActiveEncounter] = useState<CombatEncounter | null>(null);
  const [participants, setParticipants] = useState<CombatParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const activeEncounterRef = useRef<CombatEncounter | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    activeEncounterRef.current = activeEncounter;
  }, [activeEncounter]);

  // Fetch participants for an encounter
  const fetchParticipants = useCallback(async (encounterId: string) => {
    try {
      const { data, error } = await supabase
        .from('combat_participants')
        .select(`
          id,
          encounter_id,
          token_id,
          initiative_roll,
          turn_order,
          conditions,
          notes,
          token:tokens (
            id,
            name,
            image_url,
            character_id,
            monster_source,
            monster_index,
            hp_current,
            hp_max,
            character:characters (
              id,
              name,
              image_url,
              user_id,
              hp_current,
              hp_max,
              death_save_successes,
              death_save_failures,
              is_stable,
              is_concentrating,
              concentrating_on
            )
          )
        `)
        .eq('encounter_id', encounterId)
        .order('turn_order', { ascending: true });

      if (error) throw error;

      const combatParticipants = (data ?? []) as unknown as CombatParticipant[];

      if (!mapId) {
        setParticipants(combatParticipants);
        return;
      }

      const params = new URLSearchParams({ campaignId, mapId });
      const response = await fetch(`/api/vtt/tokens?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as {
        tokens?: TokenData[];
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Could not load combat token details.");
      }

      const tokensById = new Map((payload?.tokens ?? []).map((token) => [token.id, token]));
      setParticipants(
        combatParticipants.map((participant) => ({
          ...participant,
          token: tokensById.get(participant.token_id) ?? participant.token,
        }))
      );
    } catch (err) {
      const normalized = toCombatError(err, "Error fetching participants.");
      console.error('Error fetching participants:', normalized.message);
      setError(normalized);
    }
  }, [campaignId, mapId, supabase]);

  useEffect(() => {
    if (!enabled) return;

    const handleTokensChanged = (event: Event) => {
      const detail = (event as CustomEvent<{
        mapId?: string | null;
        tokenId?: string;
        deleted?: boolean;
      }>).detail;

      if (mapId && detail?.mapId && detail.mapId !== mapId) return;

      const currentEncounter = activeEncounterRef.current;
      if (!currentEncounter) return;

      if (detail?.deleted && detail.tokenId) {
        setParticipants((prev) => prev.filter((participant) => participant.token_id !== detail.tokenId));
      }

      void fetchParticipants(currentEncounter.id);
    };

    window.addEventListener('vtt:tokens-changed', handleTokensChanged);
    return () => window.removeEventListener('vtt:tokens-changed', handleTokensChanged);
  }, [enabled, fetchParticipants, mapId]);

  // Fetch the active encounter for the campaign (and optionally map)
  const fetchEncounter = useCallback(async () => {
    try {
      setLoading(true);
      if (!enabled) {
        setActiveEncounter(null);
        setParticipants([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('combat_encounters')
        .select('id, campaign_id, map_id, name, active, round_number, current_turn_index, created_at')
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
      setError(toCombatError(err, "Error fetching encounter."));
    } finally {
      setLoading(false);
    }
  }, [campaignId, enabled, fetchParticipants, mapId, supabase]);

  useEffect(() => {
    if (!enabled) return;

    const handleCombatChanged = (event: Event) => {
      const detail = (event as CustomEvent<VttCombatChangedDetail>).detail;
      if (detail?.campaignId !== campaignId) return;
      if (mapId && detail.mapId && detail.mapId !== mapId) return;

      if (detail.active === false && activeEncounterRef.current?.id === detail.encounterId) {
        setActiveEncounter(null);
        activeEncounterRef.current = null;
        setParticipants([]);
        setLoading(false);
        return;
      }

      void fetchEncounter();
    };

    window.addEventListener(VTT_COMBAT_CHANGED_EVENT, handleCombatChanged);
    return () => window.removeEventListener(VTT_COMBAT_CHANGED_EVENT, handleCombatChanged);
  }, [campaignId, enabled, fetchEncounter, mapId]);

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
      notifyVttCombatChanged({
        campaignId,
        mapId,
        encounterId: data.id,
        active: true,
      });
      return data;
    } catch (err) {
      const normalized = toCombatError(err, "Failed to start combat.");
      setError(normalized);
      throw normalized;
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
      const endedEncounter = activeEncounter;
      setActiveEncounter(null);
      setParticipants([]);
      notifyVttCombatChanged({
        campaignId,
        mapId: endedEncounter.map_id,
        encounterId: endedEncounter.id,
        active: false,
      });
    } catch (err) {
      const normalized = toCombatError(err, "Failed to end combat.");
      setError(normalized);
      throw normalized;
    }
  };

  // Add a participant (token) to the encounter
  const addParticipant = async (tokenId: string, initiative: number) => {
    if (!activeEncounter) return;
    try {
      const { data: maxRow } = await supabase
        .from('combat_participants')
        .select('turn_order')
        .eq('encounter_id', activeEncounter.id)
        .order('turn_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxRow?.turn_order ?? -1) + 1;

      const newParticipant = {
        encounter_id: activeEncounter.id,
        token_id: tokenId,
        initiative_roll: initiative,
        turn_order: nextOrder,
      };

      const { error } = await supabase
        .from('combat_participants')
        .insert(newParticipant);

      if (error) throw error;
      await fetchParticipants(activeEncounter.id);
    } catch (err) {
      const normalized = toCombatError(err, "Failed to add token to combat.");
      setError(normalized);
      throw normalized;
    }
  };

  // Add multiple participants
  const addParticipants = async (encounterId: string, newParticipants: {token_id: string, initiative_roll: number}[]) => {
    try {
      const { data: maxRow } = await supabase
        .from('combat_participants')
        .select('turn_order')
        .eq('encounter_id', encounterId)
        .order('turn_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (maxRow?.turn_order ?? -1) + 1;

      // Sort by initiative descending
      const sorted = [...newParticipants].sort((a, b) => b.initiative_roll - a.initiative_roll);
      
      const rows = sorted.map((p, index) => ({
        encounter_id: encounterId,
        token_id: p.token_id,
        initiative_roll: p.initiative_roll,
        turn_order: nextOrder + index,
      }));

      const { error } = await supabase
        .from('combat_participants')
        .insert(rows);

      if (error) throw error;
      await fetchParticipants(encounterId);
    } catch (err) {
      const normalized = toCombatError(err, "Failed to add tokens to combat.");
      setError(normalized);
      throw normalized;
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
      if (activeEncounter) {
        await fetchParticipants(activeEncounter.id);
      }
    } catch (err) {
      setError(toCombatError(err, "Failed to update participant."));
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
      if (activeEncounter) {
        await fetchParticipants(activeEncounter.id);
      }
    } catch (err) {
      setError(toCombatError(err, "Failed to remove participant."));
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
      if (activeEncounter) {
        await fetchParticipants(activeEncounter.id);
      }
    } catch (err) {
      setError(toCombatError(err, "Failed to update token."));
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

    // Tick condition durations on the token whose turn just ENDED.
    // Decrement each tracked duration by 1; remove the condition when it
    // reaches 0. Untracked conditions stay indefinite.
    const ending = participants[activeEncounter.current_turn_index];
    if (ending?.token_id) {
      try {
        const { data: tokenRow } = await supabase
          .from('tokens')
          .select('conditions, condition_durations')
          .eq('id', ending.token_id)
          .single();
        if (tokenRow) {
          const durations = (tokenRow.condition_durations ?? {}) as Record<string, number>;
          const conds: string[] = Array.isArray(tokenRow.conditions)
            ? tokenRow.conditions
            : [];
          if (Object.keys(durations).length > 0) {
            const nextDurations: Record<string, number> = {};
            const expired = new Set<string>();
            for (const [name, rounds] of Object.entries(durations)) {
              const next = (rounds ?? 0) - 1;
              if (next <= 0) expired.add(name);
              else nextDurations[name] = next;
            }
            const nextConds = conds.filter((c) => !expired.has(c));
            await supabase
              .from('tokens')
              .update({
                conditions: nextConds,
                condition_durations: nextDurations,
              })
              .eq('id', ending.token_id);
          }
        }
      } catch (tickErr) {
        // Don't block the turn advance if duration ticking fails.
        console.error('Condition duration tick failed:', tickErr);
      }
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
      setError(toCombatError(err, "Failed to advance turn."));
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
      setError(toCombatError(err, "Failed to go to previous turn."));
    }
  };

  // Subscribe to changes. Keep this independent from activeEncounter so the
  // realtime channel does not get recreated on every combat state update.
  useEffect(() => {
    if (!enabled) {
      setActiveEncounter(null);
      setParticipants([]);
      setLoading(false);
      return;
    }

    fetchEncounter();

    const channel = supabase.channel(uniqueChannelTopic(`combat-${campaignId}`))
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
               const previousEncounter = activeEncounterRef.current;
               setActiveEncounter(newEncounter);
               activeEncounterRef.current = newEncounter;
               // If it's a new encounter or ID changed, fetch participants
               if (!previousEncounter || previousEncounter.id !== newEncounter.id) {
                 fetchParticipants(newEncounter.id);
               }
             } else if (!newEncounter.active && activeEncounterRef.current?.id === newEncounter.id) {
               setActiveEncounter(null);
               activeEncounterRef.current = null;
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
          const currentEncounter = activeEncounterRef.current;
          if (currentEncounter) {
            const participant = (payload.new || payload.old) as CombatParticipant;
            if (participant.encounter_id === currentEncounter.id) {
              await fetchParticipants(currentEncounter.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tokens',
          ...(mapId ? { filter: `map_id=eq.${mapId}` } : {}),
        },
        async () => {
          const currentEncounter = activeEncounterRef.current;
          if (currentEncounter) {
            await fetchParticipants(currentEncounter.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, enabled, fetchEncounter, fetchParticipants, mapId, supabase]);

  return {
    activeEncounter,
    participants,
    loading,
    error,
    startEncounter,
    endEncounter,
    addParticipant,
    addParticipants,
    updateParticipant,
    removeParticipant,
    updateToken,
    nextTurn,
    prevTurn
  };
}
