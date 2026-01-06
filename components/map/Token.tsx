'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Group, Circle, Image as KonvaImage, Rect, Text } from 'react-konva';
import { Token as TokenType } from '@/types/vtt';
import { useVttStore } from '@/lib/store/vtt-store';
import { KonvaEventObject } from 'konva/lib/Node';

interface TokenProps {
  token: TokenType;
  onUpdate?: (id: string, updates: Partial<TokenType>) => void;
}

export const Token: React.FC<TokenProps> = ({ token, onUpdate }) => {
  const { gridSize, activeTool, selectedTokenId, setSelectedTokenId } = useVttStore();
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const groupRef = useRef<any>(null);

  useEffect(() => {
    if (token.image_url) {
      const img = new window.Image();
      img.src = token.image_url;
      img.onload = () => setImage(img);
      img.onerror = () => setImage(null);
    } else {
      setImage(null);
    }
  }, [token.image_url]);

  const getSizeMultiplier = (size: string) => {
    switch (size) {
      case 'tiny': return 0.5;
      case 'small': return 0.8;
      case 'medium': return 1;
      case 'large': return 2;
      case 'huge': return 3;
      case 'gargantuan': return 4;
      default: return 1;
    }
  };

  const sizeMultiplier = getSizeMultiplier(token.size);
  const width = gridSize * sizeMultiplier;
  const radius = width / 2;

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    const x = Math.round(e.target.x() / gridSize) * gridSize;
    const y = Math.round(e.target.y() / gridSize) * gridSize;
    
    // Snap to grid visually
    e.target.to({
      x: x,
      y: y,
      duration: 0.1
    });

    if (onUpdate) {
      onUpdate(token.id, { x, y });
    }
  };

  // Only allow drag if tool is select
  const isDraggable = activeTool === 'select';

  const isSelected = selectedTokenId === token.id;

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    // Prevent deselecting if dragging
    if (isDragging) return;
    
    // Stop propagation to prevent map click clearing selection
    e.cancelBubble = true;
    
    setSelectedTokenId(token.id);
  };

  return (
    <Group
      x={token.x}
      y={token.y}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      ref={groupRef}
    >
      {/* Background/Color Ring */}
      <Circle
        x={radius}
        y={radius}
        radius={radius}
        fill={token.color || '#cccccc'}
        stroke={isSelected ? "#4ade80" : "white"}
        strokeWidth={isSelected ? 4 : 2}
        opacity={0.8}
        shadowColor={isSelected ? "#4ade80" : "black"}
        shadowBlur={isSelected ? 10 : 0}
        shadowOpacity={0.5}
      />

      {/* Token Image */}
      {image ? (
        <KonvaImage
          image={image}
          width={width}
          height={width}
          cornerRadius={radius}
        />
      ) : (
        <Text 
          text={token.name?.substring(0, 2).toUpperCase() || '?'} 
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
            />
            <Rect 
                width={(Math.max(0, Math.min(token.hp_current, token.hp_max)) / token.hp_max) * width} 
                height={5} 
                fill="green" 
                cornerRadius={2}
            />
         </Group>
      )}
    </Group>
  );
};
