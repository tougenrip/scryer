"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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

export function useCalendarEvents(campaignId: string | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('event_year', { ascending: true })
        .order('event_month', { ascending: true })
        .order('event_day', { ascending: true });

      if (fetchError) throw fetchError;
      setEvents(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

export function useCreateCalendarEvent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createEvent = async (eventData: {
    campaign_id: string;
    title: string;
    description?: string | null;
    event_year: number;
    event_month: number;
    event_day: number;
    is_repeatable?: boolean;
    repeat_type?: CalendarEvent['repeat_type'];
    repeat_interval?: number;
    repeat_end_year?: number | null;
    repeat_end_month?: number | null;
    repeat_end_day?: number | null;
    color?: string;
    created_by: string;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('calendar_events')
        .insert({
          ...eventData,
          is_repeatable: eventData.is_repeatable || false,
          repeat_interval: eventData.repeat_interval || 1,
          color: eventData.color || '#c9b882',
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

  return { createEvent, loading, error };
}

export function useUpdateCalendarEvent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateEvent = async (
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id' | 'campaign_id' | 'created_by' | 'created_at'>>
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId)
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

  return { updateEvent, loading, error };
}

export function useDeleteCalendarEvent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteEvent = async (eventId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

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

  return { deleteEvent, loading, error };
}

