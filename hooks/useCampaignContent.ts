import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MediaItem {
  id: string;
  campaign_id: string;
  name: string;
  image_url: string | null;
  type: 'map' | 'token' | 'prop' | null;
  created_at: string | null;
}

// Legacy alias for backward compatibility during migration
export type Map = MediaItem;

export interface NPC {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  appearance: string | null;
  personality: string | null;
  background: string | null;
  location: string | null;
  notes: string | null;
  image_url: string | null;
  class_source: string | null;
  class_index: string | null;
  species_source: string | null;
  species_index: string | null;
  custom_class: string | null;
  custom_species: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface Encounter {
  id: string;
  campaign_id: string;
  map_id: string | null;
  name: string | null;
  active: boolean;
  round_number: number;
  current_turn_index: number;
  monsters?: Array<{
    monster_source: 'srd' | 'homebrew';
    monster_index: string;
    quantity: number;
  }> | null;
  created_at: string | null;
}

export interface QuestObjective {
  id: string;
  step_id: string;
  objective_order: number;
  name: string | null;
  goal: string;
  status: 'pending' | 'success' | 'failure';
  is_hidden: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuestStep {
  id: string;
  quest_id: string;
  step_order: number;
  name: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
  objectives?: QuestObjective[];
}

export interface Quest {
  id: string;
  campaign_id: string;
  title: string;
  content: string;
  source: string | null;
  location: string | null;
  verified: boolean;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  steps?: QuestStep[];
}

// ============================================
// MEDIA ITEMS HOOKS
// ============================================

export function useCampaignMediaItems(
  campaignId: string | null,
  type?: 'map' | 'token' | 'prop' | null
) {
  const [items, setItems] = useState<MediaItem[]>([]);
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

      let query = supabase
        .from('media_items')
        .select('*')
        .eq('campaign_id', campaignId);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setItems(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}

// Legacy hook for backward compatibility
export function useCampaignMaps(campaignId: string | null) {
  const { items, loading, error, refetch } = useCampaignMediaItems(campaignId, 'map');
  return { maps: items, loading, error, refetch };
}

export function useCreateMediaItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createMediaItem = async (itemData: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    type?: 'map' | 'token' | 'prop' | null;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('media_items')
        .insert(itemData)
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

  return { createMediaItem, loading, error };
}

// Legacy hook for backward compatibility
export function useCreateMap() {
  const { createMediaItem, loading, error } = useCreateMediaItem();
  const createMap = async (mapData: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    grid_size?: number;
    grid_type?: 'square' | 'hex';
    width?: number | null;
    height?: number | null;
  }) => {
    return createMediaItem({
      campaign_id: mapData.campaign_id,
      name: mapData.name,
      image_url: mapData.image_url,
      type: 'map',
    });
  };
  return { createMap, loading, error };
}

export function useUpdateMediaItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateMediaItem = async (
    itemId: string,
    updates: {
      name?: string;
      image_url?: string | null;
      type?: 'map' | 'token' | 'prop' | null;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('media_items')
        .update(updates)
        .eq('id', itemId)
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

  return { updateMediaItem, loading, error };
}

// Legacy hook for backward compatibility
export function useUpdateMap() {
  const { updateMediaItem, loading, error } = useUpdateMediaItem();
  const updateMap = async (
    mapId: string,
    updates: {
      name?: string;
      image_url?: string | null;
      grid_size?: number;
      grid_type?: 'square' | 'hex';
      width?: number | null;
      height?: number | null;
    }
  ) => {
    return updateMediaItem(mapId, {
      name: updates.name,
      image_url: updates.image_url,
    });
  };
  return { updateMap, loading, error };
}

export function useDeleteMediaItem() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteMediaItem = async (itemId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('media_items')
        .delete()
        .eq('id', itemId);

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

  return { deleteMediaItem, loading, error };
}

// Legacy hook for backward compatibility
export function useDeleteMap() {
  const { deleteMediaItem, loading, error } = useDeleteMediaItem();
  return { deleteMap: deleteMediaItem, loading, error };
}

// ============================================
// NPCs HOOKS
// ============================================

export function useCampaignNPCs(campaignId: string | null) {
  const [npcs, setNPCs] = useState<NPC[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchNPCs = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('npcs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNPCs(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchNPCs();
  }, [fetchNPCs]);

  return { npcs, loading, error, refetch: fetchNPCs };
}

export function useCreateNPC() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createNPC = async (npcData: {
    campaign_id: string;
    name: string;
    description?: string | null;
    appearance?: string | null;
    personality?: string | null;
    background?: string | null;
    location?: string | null;
    notes?: string | null;
    image_url?: string | null;
    class_source?: string | null;
    class_index?: string | null;
    species_source?: string | null;
    species_index?: string | null;
    custom_class?: string | null;
    custom_species?: string | null;
    created_by: string;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('npcs')
        .insert(npcData)
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

  return { createNPC, loading, error };
}

export function useUpdateNPC() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateNPC = async (
    npcId: string,
    updates: {
      name?: string;
      description?: string | null;
      appearance?: string | null;
      personality?: string | null;
      background?: string | null;
      location?: string | null;
      notes?: string | null;
      image_url?: string | null;
      class_source?: string | null;
      class_index?: string | null;
      species_source?: string | null;
      species_index?: string | null;
      custom_class?: string | null;
      custom_species?: string | null;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('npcs')
        .update(updates)
        .eq('id', npcId)
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

  return { updateNPC, loading, error };
}

export function useDeleteNPC() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteNPC = async (npcId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('npcs')
        .delete()
        .eq('id', npcId);

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

  return { deleteNPC, loading, error };
}

// ============================================
// ENCOUNTERS HOOKS
// ============================================

export function useCampaignEncounters(campaignId: string | null) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEncounters = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('combat_encounters')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setEncounters(data || []);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  return { encounters, loading, error, refetch: fetchEncounters };
}

export function useCreateEncounter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createEncounter = async (encounterData: {
    campaign_id: string;
    name?: string | null;
    map_id?: string | null;
    active?: boolean;
    round_number?: number;
    current_turn_index?: number;
    monsters?: Array<{
      monster_source: 'srd' | 'homebrew';
      monster_index: string;
      quantity: number;
    }> | null;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('combat_encounters')
        .insert({
          ...encounterData,
          active: encounterData.active ?? false,
          round_number: encounterData.round_number ?? 1,
          current_turn_index: encounterData.current_turn_index ?? 0,
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

  return { createEncounter, loading, error };
}

export function useUpdateEncounter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateEncounter = async (
    encounterId: string,
    updates: {
      name?: string | null;
      map_id?: string | null;
      active?: boolean;
      round_number?: number;
      current_turn_index?: number;
      monsters?: Array<{
        monster_source: 'srd' | 'homebrew';
        monster_index: string;
        quantity: number;
      }> | null;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('combat_encounters')
        .update(updates)
        .eq('id', encounterId)
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

  return { updateEncounter, loading, error };
}

export function useDeleteEncounter() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteEncounter = async (encounterId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('combat_encounters')
        .delete()
        .eq('id', encounterId);

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

  return { deleteEncounter, loading, error };
}

// ============================================
// QUESTS HOOKS
// ============================================

export function useCampaignQuests(campaignId: string | null) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuests = useCallback(async () => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();

      // Fetch quests
      const { data: questsData, error: fetchError } = await supabase
        .from('quests')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch steps for all quests
      const questIds = (questsData || []).map(q => q.id);
      let stepsData: QuestStep[] = [];
      if (questIds.length > 0) {
        const { data: steps, error: stepsError } = await supabase
          .from('quest_steps')
          .select('*')
          .in('quest_id', questIds)
          .order('step_order', { ascending: true });

        if (stepsError) throw stepsError;
        stepsData = steps || [];
      }

      // Fetch objectives for all steps
      const stepIds = stepsData.map(s => s.id);
      let objectivesData: QuestObjective[] = [];
      if (stepIds.length > 0) {
        const { data: objectives, error: objectivesError } = await supabase
          .from('quest_objectives')
          .select('*')
          .in('step_id', stepIds)
          .order('objective_order', { ascending: true });

        if (objectivesError) throw objectivesError;
        objectivesData = objectives || [];
      }

      // Combine data
      const questsWithSteps = (questsData || []).map(quest => {
        const steps = stepsData
          .filter(s => s.quest_id === quest.id)
          .map(step => ({
            ...step,
            objectives: objectivesData.filter(o => o.step_id === step.id)
          }))
          .sort((a, b) => a.step_order - b.step_order);
        
        return {
          ...quest,
          steps: steps.length > 0 ? steps : undefined
        };
      });

      setQuests(questsWithSteps);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  return { quests, loading, error, refetch: fetchQuests };
}

export function useCreateQuest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createQuest = async (questData: {
    campaign_id: string;
    title: string;
    content: string;
    source?: string | null;
    location?: string | null;
    verified?: boolean;
    created_by: string;
    steps?: Array<{
      step_order: number;
      name?: string | null;
      description?: string | null;
      objectives?: Array<{
        objective_order: number;
        name?: string | null;
        goal: string;
        status?: 'pending' | 'success' | 'failure';
      }>;
    }>;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Create quest
      const { data: quest, error: insertError } = await supabase
        .from('quests')
        .insert({
          campaign_id: questData.campaign_id,
          title: questData.title,
          content: questData.content,
          source: questData.source || null,
          location: questData.location || null,
          verified: questData.verified ?? false,
          created_by: questData.created_by,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create steps and objectives if provided
      if (questData.steps && questData.steps.length > 0) {
        for (const stepData of questData.steps) {
          const { data: step, error: stepError } = await supabase
            .from('quest_steps')
            .insert({
              quest_id: quest.id,
              step_order: stepData.step_order,
              name: stepData.name || null,
              description: stepData.description || null,
            })
            .select()
            .single();

          if (stepError) throw stepError;

          // Create objectives for this step
          if (stepData.objectives && stepData.objectives.length > 0) {
            const objectivesToInsert = stepData.objectives.map(obj => ({
              step_id: step.id,
              objective_order: obj.objective_order,
              name: obj.name || null,
              goal: obj.goal,
              status: obj.status || 'pending',
              is_hidden: obj.is_hidden || false,
            }));

            const { error: objectivesError } = await supabase
              .from('quest_objectives')
              .insert(objectivesToInsert);

            if (objectivesError) throw objectivesError;
          }
        }
      }

      setError(null);
      return { success: true, data: quest };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createQuest, loading, error };
}

export function useUpdateQuest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateQuest = async (
    questId: string,
    updates: {
      title?: string;
      content?: string;
      source?: string | null;
      location?: string | null;
      verified?: boolean;
      steps?: Array<{
        id?: string;
        step_order: number;
        name?: string | null;
        description?: string | null;
        objectives?: Array<{
          id?: string;
          objective_order: number;
          name?: string | null;
          goal: string;
          status?: 'pending' | 'success' | 'failure';
        }>;
      }>;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Update quest basic fields
      const questUpdates: any = {};
      if (updates.title !== undefined) questUpdates.title = updates.title;
      if (updates.content !== undefined) questUpdates.content = updates.content;
      if (updates.source !== undefined) questUpdates.source = updates.source;
      if (updates.location !== undefined) questUpdates.location = updates.location;
      if (updates.verified !== undefined) questUpdates.verified = updates.verified;

      if (Object.keys(questUpdates).length > 0) {
        const { data, error: updateError } = await supabase
          .from('quests')
          .update(questUpdates)
          .eq('id', questId)
          .select()
          .single();

        if (updateError) throw updateError;
      }

      // Handle steps if provided
      if (updates.steps !== undefined) {
        // Get existing steps
        const { data: existingSteps } = await supabase
          .from('quest_steps')
          .select('id')
          .eq('quest_id', questId);

        const existingStepIds = new Set((existingSteps || []).map(s => s.id));

        // Process each step
        for (const stepData of updates.steps) {
          if (stepData.id && existingStepIds.has(stepData.id)) {
            // Update existing step
            const { error: stepError } = await supabase
              .from('quest_steps')
              .update({
                step_order: stepData.step_order,
                name: stepData.name || null,
                description: stepData.description || null,
              })
              .eq('id', stepData.id);

            if (stepError) throw stepError;

            // Get existing objectives for this step
            const { data: existingObjectives } = await supabase
              .from('quest_objectives')
              .select('id')
              .eq('step_id', stepData.id);

            const existingObjectiveIds = new Set((existingObjectives || []).map(o => o.id));

            // Update/delete/create objectives
            if (stepData.objectives) {
              for (const objData of stepData.objectives) {
                if (objData.id && existingObjectiveIds.has(objData.id)) {
                  // Update existing objective
                  const { error: objError } = await supabase
                    .from('quest_objectives')
                    .update({
                      objective_order: objData.objective_order,
                      name: objData.name || null,
                      goal: objData.goal,
                      status: objData.status || 'pending',
                      is_hidden: objData.is_hidden || false,
                    })
                    .eq('id', objData.id);

                  if (objError) throw objError;
                } else {
                  // Create new objective
                  const { error: objError } = await supabase
                    .from('quest_objectives')
                    .insert({
                      step_id: stepData.id,
                      objective_order: objData.objective_order,
                      name: objData.name || null,
                      goal: objData.goal,
                      status: objData.status || 'pending',
                    });

                  if (objError) throw objError;
                }
              }

              // Delete objectives that are no longer in the list
              const providedObjectiveIds = new Set(
                stepData.objectives.filter(o => o.id).map(o => o.id!)
              );
              const toDelete = Array.from(existingObjectiveIds).filter(
                id => !providedObjectiveIds.has(id)
              );
              
              if (toDelete.length > 0) {
                const { error: deleteError } = await supabase
                  .from('quest_objectives')
                  .delete()
                  .in('id', toDelete);

                if (deleteError) throw deleteError;
              }
            }
          } else {
            // Create new step
            const { data: newStep, error: stepError } = await supabase
              .from('quest_steps')
              .insert({
                quest_id: questId,
                step_order: stepData.step_order,
                name: stepData.name || null,
                description: stepData.description || null,
              })
              .select()
              .single();

            if (stepError) throw stepError;

            // Create objectives for new step
            if (stepData.objectives && stepData.objectives.length > 0) {
              const objectivesToInsert = stepData.objectives.map(obj => ({
                step_id: newStep.id,
                objective_order: obj.objective_order,
                name: obj.name || null,
                goal: obj.goal,
                status: obj.status || 'pending',
                is_hidden: obj.is_hidden || false,
              }));

              const { error: objectivesError } = await supabase
                .from('quest_objectives')
                .insert(objectivesToInsert);

              if (objectivesError) throw objectivesError;
            }
          }
        }

        // Delete steps that are no longer in the list
        const providedStepIds = new Set(
          updates.steps.filter(s => s.id).map(s => s.id!)
        );
        const toDelete = Array.from(existingStepIds).filter(
          id => !providedStepIds.has(id)
        );
        
        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('quest_steps')
            .delete()
            .in('id', toDelete);

          if (deleteError) throw deleteError;
        }
      }

      setError(null);
      return { success: true };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { updateQuest, loading, error };
}

export function useDeleteQuest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteQuest = async (questId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('quests')
        .delete()
        .eq('id', questId);

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

  return { deleteQuest, loading, error };
}

// ============================================
// QUEST STEPS HOOKS
// ============================================

export function useCreateQuestStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createStep = async (stepData: {
    quest_id: string;
    step_order: number;
    description?: string | null;
    objectives?: Array<{
      objective_order: number;
      goal: string;
      status?: 'pending' | 'success' | 'failure';
    }>;
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data: step, error: insertError } = await supabase
        .from('quest_steps')
        .insert({
          quest_id: stepData.quest_id,
          step_order: stepData.step_order,
          description: stepData.description || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Create objectives if provided
      if (stepData.objectives && stepData.objectives.length > 0) {
        const objectivesToInsert = stepData.objectives.map(obj => ({
          step_id: step.id,
          objective_order: obj.objective_order,
          goal: obj.goal,
          status: obj.status || 'pending',
          is_hidden: obj.is_hidden || false,
        }));

        const { error: objectivesError } = await supabase
          .from('quest_objectives')
          .insert(objectivesToInsert);

        if (objectivesError) throw objectivesError;
      }

      setError(null);
      return { success: true, data: step };
    } catch (err) {
      setError(err as Error);
      return { success: false, error: err as Error };
    } finally {
      setLoading(false);
    }
  };

  return { createStep, loading, error };
}

export function useUpdateQuestStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateStep = async (
    stepId: string,
    updates: {
      step_order?: number;
      description?: string | null;
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('quest_steps')
        .update(updates)
        .eq('id', stepId)
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

  return { updateStep, loading, error };
}

export function useDeleteQuestStep() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteStep = async (stepId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('quest_steps')
        .delete()
        .eq('id', stepId);

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

  return { deleteStep, loading, error };
}

// ============================================
// QUEST OBJECTIVES HOOKS
// ============================================

export function useCreateQuestObjective() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createObjective = async (objectiveData: {
    step_id: string;
    objective_order: number;
    goal: string;
    status?: 'pending' | 'success' | 'failure';
  }) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from('quest_objectives')
        .insert({
          step_id: objectiveData.step_id,
          objective_order: objectiveData.objective_order,
          goal: objectiveData.goal,
          status: objectiveData.status || 'pending',
          is_hidden: objectiveData.is_hidden || false,
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

  return { createObjective, loading, error };
}

export function useUpdateQuestObjective() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateObjective = async (
    objectiveId: string,
    updates: {
      objective_order?: number;
      goal?: string;
      status?: 'pending' | 'success' | 'failure';
    }
  ) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { data, error: updateError } = await supabase
        .from('quest_objectives')
        .update(updates)
        .eq('id', objectiveId)
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

export function useDeleteQuestObjective() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteObjective = async (objectiveId: string) => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('quest_objectives')
        .delete()
        .eq('id', objectiveId);

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

