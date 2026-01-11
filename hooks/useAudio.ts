import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type AudioType = 'music' | 'sfx' | 'ambience';

export interface AudioTrack {
  id: string;
  campaign_id: string;
  name: string;
  url: string;
  type: AudioType;
  duration: number | null;
  created_at: string;
}

export interface Playlist {
  id: string;
  campaign_id: string;
  name: string;
  tracks: string[]; // Array of AudioTrack IDs
  is_global: boolean;
  created_at: string;
}

export interface AudioState {
  isPlaying: boolean;
  currentTrackId: string | null;
  volume: number;
  isLooping: boolean;
}

// ============================================
// AUDIO TRACKS HOOKS
// ============================================

export function useAudioTracks(campaignId: string) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTracks = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Fetch from media_items where type = 'sound'
      const { data, error: fetchError } = await supabase
        .from('media_items')
        .select('id, name, audio_url, type, created_at')
        .eq('campaign_id', campaignId)
        .eq('type', 'sound')
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      // Transform media_items to AudioTrack format
      const transformedTracks: AudioTrack[] = (data || []).map(item => ({
        id: item.id,
        campaign_id: campaignId,
        name: item.name,
        url: item.audio_url!,
        type: 'music' as AudioType, // Default to music, can be enhanced later
        duration: null,
        created_at: item.created_at || new Date().toISOString()
      }));
      
      setTracks(transformedTracks);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchTracks();
    
    const supabase = createClient();
    const channel = supabase
      .channel(`audio-tracks-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'media_items',
          filter: `campaign_id=eq.${campaignId}`
        },
        () => {
          fetchTracks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchTracks]);

  return { tracks, loading, error, refetch: fetchTracks };
}

// ============================================
// PLAYLISTS HOOKS
// ============================================

export function usePlaylists(campaignId: string) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error: fetchError } = await supabase
        .from('playlists')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPlaylists(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchPlaylists();

    const supabase = createClient();
    const channel = supabase
      .channel(`playlists-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'playlists',
          filter: `campaign_id=eq.${campaignId}`
        },
        () => {
          fetchPlaylists();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchPlaylists]);

  return { playlists, loading, error, refetch: fetchPlaylists };
}

// ============================================
// UPLOAD HOOK
// ============================================

export function useAudioUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadTrack = async (
    file: File, 
    campaignId: string, 
    name: string, 
    type: AudioType
  ) => {
    try {
      setUploading(true);
      const supabase = createClient();
      
      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${campaignId}/media/sound/${timestamp}-${sanitizedName}`;
      
      const { error: uploadError } = supabase.storage
        .from('campaign-audio')
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-audio')
        .getPublicUrl(fileName);

      // 3. Create database record in media_items
      const { data: track, error: dbError } = await supabase
        .from('media_items')
        .insert({
          campaign_id: campaignId,
          name,
          audio_url: publicUrl,
          type: 'sound'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setError(null);
      return { success: true, track };
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setUploading(false);
    }
  };

  return { uploadTrack, uploading, error };
}

// ============================================
// AUDIO SYNC HOOK
// ============================================

export function useAudioSync(campaignId: string) {
  const [audioState, setAudioState] = useState<{
    activeTrackId: string | null;
    isPlaying: boolean;
    volume: number;
    isLooping: boolean;
  }>({
    activeTrackId: null,
    isPlaying: false,
    volume: 0.5,
    isLooping: false
  });

  // Fetch initial state
  useEffect(() => {
    const supabase = createClient();
    console.log('[useAudioSync] Fetching initial state for campaign:', campaignId);
    
    supabase
      .from('campaign_state')
      .select('active_track_id, is_playing, audio_volume, is_looping')
      .eq('campaign_id', campaignId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('[useAudioSync] Error fetching initial state:', error);
        } else if (data) {
          console.log('[useAudioSync] Initial state loaded:', data);
          setAudioState({
            activeTrackId: data.active_track_id,
            isPlaying: data.is_playing,
            volume: data.audio_volume,
            isLooping: data.is_looping
          });
        }
      });

    const channel = supabase
      .channel(`campaign-state-audio-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaign_state',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          console.log('[useAudioSync] Realtime update received:', payload.new);
          setAudioState({
            activeTrackId: payload.new.active_track_id,
            isPlaying: payload.new.is_playing,
            volume: payload.new.audio_volume,
            isLooping: payload.new.is_looping
          });
        }
      )
      .subscribe((status) => {
        console.log('[useAudioSync] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const updateAudioState = async (updates: Partial<{
    activeTrackId: string | null;
    isPlaying: boolean;
    volume: number;
    isLooping: boolean;
  }>) => {
    console.log('[useAudioSync] updateAudioState called:', { campaignId, updates });
    
    const supabase = createClient();
    const dbUpdates: any = {};
    if (updates.activeTrackId !== undefined) dbUpdates.active_track_id = updates.activeTrackId;
    if (updates.isPlaying !== undefined) dbUpdates.is_playing = updates.isPlaying;
    if (updates.volume !== undefined) dbUpdates.audio_volume = updates.volume;
    if (updates.isLooping !== undefined) dbUpdates.is_looping = updates.isLooping;

    if (Object.keys(dbUpdates).length === 0) {
      console.log('[useAudioSync] No updates to apply');
      return;
    }

    console.log('[useAudioSync] Updating campaign_state with:', dbUpdates);

    const { data, error } = await supabase
      .from('campaign_state')
      .update(dbUpdates)
      .eq('campaign_id', campaignId)
      .select();

    if (error) {
      console.error('[useAudioSync] Error updating campaign_state:', error);
      console.error('[useAudioSync] Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('[useAudioSync] Successfully updated campaign_state:', data);
    }
  };

  return { audioState, updateAudioState };
}

// ============================================
// AUDIO PLAYER HOOK
// ============================================

export function useCampaignAudioState(campaignId: string) {
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  
  const updateActivePlaylist = async (playlistId: string | null) => {
    const supabase = createClient();
    await supabase
      .from('campaigns')
      .update({ active_playlist_id: playlistId })
      .eq('id', campaignId);
  };

  useEffect(() => {
    const supabase = createClient();
    
    // Initial fetch
    supabase
      .from('campaigns')
      .select('active_playlist_id')
      .eq('id', campaignId)
      .single()
      .then(({ data }) => {
        if (data) setActivePlaylistId(data.active_playlist_id);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`campaign-audio-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`
        },
        (payload) => {
          setActivePlaylistId(payload.new.active_playlist_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  return { activePlaylistId, updateActivePlaylist };
}
