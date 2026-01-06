import React from 'react';
import { Group, Line, Text, Tag, Label } from 'react-konva';
import { Vector2d } from 'konva/lib/types';

interface RulerLayerProps {
  start: Vector2d | null;
  end: Vector2d | null;
  gridSize: number;
  scale: number;
}

export const RulerLayer: React.FC<RulerLayerProps> = ({ start, end, gridSize, scale }) => {
  if (!start || !end) return null;

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  // Calculate distance in pixels
  const pixelDistance = Math.sqrt(dx * dx + dy * dy);
  
  // Convert to game units (5ft per grid cell)
  // gridSize is pixels per cell
  const gameDistance = Math.round((pixelDistance / gridSize) * 5 * 10) / 10; // Round to 1 decimal

  return (
    <Group>
      {/* The Line */}
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke="#facc15" // Yellow-400
        strokeWidth={2 / scale}
        dash={[10 / scale, 5 / scale]}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.5}
      />

      {/* The Endpoint Dot */}
      <Line
        points={[end.x, end.y]}
        stroke="#facc15"
        strokeWidth={4 / scale}
        lineCap="round"
      />

      {/* The Label */}
      <Label
        x={end.x + 10 / scale}
        y={end.y + 10 / scale}
      >
        <Tag
          fill="rgba(0, 0, 0, 0.7)"
          pointerDirection="left"
          pointerWidth={10 / scale}
          pointerHeight={10 / scale}
          cornerRadius={4 / scale}
        />
        <Text
          text={`${gameDistance} ft.`}
          fill="white"
          padding={5 / scale}
          fontSize={14 / scale}
          fontFamily="Arial"
        />
      </Label>
    </Group>
  );
};
