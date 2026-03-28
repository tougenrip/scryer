import { useMemo } from 'react';
import { useCampaignNPCs, useCampaignQuests } from './useCampaignContent';
import { useWorldLocations, useFactions } from './useForgeContent';
import type { MentionableEntity, MentionType } from '@/lib/utils/mention-parser';

export interface UseMentionablesResult {
  mentionables: MentionableEntity[];
  loading: boolean;
  error: Error | null;
  searchMentionables: (query: string) => MentionableEntity[];
}

/**
 * Hook to fetch all mentionable entities (NPCs, Locations, Quests, Factions)
 * Returns combined list for autocomplete
 */
export function useMentionables(campaignId: string | null): UseMentionablesResult {
  // Fetch all mentionable content types in parallel
  const { npcs, loading: npcsLoading, error: npcsError } = useCampaignNPCs(campaignId || '', true);
  const { locations, loading: locationsLoading, error: locationsError } = useWorldLocations(campaignId || '', true);
  const { quests, loading: questsLoading, error: questsError } = useCampaignQuests(campaignId || '');
  const { factions, loading: factionsLoading, error: factionsError } = useFactions(campaignId || '');

  // Combine all entities into mentionable format
  const mentionables = useMemo(() => {
    if (!campaignId) return [];

    const result: MentionableEntity[] = [];

    // Add NPCs
    if (npcs) {
      result.push(
        ...npcs.map((npc) => ({
          id: npc.id,
          type: 'npc' as MentionType,
          name: npc.name,
          description: npc.description,
          details: {
            appearance: npc.appearance,
            personality: npc.personality,
            background: npc.background,
            location: npc.location,
            class: npc.custom_class || npc.class_index,
            species: npc.custom_species || npc.species_index,
          },
        }))
      );
    }

    // Add Locations
    if (locations) {
      result.push(
        ...locations.map((location) => ({
          id: location.id,
          type: 'location' as MentionType,
          name: location.name,
          description: location.description,
          details: {
            locationType: location.type,
            population: location.metadata?.population,
            ruler: location.metadata?.ruler_owner_id,
            dmNotes: location.dm_notes,
            coordinates: {
              x: location.x_coordinate,
              y: location.y_coordinate,
            },
          },
        }))
      );
    }

    // Add Quests
    if (quests) {
      result.push(
        ...quests.map((quest) => ({
          id: quest.id,
          type: 'quest' as MentionType,
          name: quest.title,
          description: quest.content,
          details: {
            source: quest.source,
            location: quest.location,
            verified: quest.verified,
            steps: quest.steps,
          },
        }))
      );
    }

    // Add Factions
    if (factions) {
      result.push(
        ...factions.map((faction) => ({
          id: faction.id,
          type: 'faction' as MentionType,
          name: faction.name,
          description: faction.description,
          details: {
            factionType: faction.type,
            leader: faction.leader_name,
            alignment: faction.alignment,
            goals: faction.goals,
            resources: faction.resources,
            influenceLevel: faction.influence_level,
            publicAgenda: faction.public_agenda,
            secretAgenda: faction.secret_agenda,
          },
        }))
      );
    }

    return result;
  }, [npcs, locations, quests, factions, campaignId]);

  // Search/filter mentionables by query
  const searchMentionables = useMemo(
    () => (query: string) => {
      if (!query) return mentionables;

      const lowerQuery = query.toLowerCase();
      return mentionables.filter((entity) =>
        entity.name.toLowerCase().includes(lowerQuery)
      );
    },
    [mentionables]
  );

  const loading = npcsLoading || locationsLoading || questsLoading || factionsLoading;
  const error = npcsError || locationsError || questsError || factionsError;

  return {
    mentionables,
    loading,
    error,
    searchMentionables,
  };
}

/**
 * Get mentionable entity by ID and type
 */
export function useMentionableById(
  campaignId: string | null,
  entityId: string | null,
  entityType: MentionType | null
): MentionableEntity | null {
  const { mentionables } = useMentionables(campaignId);

  return useMemo(() => {
    if (!entityId || !entityType) return null;
    return mentionables.find((m) => m.id === entityId && m.type === entityType) || null;
  }, [mentionables, entityId, entityType]);
}
