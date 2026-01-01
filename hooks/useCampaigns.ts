import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// Note: We create client instances fresh in each hook to ensure we have the latest auth session
// createClient() from @supabase/ssr automatically handles auth via cookies

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  dm_user_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CampaignMember {
  campaign_id: string;
  user_id: string;
  role: 'dm' | 'player' | null;
  joined_at: string | null;
}

export interface CampaignWithMembers extends Campaign {
  memberCount: number;
  role: 'dm' | 'player';
}

// ============================================
// CAMPAIGN HOOKS
// ============================================

export function useCampaigns(userId: string | null) {
  const [campaigns, setCampaigns] = useState<CampaignWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchCampaigns() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Get all campaigns where user is a member
        const { data: memberships, error: membershipError } = await supabase
          .from('campaign_members')
          .select('campaign_id, role')
          .eq('user_id', userId);

        if (membershipError) throw membershipError;

        if (!memberships || memberships.length === 0) {
          setCampaigns([]);
          setError(null);
          setLoading(false);
          return;
        }

        const campaignIds = memberships.map(m => m.campaign_id);
        const roleMap = new Map(memberships.map(m => [m.campaign_id, m.role as 'dm' | 'player']));

        // Fetch campaign details
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .in('id', campaignIds)
          .order('updated_at', { ascending: false });

        if (campaignsError) throw campaignsError;

        // Get member counts for each campaign
        const { data: memberCounts, error: countError } = await supabase
          .from('campaign_members')
          .select('campaign_id')
          .in('campaign_id', campaignIds);

        if (countError) throw countError;

        const countMap = new Map<string, number>();
        memberCounts?.forEach(m => {
          countMap.set(m.campaign_id, (countMap.get(m.campaign_id) || 0) + 1);
        });

        // Combine data
        const campaignsWithMembers: CampaignWithMembers[] = (campaignsData || []).map(campaign => ({
          ...campaign,
          memberCount: countMap.get(campaign.id) || 0,
          role: roleMap.get(campaign.id) || 'player',
        }));

        setCampaigns(campaignsWithMembers);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaigns();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel('campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_members',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch on membership changes
          fetchCampaigns();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
        },
        (payload: any) => {
          setCampaigns(prev =>
            prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } as CampaignWithMembers : c)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { campaigns, loading, error };
}

export function useCampaign(campaignId: string | null) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    async function fetchCampaign() {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();

        if (fetchError) throw fetchError;
        setCampaign(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchCampaign();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${campaignId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            setCampaign(payload.new as Campaign);
          } else if (payload.eventType === 'DELETE') {
            setCampaign(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  return { campaign, loading, error };
}

// ============================================
// MUTATION HOOKS
// ============================================

export function useCreateCampaign() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createCampaign = async (campaign: { name: string; description?: string; dm_user_id: string }) => {
    try {
      setLoading(true);

      // Ensure we have a fresh client with current session
      const supabaseClient = createClient();
      
      // Verify user is authenticated before attempting insert
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        throw new Error(`User must be authenticated to create a campaign: ${authError?.message || 'No user found'}`);
      }
      
      // Ensure dm_user_id matches the authenticated user
      if (user.id !== campaign.dm_user_id) {
        throw new Error(`Campaign creator must be the DM. Expected ${user.id}, got ${campaign.dm_user_id}`);
      }

      // Get session to ensure token is valid and will be sent with request
      let { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !session) {
        // Try to refresh the session if it's expired
        const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          throw new Error(`No valid session found. Please log in again. ${refreshError?.message || sessionError?.message || 'Session is null'}`);
        }
        session = refreshData.session;
      }

      // Ensure we have a valid access token
      if (!session?.access_token) {
        throw new Error('No access token available. Please log in again.');
      }

      // Create campaign
      // The client should automatically include the Authorization header with the JWT
      const { data: campaignData, error: campaignError } = await supabaseClient
        .from('campaigns')
        .insert({
          name: campaign.name,
          description: campaign.description || null,
          dm_user_id: campaign.dm_user_id,
        })
        .select()
        .single();

      if (campaignError) {
        // Provide more helpful error message
        if (campaignError.code === '42501') {
          throw new Error('Permission denied. Make sure you are logged in and your session is valid. Try refreshing the page and logging in again.');
        }
        throw campaignError;
      }

      // Add creator as DM member
      const { error: memberError } = await supabaseClient
        .from('campaign_members')
        .insert({
          campaign_id: campaignData.id,
          user_id: campaign.dm_user_id,
          role: 'dm',
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Create campaign state
      const { error: stateError } = await supabaseClient
        .from('campaign_state')
        .insert({
          campaign_id: campaignData.id,
        });

      if (stateError) throw stateError;

      setError(null);
      return { success: true, data: campaignData };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createCampaign, loading, error };
}

export function useUpdateCampaign() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateCampaign = async (campaignId: string, updates: { name?: string; description?: string }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
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

  return { updateCampaign, loading, error };
}

export function useDeleteCampaign() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteCampaign = async (campaignId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Delete campaign (cascade will handle members, state, etc.)
      const { error: deleteError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

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

  return { deleteCampaign, loading, error };
}

export function useCampaignMembers(campaignId: string | null) {
  const [members, setMembers] = useState<CampaignMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    async function fetchMembers() {
      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from('campaign_members')
          .select('*')
          .eq('campaign_id', campaignId)
          .order('joined_at', { ascending: true });

        if (fetchError) throw fetchError;
        setMembers(data || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel(`campaign-members-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_members',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setMembers(prev => [...prev, payload.new as CampaignMember]);
          } else if (payload.eventType === 'UPDATE') {
            setMembers(prev =>
              prev.map(m =>
                m.user_id === payload.new.user_id && m.campaign_id === payload.new.campaign_id
                  ? payload.new as CampaignMember
                  : m
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setMembers(prev =>
              prev.filter(m => m.user_id !== payload.old.user_id || m.campaign_id !== payload.old.campaign_id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  return { members, loading, error };
}

export function useInvitePlayer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const invitePlayer = async (campaignId: string, userId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Check if user is already a member
      const { data: existing, error: checkError } = await supabase
        .from('campaign_members')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existing) {
        return { success: false, error: new Error('User is already a member of this campaign') };
      }

      // Add user as player
      const { data, error: insertError } = await supabase
        .from('campaign_members')
        .insert({
          campaign_id: campaignId,
          user_id: userId,
          role: 'player',
          joined_at: new Date().toISOString(),
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

  return { invitePlayer, loading, error };
}

export function useRemoveMember() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const removeMember = async (campaignId: string, userId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('campaign_members')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('user_id', userId);

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

  return { removeMember, loading, error };
}

