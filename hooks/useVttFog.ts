import { useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVttStore } from '@/lib/store/vtt-store';
import { FogData, FogShape } from '@/types/vtt';

export function useVttFog(mapId: string | null) {
  // Memoize so the supabase reference is stable across renders and the effect
  // below doesn't re-subscribe a new channel every time the parent re-renders.
  const supabase = useMemo(() => createClient(), []);
  const { setFogData, fogData } = useVttStore();

  useEffect(() => {
    if (!mapId) {
      setFogData({ shapes: [], revealed: false });
      return;
    }

    const fetchFogData = async () => {
      const { data } = await supabase
        .from('media_items')
        .select('fog_data')
        .eq('id', mapId)
        .single();

      if (data?.fog_data) {
        setFogData(data.fog_data as unknown as FogData);
      }
    };

    fetchFogData();

    // Use a per-mount channel topic suffix so we never collide with a
    // previous mount's channel that's still in the middle of being torn down
    // (Supabase reuses channels by topic; attaching a listener to a channel
    // that's already mid-subscribe throws "cannot add postgres_changes
    // callbacks ... after subscribe()").
    const topic = `media_items_fog:${mapId}:${Math.random().toString(36).slice(2, 9)}`;
    const channel = supabase
      .channel(topic)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'media_items',
          filter: `id=eq.${mapId}`,
        },
        (payload) => {
           if (payload.new.fog_data) {
               setFogData(payload.new.fog_data as unknown as FogData);
           }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, [mapId, setFogData, supabase]);

  const updateFogShapes = async (newShapes: FogShape[]) => {
      const newFogData = { ...fogData, shapes: newShapes };
      await updateFogData(newFogData);
  };

  const updateFogData = async (newFogData: FogData) => {
      // Optimistic update
      setFogData(newFogData);

      if (!mapId) return;

      const { error } = await supabase
        .from('media_items')
        .update({ fog_data: newFogData as unknown as object }) // Fix for supabase types
        .eq('id', mapId);

      if (error) {
        console.error('Error updating fog data:', error);
      }
  };

  return { updateFogShapes, updateFogData };
}
