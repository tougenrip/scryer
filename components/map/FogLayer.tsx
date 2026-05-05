'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Rect, Circle, Group, Shape } from 'react-konva';
import Konva from 'konva';
import { useVttStore } from '@/lib/store/vtt-store';
import { FogShape } from '@/types/vtt';
import { KonvaEventObject } from 'konva/lib/Node';
import { Vector2d } from 'konva/lib/types';

interface FogLayerProps {
  onFogUpdate: (newShapes: FogShape[]) => void;
  isDm: boolean;
}

type FogCloud = {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  driftX: number;
  driftY: number;
  phase: number;
  layer: number;
};

export const FogLayer: React.FC<FogLayerProps> = ({ onFogUpdate, isDm }) => {
  const { 
    mapDimensions, 
    fogData, 
    activeTool, 
    fogToolType, 
    fogToolShape,
    fogBrushSize,
    fogBrushSmoothness,
    dmHideFog
  } = useVttStore();
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Partial<FogShape> | null>(null);
  const [brushPointer, setBrushPointer] = useState<Vector2d | null>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const fogTimeRef = useRef(0);
  const fogClouds = useMemo(
    () => createFogClouds(mapDimensions?.width ?? 0, mapDimensions?.height ?? 0),
    [mapDimensions?.width, mapDimensions?.height],
  );

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const animation = new Konva.Animation((frame) => {
      fogTimeRef.current += (frame?.timeDiff ?? 16) / 1000;
    }, layer);
    animation.start();

    return () => animation.stop();
  }, []);

  if (!mapDimensions) return null;
  if (isDm && dmHideFog) return null;

  const hasRevealShapes = fogData.shapes.some((shape) => shape.subtracted);
  const hideWouldOnlyCoverBaseFog =
    fogToolType === 'hide' && !fogData.revealed && !hasRevealShapes;

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (activeTool !== 'fog') return;
    if (e.evt.button !== 0) return;
    if (hideWouldOnlyCoverBaseFog) return;
    
    const pos = getLocalPointer(e);
    if (!pos) return;

    setIsDrawing(true);
    setCurrentShape({
      type: fogToolShape,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      radius: 0,
      points: [pos.x, pos.y],
      subtracted: fogToolType === 'reveal',
      strokeWidth: fogToolShape === 'brush' ? fogBrushSize : undefined,
    });
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const pos = getLocalPointer(e);
    if (activeTool === 'fog' && fogToolShape === 'brush') {
      setBrushPointer(pos);
    }

    if (!pos) return;
    if (!isDrawing || !currentShape) return;
    if ((e.evt.buttons & 1) !== 1) return;

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
    } else if (fogToolShape === 'brush') {
      const pts = currentShape.points || [];
      if (pts.length >= 2) {
        const lastX = pts[pts.length - 2];
        const lastY = pts[pts.length - 1];
        const dx = pos.x - lastX;
        const dy = pos.y - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Only add point if distance is greater than smoothness setting
        if (dist > fogBrushSmoothness) {
          setCurrentShape(prev => ({
            ...prev,
            points: [...(prev?.points || []), pos.x, pos.y]
          }));
        }
      }
    }
    // Polygon logic would be adding points
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape) return;
    
    setIsDrawing(false);
    
    // Normalize Rect (negative width/height)
    const finalShape = { ...currentShape };
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
      type: finalShape.type as 'rect' | 'circle' | 'polygon' | 'brush',
      x: finalShape.x,
      y: finalShape.y,
      width: finalShape.width,
      height: finalShape.height,
      radius: finalShape.radius,
      points: finalShape.points,
      strokeWidth: finalShape.strokeWidth,
      subtracted: finalShape.subtracted
    };

    const newShapes = [...fogData.shapes, newShape];
    onFogUpdate(newShapes);
    setCurrentShape(null);
  };

  const showBrushCrosshair =
    isDm &&
    activeTool === 'fog' &&
    fogToolShape === 'brush' &&
    !!brushPointer &&
    fogBrushSize > 0;
  const brushRadius = Math.max(1, fogBrushSize / 2);

  return (
    <Layer
      ref={layerRef}
      listening={activeTool === 'fog'}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setBrushPointer(null)}
    >
      {/* Base Fog Overlay */}
      <Group listening={activeTool === 'fog'}>
        <Rect
          x={0}
          y={0}
          width={mapDimensions.width}
          height={mapDimensions.height}
          fill={fogData.revealed ? "rgba(0,0,0,0)" : getFogBasePaint(isDm)}
          listening={activeTool === 'fog'} // Allow interaction only when tool is active
        />
        {!fogData.revealed && (
          <FogCloudTexture
            clouds={fogClouds}
            isDm={isDm}
            width={mapDimensions.width}
            height={mapDimensions.height}
            timeRef={fogTimeRef}
          />
        )}
      </Group>

      {/* Existing Shapes */}
      {fogData.shapes.map((shape) => (
        <Group key={shape.id} globalCompositeOperation={shape.subtracted ? 'destination-out' : 'source-over'}>
          {shape.type === 'rect' && (
            shape.subtracted ? (
              <RevealMaskShape shape={shape} />
            ) : (
              <TexturedFogShape
                shape={shape}
                isDm={isDm}
                width={mapDimensions.width}
                height={mapDimensions.height}
                timeRef={fogTimeRef}
              />
            )
          )}
          {shape.type === 'circle' && (
            shape.subtracted ? (
              <RevealMaskShape shape={shape} />
            ) : (
              <TexturedFogShape
                shape={shape}
                isDm={isDm}
                width={mapDimensions.width}
                height={mapDimensions.height}
                timeRef={fogTimeRef}
              />
            )
          )}
          {shape.type === 'brush' && shape.points && (
            shape.subtracted ? (
              <RevealMaskShape shape={shape} />
            ) : (
              <TexturedFogShape
                shape={shape}
                isDm={isDm}
                width={mapDimensions.width}
                height={mapDimensions.height}
                timeRef={fogTimeRef}
              />
            )
          )}
        </Group>
      ))}

      {/* Current Drawing Shape */}
      {currentShape && (
        <Group globalCompositeOperation={currentShape.subtracted ? 'destination-out' : 'source-over'}>
           {currentShape.type === 'rect' && (
            currentShape.subtracted ? (
              <RevealMaskShape shape={currentShape} />
            ) : (
              <TexturedFogShape
                shape={currentShape}
                isDm={isDm}
                width={mapDimensions.width}
                height={mapDimensions.height}
                timeRef={fogTimeRef}
              />
            )
          )}
          {currentShape.type === 'circle' && (
            currentShape.subtracted ? (
              <RevealMaskShape shape={currentShape} />
            ) : (
              <TexturedFogShape
                shape={currentShape}
                isDm={isDm}
                width={mapDimensions.width}
                height={mapDimensions.height}
                timeRef={fogTimeRef}
              />
            )
          )}
          {currentShape.type === 'brush' && currentShape.points && (
            currentShape.subtracted ? (
              <RevealMaskShape shape={currentShape} />
            ) : (
              <TexturedFogShape
                shape={currentShape}
                isDm={isDm}
                width={mapDimensions.width}
                height={mapDimensions.height}
                timeRef={fogTimeRef}
              />
            )
          )}
        </Group>
      )}

      {showBrushCrosshair && (
        <Group x={brushPointer.x} y={brushPointer.y} listening={false}>
          <Circle
            radius={brushRadius}
            stroke="#fbbf24"
            strokeWidth={2}
            opacity={0.9}
            shadowColor="#f59e0b"
            shadowBlur={8}
            shadowOpacity={0.45}
          />
        </Group>
      )}
    </Layer>
  );
};

function getLocalPointer(e: KonvaEventObject<MouseEvent>): Vector2d | null {
  const stage = e.target.getStage();
  const pointer = stage?.getPointerPosition();
  if (!stage || !pointer) return null;

  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  return transform.point(pointer);
}

function createFogClouds(width: number, height: number): FogCloud[] {
  if (!width || !height) return [];

  const clouds: FogCloud[] = [];
  const count = Math.max(34, Math.round((width * height) / 52000));
  let seed = Math.round(width * 13 + height * 17);

  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < count; i += 1) {
    const depth = next();
    const radius = Math.min(width, height) * (0.1 + next() * 0.2);
    clouds.push({
      x: next() * width,
      y: next() * height,
      radius,
      opacity: 0.24 + depth * 0.28,
      scaleX: 1.2 + next() * 1.8,
      scaleY: 0.55 + next() * 0.75,
      driftX: (next() - 0.5) * Math.max(60, width * 0.08),
      driftY: (next() - 0.5) * Math.max(45, height * 0.06),
      phase: next() * Math.PI * 2,
      layer: next() > 0.52 ? 1 : 0,
    });
  }

  return clouds;
}

function getFogBasePaint(isDm?: boolean): string {
  return isDm ? "rgba(28, 36, 48, 0.9)" : "rgba(18, 24, 34, 0.99)";
}

function getFogShapePaint(isReveal?: boolean): string {
  return isReveal ? "black" : "rgba(18, 24, 34, 0.96)";
}

function FogCloudTexture({
  clouds,
  isDm,
  width,
  height,
  timeRef,
}: {
  clouds: FogCloud[];
  isDm: boolean;
  width: number;
  height: number;
  timeRef: React.MutableRefObject<number>;
}) {
  return (
    <Shape
      width={width}
      height={height}
      listening={false}
      sceneFunc={(context, shape) => {
        drawFogTexture(context, clouds, isDm, width, height, timeRef.current);
        context.fillStrokeShape(shape);
      }}
    />
  );
}

function TexturedFogShape({
  shape: fogShape,
  isDm,
  width,
  height,
  timeRef,
}: {
  shape: Partial<FogShape>;
  isDm: boolean;
  width: number;
  height: number;
  timeRef: React.MutableRefObject<number>;
}) {
  return (
    <Shape
      width={width}
      height={height}
      listening={false}
      sceneFunc={(context, shape) => {
        const time = timeRef.current;

        drawFogShapePath(context, fogShape);
        context.fillStyle = getFogShapePaint(false);
        context.strokeStyle = getFogShapePaint(false);
        context.lineWidth = fogShape.strokeWidth || 40;
        context.lineCap = "round";
        context.lineJoin = "round";

        if (fogShape.type === "brush") {
          context.stroke();
          context.save();
          context.globalCompositeOperation = "source-atop";
          drawLocalFogTexture(context, fogShape, isDm, width, height, time);
          context.restore();
        } else {
          context.fill();
          context.save();
          drawFogShapePath(context, fogShape);
          context.clip();
          drawLocalFogTexture(context, fogShape, isDm, width, height, time);
          context.restore();
        }

        context.fillStrokeShape(shape);
      }}
    />
  );
}

function RevealMaskShape({ shape: fogShape }: { shape: Partial<FogShape> }) {
  return (
    <Shape
      listening={false}
      sceneFunc={(context, shape) => {
        const feather = Math.max(14, Math.min(34, (fogShape.strokeWidth || 40) * 0.34));
        context.save();
        context.shadowColor = "black";
        context.shadowBlur = feather;
        context.shadowOffsetX = 0;
        context.shadowOffsetY = 0;
        drawFogShapePath(context, fogShape);
        context.fillStyle = "black";
        context.strokeStyle = "black";
        context.lineWidth = Math.max(1, (fogShape.strokeWidth || 40) - feather * 0.35);
        context.lineCap = "round";
        context.lineJoin = "round";
        if (fogShape.type === "brush") {
          context.stroke();
        } else {
          context.fill();
        }
        context.restore();

        drawFogShapePath(context, fogShape);
        context.fillStyle = "black";
        context.strokeStyle = "black";
        context.lineWidth = Math.max(1, (fogShape.strokeWidth || 40) - feather * 1.4);
        context.lineCap = "round";
        context.lineJoin = "round";
        if (fogShape.type === "brush") {
          context.stroke();
        } else {
          context.fill();
        }
        context.fillStrokeShape(shape);
      }}
    />
  );
}

function drawLocalFogTexture(
  context: Konva.Context,
  shape: Partial<FogShape>,
  isDm: boolean,
  mapWidth: number,
  mapHeight: number,
  time: number,
) {
  const bounds = getFogShapeBounds(shape, mapWidth, mapHeight);
  if (!bounds) return;

  const area = Math.max(1, bounds.width * bounds.height);
  const count = Math.max(10, Math.min(70, Math.round(area / 9000)));
  const seedBase = hashFogShape(shape, bounds);
  const baseAlpha = isDm ? 0.9 : 1;

  context.save();
  context.fillStyle = `rgba(18, 24, 34, ${isDm ? 0.78 : 0.96})`;
  context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  context.restore();

  for (let i = 0; i < count; i += 1) {
    const a = seededRandom(seedBase + i * 17);
    const b = seededRandom(seedBase + i * 37);
    const c = seededRandom(seedBase + i * 71);
    const phase = seededRandom(seedBase + i * 101) * Math.PI * 2;
    const radius = Math.max(36, Math.min(bounds.width, bounds.height) * (0.16 + c * 0.32));
    const x = bounds.x + a * bounds.width + Math.sin(time * 0.65 + phase) * radius * 0.18;
    const y = bounds.y + b * bounds.height + Math.cos(time * 0.48 + phase) * radius * 0.14;

    context.save();
    context.translate(x, y);
    context.scale(1.4 + seededRandom(seedBase + i * 131) * 1.2, 0.75 + seededRandom(seedBase + i * 151) * 0.55);
    context.translate(-x, -y);

    const shadow = context.createRadialGradient(x, y, 0, x, y, radius * 1.1);
    shadow.addColorStop(0, `rgba(6, 10, 16, ${baseAlpha * 0.95})`);
    shadow.addColorStop(0.58, `rgba(18, 26, 38, ${baseAlpha * 0.78})`);
    shadow.addColorStop(1, "rgba(96, 108, 124, 0)");
    context.globalCompositeOperation = "multiply";
    context.fillStyle = shadow;
    context.beginPath();
    context.arc(x, y, radius * 1.1, 0, Math.PI * 2);
    context.fill();

    const highlight = context.createRadialGradient(x + radius * 0.2, y - radius * 0.15, 0, x + radius * 0.2, y - radius * 0.15, radius * 0.9);
    highlight.addColorStop(0, `rgba(130, 146, 164, ${baseAlpha * 0.12})`);
    highlight.addColorStop(0.48, `rgba(84, 102, 122, ${baseAlpha * 0.08})`);
    highlight.addColorStop(1, "rgba(205, 218, 232, 0)");
    context.globalCompositeOperation = "screen";
    context.fillStyle = highlight;
    context.beginPath();
    context.arc(x + radius * 0.2, y - radius * 0.15, radius * 0.9, 0, Math.PI * 2);
    context.fill();

    context.restore();
  }
}

function drawFogShapePath(context: Konva.Context, shape: Partial<FogShape>) {
  context.beginPath();
  if (shape.type === "rect") {
    context.rect(shape.x || 0, shape.y || 0, shape.width || 0, shape.height || 0);
    return;
  }
  if (shape.type === "circle") {
    context.arc(shape.x || 0, shape.y || 0, shape.radius || 0, 0, Math.PI * 2);
    return;
  }
  if (shape.type === "brush" && shape.points && shape.points.length >= 2) {
    context.moveTo(shape.points[0], shape.points[1]);
    for (let i = 2; i < shape.points.length; i += 2) {
      context.lineTo(shape.points[i], shape.points[i + 1]);
    }
  }
}

function getFogShapeBounds(
  shape: Partial<FogShape>,
  mapWidth: number,
  mapHeight: number,
): { x: number; y: number; width: number; height: number } | null {
  if (shape.type === "rect") {
    return clampBounds({
      x: shape.x || 0,
      y: shape.y || 0,
      width: Math.abs(shape.width || 0),
      height: Math.abs(shape.height || 0),
    }, mapWidth, mapHeight);
  }

  if (shape.type === "circle") {
    const radius = Math.max(1, shape.radius || 0);
    return clampBounds({
      x: (shape.x || 0) - radius,
      y: (shape.y || 0) - radius,
      width: radius * 2,
      height: radius * 2,
    }, mapWidth, mapHeight);
  }

  if (shape.type === "brush" && shape.points && shape.points.length >= 2) {
    const xs = shape.points.filter((_, index) => index % 2 === 0);
    const ys = shape.points.filter((_, index) => index % 2 === 1);
    const pad = Math.max(24, (shape.strokeWidth || 40) * 1.2);
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return clampBounds({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }, mapWidth, mapHeight);
  }

  return null;
}

function clampBounds(
  bounds: { x: number; y: number; width: number; height: number },
  mapWidth: number,
  mapHeight: number,
) {
  const x = Math.max(0, Math.min(mapWidth, bounds.x));
  const y = Math.max(0, Math.min(mapHeight, bounds.y));
  const right = Math.max(x, Math.min(mapWidth, bounds.x + bounds.width));
  const bottom = Math.max(y, Math.min(mapHeight, bounds.y + bounds.height));
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

function hashFogShape(
  shape: Partial<FogShape>,
  bounds: { x: number; y: number; width: number; height: number },
) {
  const pointHash = shape.points?.slice(0, 12).reduce((sum, value, index) => {
    return sum + Math.round(value * 10) * (index + 3);
  }, 0) ?? 0;
  return (
    Math.round(bounds.x * 13) +
    Math.round(bounds.y * 17) +
    Math.round(bounds.width * 19) +
    Math.round(bounds.height * 23) +
    pointHash
  );
}

function seededRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function drawFogTexture(
  context: Konva.Context,
  clouds: FogCloud[],
  isDm: boolean,
  width: number,
  height: number,
  time: number,
  alphaMultiplier = 1,
) {
  context.save();
  context.globalAlpha = alphaMultiplier;
  context.fillStyle = isDm ? "rgba(18, 24, 34, 0.82)" : "rgba(18, 24, 34, 0.96)";
  context.fillRect(0, 0, width, height);
  context.restore();

  clouds.forEach((cloud) => {
    const speed = cloud.layer === 0 ? 0.42 : 0.68;
    const wobble = Math.sin(time * speed + cloud.phase);
    const drift = Math.cos(time * (speed * 0.72) + cloud.phase * 0.7);
    const x = cloud.x + wobble * cloud.driftX;
    const y = cloud.y + drift * cloud.driftY;

    context.save();
    context.translate(x, y);
    context.scale(cloud.scaleX, cloud.scaleY);
    context.translate(-x, -y);

    const shadow = context.createRadialGradient(x, y, 0, x, y, cloud.radius * 1.15);
    shadow.addColorStop(0, `rgba(6, 10, 16, ${cloud.opacity * (isDm ? 0.9 : 1.2) * alphaMultiplier})`);
    shadow.addColorStop(0.58, `rgba(18, 26, 38, ${cloud.opacity * (isDm ? 0.7 : 1) * alphaMultiplier})`);
    shadow.addColorStop(1, "rgba(96, 108, 124, 0)");
    context.globalCompositeOperation = "multiply";
    context.fillStyle = shadow;
    context.beginPath();
    context.arc(x, y, cloud.radius * 1.15, 0, Math.PI * 2);
    context.fill();

    const highlightX = x + cloud.radius * 0.22;
    const highlightY = y - cloud.radius * 0.16;
    const highlight = context.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, cloud.radius);
    highlight.addColorStop(0, `rgba(130, 146, 164, ${cloud.opacity * (isDm ? 0.12 : 0.18) * alphaMultiplier})`);
    highlight.addColorStop(0.48, `rgba(84, 102, 122, ${cloud.opacity * (isDm ? 0.08 : 0.12) * alphaMultiplier})`);
    highlight.addColorStop(1, "rgba(186, 199, 214, 0)");
    context.globalCompositeOperation = "screen";
    context.fillStyle = highlight;
    context.beginPath();
    context.arc(highlightX, highlightY, cloud.radius, 0, Math.PI * 2);
    context.fill();

    context.restore();
  });
}
