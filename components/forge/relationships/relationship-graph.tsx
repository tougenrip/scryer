"use client";

import React, { useCallback, useMemo, useEffect, useRef, memo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  ReactFlowProvider,
  useReactFlow,
} from "reactflow";
import { useRelationshipGraphStore } from "./relationship-graph-store";
import { useShallow } from "zustand/react/shallow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./custom-nodes";
import { edgeTypes, RelationshipEdgeData, RelationshipType } from "./affinity-edge";
import {
  NPCNodeData,
  FactionNodeData,
  LocationNodeData,
  PantheonNodeData,
  NodeData,
} from "./custom-nodes";
import { NPC } from "@/hooks/useCampaignContent";
import { Faction, FactionRelationship } from "@/hooks/useForgeContent";
import { WorldLocation, LocationRelationship } from "@/hooks/useForgeContent";
import { PantheonDeity } from "@/hooks/useForgeContent";

export interface UnifiedRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  sourceType: 'npc' | 'faction' | 'location' | 'pantheon';
  targetType: 'npc' | 'faction' | 'location' | 'pantheon';
  type: RelationshipType;
  strength: number;
  isSecret: boolean;
  description?: string | null;
}

interface RelationshipGraphProps {
  npcs?: NPC[];
  factions?: Faction[];
  locations?: WorldLocation[];
  pantheons?: PantheonDeity[];
  relationships?: UnifiedRelationship[];
  onNodeClick?: (nodeId: string, entityType: string) => void;
  onRelationshipStrengthChange?: (relationshipId: string, newStrength: number, relationship: UnifiedRelationship) => void;
  className?: string;
}

// Force-directed layout algorithm for automatic grouping
function calculateForceDirectedLayout(
  nodes: Node<NodeData>[],
  edges: Edge<RelationshipEdgeData>[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Initialize positions
  nodes.forEach(node => {
    if (!positions.has(node.id)) {
      positions.set(node.id, { x: Math.random() * 1000, y: Math.random() * 1000 });
    }
  });
  
  // Simple force-directed layout iterations
  const iterations = 100;
  const k = Math.sqrt((1000 * 800) / nodes.length); // Optimal distance
  const temperature = 1000;
  const coolingRate = 0.95;
  
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();
    
    // Initialize forces
    nodes.forEach(node => {
      forces.set(node.id, { x: 0, y: 0 });
    });
    
    // Repulsive forces between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const posA = positions.get(nodeA.id)!;
        const posB = positions.get(nodeB.id)!;
        
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (k * k) / distance;
        
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        const forceA = forces.get(nodeA.id)!;
        const forceB = forces.get(nodeB.id)!;
        forceA.x += fx;
        forceA.y += fy;
        forceB.x -= fx;
        forceB.y -= fy;
      }
    }
    
    // Attractive forces along edges
    edges.forEach(edge => {
      const sourcePos = positions.get(edge.source);
      const targetPos = positions.get(edge.target);
      
      if (sourcePos && targetPos) {
        const dx = targetPos.x - sourcePos.x;
        const dy = targetPos.y - sourcePos.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (distance * distance) / k;
        
        const fx = (dx / distance) * force * 0.5;
        const fy = (dy / distance) * force * 0.5;
        
        const sourceForce = forces.get(edge.source)!;
        const targetForce = forces.get(edge.target)!;
        sourceForce.x += fx;
        sourceForce.y += fy;
        targetForce.x -= fx;
        targetForce.y -= fy;
      }
    });
    
    // Apply forces with temperature (simulated annealing)
    const currentTemp = temperature * Math.pow(coolingRate, iter);
    nodes.forEach(node => {
      const pos = positions.get(node.id)!;
      const force = forces.get(node.id)!;
      
      const magnitude = Math.sqrt(force.x * force.x + force.y * force.y);
      if (magnitude > 0) {
        const limitedForce = Math.min(magnitude, currentTemp) / magnitude;
        pos.x += force.x * limitedForce;
        pos.y += force.y * limitedForce;
      }
    });
    
    // Keep nodes within bounds
    nodes.forEach(node => {
      const pos = positions.get(node.id)!;
      pos.x = Math.max(0, Math.min(2000, pos.x));
      pos.y = Math.max(0, Math.min(1600, pos.y));
    });
  }
  
  return positions;
}

// Inner component that uses React Flow hooks (must be inside ReactFlowProvider)
function RelationshipGraphInner({
  npcs = [],
  factions = [],
  locations = [],
  pantheons = [],
  relationships = [],
  onNodeClick,
  onRelationshipStrengthChange,
  className,
}: RelationshipGraphProps) {
  // Use Zustand store for state management - prevents canvas resets
  // Use useShallow to avoid re-renders when object references change but values are the same
  const { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange } = useRelationshipGraphStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
    }))
  );
  
  // Ensure nodes and edges are always arrays
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];
  
  const { fitView } = useReactFlow();
  
  // Store relationships in a ref to prevent prop changes from triggering re-renders
  const relationshipsRef = useRef(relationships);
  const relationshipsStructureRef = useRef<string>('');
  
  // Only update relationships ref when structure changes (not when strength changes)
  const currentStructureKey = useMemo(() => {
    return relationships.map(r => `${r.id}:${r.sourceType}-${r.sourceId}-${r.targetType}-${r.targetId}`).sort().join(',');
  }, [relationships]);
  
  useEffect(() => {
    if (currentStructureKey !== relationshipsStructureRef.current) {
      relationshipsStructureRef.current = currentStructureKey;
      relationshipsRef.current = relationships;
    } else {
      // Structure hasn't changed - just update strength values in edges directly
      // Don't update the relationships ref to avoid triggering re-renders
    }
  }, [relationships, currentStructureKey]);

  // Base nodes without layout (for layout calculation)
  const baseNodes = useMemo<Node<NodeData>[]>(() => {
    const nodes: Node<NodeData>[] = [];
    let nodeIndex = 0;

    // Add NPC nodes
    npcs.forEach((npc) => {
      nodes.push({
        id: `npc-${npc.id}`,
        type: 'custom',
        position: { x: 0, y: 0 }, // Will be set by layout
        data: {
          id: npc.id,
          label: npc.name,
          entityType: 'npc',
          alignment: null,
          imageUrl: npc.image_url,
          selected: false,
          dimmed: false,
        } as NPCNodeData,
      });
      nodeIndex++;
    });

    // Add Faction nodes
    factions.forEach((faction) => {
      nodes.push({
        id: `faction-${faction.id}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          id: faction.id,
          label: faction.name,
          entityType: 'faction',
          alignment: faction.alignment,
          emblemUrl: faction.emblem_sigil_url,
          selected: false,
          dimmed: false,
        } as FactionNodeData,
      });
      nodeIndex++;
    });

    // Add Location nodes
    locations.forEach((location) => {
      nodes.push({
        id: `location-${location.id}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          id: location.id,
          label: location.name,
          entityType: 'location',
          mapSnippet: location.image_url,
          selected: false,
          dimmed: false,
        } as LocationNodeData,
      });
      nodeIndex++;
    });

    // Add Pantheon nodes
    pantheons.forEach((deity) => {
      nodes.push({
        id: `pantheon-${deity.id}`,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: {
          id: deity.id,
          label: deity.name,
          entityType: 'pantheon',
          alignment: deity.alignment,
          imageUrl: deity.image_url,
          selected: false,
          dimmed: false,
        } as PantheonNodeData,
      });
      nodeIndex++;
    });

    return nodes;
  }, [npcs, factions, locations, pantheons]);


  // Helper function to calculate closest handle based on node positions
  // Moved outside useMemo so it can be used in useEffect
  const getClosestHandle = useCallback((
    sourcePos: { x: number; y: number },
    targetPos: { x: number; y: number },
    handleType: 'source' | 'target'
  ): string => {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    
    // Calculate which direction is dominant
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    let position: 'top' | 'right' | 'bottom' | 'left';
    
    if (absDx > absDy) {
      // Horizontal is dominant
      position = dx > 0 ? 'right' : 'left';
    } else {
      // Vertical is dominant
      position = dy > 0 ? 'bottom' : 'top';
    }
    
    return `${position}-${handleType}`;
  }, []);

  // Create a stable signature of relationship structure (connections only, not strength/data)
  // Use the ref to prevent recalculation when only strength changes
  const relationshipStructureKey = useMemo(() => {
    return relationshipsRef.current.map(r => `${r.id}:${r.sourceType}-${r.sourceId}-${r.targetType}-${r.targetId}`).sort().join(',');
  }, [currentStructureKey]); // Only recalculate when structure actually changes

  // Create a map for quick lookup of relationships by ID
  const relationshipsMap = useMemo(() => {
    const map = new Map<string, UnifiedRelationship>();
    relationships.forEach(rel => map.set(rel.id, rel));
    return map;
  }, [relationships]);

  // Convert relationships to basic edges first (for layout calculation)
  // Only recalculate when structure changes (new/removed connections), not when strength changes
  // Use ref to prevent recalculation when only strength changes
  const basicEdges = useMemo<Edge<RelationshipEdgeData>[]>(() => {
    return relationshipsRef.current.map((rel) => {
      const sourceId = `${rel.sourceType}-${rel.sourceId}`;
      const targetId = `${rel.targetType}-${rel.targetId}`;
      
      return {
        id: rel.id,
        source: sourceId,
        target: targetId,
        type: 'affinity',
        style: {
          strokeWidth: 3,
        },
        data: {
          type: rel.type,
          strength: rel.strength,
          isSecret: rel.isSecret,
          description: rel.description,
        } as RelationshipEdgeData,
      };
    });
  }, [relationshipStructureKey]); // Only recalculate when structure changes

  // Apply force-directed layout to position nodes automatically based on relationships
  // Only recalculate positions when structure changes (not when strength changes)
  // Use a ref to store the last calculated layout positions and base node IDs
  const lastLayoutPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastStructureKeyRef = useRef<string>('');
  const lastBaseNodeIdsRef = useRef<string>('');
  
  const layoutNodes = useMemo<Node<NodeData>[]>(() => {
    const nodes = baseNodes.map(node => ({ ...node }));
    const baseNodeIds = baseNodes.map(n => n.id).sort().join(',');
    
    // If structure hasn't changed AND base nodes haven't changed, reuse previous positions
    if (
      relationshipStructureKey === lastStructureKeyRef.current && 
      baseNodeIds === lastBaseNodeIdsRef.current &&
      lastLayoutPositionsRef.current.size > 0
    ) {
      // Reuse previous positions - use the exact same position objects from cache
      nodes.forEach(node => {
        const savedPos = lastLayoutPositionsRef.current.get(node.id);
        if (savedPos) {
          // Use the cached position object directly to maintain reference equality
          node.position = savedPos;
        }
      });
      return nodes;
    }
    
    // Structure changed - recalculate layout
    // Calculate force-directed layout positions for automatic grouping
    if (nodes.length > 0) {
      if (basicEdges.length > 0) {
        const layoutPositions = calculateForceDirectedLayout(nodes, basicEdges);
        
        // Save positions for future reuse - store the actual position objects
        const positionsMap = new Map<string, { x: number; y: number }>();
        nodes.forEach(node => {
          const pos = layoutPositions.get(node.id);
          if (pos) {
            node.position = pos;
            positionsMap.set(node.id, pos);
          }
        });
        lastLayoutPositionsRef.current = positionsMap;
        lastStructureKeyRef.current = relationshipStructureKey;
        lastBaseNodeIdsRef.current = baseNodeIds;
      } else {
        // Fallback to grid layout if no relationships
        const cols = Math.ceil(Math.sqrt(nodes.length));
        const gridPositions = new Map<string, { x: number; y: number }>();
        nodes.forEach((node, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const pos = {
            x: 200 + col * 250,
            y: 200 + row * 200,
          };
          node.position = pos;
          gridPositions.set(node.id, pos);
        });
        lastLayoutPositionsRef.current = gridPositions;
        lastStructureKeyRef.current = relationshipStructureKey;
        lastBaseNodeIdsRef.current = baseNodeIds;
      }
    }

    return nodes;
  }, [baseNodes, basicEdges, relationshipStructureKey]);

  // Store layoutNodes in a ref so we can access it without triggering recalculation
  // MUST be declared before initialEdges since initialEdges uses it
  const layoutNodesRef = useRef(layoutNodes);
  useEffect(() => {
    layoutNodesRef.current = layoutNodes;
  }, [layoutNodes]);

  // Cache initialEdges and only recalculate when structure changes
  // IMPORTANT: This prevents edges from being reset when only strength changes
  const cachedInitialEdgesRef = useRef<Edge<RelationshipEdgeData>[]>([]);
  const cachedInitialEdgesStructureRef = useRef<string>('');
  
  const initialEdges = useMemo<Edge<RelationshipEdgeData>[]>(() => {
    // If structure hasn't changed, reuse cached edges completely
    if (relationshipStructureKey === cachedInitialEdgesStructureRef.current && cachedInitialEdgesRef.current.length > 0) {
      // Structure unchanged - return cached edges as-is
      // Strength will be updated by separate effect
      return cachedInitialEdgesRef.current;
    }
    
    // Structure changed - create new edges
    // Access layoutNodes from ref to avoid dependency issues
    const currentLayoutNodes = layoutNodesRef.current;
    const nodeIdSet = new Set<string>();
    const nodePositionMap = new Map<string, { x: number; y: number }>();
    currentLayoutNodes.forEach(node => {
      nodeIdSet.add(node.id);
      nodePositionMap.set(node.id, node.position);
    });
    
    // Use ref for relationships structure
    const newEdges = relationshipsRef.current
      .map((rel) => {
        const sourceId = `${rel.sourceType}-${rel.sourceId}`;
        const targetId = `${rel.targetType}-${rel.targetId}`;
        
        // Only create edge if both source and target nodes exist
        if (!nodeIdSet.has(sourceId) || !nodeIdSet.has(targetId)) {
          return null;
        }
        
        const sourcePos = nodePositionMap.get(sourceId);
        const targetPos = nodePositionMap.get(targetId);
        
        // Calculate handles based on relative positions
        let sourceHandle: string | undefined;
        let targetHandle: string | undefined;
        
        if (sourcePos && targetPos) {
          sourceHandle = getClosestHandle(sourcePos, targetPos, 'source');
          targetHandle = getClosestHandle(targetPos, sourcePos, 'target');
        }
        
        return {
          id: rel.id,
          source: sourceId,
          target: targetId,
          type: 'affinity',
          sourceHandle,
          targetHandle,
          className: 'affinity-edge',
          style: {
            strokeWidth: 3,
          },
          data: {
            type: rel.type,
            strength: rel.strength, // Use ref value - will be updated by separate effect
            isSecret: rel.isSecret,
            description: rel.description,
            onStrengthChange: (newStrength: number) => {
              if (onRelationshipStrengthChange) {
                onRelationshipStrengthChange(rel.id, newStrength, rel);
              }
            },
            relationshipId: rel.id,
            sourceType: rel.sourceType,
            targetType: rel.targetType,
          } as RelationshipEdgeData,
        };
      })
      .filter((edge): edge is Edge<RelationshipEdgeData> => edge !== null);
    
    cachedInitialEdgesRef.current = newEdges;
    cachedInitialEdgesStructureRef.current = relationshipStructureKey;
    
    return newEdges;
  }, [getClosestHandle, onRelationshipStrengthChange, relationshipStructureKey]); // ONLY depend on structure key - never recalculate when layoutNodes changes

  // Fit view to center on nodes after layout is calculated
  // Only do this once when nodes are first loaded, not when strength changes
  const hasFittedViewRef = useRef(false);
  useEffect(() => {
    if (layoutNodes.length > 0 && !hasFittedViewRef.current) {
      // Use setTimeout to ensure React Flow has rendered the nodes
      setTimeout(() => {
        fitView({
          padding: 0.2,
          duration: 400,
          maxZoom: 1,
          minZoom: 0.1,
        });
        hasFittedViewRef.current = true;
      }, 100);
    }
    
    // Reset if all nodes are removed
    if (layoutNodes.length === 0) {
      hasFittedViewRef.current = false;
    }
  }, [layoutNodes.length, fitView]);

  // Apply data to nodes (no focus/selection states)
  // Cache initialNodes and only recalculate when structure changes
  // IMPORTANT: This prevents nodes from being reset when only strength changes
  const cachedInitialNodesRef = useRef<Node<NodeData>[]>([]);
  const cachedInitialNodesStructureRef = useRef<string>('');
  
  const initialNodes = useMemo<Node<NodeData>[]>(() => {
    // Access layoutNodes from ref to avoid dependency issues
    const currentLayoutNodes = layoutNodesRef.current;
    
    // If structure hasn't changed, reuse cached nodes completely
    // Don't update positions - preserve current user positions
    if (relationshipStructureKey === cachedInitialNodesStructureRef.current && cachedInitialNodesRef.current.length > 0) {
      // Structure unchanged - return cached nodes as-is
      // React Flow will handle position updates from user dragging internally
      return cachedInitialNodesRef.current;
    }
    
    // Structure changed - create new nodes from layout
    const newNodes = currentLayoutNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        selected: false,
        dimmed: false,
      },
      position: node.position,
    }));
    
    cachedInitialNodesRef.current = newNodes;
    cachedInitialNodesStructureRef.current = relationshipStructureKey;
    
    return newNodes;
  }, [relationshipStructureKey]); // ONLY depend on structure key - never recalculate when layoutNodes changes

  // Track if we've initialized and what structure we initialized with
  const isInitializedRef = useRef(false);
  const prevNodeStructureKeyRef = useRef<string>('');
  
  // Initialize or update nodes/edges ONLY when structure changes
  useEffect(() => {
    // Only update nodes/edges when structure actually changes
    if (!isInitializedRef.current || relationshipStructureKey !== prevNodeStructureKeyRef.current) {
      isInitializedRef.current = true;
      prevNodeStructureKeyRef.current = relationshipStructureKey;
      // Structure changed - update nodes and edges
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    // Don't update nodes/edges if structure hasn't changed - strength updates handled via Zustand store
  }, [relationshipStructureKey, initialNodes, initialEdges, setNodes, setEdges]);

  // Update edge handles when nodes are moved (user dragging)
  // Use a ref to track previous positions and only update when positions actually change
  const prevNodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    if (safeEdges.length === 0 || safeNodes.length === 0) return;

    // Create a map of current node positions
    const nodePositionMap = new Map<string, { x: number; y: number }>();
    safeNodes.forEach(node => {
      nodePositionMap.set(node.id, node.position);
    });

    // Check if any positions actually changed
    let positionsChanged = false;
    for (const [nodeId, currentPos] of nodePositionMap.entries()) {
      const prevPos = prevNodePositionsRef.current.get(nodeId);
      if (!prevPos || prevPos.x !== currentPos.x || prevPos.y !== currentPos.y) {
        positionsChanged = true;
        break;
      }
    }

    // Only update if positions changed
    if (positionsChanged) {
      prevNodePositionsRef.current = new Map(nodePositionMap);

      // Update edges with new handle positions based on current node positions
      setEdges(safeEdges.map((edge) => {
          const sourcePos = nodePositionMap.get(edge.source);
          const targetPos = nodePositionMap.get(edge.target);

          if (sourcePos && targetPos) {
            const newSourceHandle = getClosestHandle(sourcePos, targetPos, 'source');
            const newTargetHandle = getClosestHandle(targetPos, sourcePos, 'target');

            // Only update if handles changed
            if (edge.sourceHandle !== newSourceHandle || edge.targetHandle !== newTargetHandle) {
              return {
                ...edge,
                sourceHandle: newSourceHandle,
                targetHandle: newTargetHandle,
              };
            }
          }

          return edge;
        })
      );
    }
  }, [safeNodes, safeEdges.length, getClosestHandle, setEdges]);

  // Handle node click (no focus mode)
  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      // Call external handler if provided
      if (onNodeClick) {
        const entityType = node.data.entityType;
        const entityId = node.data.id;
        onNodeClick(entityId, entityType);
      }
    },
    [onNodeClick]
  );

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={safeNodes}
        edges={safeEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClickHandler}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={false}
        nodesDraggable={true}
        edgesUpdatable={false}
        edgesFocusable={false}
        minZoom={0.1}
        maxZoom={2}
        fitView={false}
        attributionPosition="bottom-left"
      >
          <Background />
          <Controls />
      </ReactFlow>
    </div>
  );
}

// Memoize the inner component to prevent re-renders when only strength changes
const MemoizedRelationshipGraphInner = memo(RelationshipGraphInner, (prevProps, nextProps) => {
  // Create structure keys that ignore strength values
  const createStructureKey = (props: RelationshipGraphProps) => {
    const relKey = props.relationships
      ?.map(r => `${r.id}:${r.sourceType}-${r.sourceId}-${r.targetType}-${r.targetId}`)
      .sort()
      .join(',') || '';
    
    return [
      props.npcs?.map(n => n.id).sort().join(',') || '',
      props.factions?.map(f => f.id).sort().join(',') || '',
      props.locations?.map(l => l.id).sort().join(',') || '',
      props.pantheons?.map(p => p.id).sort().join(',') || '',
      relKey,
    ].join('|');
  };
  
  const prevKey = createStructureKey(prevProps);
  const nextKey = createStructureKey(nextProps);
  
  // Only re-render if structure changed (return false = re-render, true = skip)
  const shouldSkip = prevKey === nextKey;
  return shouldSkip;
});

// Main component with ReactFlowProvider
export function RelationshipGraph(props: RelationshipGraphProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlowProvider>
        <MemoizedRelationshipGraphInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}

