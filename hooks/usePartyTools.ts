import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Objective {
  id: string;
  campaign_id: string;
  description: string;
  completed: boolean;
  order: number;
  created_at: string;
}

export interface PartyItem {
  id: string;
  campaign_id: string;
  item_source: 'srd' | 'homebrew';
  item_index: string | null;
  name: string;
  quantity: number;
  weight: number;
  notes: string | null;
  created_at: string;
}

// ============================================
// OBJECTIVES HOOKS
// ============================================

export function useCampaignObjectives(campaignId: string | null) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchObjectives = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('objectives')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('order', { ascending: true })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setObjectives(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchObjectives();

    if (!campaignId) return;

    // Real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`objectives-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'objectives',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchObjectives();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchObjectives]);

  return { objectives, loading, error, refetch: fetchObjectives };
}

export function useCreateObjective() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createObjective = async (data: {
    campaign_id: string;
    description: string;
    order?: number;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: newObjective, error: insertError } = await supabase
        .from('objectives')
        .insert({
          campaign_id: data.campaign_id,
          description: data.description,
          order: data.order ?? 0,
          completed: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setError(null);
      return { success: true, data: newObjective };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createObjective, loading, error };
}

export function useUpdateObjective() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateObjective = async (
    id: string,
    updates: {
      description?: string;
      completed?: boolean;
      order?: number;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('objectives')
        .update(updates)
        .eq('id', id)
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

  return { updateObjective, loading, error };
}

export function useDeleteObjective() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteObjective = async (id: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('objectives')
        .delete()
        .eq('id', id);

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

  return { deleteObjective, loading, error };
}

// ============================================
// PARTY INVENTORY HOOKS
// ============================================

export function usePartyInventory(campaignId: string | null) {
  const [items, setItems] = useState<PartyItem[]>([]);
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

      const { data, error: fetchError } = await supabase
        .from('campaign_inventories')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setItems(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchItems();

    if (!campaignId) return;

    // Real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`party-inventory-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_inventories',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}

export function useAddPartyItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const addItem = async (data: {
    campaign_id: string;
    name: string;
    item_source?: 'srd' | 'homebrew';
    item_index?: string | null;
    quantity?: number;
    weight?: number;
    notes?: string | null;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: newItem, error: insertError } = await supabase
        .from('campaign_inventories')
        .insert({
          campaign_id: data.campaign_id,
          name: data.name,
          item_source: data.item_source ?? 'srd',
          item_index: data.item_index,
          quantity: data.quantity ?? 1,
          weight: data.weight ?? 0,
          notes: data.notes,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setError(null);
      return { success: true, data: newItem };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { addItem, loading, error };
}

export function useUpdatePartyItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateItem = async (
    id: string,
    updates: {
      name?: string;
      quantity?: number;
      weight?: number;
      notes?: string | null;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('campaign_inventories')
        .update(updates)
        .eq('id', id)
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

  return { updateItem, loading, error };
}

export function useDeletePartyItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteItem = async (id: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('campaign_inventories')
        .delete()
        .eq('id', id);

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

  return { deleteItem, loading, error };
}
