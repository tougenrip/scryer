'use client';

import React, { memo, useEffect, useState } from 'react';
import { Group, Circle, Image as KonvaImage, Line, Path, Rect, Text } from 'react-konva';
import { Token as TokenType } from '@/types/vtt';
import { KonvaEventObject } from 'konva/lib/Node';
import { cleanVttDisplayName } from '@/lib/vtt/display-name';
import type { WallSegment } from "@/types/vtt-walls";
import { slideAgainstWalls } from "@/lib/vtt/movement";

interface TokenProps {
  token: TokenType;
  gridSize: number;
  isDraggable: boolean;
  isSelected: boolean;
  /** Soft hover from non-canvas UI (initiative tracker, etc.). */
  isHovered?: boolean;
  pendingPlacement: boolean;
  groupDragOffset?: { x: number; y: number } | null;
  onSelect: (id: string, additive?: boolean) => void;
  onContextMenu?: (id: string, position: { x: number; y: number }) => void;
  onUpdate?: (id: string, updates: Partial<TokenType>) => void;
  onDragMove?: (id: string, x: number, y: number) => void;
  onDragEnd?: () => void;
  /** Sight+movement-blocking wall segments (filtered by caller). */
  blockingSegments?: WallSegment[];
}

const tokenImageCache = new Map<string, HTMLImageElement | null>();

function getSizeMultiplier(size: string) {
  switch (size) {
    case 'tiny': return 0.5;
    case 'small': return 0.8;
    case 'medium': return 1;
    case 'large': return 2;
    case 'huge': return 3;
    case 'gargantuan': return 4;
    default: return 1;
  }
}

const CONDITION_COLORS: Record<string, string> = {
  blinded: '#111827',
  charmed: '#ec4899',
  deafened: '#64748b',
  frightened: '#7c3aed',
  grappled: '#92400e',
  incapacitated: '#6b7280',
  invisible: '#38bdf8',
  paralyzed: '#f59e0b',
  poisoned: '#22c55e',
  prone: '#a16207',
  restrained: '#f97316',
  stunned: '#eab308',
  unconscious: '#dc2626',
  concentrating: '#8b5cf6',
  marked: '#ef4444',
  bloodied: '#b91c1c',
};

const CONDITION_ICON_PATHS: Record<string, string> = {
  blinded: 'M2 12C4.5 7.5 7.9 5.5 12 5.5C16.1 5.5 19.5 7.5 22 12C21 13.8 19.8 15.2 18.4 16.2M14.1 14.1C13.5 14.7 12.8 15 12 15C10.3 15 9 13.7 9 12C9 11.2 9.3 10.5 9.9 9.9M4 4L20 20',
  charmed: 'M12 21C9.2 18.4 4 14.2 3 10.6C2.2 7.6 4.1 5 6.9 5C9 5 10.3 6.2 12 8.1C13.7 6.2 15 5 17.1 5C19.9 5 21.8 7.6 21 10.6C20 14.2 14.8 18.4 12 21Z',
  deafened: 'M6 9C6 5.7 8.7 3 12 3C15.3 3 18 5.7 18 9C18 14.5 13 14 13 18C13 19.7 11.7 21 10 21C8.6 21 7.4 20.1 7.1 18.8M9 9C9 7.3 10.3 6 12 6C13.7 6 15 7.3 15 9C15 12 10.5 12.4 10.5 16',
  frightened: 'M12 3L22 21H2L12 3ZM12 9V14M12 17.5V18',
  grappled: 'M7 11V7C7 5.9 7.9 5 9 5C10.1 5 11 5.9 11 7V10M11 10V6C11 4.9 11.9 4 13 4C14.1 4 15 4.9 15 6V11M15 11V8C15 6.9 15.9 6 17 6C18.1 6 19 6.9 19 8V14C19 18.4 16.4 21 12 21H10C7.2 21 5 18.8 5 16V12C5 10.9 5.9 10 7 10V16',
  incapacitated: 'M12 2L14.7 8.5L21.7 9.1L16.4 13.7L18 20.5L12 16.9L6 20.5L7.6 13.7L2.3 9.1L9.3 8.5L12 2Z',
  invisible: 'M2 12C4.5 7.5 7.9 5.5 12 5.5C16.1 5.5 19.5 7.5 22 12C19.5 16.5 16.1 18.5 12 18.5C7.9 18.5 4.5 16.5 2 12ZM9 12C9 13.7 10.3 15 12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9C10.3 9 9 10.3 9 12Z',
  paralyzed: 'M12 2V22M5 6L19 18M19 6L5 18M2 12H22',
  poisoned: 'M9 2H15L14 6C17.5 7 20 10.1 20 14C20 18.4 16.4 22 12 22C7.6 22 4 18.4 4 14C4 10.1 6.5 7 10 6L9 2ZM9 14C9 15.7 10.3 17 12 17C13.7 17 15 15.7 15 14',
  prone: 'M4 17H20M7 13H17M10 9H14M12 4V9',
  restrained: 'M7 8C7 5.2 9.2 3 12 3C14.8 3 17 5.2 17 8V10H7V8ZM6 10H18V21H6V10ZM9 15H15',
  stunned: 'M13 2L5 13H11L10 22L19 10H13L13 2Z',
  unconscious: 'M8 7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7C16 9.2 14.2 11 12 11C9.8 11 8 9.2 8 7ZM5 21C5.8 16.8 8.4 14.5 12 14.5C15.6 14.5 18.2 16.8 19 21H5Z',
  concentrating: 'M12 3C7 3 3 7 3 12C3 17 7 21 12 21C17 21 21 17 21 12M12 7C9.2 7 7 9.2 7 12C7 14.8 9.2 17 12 17M12 11C11.4 11 11 11.4 11 12C11 12.6 11.4 13 12 13',
  marked: 'M12 2L15 9L22 12L15 15L12 22L9 15L2 12L9 9L12 2Z',
  bloodied: 'M12 2C12 2 6 9 6 14C6 18.4 8.7 22 12 22C15.3 22 18 18.4 18 14C18 9 12 2 12 2Z',
};

function formatCondition(condition: string) {
  return condition
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ConditionIcon({
  condition,
  size,
}: {
  condition: string;
  size: number;
}) {
  const data = CONDITION_ICON_PATHS[condition.toLowerCase()] ?? CONDITION_ICON_PATHS.marked;
  const iconSize = size * 0.58;
  const offset = (size - iconSize) / 2;
  const scale = iconSize / 24;

  return (
    <Path
      data={data}
      x={offset}
      y={offset}
      scaleX={scale}
      scaleY={scale}
      stroke="white"
      strokeWidth={2.6}
      lineCap="round"
      lineJoin="round"
      perfectDrawEnabled={false}
    />
  );
}

function TokenComponent({
  token,
  gridSize,
  isDraggable,
  isSelected,
  isHovered,
  pendingPlacement,
  groupDragOffset,
  onSelect,
  onContextMenu,
  onUpdate,
  onDragMove,
  onDragEnd,
  blockingSegments,
}: TokenProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConditionHover, setIsConditionHover] = useState(false);

  useEffect(() => {
    if (token.image_url) {
      if (tokenImageCache.has(token.image_url)) {
        setImage(tokenImageCache.get(token.image_url) ?? null);
        return;
      }

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = token.image_url;
      img.onload = () => {
        tokenImageCache.set(token.image_url as string, img);
        setImage(img);
      };
      img.onerror = () => {
        tokenImageCache.set(token.image_url as string, null);
        setImage(null);
      };
    } else {
      setImage(null);
    }
  }, [token.image_url]);

  const sizeMultiplier = getSizeMultiplier(token.size);
  const width = gridSize * sizeMultiplier;
  const radius = width / 2;
  const displayName = cleanVttDisplayName(token.name);
  const conditions = token.conditions ?? [];
  const firstCondition = conditions[0];
  const conditionMarkerSize = width * 0.42;

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    const desired = { x: e.target.x(), y: e.target.y() };
    if (blockingSegments && blockingSegments.length > 0) {
      const start = { x: token.x, y: token.y };
      const slid = slideAgainstWalls(start, desired, blockingSegments);
      e.target.x(slid.x);
      e.target.y(slid.y);
      onDragMove?.(token.id, slid.x, slid.y);
      return;
    }
    onDragMove?.(token.id, desired.x, desired.y);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    let endX = e.target.x();
    let endY = e.target.y();
    if (blockingSegments && blockingSegments.length > 0) {
      const start = { x: token.x, y: token.y };
      const slid = slideAgainstWalls(start, { x: endX, y: endY }, blockingSegments);
      endX = slid.x;
      endY = slid.y;
    }
    const x = Math.round(endX / gridSize) * gridSize;
    const y = Math.round(endY / gridSize) * gridSize;
    e.target.to({ x, y, duration: 0.1 });
    if (onUpdate) onUpdate(token.id, { x, y });
    onDragEnd?.();
  };

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    if (pendingPlacement) return;
    if (e.evt.button !== 0) return;

    // Prevent deselecting if dragging
    if (isDragging) return;
    
    // Stop propagation to prevent map click clearing selection
    e.cancelBubble = true;
    
    onSelect(token.id, e.evt.shiftKey);
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0) {
      // Stop the Stage handler from running its "clicked empty space → deselect"
      // logic when the user is actually pressing on a token. The token's own
      // onClick is what manages selection.
      e.cancelBubble = true;
      return;
    }
    if (e.evt.button !== 2) return;
    e.evt.preventDefault();
    e.cancelBubble = true;
  };

  const handleContextMenu = (e: KonvaEventObject<PointerEvent>) => {
    if (pendingPlacement) return;
    e.evt.preventDefault();
    e.cancelBubble = true;
    onContextMenu?.(token.id, { x: e.evt.clientX, y: e.evt.clientY });
  };

  return (
    <Group
      x={token.x + (groupDragOffset?.x ?? 0)}
      y={token.y + (groupDragOffset?.y ?? 0)}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onTap={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Background/Color Ring */}
      <Circle
        x={radius}
        y={radius}
        radius={radius}
        fill={token.color || '#cccccc'}
        stroke={
          isSelected ? "#4ade80" : isHovered ? "#fbbf24" : "white"
        }
        strokeWidth={isSelected ? 4 : isHovered ? 4 : 2}
        opacity={0.8}
        shadowColor={
          isSelected ? "#4ade80" : isHovered ? "#fbbf24" : "black"
        }
        shadowBlur={isSelected ? 10 : isHovered ? 12 : 0}
        shadowOpacity={isSelected || isHovered ? 0.65 : 0.5}
        perfectDrawEnabled={false}
      />

      {/* Token Image */}
      {image ? (
        <KonvaImage
          image={image}
          width={width}
          height={width}
          cornerRadius={radius}
          perfectDrawEnabled={false}
        />
      ) : (
        <Text 
          text={displayName.substring(0, 2).toUpperCase()} 
          fontSize={gridSize / 2} 
          fill="white" 
          width={width}
          height={width}
          align="center"
          verticalAlign="middle"
        />
      )}
      
      {/* HP Bar */}
      {token.hp_max && token.hp_current !== undefined && token.hp_current !== null && token.hp_max > 0 && (
         <Group y={-8}>
            <Rect 
                width={width} 
                height={5} 
                fill="red" 
                cornerRadius={2}
                perfectDrawEnabled={false}
            />
            <Rect 
                width={(Math.max(0, Math.min(token.hp_current, token.hp_max)) / token.hp_max) * width} 
                height={5} 
                fill="green" 
                cornerRadius={2}
                perfectDrawEnabled={false}
            />
         </Group>
      )}

      {firstCondition && (
        <Group
          x={width - conditionMarkerSize + 2}
          y={-2}
          onMouseEnter={() => setIsConditionHover(true)}
          onMouseLeave={() => setIsConditionHover(false)}
        >
          <Circle
            x={conditionMarkerSize / 2}
            y={conditionMarkerSize / 2}
            radius={conditionMarkerSize / 2 + 2}
            fill="black"
            opacity={0.72}
            shadowColor="black"
            shadowBlur={8}
            shadowOpacity={0.75}
            perfectDrawEnabled={false}
          />
          <Circle
            x={conditionMarkerSize / 2}
            y={conditionMarkerSize / 2}
            radius={conditionMarkerSize / 2}
            fill={CONDITION_COLORS[firstCondition.toLowerCase()] ?? '#fbbf24'}
            stroke="white"
            strokeWidth={2}
            shadowColor="black"
            shadowBlur={6}
            shadowOpacity={0.85}
            perfectDrawEnabled={false}
          />
          <ConditionIcon condition={firstCondition} size={conditionMarkerSize} />
          {conditions.length > 1 && (() => {
            const plusRadius = conditionMarkerSize * 0.32;
            const plusCx = conditionMarkerSize + plusRadius / 2;
            const plusCy = conditionMarkerSize * 0.28;
            const armLen = plusRadius * 0.7;
            const stroke = Math.max(1, conditionMarkerSize * 0.08);
            return (
              <>
                <Circle
                  x={plusCx}
                  y={plusCy}
                  radius={plusRadius}
                  fill="black"
                  opacity={0.9}
                  stroke="white"
                  strokeWidth={Math.max(0.5, stroke / 2)}
                  perfectDrawEnabled={false}
                />
                <Line
                  points={[plusCx - armLen, plusCy, plusCx + armLen, plusCy]}
                  stroke="white"
                  strokeWidth={stroke}
                  lineCap="round"
                  perfectDrawEnabled={false}
                />
                <Line
                  points={[plusCx, plusCy - armLen, plusCx, plusCy + armLen]}
                  stroke="white"
                  strokeWidth={stroke}
                  lineCap="round"
                  perfectDrawEnabled={false}
                />
              </>
            );
          })()}
          {isConditionHover && (
            <Group x={-Math.max(0, width - 122)} y={-28}>
              <Rect
                width={122}
                height={22}
                fill="black"
                opacity={0.86}
                cornerRadius={4}
                shadowColor="black"
                shadowBlur={6}
                shadowOpacity={0.45}
                perfectDrawEnabled={false}
              />
              <Text
                text={conditions.map(formatCondition).join('  |  ')}
                x={6}
                y={6}
                width={110}
                height={12}
                align="center"
                fontSize={9}
                fontStyle="bold"
                fill="white"
                perfectDrawEnabled={false}
              />
            </Group>
          )}
        </Group>
      )}
    </Group>
  );
}

export const Token = memo(TokenComponent, (prev, next) => (
  prev.token === next.token &&
  prev.gridSize === next.gridSize &&
  prev.isDraggable === next.isDraggable &&
  prev.isSelected === next.isSelected &&
  prev.isHovered === next.isHovered &&
  prev.pendingPlacement === next.pendingPlacement &&
  prev.onSelect === next.onSelect &&
  prev.onContextMenu === next.onContextMenu &&
  prev.onUpdate === next.onUpdate &&
  prev.blockingSegments === next.blockingSegments
));
