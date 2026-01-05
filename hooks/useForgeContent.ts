import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface WorldLocation {
  id: string;
  campaign_id: string;
  parent_location_id: string | null;
  name: string;
  type: 
    | 'world' | 'continent' | 'region' | 'kingdom' | 'city' | 'village' | 'settlement' | 'poi' // Political/Legacy
    | 'dungeon' | 'landmark' | 'structure' | 'lair' // Adventure/Tactical
    | 'biome' | 'island' | 'archipelago'; // Geographical/Natural
  description: string | null;
  image_url: string | null;
  x_coordinate: number | null;
  y_coordinate: number | null;
  map_level: number;
  marker_color: string | null;
  status: string | null; // Location status (syncs with marker if linked)
  metadata: Record<string, any>; // Stores: ruler_owner_id, population, demographics, faction_ids
  created_at: string | null;
  updated_at: string | null;
}

export interface LocationRelationship {
  id: string;
  campaign_id: string;
  location_a_id: string;
  location_b_id: string;
  relationship_type: 'alliance' | 'rivalry' | 'trading_partner' | 'vassal' | 'neutral' | 'war' | 'trade_route' | null;
  affection_score: number;
  control_status: 'independent' | 'controlled_by' | 'occupied' | 'vassal' | 'allied' | null;
  controlling_location_id: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface LocationMarker {
  id: string;
  campaign_id: string;
  location_id: string | null;
  map_id: string | null;
  x: number;
  y: number;
  icon_type: 'city' | 'village' | 'fort' | 'tavern' | 'shop' | 'temple' | 'dungeon' | 'cave' | 'landmark' | 'port' | 'border' | null;
  status_icon: string | null; // Can be predefined or custom text
  name: string | null;
  description: string | null;
  color: string;
  size: 'small' | 'medium' | 'large';
  visible: boolean;
  created_at: string | null;
}

export interface PantheonDeity {
  id: string;
  campaign_id: string;
  name: string;
  title: string | null;
  domain: string[];
  alignment: 'LG' | 'NG' | 'CG' | 'LN' | 'N' | 'CN' | 'LE' | 'NE' | 'CE' | null;
  symbol: string | null; // Now stores symbol image URL
  image_url: string | null; // Deity portrait/avatar image
  description: string | null;
  worshipers_location_ids: string[];
  holy_days: string[];
  created_at: string | null;
  updated_at: string | null;
}

export interface CampaignTimeline {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  session_type: 'prologue' | 'session' | 'milestone' | 'downtime' | 'event' | null;
  planned_date: string | null;
  actual_date: string | null;
  order_index: number;
  status: 'not_started' | 'ongoing' | 'finished' | 'abandoned';
  parent_entry_id: string | null; // For branching - references another timeline entry
  branch_path_index: number; // Order within a branch (0 = main path)
  associated_location_ids: string[];
  associated_quest_ids: string[];
  notes: string | null;
  image_url: string | null; // Background image for the timeline entry card
  created_at: string | null;
  updated_at: string | null;
}

export interface CampaignCalendar {
  id: string;
  campaign_id: string;
  current_year: number;
  current_month: number;
  current_day: number;
  day_of_week: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter' | null;
  moon_phase: 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent' | null;
  moon_phase_day: number | null;
  weather: Record<string, any>;
  custom_month_names: string[];
  custom_weekday_names: string[];
  custom_season_months: Record<'spring' | 'summer' | 'autumn' | 'winter', number[]> | null;
  time_speed_multiplier: number;
  updated_at: string | null;
}

export interface CalendarEvent {
  id: string;
  campaign_id: string;
  title: string;
  description: string | null;
  event_year: number;
  event_month: number;
  event_day: number;
  is_repeatable: boolean;
  repeat_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  repeat_interval: number;
  repeat_end_year: number | null;
  repeat_end_month: number | null;
  repeat_end_day: number | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

export interface Faction {
  id: string;
  campaign_id: string;
  name: string;
  type: 'kingdom' | 'guild' | 'organization' | 'tribe' | 'cult' | 'company' | 'church' | 'family' | 'religious' | 'criminal' | 'arcane' | 'political' | 'military' | 'secret_society' | 'academy' | 'military_unit' | 'other' | null;
  description: string | null;
  headquarters_location_id: string | null;
  leader_name: string | null;
  leader_npc_id: string | null;
  alignment: 'LG' | 'NG' | 'CG' | 'LN' | 'N' | 'CN' | 'LE' | 'NE' | 'CE' | null;
  goals: string[];
  resources: string[];
  influence_level: 'local' | 'regional' | 'continental' | 'global' | 'multiverse' | null;
  emblem_sigil_url: string | null;
  motto_creed: string | null;
  public_agenda: string | null;
  secret_agenda: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FactionRelationship {
  id: string;
  campaign_id: string;
  faction_a_id: string;
  faction_b_id: string;
  relationship_type: 'alliance' | 'neutral' | 'rivalry' | 'war' | 'vassal' | 'trade_partner' | 'enemy' | 'friendly' | null;
  strength: number;
  public: boolean;
  secret_notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RelationshipStrengthOverride {
  id: string;
  campaign_id: string;
  relationship_key: string;
  source_type: 'faction' | 'location' | 'pantheon' | 'npc';
  source_id: string;
  target_type: 'faction' | 'location' | 'pantheon' | 'npc';
  target_id: string;
  strength: number;
  created_at: string | null;
  updated_at: string | null;
}

// ============================================
// WORLD LOCATIONS HOOKS
// ============================================

export function useWorldLocations(campaignId: string | null) {
  const [locations, setLocations] = useState<WorldLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLocations = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('world_locations')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setLocations(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return { locations, loading, error, refetch: fetchLocations };
}

export function useCreateWorldLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createLocation = async (locationData: {
    campaign_id: string;
    parent_location_id?: string | null;
    name: string;
    type: WorldLocation['type'];
    description?: string | null;
    image_url?: string | null;
    x_coordinate?: number | null;
    y_coordinate?: number | null;
    map_level?: number;
    marker_color?: string | null;
    metadata?: Record<string, any>;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('world_locations')
        .insert({
          ...locationData,
          metadata: locationData.metadata || {},
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setError(null);
      return { success: true, data };
    } catch (err: any) {
      // Preserve the original error structure (Supabase errors are PostgREST errors)
      const error = err instanceof Error ? err : new Error(err?.message || JSON.stringify(err));
      setError(error);
      return { success: false, error: err }; // Return original error to preserve structure
    } finally {
      setLoading(false);
    }
  };

  return { createLocation, loading, error };
}

export function useUpdateWorldLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateLocation = async (
    locationId: string,
    updates: Partial<Omit<WorldLocation, 'id' | 'campaign_id' | 'created_at'>>
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const updateData: any = { ...updates };
      // Remove undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const { data, error: updateError } = await supabase
        .from('world_locations')
        .update(updateData)
        .eq('id', locationId)
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

  return { updateLocation, loading, error };
}

export function useDeleteWorldLocation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteLocation = async (locationId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('world_locations')
        .delete()
        .eq('id', locationId);

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

  return { deleteLocation, loading, error };
}

// ============================================
// LOCATION MARKERS HOOKS
// ============================================

export function useLocationMarkers(campaignId: string | null, mapId?: string | null) {
  const [markers, setMarkers] = useState<LocationMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMarkers = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      let query = supabase
        .from('location_markers')
        .select('*')
        .eq('campaign_id', campaignId);

      if (mapId !== undefined) {
        if (mapId === null) {
          query = query.is('map_id', null);
        } else {
          query = query.eq('map_id', mapId);
        }
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setMarkers(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, mapId]);

  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);

  return { markers, loading, error, refetch: fetchMarkers };
}

export function useCreateLocationMarker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMarker = async (markerData: {
    campaign_id: string;
    location_id?: string | null;
    map_id?: string | null;
    x: number;
    y: number;
    icon_type?: LocationMarker['icon_type'];
    status_icon?: LocationMarker['status_icon'];
    name?: string | null;
    description?: string | null;
    color?: string;
    size?: LocationMarker['size'];
    visible?: boolean;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('location_markers')
        .insert({
          ...markerData,
          color: markerData.color || '#c9b882',
          size: markerData.size || 'medium',
          visible: markerData.visible ?? true,
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

  return { createMarker, loading, error };
}

export function useUpdateLocationMarker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateMarker = async (
    markerId: string,
    updates: Partial<Omit<LocationMarker, 'id' | 'campaign_id' | 'created_at'>>
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('location_markers')
        .update(updates)
        .eq('id', markerId)
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

  return { updateMarker, loading, error };
}

export function useDeleteLocationMarker() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteMarker = async (markerId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('location_markers')
        .delete()
        .eq('id', markerId);

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

  return { deleteMarker, loading, error };
}

// ============================================
// PANTHEON HOOKS
// ============================================

export function usePantheonDeities(campaignId: string | null) {
  const [deities, setDeities] = useState<PantheonDeity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDeities = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('pantheon_deities')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setDeities(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchDeities();
  }, [fetchDeities]);

  return { deities, loading, error, refetch: fetchDeities };
}

export function useCreatePantheonDeity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createDeity = async (deityData: {
    campaign_id: string;
    name: string;
    title?: string | null;
    domain?: string[];
    alignment?: PantheonDeity['alignment'];
    symbol?: string | null;
    image_url?: string | null;
    description?: string | null;
    worshipers_location_ids?: string[];
    holy_days?: string[];
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('pantheon_deities')
        .insert({
          ...deityData,
          domain: deityData.domain || [],
          worshipers_location_ids: deityData.worshipers_location_ids || [],
          holy_days: deityData.holy_days || [],
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

  return { createDeity, loading, error };
}

export function useUpdatePantheonDeity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateDeity = async (
    deityId: string,
    updates: Partial<Omit<PantheonDeity, 'id' | 'campaign_id' | 'created_at'>>
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('pantheon_deities')
        .update(updates)
        .eq('id', deityId)
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

  return { updateDeity, loading, error };
}

export function useDeletePantheonDeity() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteDeity = async (deityId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('pantheon_deities')
        .delete()
        .eq('id', deityId);

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

  return { deleteDeity, loading, error };
}

// ============================================
// CAMPAIGN TIMELINE HOOKS
// ============================================

export function useCampaignTimeline(campaignId: string | null) {
  const [timeline, setTimeline] = useState<CampaignTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTimeline = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('campaign_timeline')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;
      setTimeline(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  return { timeline, loading, error, refetch: fetchTimeline };
}

export function useCreateCampaignTimeline() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTimelineEntry = async (entryData: {
    campaign_id: string;
    title: string;
    description?: string | null;
    session_type?: CampaignTimeline['session_type'];
    planned_date?: string | null;
    actual_date?: string | null;
    order_index: number;
    status?: CampaignTimeline['status'];
    parent_entry_id?: string | null;
    branch_path_index?: number;
    associated_location_ids?: string[];
    associated_quest_ids?: string[];
    notes?: string | null;
    image_url?: string | null;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('campaign_timeline')
        .insert({
          ...entryData,
          status: entryData.status || 'not_started',
          parent_entry_id: entryData.parent_entry_id || null,
          branch_path_index: entryData.branch_path_index ?? 0,
          associated_location_ids: entryData.associated_location_ids || [],
          associated_quest_ids: entryData.associated_quest_ids || [],
          image_url: entryData.image_url || null,
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

  return { createTimelineEntry, loading, error };
}

export function useUpdateCampaignTimeline() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateTimelineEntry = async (
    entryId: string,
    updates: Partial<Omit<CampaignTimeline, 'id' | 'campaign_id' | 'created_at'>>
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('campaign_timeline')
        .update(updates)
        .eq('id', entryId)
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

  return { updateTimelineEntry, loading, error };
}

export function useDeleteCampaignTimeline() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteTimelineEntry = async (entryId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('campaign_timeline')
        .delete()
        .eq('id', entryId);

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

  return { deleteTimelineEntry, loading, error };
}

// ============================================
// CAMPAIGN CALENDAR HOOKS
// ============================================

export function useCampaignCalendar(campaignId: string | null) {
  const [calendar, setCalendar] = useState<CampaignCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCalendar = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('campaign_calendar')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No calendar exists yet, return null
          setCalendar(null);
          setError(null);
          return;
        }
        throw fetchError;
      }
      setCalendar(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  return { calendar, loading, error, refetch: fetchCalendar };
}

export function useCreateCampaignCalendar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCalendar = async (calendarData: {
    campaign_id: string;
    current_year?: number;
    current_month?: number;
    current_day?: number;
    day_of_week?: number;
    season?: CampaignCalendar['season'];
    moon_phase?: CampaignCalendar['moon_phase'];
    moon_phase_day?: number | null;
    weather?: Record<string, any>;
    custom_month_names?: string[];
    custom_weekday_names?: string[];
    custom_season_months?: Record<'spring' | 'summer' | 'autumn' | 'winter', number[]>;
    time_speed_multiplier?: number;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const defaultSeasonMonths: Record<'spring' | 'summer' | 'autumn' | 'winter', number[]> = {
        spring: [4, 5, 6],
        summer: [7, 8, 9],
        autumn: [10, 11, 12],
        winter: [1, 2, 3],
      };

      const { data, error: insertError } = await supabase
        .from('campaign_calendar')
        .insert({
          ...calendarData,
          current_year: calendarData.current_year || 1,
          current_month: calendarData.current_month || 1,
          current_day: calendarData.current_day || 1,
          day_of_week: calendarData.day_of_week || 1,
          weather: calendarData.weather || {},
          custom_month_names: calendarData.custom_month_names || [],
          custom_weekday_names: calendarData.custom_weekday_names || [],
          custom_season_months: calendarData.custom_season_months || defaultSeasonMonths,
          time_speed_multiplier: calendarData.time_speed_multiplier || 1.0,
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

  return { createCalendar, loading, error };
}

export function useUpdateCampaignCalendar() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateCalendar = async (
    calendarId: string,
    updates: Partial<Omit<CampaignCalendar, 'id' | 'campaign_id'>>
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('campaign_calendar')
        .update(updates)
        .eq('id', calendarId)
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

  return { updateCalendar, loading, error };
}

// ============================================
// FACTIONS HOOKS
// ============================================

export function useFactions(campaignId: string | null) {
  const [factions, setFactions] = useState<Faction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFactions = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('factions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setFactions(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchFactions();
  }, [fetchFactions]);

  return { factions, loading, error, refetch: fetchFactions };
}

export function useCreateFaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createFaction = async (factionData: {
    campaign_id: string;
    name: string;
    type?: Faction['type'];
    description?: string | null;
    headquarters_location_id?: string | null;
    leader_name?: string | null;
    leader_npc_id?: string | null;
    alignment?: Faction['alignment'];
    goals?: string[];
    resources?: string[];
    influence_level?: Faction['influence_level'];
    emblem_sigil_url?: string | null;
    motto_creed?: string | null;
    public_agenda?: string | null;
    secret_agenda?: string | null;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('factions')
        .insert({
          ...factionData,
          goals: factionData.goals || [],
          resources: factionData.resources || [],
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

  return { createFaction, loading, error };
}

export function useUpdateFaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateFaction = async (
    factionId: string,
    updates: Partial<Omit<Faction, 'id' | 'campaign_id' | 'created_at'>>
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('factions')
        .update(updates)
        .eq('id', factionId)
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

  return { updateFaction, loading, error };
}

export function useDeleteFaction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteFaction = async (factionId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('factions')
        .delete()
        .eq('id', factionId);

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

  return { deleteFaction, loading, error };
}

// ============================================
// FACTION RELATIONSHIPS HOOKS
// ============================================

export function useFactionRelationships(campaignId: string | null) {
  const [relationships, setRelationships] = useState<FactionRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRelationships = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('faction_relationships')
        .select('*')
        .eq('campaign_id', campaignId);

      if (fetchError) throw fetchError;
      setRelationships(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  return { relationships, loading, error, refetch: fetchRelationships };
}

export function useCreateFactionRelationship() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createRelationship = async (relationshipData: {
    campaign_id: string;
    faction_a_id: string;
    faction_b_id: string;
    relationship_type?: FactionRelationship['relationship_type'];
    strength?: number;
    public?: boolean;
    secret_notes?: string | null;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('faction_relationships')
        .insert({
          ...relationshipData,
          strength: relationshipData.strength || 50,
          public: relationshipData.public ?? true,
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

  return { createRelationship, loading, error };
}

export function useUpdateFactionRelationship() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateRelationship = async (
    relationshipId: string,
    updates: Partial<Omit<FactionRelationship, 'id' | 'campaign_id' | 'created_at'>>
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('faction_relationships')
        .update(updates)
        .eq('id', relationshipId)
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

  return { updateRelationship, loading, error };
}

export function useDeleteFactionRelationship() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteRelationship = async (relationshipId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('faction_relationships')
        .delete()
        .eq('id', relationshipId);

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

  return { deleteRelationship, loading, error };
}

// ============================================
// RELATIONSHIP STRENGTH OVERRIDES HOOKS
// ============================================

export function useRelationshipStrengthOverrides(campaignId: string | null) {
  const [overrides, setOverrides] = useState<RelationshipStrengthOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOverrides = useCallback(async () => {
    if (!campaignId) {
      setOverrides([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('relationship_strength_overrides')
        .select('*')
        .eq('campaign_id', campaignId);

      if (fetchError) throw fetchError;

      setOverrides(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
      setOverrides([]);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);

  return { overrides, loading, error, refetch: fetchOverrides };
}

export function useUpsertRelationshipStrengthOverride() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upsertOverride = async (overrideData: {
    campaign_id: string;
    relationship_key: string;
    source_type: 'faction' | 'location' | 'pantheon' | 'npc';
    source_id: string;
    target_type: 'faction' | 'location' | 'pantheon' | 'npc';
    target_id: string;
    strength: number;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: upsertError } = await supabase
        .from('relationship_strength_overrides')
        .upsert({
          campaign_id: overrideData.campaign_id,
          relationship_key: overrideData.relationship_key,
          source_type: overrideData.source_type,
          source_id: overrideData.source_id,
          target_type: overrideData.target_type,
          target_id: overrideData.target_id,
          strength: overrideData.strength,
        }, {
          onConflict: 'campaign_id,relationship_key',
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setError(null);
      return { success: true, data };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { upsertOverride, loading, error };
}

export function useDeleteRelationshipStrengthOverride() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteOverride = async (campaignId: string, relationshipKey: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('relationship_strength_overrides')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('relationship_key', relationshipKey);

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

  return { deleteOverride, loading, error };
}

