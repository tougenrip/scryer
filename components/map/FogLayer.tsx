'use client';

import React, { useState, useRef } from 'react';
import { Layer, Rect, Circle, Line, Group } from 'react-konva';
import { useVttStore } from '@/lib/store/vtt-store';
import { FogShape } from '@/types/vtt';
import { KonvaEventObject } from 'konva/lib/Node';

interface FogLayerProps {
  onFogUpdate: (newShapes: FogShape[]) => void;
}

export const FogLayer: React.FC<FogLayerProps> = ({ onFogUpdate }) => {
  const { 
    mapDimensions, 
    fogData, 
    activeTool, 
    fogToolType, 
    fogToolShape,
    stageScale,
    stagePos
  } = useVttStore();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Partial<FogShape> | null>(null);

  if (!mapDimensions) return null;

  // Don't render fog if globally revealed
  if (fogData.revealed) return null;

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'fog') return;
    
    const stage = e.target.getStage();
    if (!stage) return;

    // Get pointer pos relative to stage (account for zoom/pan)
    // The Layer transforms are handled by Stage, so e.target.getStage().getPointerPosition() is global.
    // We need local coordinates. Since the Layer inside Stage inherits scale/pos?
    // Wait, Stage has scale/pos. Layer usually inherits.
    // So simple mapping:
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = transform.point(stage.getPointerPosition()!);

    setIsDrawing(true);
    setCurrentShape({
      type: fogToolShape,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      radius: 0,
      points: [pos.x, pos.y],
      subtracted: fogToolType === 'reveal'
    });
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !currentShape) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    const pos = transform.point(stage.getPointerPosition()!);

    if (fogToolShape === 'rect') {
      setCurrentShape(prev => ({
        ...prev,
        width: pos.x - (prev?.x || 0),
        height: pos.y - (prev?.y || 0)
      }));
    } else if (fogToolShape === 'circle') {
      const dx = pos.x - (currentShape.x || 0);
      const dy = pos.y - (currentShape.y || 0);
      const radius = Math.sqrt(dx*dx + dy*dy);
      setCurrentShape(prev => ({
        ...prev,
        radius
      }));
    }
    // Polygon logic would be adding points
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) return;
    
    setIsDrawing(false);
    
    // Normalize Rect (negative width/height)
    let finalShape = { ...currentShape };
    if (finalShape.type === 'rect') {
      if ((finalShape.width || 0) < 0) {
        finalShape.x = (finalShape.x || 0) + (finalShape.width || 0);
        finalShape.width = Math.abs(finalShape.width || 0);
      }
      if ((finalShape.height || 0) < 0) {
        finalShape.y = (finalShape.y || 0) + (finalShape.height || 0);
        finalShape.height = Math.abs(finalShape.height || 0);
      }
    }

    // Generate ID
    const newShape: FogShape = {
      id: crypto.randomUUID(),
      type: finalShape.type as 'rect' | 'circle' | 'polygon',
      x: finalShape.x,
      y: finalShape.y,
      width: finalShape.width,
      height: finalShape.height,
      radius: finalShape.radius,
      points: finalShape.points,
      subtracted: finalShape.subtracted
    };

    const newShapes = [...fogData.shapes, newShape];
    onFogUpdate(newShapes);
    setCurrentShape(null);
  };

  return (
    <Layer
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Base Fog Overlay */}
      <Rect
        x={0}
        y={0}
        width={mapDimensions.width}
        height={mapDimensions.height}
        fill="black"
        listening={activeTool === 'fog'} // Allow interaction only when tool is active
      />

      {/* Existing Shapes */}
      {fogData.shapes.map((shape) => (
        <Group key={shape.id} globalCompositeOperation={shape.subtracted ? 'destination-out' : 'source-over'}>
          {shape.type === 'rect' && (
            <Rect
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              fill="black"
              listening={false}
            />
          )}
          {shape.type === 'circle' && (
            <Circle
              x={shape.x}
              y={shape.y}
              radius={shape.radius}
              fill="black"
              listening={false}
            />
          )}
        </Group>
      ))}

      {/* Current Drawing Shape */}
      {currentShape && (
        <Group globalCompositeOperation={currentShape.subtracted ? 'destination-out' : 'source-over'}>
           {currentShape.type === 'rect' && (
            <Rect
              x={currentShape.x}
              y={currentShape.y}
              width={currentShape.width}
              height={currentShape.height}
              fill="black"
              listening={false}
            />
          )}
          {currentShape.type === 'circle' && (
            <Circle
              x={currentShape.x}
              y={currentShape.y}
              radius={currentShape.radius}
              fill="black"
              listening={false}
            />
          )}
        </Group>
      )}
    </Layer>
  );
};
