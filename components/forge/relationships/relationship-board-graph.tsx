"use client";

import React, { useCallback, useMemo, useEffect, useRef } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  ReactFlowProvider,
  useReactFlow,
  Connection,
  ConnectionMode,
} from "reactflow";
import { useRelationshipGraphStore } from "./relationship-graph-store";
import { useShallow } from "zustand/react/shallow";
import "reactflow/dist/style.css";
import { nodeTypes } from "./custom-nodes";
import { edgeTypes, RelationshipEdgeData, RelationshipType } from "./affinity-edge";
import { NodeData } from "./custom-nodes";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RelationshipBoardNode {
  id: string;
  entityType: 'npc' | 'faction' | 'location' | 'pantheon';
  entityId: string;
  position: { x: number; y: number };
}

export interface RelationshipBoardConnection {
  id: string;
  sourceId: string;
  targetId: string;
  strength: number; // 0-5 (represented as hearts)
  type: RelationshipType;
}

interface RelationshipBoardGraphProps {
  nodes: RelationshipBoardNode[];
  connections: RelationshipBoardConnection[];
  entityData: {
    npcs: Map<string, any>;
    factions: Map<string, any>;
    locations: Map<string, any>;
    pantheons: Map<string, any>;
  };
  onNodesChange: (nodes: RelationshipBoardNode[]) => void;
  onConnectionsChange: (connections: RelationshipBoardConnection[]) => void;
  onNodeClick?: (nodeId: string, entityType: string) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  onNodeDelete?: (nodeId: string) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onNodeAdd?: (entityType: 'npc' | 'faction' | 'location' | 'pantheon', entityId: string, position: { x: number; y: number }) => void;
  selectedNodeId?: string | null;
  className?: string;
  isDm?: boolean;
}

function RelationshipBoardGraphInner({
  nodes: boardNodes,
  connections: boardConnections,
  entityData,
  onNodesChange,
  onConnectionsChange,
  onNodeClick,
  onNodeSelect,
  onNodeDelete,
  onConnectionDelete,
  onNodeAdd,
  selectedNodeId,
  className,
  isDm = true,
}: RelationshipBoardGraphProps) {
  const { nodes, edges, setNodes, setEdges, onNodesChange: onNodesChangeInternal, onEdgesChange: onEdgesChangeInternal } = useRelationshipGraphStore(
    useShallow((state) => ({
      nodes: state.nodes,
      edges: state.edges,
      setNodes: state.setNodes,
      setEdges: state.setEdges,
      onNodesChange: state.onNodesChange,
      onEdgesChange: state.onEdgesChange,
    }))
  );

  const { screenToFlowPosition, getViewport } = useReactFlow();
  const safeNodes = Array.isArray(nodes) ? nodes : [];
  const safeEdges = Array.isArray(edges) ? edges : [];

  // Calculate which handle is closest based on node positions
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
    
    // Map position to handle ID based on type
    if (handleType === 'source') {
      return `${position}-source`;
    } else {
      return `${position}-target`;
    }
  }, []);

  // Convert board nodes to ReactFlow nodes
  const reactFlowNodes = useMemo<Node<NodeData>[]>(() => {
    return boardNodes.map((boardNode) => {
      const entity = entityData[`${boardNode.entityType}s` as keyof typeof entityData]?.get(boardNode.entityId);
      if (!entity) return null;

      const isSelected = selectedNodeId === boardNode.id;
      
      let nodeData: NodeData & { onDelete?: () => void; isDm?: boolean; isSelected?: boolean };
      if (boardNode.entityType === 'npc') {
        nodeData = {
          id: boardNode.entityId,
          label: entity.name,
          entityType: 'npc',
          alignment: null,
          imageUrl: entity.image_url || null,
          selected: isSelected,
          onDelete: onNodeDelete ? () => onNodeDelete(boardNode.id) : undefined,
          isDm,
          isSelected,
        } as NodeData & { onDelete?: () => void; isDm?: boolean; isSelected?: boolean };
      } else if (boardNode.entityType === 'faction') {
        nodeData = {
          id: boardNode.entityId,
          label: entity.name,
          entityType: 'faction',
          alignment: entity.alignment || null,
          emblemUrl: entity.emblem_sigil_url || null,
          selected: isSelected,
          onDelete: onNodeDelete ? () => onNodeDelete(boardNode.id) : undefined,
          isDm,
          isSelected,
        } as NodeData & { onDelete?: () => void; isDm?: boolean; isSelected?: boolean };
      } else if (boardNode.entityType === 'location') {
        nodeData = {
          id: boardNode.entityId,
          label: entity.name,
          entityType: 'location',
          mapSnippet: entity.image_url || null,
          selected: isSelected,
          onDelete: onNodeDelete ? () => onNodeDelete(boardNode.id) : undefined,
          isDm,
          isSelected,
        } as NodeData & { onDelete?: () => void; isDm?: boolean; isSelected?: boolean };
      } else {
        nodeData = {
          id: boardNode.entityId,
          label: entity.name,
          entityType: 'pantheon',
          alignment: entity.alignment || null,
          imageUrl: entity.image_url || null,
          selected: isSelected,
          onDelete: onNodeDelete ? () => onNodeDelete(boardNode.id) : undefined,
          isDm,
          isSelected,
        } as NodeData & { onDelete?: () => void; isDm?: boolean; isSelected?: boolean };
      }

      return {
        id: boardNode.id,
        type: 'custom',
        position: boardNode.position,
        data: nodeData,
      } as Node<NodeData & { onDelete?: () => void; isDm?: boolean; isSelected?: boolean }>;
    }).filter((n): n is Node<NodeData & { onDelete?: () => void; isDm?: boolean; isSelected?: boolean }> => n !== null);
  }, [boardNodes, entityData, selectedNodeId, onNodeDelete, isDm]);

  // Convert board connections to ReactFlow edges
  const reactFlowEdges = useMemo<Edge<RelationshipEdgeData>[]>(() => {
    return boardConnections.map((conn) => {
      // Convert strength (0-5) to 0-100 scale
      const strength = (conn.strength / 5) * 100;
      
      // Find source and target node positions
      const sourceNode = reactFlowNodes.find((n) => n.id === conn.sourceId);
      const targetNode = reactFlowNodes.find((n) => n.id === conn.targetId);
      
      let sourceHandle: string | undefined;
      let targetHandle: string | undefined;
      
      if (sourceNode && targetNode) {
        sourceHandle = getClosestHandle(sourceNode.position, targetNode.position, 'source');
        targetHandle = getClosestHandle(targetNode.position, sourceNode.position, 'target');
      }
      
      return {
        id: conn.id,
        source: conn.sourceId,
        target: conn.targetId,
        type: 'affinity',
        sourceHandle,
        targetHandle,
        data: {
          type: conn.type,
          strength,
          isSecret: false,
          relationshipId: conn.id,
        } as RelationshipEdgeData,
      } as Edge<RelationshipEdgeData>;
    });
  }, [boardConnections, reactFlowNodes, getClosestHandle]);

  // Sync ReactFlow nodes/edges with board data
  useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  // Update edge handles when nodes are moved
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
      }));
    }
  }, [safeNodes, safeEdges.length, getClosestHandle, setEdges]);

  // Handle node position changes
  useEffect(() => {
    const handleNodePositionChange = () => {
      const updatedNodes = safeNodes.map((node) => {
        const boardNode = boardNodes.find((bn) => bn.id === node.id);
        if (!boardNode) return null;
        return {
          ...boardNode,
          position: node.position,
        };
      }).filter((n): n is RelationshipBoardNode => n !== null);
      
      if (updatedNodes.length === boardNodes.length) {
        onNodesChange(updatedNodes);
      }
    };

    // Debounce position updates
    const timeoutId = setTimeout(handleNodePositionChange, 300);
    return () => clearTimeout(timeoutId);
  }, [safeNodes.map(n => `${n.id}-${n.position.x}-${n.position.y}`).join(',')]);

  // Handle connections
  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    const newConnection: RelationshipBoardConnection = {
      id: `conn-${Date.now()}-${Math.random()}`,
      sourceId: connection.source,
      targetId: connection.target,
      strength: 3, // Default to 3 hearts
      type: 'neutral',
    };

    onConnectionsChange([...boardConnections, newConnection]);
  }, [boardConnections, onConnectionsChange]);

  // Handle node click - select/deselect
  const onNodeClickHandler = useCallback(
    (_: React.MouseEvent, node: Node<NodeData>) => {
      if (onNodeSelect) {
        const boardNode = boardNodes.find((bn) => bn.id === node.id);
        if (boardNode) {
          // Toggle selection: if already selected, deselect; otherwise select
          if (selectedNodeId === node.id) {
            onNodeSelect(null);
          } else {
            onNodeSelect(node.id);
          }
        }
      }
      if (onNodeClick) {
        const boardNode = boardNodes.find((bn) => bn.id === node.id);
        if (boardNode) {
          onNodeClick(boardNode.entityId, boardNode.entityType);
        }
      }
    },
    [onNodeSelect, onNodeClick, boardNodes, selectedNodeId]
  );

  // Handle pane click to deselect
  const onPaneClick = useCallback(() => {
    if (onNodeSelect) {
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  // Handle edge strength change
  const handleEdgeStrengthChange = useCallback((edgeId: string, newStrength: number) => {
    // Convert 0-100 to 0-5
    const heartStrength = Math.round((newStrength / 100) * 5);
    const updatedConnections = boardConnections.map((conn) =>
      conn.id === edgeId ? { ...conn, strength: heartStrength } : conn
    );
    onConnectionsChange(updatedConnections);
  }, [boardConnections, onConnectionsChange]);

  // Handle edge delete
  const handleEdgeDelete = useCallback((edgeId: string) => {
    if (!onConnectionDelete) return;
    onConnectionDelete(edgeId);
  }, [onConnectionDelete]);

  // Update edge data to include strength change handler and delete handler
  const edgesWithHandlers = useMemo(() => {
    return reactFlowEdges.map((edge) => ({
      ...edge,
      data: {
        ...edge.data,
        onStrengthChange: (newStrength: number) => handleEdgeStrengthChange(edge.id, newStrength),
        onDelete: onConnectionDelete ? () => handleEdgeDelete(edge.id) : undefined,
        isDm,
      },
    }));
  }, [reactFlowEdges, handleEdgeStrengthChange, handleEdgeDelete, onConnectionDelete, isDm]);

  useEffect(() => {
    setEdges(edgesWithHandlers);
  }, [edgesWithHandlers, setEdges]);

  // Handle pane drop (for drag and drop from sidebar) - using wrapper div since ReactFlow may not have onPaneDrop
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!isDm || !onNodeAdd) return;

    event.preventDefault();
    event.stopPropagation();
    
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/reactflow'));
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onNodeAdd(data.type, data.id, position);
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  }, [isDm, onNodeAdd, screenToFlowPosition]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div 
      className={cn("w-full h-full relative", className)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={safeNodes}
        edges={safeEdges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onNodeClick={onNodeClickHandler}
        onPaneClick={onPaneClick}
        onConnect={isDm ? onConnect : undefined}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={isDm}
        nodesDraggable={isDm}
        edgesUpdatable={false}
        edgesFocusable={false}
        connectionMode={ConnectionMode.Loose}
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

export function RelationshipBoardGraph(props: RelationshipBoardGraphProps) {
  return (
    <ReactFlowProvider>
      <RelationshipBoardGraphInner {...props} />
    </ReactFlowProvider>
  );
}

