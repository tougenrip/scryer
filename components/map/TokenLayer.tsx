'use client';

import React, { memo } from 'react';
import { Layer } from 'react-konva';
import { useVttStore } from '@/lib/store/vtt-store';
import { Token } from './Token';
import { Token as TokenType } from '@/types/vtt';

interface TokenLayerProps {
  onTokenUpdate: (id: string, updates: Partial<TokenType>) => void;
  onTokenContextMenu?: (id: string, position: { x: number; y: number }) => void;
}

const TokenLayerComponent: React.FC<TokenLayerProps> = ({ onTokenUpdate, onTokenContextMenu }) => {
  const tokens = useVttStore((state) => state.tokens);
  const gridSize = useVttStore((state) => state.gridSize);
  const activeTool = useVttStore((state) => state.activeTool);
  const selectedTokenId = useVttStore((state) => state.selectedTokenId);
  const pendingTokenPlacement = useVttStore((state) => state.pendingTokenPlacement);
  const setSelectedTokenId = useVttStore((state) => state.setSelectedTokenId);
  const isDraggable = activeTool === 'select' && !pendingTokenPlacement;
  const isInteractive = activeTool === 'select' && !pendingTokenPlacement;

  return (
    <Layer listening={isInteractive}>
      {tokens.map((token) => (
        <Token 
          key={token.id} 
          token={token} 
          gridSize={gridSize}
          isDraggable={isDraggable}
          isSelected={selectedTokenId === token.id}
          pendingPlacement={!!pendingTokenPlacement}
          onSelect={setSelectedTokenId}
          onContextMenu={onTokenContextMenu}
          onUpdate={onTokenUpdate} 
        />
      ))}
    </Layer>
  );
};

export const TokenLayer = memo(TokenLayerComponent);
