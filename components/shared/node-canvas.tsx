"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Group, Circle, Line, Text, Arrow } from "react-konva";
import { cn } from "@/lib/utils";
import Konva from "konva";

export interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  color?: string;
  size?: number;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  color?: string;
}

interface NodeCanvasProps {
  width?: number;
  height?: number;
  nodes?: Node[];
  connections?: Connection[];
  onNodesChange?: (nodes: Node[]) => void;
  onConnectionsChange?: (connections: Connection[]) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  nodeColor?: string;
  connectionColor?: string;
  showControls?: boolean;
  className?: string;
}

export function NodeCanvas({
  width = 800,
  height = 600,
  nodes = [],
  connections = [],
  onNodesChange,
  onConnectionsChange,
  onNodeSelect,
  selectedNodeId = null,
  nodeColor = "#6366f1",
  connectionColor = "#94a3b8",
  showControls = false,
  className,
}: NodeCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasNodes, setCanvasNodes] = useState<Node[]>(nodes);
  const [canvasConnections, setCanvasConnections] = useState<Connection[]>(connections);
  const [selectedId, setSelectedId] = useState<string | null>(selectedNodeId);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [tempConnection, setTempConnection] = useState<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null);

  // Sync external data
  useEffect(() => {
    setCanvasNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    setCanvasConnections(connections);
  }, [connections]);

  useEffect(() => {
    setSelectedId(selectedNodeId);
  }, [selectedNodeId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isPanning) {
        setIsPanning(true);
        e.preventDefault();
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        const newNodes = canvasNodes.filter(n => n.id !== selectedId);
        const newConnections = canvasConnections.filter(
          c => c.fromNodeId !== selectedId && c.toNodeId !== selectedId
        );
        setCanvasNodes(newNodes);
        setCanvasConnections(newConnections);
        onNodesChange?.(newNodes);
        onConnectionsChange?.(newConnections);
        setSelectedId(null);
        onNodeSelect?.(null);
      }
      
      // Escape to cancel connection
      if (e.key === 'Escape' && connectingFrom) {
        setConnectingFrom(null);
        setTempConnection(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, canvasNodes, canvasConnections, connectingFrom, isPanning, onNodesChange, onConnectionsChange, onNodeSelect]);

  // Pan handlers
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Right click or space for panning
    if (e.evt.button === 1 || e.evt.button === 2 || (e.evt.button === 0 && isPanning)) {
      setIsPanning(true);
      const pos = stage.getPointerPosition();
      if (pos) {
        setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
      }
      e.evt.preventDefault();
      return;
    }

    // Left click
    if (e.evt.button === 0) {
      const clickedOnEmpty = e.target === stage;
      const clickedOnNode = e.target.name() === 'node';

      if (clickedOnEmpty && !clickedOnNode) {
        // Create new node on click
        const pos = stage.getPointerPosition();
        if (pos) {
          const newNode: Node = {
            id: `node-${Date.now()}-${Math.random()}`,
            x: (pos.x - pan.x) / zoom,
            y: (pos.y - pan.y) / zoom,
            label: `Node ${canvasNodes.length + 1}`,
            color: nodeColor,
            size: 60,
          };
          const newNodes = [...canvasNodes, newNode];
          setCanvasNodes(newNodes);
          onNodesChange?.(newNodes);
          setSelectedId(newNode.id);
          onNodeSelect?.(newNode.id);
        }
      } else if (clickedOnNode) {
        const nodeId = e.target.id();
        if (nodeId) {
          if (connectingFrom && connectingFrom !== nodeId) {
            // Complete connection
            const newConnection: Connection = {
              id: `conn-${Date.now()}-${Math.random()}`,
              fromNodeId: connectingFrom,
              toNodeId: nodeId,
              color: connectionColor,
            };
            const newConnections = [...canvasConnections, newConnection];
            setCanvasConnections(newConnections);
            onConnectionsChange?.(newConnections);
            setConnectingFrom(null);
            setTempConnection(null);
          } else {
            // Select node
            setSelectedId(nodeId);
            onNodeSelect?.(nodeId);
          }
        }
      }
    }
  }, [pan, zoom, isPanning, canvasNodes, connectingFrom, nodeColor, connectionColor, onNodesChange, onConnectionsChange, onNodeSelect]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (isPanning) {
      const pos = stage.getPointerPosition();
      if (pos) {
        setPan({
          x: pos.x - panStart.x,
          y: pos.y - panStart.y,
        });
      }
    } else if (connectingFrom) {
      const pos = stage.getPointerPosition();
      if (pos) {
        const fromNode = canvasNodes.find(n => n.id === connectingFrom);
        if (fromNode) {
          setTempConnection({
            fromX: fromNode.x * zoom + pan.x,
            fromY: fromNode.y * zoom + pan.y,
            toX: pos.x,
            toY: pos.y,
          });
        }
      }
    }
  }, [isPanning, panStart, connectingFrom, pan, zoom, canvasNodes]);

  const handleStageMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const scaleBy = 1.1;
    const oldZoom = zoom;
    let newZoom = zoom;
    
    if (e.evt.deltaY < 0) {
      newZoom = Math.min(zoom * scaleBy, 3);
    } else {
      newZoom = Math.max(zoom / scaleBy, 0.3);
    }

    if (newZoom !== oldZoom) {
      const mousePointTo = {
        x: (pointerPos.x - pan.x) / oldZoom,
        y: (pointerPos.y - pan.y) / oldZoom,
      };

      const newPan = {
        x: pointerPos.x - mousePointTo.x * newZoom,
        y: pointerPos.y - mousePointTo.y * newZoom,
      };

      setZoom(newZoom);
      setPan(newPan);
    }
  }, [zoom, pan]);

  // Handle node double click to start connection
  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    if (connectingFrom === nodeId) {
      setConnectingFrom(null);
      setTempConnection(null);
    } else {
      setConnectingFrom(nodeId);
      const node = canvasNodes.find(n => n.id === nodeId);
      if (node && stageRef.current) {
        const pos = stageRef.current.getPointerPosition();
        if (pos) {
          setTempConnection({
            fromX: node.x * zoom + pan.x,
            fromY: node.y * zoom + pan.y,
            toX: pos.x,
            toY: pos.y,
          });
        }
      }
    }
  }, [connectingFrom, canvasNodes, zoom, pan]);

  // Calculate connection points
  const getConnectionPoints = useCallback((fromNode: Node, toNode: Node) => {
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const fromSize = (fromNode.size || 60) / 2;
    const toSize = (toNode.size || 60) / 2;
    
    const fromX = fromNode.x + (dx / distance) * fromSize;
    const fromY = fromNode.y + (dy / distance) * fromSize;
    const toX = toNode.x - (dx / distance) * toSize;
    const toY = toNode.y - (dy / distance) * toSize;
    
    return {
      fromX: fromX * zoom + pan.x,
      fromY: fromY * zoom + pan.y,
      toX: toX * zoom + pan.x,
      toY: toY * zoom + pan.y,
    };
  }, [zoom, pan]);

  // Render connections
  const renderConnections = useMemo(() => {
    return canvasConnections.map(conn => {
      const fromNode = canvasNodes.find(n => n.id === conn.fromNodeId);
      const toNode = canvasNodes.find(n => n.id === conn.toNodeId);
      
      if (!fromNode || !toNode) return null;

      const points = getConnectionPoints(fromNode, toNode);
      
      // Calculate arrow head
      const angle = Math.atan2(points.toY - points.fromY, points.toX - points.fromX);
      const arrowLength = 15;
      const arrowWidth = 8;
      
      const arrowX = points.toX - Math.cos(angle) * arrowLength;
      const arrowY = points.toY - Math.sin(angle) * arrowLength;
      
      return (
        <Group key={conn.id}>
          <Line
            points={[points.fromX, points.fromY, points.toX, points.toY]}
            stroke={conn.color || connectionColor}
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
          {/* Arrow head */}
          <Line
            points={[
              points.toX,
              points.toY,
              arrowX - Math.cos(angle - Math.PI / 6) * arrowWidth,
              arrowY - Math.sin(angle - Math.PI / 6) * arrowWidth,
            ]}
            stroke={conn.color || connectionColor}
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
          <Line
            points={[
              points.toX,
              points.toY,
              arrowX - Math.cos(angle + Math.PI / 6) * arrowWidth,
              arrowY - Math.sin(angle + Math.PI / 6) * arrowWidth,
            ]}
            stroke={conn.color || connectionColor}
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
        </Group>
      );
    });
  }, [canvasConnections, canvasNodes, getConnectionPoints, connectionColor]);

  // Render temporary connection
  const renderTempConnection = useMemo(() => {
    if (!tempConnection) return null;

    const angle = Math.atan2(
      tempConnection.toY - tempConnection.fromY,
      tempConnection.toX - tempConnection.fromX
    );
    const arrowLength = 15;
    const arrowWidth = 8;
    const arrowX = tempConnection.toX - Math.cos(angle) * arrowLength;
    const arrowY = tempConnection.toY - Math.sin(angle) * arrowLength;

    return (
      <Group>
        <Line
          points={[tempConnection.fromX, tempConnection.fromY, tempConnection.toX, tempConnection.toY]}
          stroke={connectionColor}
          strokeWidth={2}
          strokeDasharray={[5, 5]}
          lineCap="round"
        />
        <Line
          points={[
            tempConnection.toX,
            tempConnection.toY,
            arrowX - Math.cos(angle - Math.PI / 6) * arrowWidth,
            arrowY - Math.sin(angle - Math.PI / 6) * arrowWidth,
          ]}
          stroke={connectionColor}
          strokeWidth={2}
          strokeDasharray={[5, 5]}
          lineCap="round"
        />
        <Line
          points={[
            tempConnection.toX,
            tempConnection.toY,
            arrowX - Math.cos(angle + Math.PI / 6) * arrowWidth,
            arrowY - Math.sin(angle + Math.PI / 6) * arrowWidth,
          ]}
          stroke={connectionColor}
          strokeWidth={2}
          strokeDasharray={[5, 5]}
          lineCap="round"
        />
      </Group>
    );
  }, [tempConnection, connectionColor]);

  // Render nodes
  const renderNodes = useMemo(() => {
    return canvasNodes.map(node => {
      const size = node.size || 60;
      const x = node.x * zoom + pan.x;
      const y = node.y * zoom + pan.y;
      const isSelected = selectedId === node.id;
      const isConnecting = connectingFrom === node.id;

      return (
        <Group
          key={node.id}
          id={node.id}
          name="node"
          x={x}
          y={y}
          draggable={!connectingFrom}
          dragBoundFunc={(pos) => {
            // Keep nodes within bounds if needed, or return pos as-is for infinite canvas
            return pos;
          }}
          onDragEnd={(e) => {
            const newNodes = canvasNodes.map(n => {
              if (n.id === node.id) {
                return {
                  ...n,
                  x: (e.target.x() - pan.x) / zoom,
                  y: (e.target.y() - pan.y) / zoom,
                };
              }
              return n;
            });
            setCanvasNodes(newNodes);
            onNodesChange?.(newNodes);
          }}
          onDblClick={() => handleNodeDoubleClick(node.id)}
          onClick={() => {
            if (!connectingFrom) {
              setSelectedId(node.id);
              onNodeSelect?.(node.id);
            }
          }}
        >
          {/* Node circle with glow */}
          <Circle
            radius={size / 2}
            fill={isConnecting ? "#f59e0b" : node.color || nodeColor}
            stroke={isSelected ? "#fff" : "rgba(255, 255, 255, 0.2)"}
            strokeWidth={isSelected ? 3 : 2}
            shadowColor={isSelected ? node.color || nodeColor : "rgba(0, 0, 0, 0.3)"}
            shadowBlur={isSelected ? 15 : 8}
            shadowOpacity={0.6}
          />
          {/* Label */}
          <Text
            text={node.label}
            fontSize={14}
            fill="#fff"
            fontStyle="600"
            align="center"
            verticalAlign="middle"
            width={size}
            height={size}
            offsetX={-size / 2}
            offsetY={-size / 2}
            listening={false}
          />
        </Group>
      );
    });
  }, [canvasNodes, selectedId, connectingFrom, zoom, pan, nodeColor, handleNodeDoubleClick, onNodesChange, onNodeSelect]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden",
        className
      )}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : connectingFrom ? 'crosshair' : 'default' }}
      >
        <Layer>
          {/* Connections */}
          {renderConnections}
          
          {/* Temporary connection */}
          {renderTempConnection}
          
          {/* Nodes */}
          {renderNodes}
        </Layer>
      </Stage>

      {/* Instructions */}
      {showControls && (
        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm border rounded-lg px-4 py-2 text-sm text-muted-foreground">
          <p>Click to create node • Drag to move • Double-click to connect • Space+drag to pan</p>
        </div>
      )}

      {/* Connection hint */}
      {connectingFrom && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
          Click another node to connect (ESC to cancel)
        </div>
      )}
    </div>
  );
}

