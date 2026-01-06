"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelationshipGraph, UnifiedRelationship } from "./relationship-graph";
import { RelationshipType } from "./affinity-edge";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";
import {
  useFactions,
  useFactionRelationships,
  useWorldLocations,
  usePantheonDeities,
  useUpdateFactionRelationship,
  useRelationshipStrengthOverrides,
  useUpsertRelationshipStrengthOverride,
  FactionRelationship,
} from "@/hooks/useForgeContent";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/types/supabase";

interface RelationshipWebTabProps {
  campaignId: string;
  isDm: boolean;
}

type LocationRelationship = Tables<"location_relationships">;

// Fetch location relationships (need to check if there's a hook for this)
async function fetchLocationRelationships(campaignId: string): Promise<LocationRelationship[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('location_relationships')
    .select('*')
    .eq('campaign_id', campaignId);
  
  if (error) {
    console.error('Error fetching location relationships:', error);
    return [];
  }
  
  return data || [];
}

export function RelationshipWebTab({ campaignId }: RelationshipWebTabProps) {
  const { npcs, loading: npcsLoading } = useCampaignNPCs(campaignId);
  const { factions, loading: factionsLoading } = useFactions(campaignId);
  const { locations, loading: locationsLoading } = useWorldLocations(campaignId);
  const { deities, loading: pantheonsLoading } = usePantheonDeities(campaignId);
  const { relationships: factionRelationships, loading: factionRelsLoading, refetch: refetchFactionRels } = useFactionRelationships(campaignId);
  const { updateRelationship: updateFactionRelationship } = useUpdateFactionRelationship();
  const { overrides: strengthOverrides, loading: overridesLoading, refetch: refetchOverrides } = useRelationshipStrengthOverrides(campaignId);
  const { upsertOverride } = useUpsertRelationshipStrengthOverride();
  
  const [locationRelationships, setLocationRelationships] = useState<LocationRelationship[]>([]);
  const [locationRelsLoading, setLocationRelsLoading] = useState(true);
  
  // Convert overrides array to Map for easier lookup
  const strengthOverridesMap = useMemo(() => {
    const map = new Map<string, number>();
    strengthOverrides.forEach(override => {
      map.set(override.relationship_key, override.strength);
    });
    return map;
  }, [strengthOverrides]);

  useEffect(() => {
    async function loadLocationRelationships() {
      setLocationRelsLoading(true);
      const rels = await fetchLocationRelationships(campaignId);
      setLocationRelationships(rels);
      setLocationRelsLoading(false);
    }
    loadLocationRelationships();
  }, [campaignId]);

  // Create structure-only version (for memoization) - this only changes when connections change
  const relationshipsStructure = useMemo(() => {
    return [
      factionRelationships.map((r: FactionRelationship) => `faction-${r.faction_a_id}-${r.faction_b_id}`).sort().join(','),
      locationRelationships.map((r: LocationRelationship) => `location-${r.location_a_id}-${r.location_b_id}`).sort().join(','),
      factions?.filter(f => f.headquarters_location_id).map(f => `faction-hq-${f.id}-${f.headquarters_location_id}`).sort().join(','),
      factions?.filter(f => f.leader_npc_id).map(f => `faction-leader-${f.id}-${f.leader_npc_id}`).sort().join(','),
      locations?.filter(l => l.parent_location_id).map(l => `location-parent-${l.id}-${l.parent_location_id}`).sort().join(','),
      deities?.flatMap(d => (d.worshipers_location_ids || []).map((lid: string) => `pantheon-worshipers-${d.id}-${lid}`)).sort().join(','),
    ].join('|');
  }, [factionRelationships, locationRelationships, factions, locations, deities]);

  // Cache the relationships array - only create new reference when structure changes
  const cachedRelationshipsRef = useRef<UnifiedRelationship[]>([]);
  const cachedStructureRef = useRef<string>('');
  
  // Convert faction relationships to unified format + extract automatic relationships
  const unifiedRelationships = useMemo<UnifiedRelationship[]>(() => {
    // If structure hasn't changed, reuse cached array and just update strengths
    if (relationshipsStructure === cachedStructureRef.current && cachedRelationshipsRef.current.length > 0) {
      // Update strengths in place without creating new array
      const strengthMap = new Map<string, number>();
      
      // Build strength map from latest data
      factionRelationships.forEach((rel: FactionRelationship) => {
        strengthMap.set(`faction-${rel.id}`, rel.strength);
      });
      locationRelationships.forEach((rel: LocationRelationship) => {
        strengthMap.set(`location-${rel.id}`, Math.max(0, Math.min(100, (rel.affection_score ?? 0) + 100)));
      });
      factions?.forEach((faction) => {
        if (faction.headquarters_location_id) {
          const relId = `faction-hq-${faction.id}-${faction.headquarters_location_id}`;
          strengthMap.set(relId, strengthOverridesMap.get(relId) ?? 100);
        }
      });
      factions?.forEach((faction) => {
        if (faction.leader_npc_id) {
          const relId = `faction-leader-${faction.id}-${faction.leader_npc_id}`;
          strengthMap.set(relId, strengthOverridesMap.get(relId) ?? 100);
        }
      });
      locations?.forEach((location) => {
        if (location.parent_location_id) {
          const relId = `location-parent-${location.id}-${location.parent_location_id}`;
          const existingRel = locationRelationships.find(
            (r: LocationRelationship) => 
              (r.location_a_id === location.id && r.location_b_id === location.parent_location_id) ||
              (r.location_a_id === location.parent_location_id && r.location_b_id === location.id)
          );
          if (existingRel) {
            strengthMap.set(`location-${existingRel.id}`, Math.max(0, Math.min(100, (existingRel.affection_score ?? 0) + 100)));
          } else {
            strengthMap.set(relId, strengthOverridesMap.get(relId) ?? 80);
          }
        }
      });
      deities?.forEach((deity) => {
        if (deity.worshipers_location_ids && deity.worshipers_location_ids.length > 0) {
          deity.worshipers_location_ids.forEach((locationId: string) => {
            const relId = `pantheon-worshipers-${deity.id}-${locationId}`;
            strengthMap.set(relId, strengthOverridesMap.get(relId) ?? 70);
          });
        }
      });
      
      // Update strengths in cached relationships without creating new array
      // IMPORTANT: Mutate in place to keep same array reference
      cachedRelationshipsRef.current.forEach(rel => {
        const newStrength = strengthMap.get(rel.id);
        if (newStrength !== undefined && rel.strength !== newStrength) {
          rel.strength = newStrength;
        }
      });
      
      // Return same array reference - this prevents component re-render
      // Even though we mutated the objects, the array reference is the same
      return cachedRelationshipsRef.current;
    }

    // Structure changed - create new relationships array
    const unified: UnifiedRelationship[] = [];

    // 1. Convert explicit faction relationships
    factionRelationships.forEach((rel: FactionRelationship) => {
      unified.push({
        id: `faction-${rel.id}`,
        sourceId: rel.faction_a_id,
        targetId: rel.faction_b_id,
        sourceType: 'faction',
        targetType: 'faction',
        type: (rel.relationship_type || 'neutral') as RelationshipType,
        strength: rel.strength,
        isSecret: !rel.public,
        description: rel.secret_notes || null,
      });
    });

    // 2. Convert explicit location relationships
    locationRelationships.forEach((rel: LocationRelationship) => {
      unified.push({
        id: `location-${rel.id}`,
        sourceId: rel.location_a_id,
        targetId: rel.location_b_id,
        sourceType: 'location',
        targetType: 'location',
        type: (rel.relationship_type || 'neutral') as RelationshipType,
        strength: Math.max(0, Math.min(100, (rel.affection_score ?? 0) + 100)),
        isSecret: false,
        description: rel.notes || null,
      });
    });

    // 3. Extract automatic relationships: Faction -> Location (headquarters)
    factions?.forEach((faction) => {
      if (faction.headquarters_location_id) {
        const relId = `faction-hq-${faction.id}-${faction.headquarters_location_id}`;
        unified.push({
          id: relId,
          sourceId: faction.id,
          targetId: faction.headquarters_location_id,
          sourceType: 'faction',
          targetType: 'location',
          type: 'alliance',
          strength: strengthOverridesMap.get(relId) ?? 100,
          isSecret: false,
          description: 'Headquarters',
        });
      }
    });

    // 4. Extract automatic relationships: Faction -> NPC (leader)
    factions?.forEach((faction) => {
      if (faction.leader_npc_id) {
        const relId = `faction-leader-${faction.id}-${faction.leader_npc_id}`;
        unified.push({
          id: relId,
          sourceId: faction.id,
          targetId: faction.leader_npc_id,
          sourceType: 'faction',
          targetType: 'npc',
          type: 'alliance',
          strength: strengthOverridesMap.get(relId) ?? 100,
          isSecret: false,
          description: 'Leader',
        });
      }
    });

    // 5. Extract automatic relationships: Location -> Location (parent hierarchy)
    locations?.forEach((location) => {
      if (location.parent_location_id) {
        const relId = `location-parent-${location.id}-${location.parent_location_id}`;
        const existingRel = locationRelationships.find(
          (r: LocationRelationship) => 
            (r.location_a_id === location.id && r.location_b_id === location.parent_location_id) ||
            (r.location_a_id === location.parent_location_id && r.location_b_id === location.id)
        );
        
        if (existingRel) {
          unified.push({
            id: `location-${existingRel.id}`,
            sourceId: location.id,
            targetId: location.parent_location_id,
            sourceType: 'location',
            targetType: 'location',
            type: (existingRel.relationship_type || 'alliance') as RelationshipType,
            strength: Math.max(0, Math.min(100, (existingRel.affection_score ?? 0) + 100)),
            isSecret: false,
            description: existingRel.notes || 'Parent location',
          });
        } else {
          unified.push({
            id: relId,
            sourceId: location.id,
            targetId: location.parent_location_id,
            sourceType: 'location',
            targetType: 'location',
            type: 'alliance',
            strength: strengthOverridesMap.get(relId) ?? 80,
            isSecret: false,
            description: 'Parent location',
          });
        }
      }
    });

    // 6. Extract automatic relationships: Location -> Location (control)
    locationRelationships.forEach((rel: LocationRelationship) => {
      if (rel.controlling_location_id) {
        unified.push({
          id: `location-control-${rel.location_a_id}-${rel.controlling_location_id}`,
          sourceId: rel.location_a_id,
          targetId: rel.controlling_location_id,
          sourceType: 'location',
          targetType: 'location',
          type: 'vassal',
          strength: 90,
          isSecret: false,
          description: 'Controlled by',
        });
      }
    });

    // 7. Extract automatic relationships: Pantheon -> Location (worshipers)
    deities?.forEach((deity) => {
      if (deity.worshipers_location_ids && deity.worshipers_location_ids.length > 0) {
        deity.worshipers_location_ids.forEach((locationId: string) => {
          const relId = `pantheon-worshipers-${deity.id}-${locationId}`;
          unified.push({
            id: relId,
            sourceId: deity.id,
            targetId: locationId,
            sourceType: 'pantheon',
            targetType: 'location',
            type: 'alliance',
            strength: strengthOverridesMap.get(relId) ?? 70,
            isSecret: false,
            description: 'Worshiped here',
          });
        });
      }
    });

    // Cache for next time
    cachedRelationshipsRef.current = unified;
    cachedStructureRef.current = relationshipsStructure;

    return unified;
  }, [factionRelationships, locationRelationships, factions, locations, deities, strengthOverridesMap, relationshipsStructure]);
  

  // Handler for strength changes
  const handleStrengthChange = useCallback(async (
    relationshipId: string,
    newStrength: number,
    relationship: UnifiedRelationship
  ) => {
    // Determine which table to update based on relationship ID prefix
    if (relationshipId.startsWith('faction-') && relationship.sourceType === 'faction' && relationship.targetType === 'faction') {
      // Explicit faction relationship - extract the actual ID
      const actualId = relationshipId.replace('faction-', '');
      const result = await updateFactionRelationship(actualId, { strength: newStrength });
      if (result.success) {
        refetchFactionRels();
      }
    } else if (relationshipId.startsWith('location-') && relationship.sourceType === 'location' && relationship.targetType === 'location') {
      // Explicit location relationship - update affection_score
      const actualId = relationshipId.replace('location-', '');
      const supabase = createClient();
      // Convert 0-100 to -100 to 100 scale
      const affectionScore = Math.round((newStrength / 100) * 200 - 100);
      const { error } = await supabase
        .from('location_relationships')
        .update({ affection_score: affectionScore })
        .eq('id', actualId);
      
      if (!error) {
        // Reload location relationships
        const rels = await fetchLocationRelationships(campaignId);
        setLocationRelationships(rels);
      }
    } else if (relationshipId.startsWith('location-parent-')) {
      // Location parent relationship - try to create or update explicit location_relationship
      // Use sourceId and targetId from the relationship object (these are the actual UUIDs)
      const locationId = relationship.sourceId;
      const parentId = relationship.targetId;
      
      const supabase = createClient();
      const affectionScore = Math.round((newStrength / 100) * 200 - 100);
      
      // Check if relationship already exists
      const existingRel = locationRelationships.find(
        (r: LocationRelationship) => 
          (r.location_a_id === locationId && r.location_b_id === parentId) ||
          (r.location_a_id === parentId && r.location_b_id === locationId)
      );
      
      if (existingRel) {
        // Update existing
        const { error } = await supabase
          .from('location_relationships')
          .update({ affection_score: affectionScore })
          .eq('id', existingRel.id);
        
        if (!error) {
          const rels = await fetchLocationRelationships(campaignId);
          setLocationRelationships(rels);
        }
      } else {
        // Create new explicit relationship
        const { error } = await supabase
          .from('location_relationships')
          .insert({
            campaign_id: campaignId,
            location_a_id: locationId,
            location_b_id: parentId,
            relationship_type: 'alliance',
            affection_score: affectionScore,
            notes: 'Parent location',
          });
        
        if (!error) {
          const rels = await fetchLocationRelationships(campaignId);
          setLocationRelationships(rels);
        }
      }
    } else {
      // Other automatic relationships (faction-hq, faction-leader, pantheon-worshipers, location-control)
      // Store in database using relationship_strength_overrides table
      const result = await upsertOverride({
        campaign_id: campaignId,
        relationship_key: relationshipId,
        source_type: relationship.sourceType,
        source_id: relationship.sourceId,
        target_type: relationship.targetType,
        target_id: relationship.targetId,
        strength: newStrength,
      });
      
      if (result.success) {
        refetchOverrides();
      }
    }
  }, [campaignId, updateFactionRelationship, refetchFactionRels, locationRelationships, upsertOverride, refetchOverrides]);

  const loading =
    npcsLoading ||
    factionsLoading ||
    locationsLoading ||
    pantheonsLoading ||
    factionRelsLoading ||
    locationRelsLoading ||
    overridesLoading;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[600px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Debug: Check if we have any data
  const totalEntities = (npcs?.length || 0) + (factions?.length || 0) + (locations?.length || 0) + (deities?.length || 0);
  
  if (totalEntities === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            No entities found. Create NPCs, Factions, Locations, or Pantheon deities to see the relationship web.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="h-[600px] w-full">
          <RelationshipGraph
            npcs={npcs || []}
            factions={factions || []}
            locations={locations || []}
            pantheons={deities || []}
            relationships={unifiedRelationships}
            onRelationshipStrengthChange={handleStrengthChange}
            className="w-full h-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
