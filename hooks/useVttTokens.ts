import { useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useVttStore } from '@/lib/store/vtt-store';
import { Token } from '@/types/vtt';
import { cleanVttDisplayName } from '@/lib/vtt/display-name';

type TokenRow = Token & {
  character?: { image_url: string | null; name: string | null } | null;
};

export function useVttTokens(mapId: string | null, campaignId?: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const { setTokens, addToken, updateToken, removeToken } = useVttStore();

  useEffect(() => {
    if (!mapId || !campaignId) {
        setTokens([]);
        return;
    }

    const fetchTokens = async () => {
      const params = new URLSearchParams({ campaignId, mapId });
      const response = await fetch(`/api/vtt/tokens?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as {
        tokens?: TokenRow[];
        error?: string;
        details?: string;
      } | null;

      if (!response.ok) {
        console.error('Error fetching tokens:', payload);
        return;
      }
      
      const formattedTokens = (payload?.tokens ?? []).map((t) => ({
        ...t,
        image_url: t.image_url || t.character?.image_url || null,
        name: cleanVttDisplayName(t.name || t.character?.name),
      }));
      
      setTokens(formattedTokens as Token[]);
      window.dispatchEvent(new CustomEvent('vtt:tokens-changed', { detail: { mapId } }));
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
            const newToken = payload.new as TokenRow;
            // If it has a character_id, we might need to fetch the character info
            if (newToken.character_id) {
               const { data: charData } = await supabase
                 .from('characters')
                 .select('image_url, name')
                 .eq('id', newToken.character_id)
                 .single();
               
               if (charData) {
                 newToken.image_url = newToken.image_url || charData.image_url;
                 newToken.name = cleanVttDisplayName(newToken.name || charData.name);
               }
            }
            newToken.name = cleanVttDisplayName(newToken.name);
            addToken(newToken as Token);
            window.dispatchEvent(new CustomEvent('vtt:tokens-changed', { detail: { mapId, tokenId: newToken.id } }));
          } else if (payload.eventType === 'UPDATE') {
            // For updates, we preserve existing non-DB fields (like image_url) from store if not provided?
            // But payload.new is the whole record.
            // We need to re-attach derived fields.
             const newToken = payload.new as TokenRow;
             if (newToken.character_id) {
                 const { data: charData } = await supabase
                 .from('characters')
                 .select('image_url, name')
                 .eq('id', newToken.character_id)
                 .single();
                 if (charData) {
                     newToken.image_url = newToken.image_url || charData.image_url;
                     newToken.name = cleanVttDisplayName(newToken.name || charData.name);
                 }
             }
            newToken.name = cleanVttDisplayName(newToken.name);
            updateToken(payload.new.id, newToken as Token);
            window.dispatchEvent(new CustomEvent('vtt:tokens-changed', { detail: { mapId, tokenId: newToken.id } }));
          } else if (payload.eventType === 'DELETE') {
            removeToken(payload.old.id);
            window.dispatchEvent(new CustomEvent('vtt:tokens-changed', { detail: { mapId, tokenId: payload.old.id, deleted: true } }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, mapId, setTokens, addToken, updateToken, removeToken, supabase]);

  const updateTokenPosition = useCallback(async (id: string, updates: Partial<Token>) => {
    // We only send DB columns. Filter out 'image_url' etc.
    const dbUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key, value]) => key !== 'image_url' && value !== undefined)
    );
    
    // Optimistic update in store
    updateToken(id, updates);

    if (!campaignId) {
      console.error('Error updating token: missing campaignId');
      return;
    }

    const response = await fetch('/api/vtt/tokens', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        tokenId: id,
        updates: dbUpdates,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.error('Error updating token:', payload);
      // TODO: Revert on error
    }
  }, [campaignId, updateToken]);

  const deleteToken = useCallback(async (id: string) => {
    if (!campaignId) {
      console.error('Error deleting token: missing campaignId');
      return false;
    }

    const response = await fetch('/api/vtt/tokens', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        tokenId: id,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      console.error('Error deleting token:', payload);
      return false;
    }

    removeToken(id);
    if (mapId) {
      window.dispatchEvent(new CustomEvent('vtt:tokens-changed', { detail: { mapId, tokenId: id, deleted: true } }));
    }
    return true;
  }, [campaignId, mapId, removeToken]);

  return { updateTokenPosition, deleteToken };
}
