"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Group, Rect, Circle, Text, Line, Transformer } from "react-konva";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Move, Grid, Hand, Square, Circle as CircleIcon, Type, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import Konva from "konva";

// Types for canvas objects
export interface CanvasObject {
  id: string;
  type: 'rect' | 'circle' | 'text' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  points?: number[];
}

interface FigmaCanvasProps {
  width?: number;
  height?: number;
  objects?: CanvasObject[];
  onObjectsChange?: (objects: CanvasObject[]) => void;
  onObjectSelect?: (objectId: string | null) => void;
  selectedObjectId?: string | null;
  showGrid?: boolean;
  onShowGridChange?: (show: boolean) => void;
  showControls?: boolean;
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  className?: string;
}

export function FigmaCanvas({
  width = 800,
  height = 600,
  objects = [],
  onObjectsChange,
  onObjectSelect,
  selectedObjectId = null,
  showGrid = true,
  onShowGridChange,
  showControls = true,
  minZoom = 0.1,
  maxZoom = 5,
  initialZoom = 1,
  className,
}: FigmaCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'select' | 'rect' | 'circle' | 'text' | 'line'>('select');
  const [canvasObjects, setCanvasObjects] = useState<CanvasObject[]>(objects);
  const [selectedId, setSelectedId] = useState<string | null>(selectedObjectId);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 });

  // Sync external objects
  useEffect(() => {
    setCanvasObjects(objects);
  }, [objects]);

  // Sync selected ID
  useEffect(() => {
    setSelectedId(selectedObjectId);
  }, [selectedObjectId]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;

    const stage = stageRef.current;
    const transformer = transformerRef.current;
    const selectedNode = stage.findOne(`#${selectedId}`);

    if (selectedNode) {
      transformer.nodes([selectedNode]);
      transformer.getLayer()?.batchDraw();
    } else {
      transformer.nodes([]);
    }
  }, [selectedId]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Spacebar for panning
      if (e.code === 'Space' && !isSpacePressed) {
        setIsSpacePressed(true);
        e.preventDefault();
      }
      
      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && onObjectsChange) {
          const newObjects = canvasObjects.filter(obj => obj.id !== selectedId);
          setCanvasObjects(newObjects);
          onObjectsChange(newObjects);
          setSelectedId(null);
          onObjectSelect?.(null);
        }
      }
      
      // Copy (Ctrl+C / Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) {
        // Copy functionality can be added here
        e.preventDefault();
      }
      
      // Paste (Ctrl+V / Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Paste functionality can be added here
        e.preventDefault();
      }
      
      // Zoom with +/- keys
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        handleZoomIn();
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        handleZoomOut();
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedId, canvasObjects, onObjectsChange, isSpacePressed]);

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!stageRef.current) return { x: 0, y: 0 };
    
    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return { x: 0, y: 0 };
    
    const stageBox = stage.container().getBoundingClientRect();
    const x = (screenX - stageBox.left - pan.x) / zoom;
    const y = (screenY - stageBox.top - pan.y) / zoom;
    
    return { x, y };
  }, [pan, zoom]);

  // Convert canvas coordinates to screen coordinates
  const canvasToScreen = useCallback((canvasX: number, canvasY: number) => {
    return {
      x: canvasX * zoom + pan.x,
      y: canvasY * zoom + pan.y,
    };
  }, [pan, zoom]);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.2, maxZoom));
  }, [maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.2, minZoom));
  }, [minZoom]);

  const handleResetZoom = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  }, [initialZoom]);

  // Pan handlers
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Right click or middle mouse for panning
    if (e.evt.button === 1 || e.evt.button === 2 || (e.evt.button === 0 && isSpacePressed)) {
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX - pan.x, y: e.evt.clientY - pan.y });
      e.evt.preventDefault();
      return;
    }

    // Left click
    if (e.evt.button === 0) {
      const clickedOnEmpty = e.target === e.target.getStage();
      
      if (clickedOnEmpty) {
        setSelectedId(null);
        onObjectSelect?.(null);
        
        // Start drawing if tool is selected
        if (tool !== 'select') {
          const pos = e.target.getStage()?.getPointerPosition();
          if (pos) {
            setIsDrawing(true);
            setDrawStart({ x: pos.x, y: pos.y });
          }
        }
      } else {
        // Clicked on an object
        const id = e.target.id();
        if (id) {
          setSelectedId(id);
          onObjectSelect?.(id);
        }
      }
    }
  }, [pan, isSpacePressed, tool, onObjectSelect]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      const newPan = {
        x: e.evt.clientX - panStart.x,
        y: e.evt.clientY - panStart.y,
      };
      setPan(newPan);
    } else if (isDrawing && tool !== 'select') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos) {
        // Preview drawing (can be enhanced)
      }
    }
  }, [isPanning, panStart, isDrawing, tool]);

  const handleStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      setIsPanning(false);
    } else if (isDrawing && tool !== 'select') {
      const pos = e.target.getStage()?.getPointerPosition();
      if (pos && stageRef.current) {
        const stage = stageRef.current;
        const stageBox = stage.container().getBoundingClientRect();
        const canvasX = (pos.x - stageBox.left - pan.x) / zoom;
        const canvasY = (pos.y - stageBox.top - pan.y) / zoom;
        const startCanvasX = (drawStart.x - stageBox.left - pan.x) / zoom;
        const startCanvasY = (drawStart.y - stageBox.top - pan.y) / zoom;

        const newObject: CanvasObject = {
          id: `obj-${Date.now()}-${Math.random()}`,
          type: tool,
          x: Math.min(startCanvasX, canvasX),
          y: Math.min(startCanvasY, canvasY),
          fill: '#3b82f6',
          stroke: '#1e40af',
          strokeWidth: 2,
        };

        if (tool === 'rect' || tool === 'text') {
          newObject.width = Math.abs(canvasX - startCanvasX);
          newObject.height = Math.abs(canvasY - startCanvasY);
          if (tool === 'text') {
            newObject.text = 'Text';
            newObject.fontSize = 16;
          }
        } else if (tool === 'circle') {
          const radius = Math.sqrt(
            Math.pow(canvasX - startCanvasX, 2) + Math.pow(canvasY - startCanvasY, 2)
          );
          newObject.radius = radius;
          newObject.x = startCanvasX;
          newObject.y = startCanvasY;
        } else if (tool === 'line') {
          newObject.points = [0, 0, canvasX - startCanvasX, canvasY - startCanvasY];
          newObject.x = startCanvasX;
          newObject.y = startCanvasY;
        }

        const newObjects = [...canvasObjects, newObject];
        setCanvasObjects(newObjects);
        onObjectsChange?.(newObjects);
        setSelectedId(newObject.id);
        onObjectSelect?.(newObject.id);
      }
      setIsDrawing(false);
    }
  }, [isPanning, isDrawing, tool, drawStart, pan, zoom, canvasObjects, onObjectsChange, onObjectSelect]);

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    if (!stageRef.current) return;
    
    const stage = stageRef.current;
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const scaleBy = 1.1;
    const oldZoom = zoom;
    let newZoom = zoom;
    
    if (e.evt.deltaY < 0) {
      newZoom = Math.min(zoom * scaleBy, maxZoom);
    } else {
      newZoom = Math.max(zoom / scaleBy, minZoom);
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
  }, [zoom, pan, maxZoom, minZoom]);

  // Object drag handler
  const handleObjectDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, obj: CanvasObject) => {
    const node = e.target;
    const updatedObjects = canvasObjects.map(o => {
      if (o.id === obj.id) {
        return {
          ...o,
          x: node.x(),
          y: node.y(),
        };
      }
      return o;
    });
    setCanvasObjects(updatedObjects);
    onObjectsChange?.(updatedObjects);
  }, [canvasObjects, onObjectsChange]);

  // Transform handler
  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, obj: CanvasObject) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    node.scaleX(1);
    node.scaleY(1);

    const updatedObjects = canvasObjects.map(o => {
      if (o.id === obj.id) {
        const updated: CanvasObject = {
          ...o,
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
        };

        if (o.type === 'rect' || o.type === 'text') {
          updated.width = (o.width || 0) * scaleX;
          updated.height = (o.height || 0) * scaleY;
        } else if (o.type === 'circle') {
          updated.radius = (o.radius || 0) * Math.max(scaleX, scaleY);
        }

        return updated;
      }
      return o;
    });

    setCanvasObjects(updatedObjects);
    onObjectsChange?.(updatedObjects);
  }, [canvasObjects, onObjectsChange]);

  // Render grid
  const renderGrid = useMemo(() => {
    if (!showGrid) return null;

    const gridSize = 20 * zoom;
    const gridLines: JSX.Element[] = [];
    const stageWidth = width;
    const stageHeight = height;

    // Calculate visible grid area
    const startX = Math.floor(-pan.x / gridSize) * gridSize;
    const endX = startX + stageWidth + gridSize * 2;
    const startY = Math.floor(-pan.y / gridSize) * gridSize;
    const endY = startY + stageHeight + gridSize * 2;

    // Vertical lines
    for (let x = startX; x < endX; x += gridSize) {
      gridLines.push(
        <Line
          key={`v-${x}`}
          points={[x, startY, x, endY]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    // Horizontal lines
    for (let y = startY; y < endY; y += gridSize) {
      gridLines.push(
        <Line
          key={`h-${y}`}
          points={[startX, y, endX, y]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
          perfectDrawEnabled={false}
        />
      );
    }

    return <Group>{gridLines}</Group>;
  }, [showGrid, zoom, pan, width, height]);

  // Render objects
  const renderObjects = useMemo(() => {
    return canvasObjects.map((obj) => {
      const commonProps = {
        id: obj.id,
        x: obj.x,
        y: obj.y,
        rotation: obj.rotation || 0,
        draggable: tool === 'select',
        fill: obj.fill,
        stroke: obj.stroke,
        strokeWidth: obj.strokeWidth || 1,
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => handleObjectDragEnd(e, obj),
        onTransformEnd: (e: Konva.KonvaEventObject<Event>) => handleTransformEnd(e, obj),
        onClick: () => {
          setSelectedId(obj.id);
          onObjectSelect?.(obj.id);
        },
      };

      switch (obj.type) {
        case 'rect':
          return (
            <Rect
              key={obj.id}
              {...commonProps}
              width={obj.width || 100}
              height={obj.height || 100}
            />
          );
        case 'circle':
          return (
            <Circle
              key={obj.id}
              {...commonProps}
              radius={obj.radius || 50}
            />
          );
        case 'text':
          return (
            <Text
              key={obj.id}
              {...commonProps}
              width={obj.width || 100}
              height={obj.height || 50}
              text={obj.text || 'Text'}
              fontSize={obj.fontSize || 16}
              align="center"
              verticalAlign="middle"
            />
          );
        case 'line':
          return (
            <Line
              key={obj.id}
              {...commonProps}
              points={obj.points || [0, 0, 100, 100]}
            />
          );
        default:
          return null;
      }
    });
  }, [canvasObjects, tool, handleObjectDragEnd, handleTransformEnd, onObjectSelect]);

  return (
    <div ref={containerRef} className={cn("relative w-full h-full bg-muted/30", className)}>
      {/* Toolbar */}
      {showControls && (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-background/90 backdrop-blur-sm border rounded-lg p-2 shadow-lg">
          {/* Tools */}
          <div className="flex flex-col gap-1">
            <Button
              variant={tool === 'select' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setTool('select')}
              title="Select (V)"
            >
              <Move className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'rect' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setTool('rect')}
              title="Rectangle (R)"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'circle' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setTool('circle')}
              title="Circle (C)"
            >
              <CircleIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'text' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setTool('text')}
              title="Text (T)"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={tool === 'line' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setTool('line')}
              title="Line (L)"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-t my-1" />

          {/* Zoom Controls */}
          <div className="flex flex-col gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              title="Zoom In (Ctrl/Cmd +)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              title="Zoom Out (Ctrl/Cmd -)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-t my-1" />

          {/* Grid Toggle */}
          <Button
            variant={showGrid ? 'default' : 'ghost'}
            size="icon"
            onClick={() => onShowGridChange?.(!showGrid)}
            title="Toggle Grid"
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Zoom Indicator */}
      {showControls && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-sm font-medium">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Canvas */}
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning || isSpacePressed ? 'grabbing' : tool === 'select' ? 'default' : 'crosshair' }}
      >
        <Layer>
          {/* Grid */}
          {renderGrid}

          {/* Objects */}
          <Group>
            {renderObjects}
          </Group>

          {/* Transformer for selected object */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize
              if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}

