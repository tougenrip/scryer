import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVttStore } from '@/lib/store/vtt-store';
import { FogData, FogShape } from '@/types/vtt';

export function useVttFog(mapId: string | null) {
  const supabase = createClient();
  const { setFogData, fogData } = useVttStore();

  useEffect(() => {
    if (!mapId) {
      setFogData({ shapes: [], revealed: false });
      return;
    }

    const fetchFogData = async () => {
      const { data, error } = await supabase
        .from('media_items')
        .select('fog_data')
        .eq('id', mapId)
        .single();
        
      if (data?.fog_data) {
        setFogData(data.fog_data as unknown as FogData);
      }
    };

    fetchFogData();

    // Subscribe to changes
    const channel = supabase
      .channel(`media_items_fog:${mapId}`)
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
      
      // Optimistic update
      setFogData(newFogData);

      if (!mapId) return;

      const { error } = await supabase
        .from('media_items')
        .update({ fog_data: newFogData })
        .eq('id', mapId);

      if (error) {
        console.error('Error updating fog data:', error);
      }
  };

  return { updateFogShapes };
}
