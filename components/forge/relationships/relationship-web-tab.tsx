"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RelationshipBoardGraph, RelationshipBoardNode, RelationshipBoardConnection } from "./relationship-board-graph";
import { RelationshipBoardSidebar } from "./relationship-board-sidebar";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";
import {
  useFactions,
  useWorldLocations,
  usePantheonDeities,
} from "@/hooks/useForgeContent";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface RelationshipWebTabProps {
  campaignId: string;
  isDm: boolean;
}

export function RelationshipWebTab({ campaignId, isDm }: RelationshipWebTabProps) {
  const { npcs, loading: npcsLoading } = useCampaignNPCs(campaignId);
  const { factions, loading: factionsLoading } = useFactions(campaignId);
  const { locations, loading: locationsLoading } = useWorldLocations(campaignId);
  const { deities, loading: pantheonsLoading } = usePantheonDeities(campaignId);

  const [boardNodes, setBoardNodes] = useState<RelationshipBoardNode[]>([]);
  const [boardConnections, setBoardConnections] = useState<RelationshipBoardConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Create entity data maps for quick lookup
  const entityData = useMemo(() => {
    const npcMap = new Map();
    const factionMap = new Map();
    const locationMap = new Map();
    const pantheonMap = new Map();

    npcs?.forEach((npc) => npcMap.set(npc.id, npc));
    factions?.forEach((faction) => factionMap.set(faction.id, faction));
    locations?.forEach((location) => locationMap.set(location.id, location));
    deities?.forEach((deity) => pantheonMap.set(deity.id, deity));

    return {
      npcs: npcMap,
      factions: factionMap,
      locations: locationMap,
      pantheons: pantheonMap,
    };
  }, [npcs, factions, locations, deities]);

  // Load board data from database
  useEffect(() => {
    async function loadBoardData() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
          .from('campaigns')
          .select('relationship_board_data')
          .eq('id', campaignId)
          .single();

        if (error) throw error;

        const boardData = data?.relationship_board_data as {
          nodes?: RelationshipBoardNode[];
          connections?: RelationshipBoardConnection[];
        } || { nodes: [], connections: [] };

        setBoardNodes(boardData.nodes || []);
        setBoardConnections(boardData.connections || []);
      } catch (error) {
        console.error('Error loading relationship board data:', error);
        toast.error('Failed to load relationship board');
      } finally {
        setLoading(false);
      }
    }

    loadBoardData();
  }, [campaignId]);

  // Save board data to database
  const saveBoardData = useCallback(async (nodes: RelationshipBoardNode[], connections: RelationshipBoardConnection[]) => {
    if (!isDm) return; // Only DM can save

    try {
      setSaving(true);
      const supabase = createClient();
      const { error } = await supabase
        .from('campaigns')
        .update({
          relationship_board_data: { nodes, connections },
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving relationship board data:', error);
      toast.error('Failed to save relationship board');
    } finally {
      setSaving(false);
    }
  }, [campaignId, isDm]);

  // Handle nodes change
  const handleNodesChange = useCallback((nodes: RelationshipBoardNode[]) => {
    setBoardNodes(nodes);
    saveBoardData(nodes, boardConnections);
  }, [boardConnections, saveBoardData]);

  // Handle connections change
  const handleConnectionsChange = useCallback((connections: RelationshipBoardConnection[]) => {
    setBoardConnections(connections);
    saveBoardData(boardNodes, connections);
  }, [boardNodes, saveBoardData]);

  // Handle drag start from sidebar
  const handleDragStart = useCallback((
    entityType: 'npc' | 'faction' | 'location' | 'pantheon',
    entityId: string,
    entityName: string
  ) => {
    // This is just for visual feedback, actual drop is handled in onDrop
  }, []);

  // Handle node add from sidebar drag and drop
  const handleNodeAdd = useCallback((entityType: 'npc' | 'faction' | 'location' | 'pantheon', entityId: string, position: { x: number; y: number }) => {
    if (!isDm) return;

    // Check if node already exists
    const existingNode = boardNodes.find(
      (n) => n.entityType === entityType && n.entityId === entityId
    );
    if (existingNode) {
      const entity = entityData[`${entityType}s` as keyof typeof entityData]?.get(entityId);
      toast.info(`${entity?.name || 'Item'} is already on the board`);
      return;
    }

    const newNode: RelationshipBoardNode = {
      id: crypto.randomUUID(),
      entityType,
      entityId,
      position,
    };

    const updatedNodes = [...boardNodes, newNode];
    setBoardNodes(updatedNodes);
    saveBoardData(updatedNodes, boardConnections);
  }, [boardNodes, boardConnections, saveBoardData, isDm, entityData]);

  // Handle node delete
  const handleNodeDelete = useCallback((nodeId: string) => {
    if (!isDm) return;

    // Remove node and all its connections
    const updatedNodes = boardNodes.filter((n) => n.id !== nodeId);
    const updatedConnections = boardConnections.filter(
      (c) => c.sourceId !== nodeId && c.targetId !== nodeId
    );

    setBoardNodes(updatedNodes);
    setBoardConnections(updatedConnections);
    saveBoardData(updatedNodes, updatedConnections);
  }, [boardNodes, boardConnections, saveBoardData, isDm]);

  // Handle connection delete
  const handleConnectionDelete = useCallback((connectionId: string) => {
    if (!isDm) return;

    const updatedConnections = boardConnections.filter((c) => c.id !== connectionId);
    setBoardConnections(updatedConnections);
    saveBoardData(boardNodes, updatedConnections);
  }, [boardNodes, boardConnections, saveBoardData, isDm]);

  // Handle node click
  const handleNodeClick = useCallback((entityId: string, entityType: string) => {
    // Could navigate to entity detail page or show a modal
    console.log('Node clicked:', entityId, entityType);
  }, []);

  // Handle node select
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const isLoading = npcsLoading || factionsLoading || locationsLoading || pantheonsLoading || loading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[600px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex h-[600px] w-full">
          {isDm && (
            <RelationshipBoardSidebar
              npcs={npcs || []}
              factions={factions || []}
              locations={locations || []}
              pantheons={deities || []}
              onDragStart={handleDragStart}
            />
          )}
          <div className="flex-1">
            <RelationshipBoardGraph
              nodes={boardNodes}
              connections={boardConnections}
              entityData={entityData}
              onNodesChange={handleNodesChange}
              onConnectionsChange={handleConnectionsChange}
              onNodeClick={handleNodeClick}
              onNodeSelect={handleNodeSelect}
              onNodeDelete={handleNodeDelete}
              onConnectionDelete={handleConnectionDelete}
              onNodeAdd={handleNodeAdd}
              selectedNodeId={selectedNodeId}
              isDm={isDm}
              className="w-full h-full"
            />
          </div>
        </div>
        {saving && (
          <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 text-sm">
            Saving...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
