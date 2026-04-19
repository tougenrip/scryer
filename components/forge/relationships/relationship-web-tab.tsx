"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RelationshipBoardGraph, RelationshipBoardNode, RelationshipBoardConnection } from "./relationship-board-graph";
import { RelationshipBoardSidebar } from "./relationship-board-sidebar";
import { RelationshipType } from "./affinity-edge";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";
import {
  useFactions,
  useWorldLocations,
  usePantheonDeities,
} from "@/hooks/useForgeContent";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Maximize2,
  Minimize2,
  User,
  Flag,
  MapPin,
  Sparkles,
  Filter,
} from "lucide-react";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Entity type filters
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({
    npc: true,
    faction: true,
    location: true,
    pantheon: true,
  });

  // Connection editing state
  const [editingConnection, setEditingConnection] = useState<RelationshipBoardConnection | null>(null);
  const [editConnectionOpen, setEditConnectionOpen] = useState(false);

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

  // Toggle entity type filter
  const toggleEntityType = useCallback((type: string) => {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  // Filter nodes based on visible types
  const filteredNodes = useMemo(() => {
    return boardNodes.filter((node) => visibleTypes[node.entityType]);
  }, [boardNodes, visibleTypes]);

  // Filter connections to only show those between visible nodes
  const filteredConnections = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return boardConnections.filter(
      (c) => visibleNodeIds.has(c.sourceId) && visibleNodeIds.has(c.targetId)
    );
  }, [boardConnections, filteredNodes]);

  // Handle connection edit (from edge click)
  const handleConnectionEdit = useCallback((connectionId: string) => {
    const conn = boardConnections.find((c) => c.id === connectionId);
    if (conn) {
      setEditingConnection({ ...conn });
      setEditConnectionOpen(true);
    }
  }, [boardConnections]);

  // Save connection edits
  const handleSaveConnectionEdit = useCallback(() => {
    if (!editingConnection) return;
    const updatedConnections = boardConnections.map((c) =>
      c.id === editingConnection.id ? editingConnection : c
    );
    setBoardConnections(updatedConnections);
    saveBoardData(boardNodes, updatedConnections);
    setEditConnectionOpen(false);
    setEditingConnection(null);
    toast.success('Connection updated');
  }, [editingConnection, boardConnections, boardNodes, saveBoardData]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Handle Escape to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  const isLoading = npcsLoading || factionsLoading || locationsLoading || pantheonsLoading || loading;

  if (isLoading) {
    return (
      <div style={{ padding: "16px 20px" }}>
        <Skeleton className="h-6 w-56 mb-2" />
        <Skeleton className="h-3 w-80 mb-4" />
        <div className="sc-card" style={{ padding: 14 }}>
          <Skeleton className="h-[600px] w-full" />
        </div>
      </div>
    );
  }

  const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
    { value: 'neutral', label: 'Neutral' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'bond', label: 'Bond' },
    { value: 'romance', label: 'Romance' },
    { value: 'family', label: 'Family' },
    { value: 'alliance', label: 'Alliance' },
    { value: 'trade', label: 'Trade' },
    { value: 'trade_partner', label: 'Trade Partner' },
    { value: 'trading_partner', label: 'Trading Partner' },
    { value: 'trade_route', label: 'Trade Route' },
    { value: 'vassal', label: 'Vassal' },
    { value: 'rivalry', label: 'Rivalry' },
    { value: 'hostile', label: 'Hostile' },
    { value: 'enemy', label: 'Enemy' },
    { value: 'war', label: 'War' },
  ];

  const filterButtons = [
    { type: 'npc', label: 'NPCs', icon: User, count: (npcs || []).length },
    { type: 'faction', label: 'Factions', icon: Flag, count: (factions || []).length },
    { type: 'location', label: 'Locations', icon: MapPin, count: (locations || []).length },
    { type: 'pantheon', label: 'Pantheons', icon: Sparkles, count: (deities || []).length },
  ];

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          isFullscreen && "fixed inset-0 z-50 bg-background"
        )}
        style={!isFullscreen ? { padding: "16px 20px" } : undefined}
      >
        {!isFullscreen && (
          <div style={{ marginBottom: 14 }}>
            <div className="font-serif" style={{ fontSize: 20 }}>
              Relationship Web
            </div>
            <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
              Visualize bonds, alliances, and rivalries between NPCs, factions,
              locations, and deities
            </div>
          </div>
        )}
        <Card className={cn("overflow-hidden", isFullscreen && "rounded-none border-0 h-full")}>
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {filterButtons.map(({ type, label, icon: Icon, count }) => (
                <Button
                  key={type}
                  variant={visibleTypes[type] ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 gap-1.5 text-xs",
                    !visibleTypes[type] && "opacity-50"
                  )}
                  onClick={() => toggleEntityType(type)}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="text-[10px] text-muted-foreground">({count})</span>
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {saving && (
                <span className="text-xs text-muted-foreground animate-pulse mr-2">Saving...</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={toggleFullscreen}
                title={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <CardContent className="p-0">
            <div className={cn("flex w-full", isFullscreen ? "h-[calc(100vh-41px)]" : "h-[600px]")}>
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
                  nodes={filteredNodes}
                  connections={filteredConnections}
                  entityData={entityData}
                  onNodesChange={handleNodesChange}
                  onConnectionsChange={handleConnectionsChange}
                  onNodeClick={handleNodeClick}
                  onNodeSelect={handleNodeSelect}
                  onNodeDelete={handleNodeDelete}
                  onConnectionDelete={handleConnectionDelete}
                  onNodeAdd={handleNodeAdd}
                  onConnectionEdit={isDm ? handleConnectionEdit : undefined}
                  selectedNodeId={selectedNodeId}
                  isDm={isDm}
                  className="w-full h-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Edit Dialog */}
      <Dialog open={editConnectionOpen} onOpenChange={(open) => {
        if (!open) {
          setEditConnectionOpen(false);
          setEditingConnection(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>
              Change the relationship type, description, and visibility.
            </DialogDescription>
          </DialogHeader>
          {editingConnection && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Relationship Type</Label>
                <Select
                  value={editingConnection.type}
                  onValueChange={(value) =>
                    setEditingConnection({ ...editingConnection, type: value as RelationshipType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {rt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingConnection.description || ''}
                  onChange={(e) =>
                    setEditingConnection({ ...editingConnection, description: e.target.value || null })
                  }
                  placeholder="Describe this relationship..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="secret-toggle"
                  checked={editingConnection.isSecret || false}
                  onChange={(e) =>
                    setEditingConnection({ ...editingConnection, isSecret: e.target.checked })
                  }
                  className="rounded border-border"
                />
                <Label htmlFor="secret-toggle" className="text-sm cursor-pointer">
                  Secret relationship (only visible to DM)
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditConnectionOpen(false); setEditingConnection(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveConnectionEdit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
