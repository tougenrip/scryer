'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Vector2d } from 'konva/lib/types';
import { useVttStore } from '@/lib/store/vtt-store';
import { MapLayer } from './MapLayer';
import { GridLayer } from './GridLayer';
import { TokenLayer } from './TokenLayer';
import { FogLayer } from './FogLayer';
import { WeatherOverlay } from './WeatherOverlay';
import { RulerLayer } from './RulerLayer';
import { useVttTokens } from '@/hooks/useVttTokens';
import { useVttFog } from '@/hooks/useVttFog';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { CompactSheet } from "../character/compact-sheet";

export const GameCanvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rulerStart, setRulerStart] = useState<Vector2d | null>(null);
  const [rulerEnd, setRulerEnd] = useState<Vector2d | null>(null);
  
  const { 
    stageScale, 
    stagePos, 
    setStageScale, 
    setStagePos,
    mapUrl,
    mapId,
    activeTool,
    gridSize,
    selectedTokenId,
    setSelectedTokenId,
    tokens
  } = useVttStore();

  const { updateTokenPosition } = useVttTokens(mapId);
  const { updateFogShapes } = useVttFog(mapId);

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle Zoom
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Limit zoom
    if (newScale < 0.1 || newScale > 10) return;

    setStageScale(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStagePos(newPos);
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    // If clicking on the stage (background) and not a shape/token, clear selection
    const clickedOnStage = e.target === e.target.getStage();
    if (clickedOnStage && activeTool === 'select') {
        setSelectedTokenId(null);
    }

    if (activeTool !== 'measure') return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    setRulerStart(pointer);
    setRulerEnd(pointer);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'measure' || !rulerStart) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    setRulerEnd(pointer);
  };

  const handleMouseUp = () => {
    if (activeTool === 'measure') {
      setRulerStart(null);
      setRulerEnd(null);
    }
  };

  const isDraggable = activeTool === 'pan';

  const selectedToken = tokens.find(t => t.id === selectedTokenId);
  const showCharacterSheet = !!(selectedToken && selectedToken.character_id);

  return (
    <div className="relative w-full h-full bg-neutral-900 overflow-hidden" ref={containerRef}>
      <Stage
        width={size.width}
        height={size.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        scale={{ x: stageScale, y: stageScale }}
        x={stagePos.x}
        y={stagePos.y}
        draggable={isDraggable}
        onDragEnd={(e) => {
          setStagePos({ x: e.target.x(), y: e.target.y() });
        }}
        className={activeTool === 'measure' ? 'cursor-crosshair' : activeTool === 'pan' ? 'cursor-grab' : 'cursor-default'}
      >
        <Layer>
          <MapLayer url={mapUrl} />
          <GridLayer />
        </Layer>
        <TokenLayer onTokenUpdate={updateTokenPosition} />
        <FogLayer onFogUpdate={updateFogShapes} />
        <Layer>
          <RulerLayer 
            start={rulerStart} 
            end={rulerEnd} 
            gridSize={gridSize}
            scale={stageScale}
          />
        </Layer>
        <WeatherOverlay />
      </Stage>
      
      {/* Character Sheet Sidebar */}
      <Sheet open={showCharacterSheet} onOpenChange={(open) => !open && setSelectedTokenId(null)}>
        <SheetContent side="right" className="p-0 w-[400px] sm:w-[540px] bg-background border-l">
          {selectedToken?.character_id && (
            <CompactSheet 
              characterId={selectedToken.character_id} 
              onClose={() => setSelectedTokenId(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
