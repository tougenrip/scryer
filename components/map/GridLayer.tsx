'use client';

import React, { useMemo } from 'react';
import { Line, Group } from 'react-konva';
import { useVttStore } from '@/lib/store/vtt-store';

export const GridLayer: React.FC = () => {
  const { 
    gridSize, 
    gridType, 
    showGrid, 
    gridColor, 
    gridOpacity,
    mapDimensions 
  } = useVttStore();

  const lines = useMemo(() => {
    if (!showGrid || !mapDimensions || gridType !== 'square') return [];

    const { width, height } = mapDimensions;
    const linesArray: React.ReactNode[] = [];
    const strokeWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      linesArray.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, height]}
          stroke={gridColor}
          strokeWidth={strokeWidth}
          opacity={gridOpacity}
          listening={false}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      linesArray.push(
        <Line
          key={`h-${y}`}
          points={[0, y, width, y]}
          stroke={gridColor}
          strokeWidth={strokeWidth}
          opacity={gridOpacity}
          listening={false}
        />
      );
    }

    return linesArray;
  }, [gridSize, gridType, showGrid, gridColor, gridOpacity, mapDimensions]);

  if (!showGrid || !mapDimensions) return null;

  return (
    <Group>
      {lines}
    </Group>
  );
};
