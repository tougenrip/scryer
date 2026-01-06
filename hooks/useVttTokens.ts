import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVttStore } from '@/lib/store/vtt-store';
import { Token } from '@/types/vtt';

export function useVttTokens(mapId: string | null) {
  const supabase = createClient();
  const { setTokens, addToken, updateToken, removeToken } = useVttStore();

  useEffect(() => {
    if (!mapId) {
        setTokens([]);
        return;
    }

    const fetchTokens = async () => {
      // Fetch tokens with character image info
      const { data, error } = await supabase
        .from('tokens')
        .select(`
          *,
          character:characters(image_url, name)
        `)
        .eq('map_id', mapId);

      if (error) {
        console.error('Error fetching tokens:', error);
        return;
      }
      
      const formattedTokens = data.map((t: any) => ({
        ...t,
        // Use character image/name if available and token properties are null?
        // Or just map character image to a temporary field.
        image_url: t.character?.image_url,
        name: t.name || t.character?.name || 'Unknown',
      }));
      
      setTokens(formattedTokens as Token[]);
    };

    fetchTokens();

    const channel = supabase
      .channel(`tokens:${mapId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tokens',
          filter: `map_id=eq.${mapId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newToken = payload.new as any;
            // If it has a character_id, we might need to fetch the character info
            if (newToken.character_id) {
               const { data: charData } = await supabase
                 .from('characters')
                 .select('image_url, name')
                 .eq('id', newToken.character_id)
                 .single();
               
               if (charData) {
                 newToken.image_url = charData.image_url;
                 newToken.name = newToken.name || charData.name;
               }
            }
            addToken(newToken as Token);
          } else if (payload.eventType === 'UPDATE') {
            // For updates, we preserve existing non-DB fields (like image_url) from store if not provided?
            // But payload.new is the whole record.
            // We need to re-attach derived fields.
             const newToken = payload.new as any;
             if (newToken.character_id) {
                 const { data: charData } = await supabase
                 .from('characters')
                 .select('image_url, name')
                 .eq('id', newToken.character_id)
                 .single();
                 if (charData) {
                     newToken.image_url = charData.image_url;
                     newToken.name = newToken.name || charData.name;
                 }
             }
            updateToken(payload.new.id, newToken as Token);
          } else if (payload.eventType === 'DELETE') {
            removeToken(payload.old.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mapId, setTokens, addToken, updateToken, removeToken, supabase]);

  const updateTokenPosition = async (id: string, updates: Partial<Token>) => {
    // We only send DB columns. Filter out 'image_url' etc.
    const { image_url, ...dbUpdates } = updates;
    
    // Optimistic update in store
    updateToken(id, updates);

    const { error } = await supabase
      .from('tokens')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      console.error('Error updating token:', error);
      // TODO: Revert on error
    }
  };

  return { updateTokenPosition };
}
