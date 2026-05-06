'use client';

import React, { memo, useEffect, useState } from 'react';
import { Layer } from 'react-konva';
import { useVttStore } from '@/lib/store/vtt-store';
import { Token } from './Token';
import { Token as TokenType } from '@/types/vtt';

interface TokenLayerProps {
  onTokenUpdate: (id: string, updates: Partial<TokenType>) => void;
  onTokenContextMenu?: (id: string, position: { x: number; y: number }) => void;
  onTokenDragMove?: (id: string, x: number, y: number) => void;
  onTokenDragEnd?: () => void;
  groupDrag?: { leadId: string; dx: number; dy: number } | null;
}

const TokenLayerComponent: React.FC<TokenLayerProps> = ({
  onTokenUpdate,
  onTokenContextMenu,
  onTokenDragMove,
  onTokenDragEnd,
  groupDrag,
}) => {
  const tokens = useVttStore((state) => state.tokens);
  const gridSize = useVttStore((state) => state.gridSize);
  const activeTool = useVttStore((state) => state.activeTool);
  const selectedTokenIds = useVttStore((state) => state.selectedTokenIds);
  const pendingTokenPlacement = useVttStore((state) => state.pendingTokenPlacement);
  const setSelectedTokenId = useVttStore((state) => state.setSelectedTokenId);
  const setSelectedTokenIds = useVttStore((state) => state.setSelectedTokenIds);

  const handleSelect = (id: string, additive?: boolean) => {
    if (additive) {
      const current = useVttStore.getState().selectedTokenIds;
      const next = current.includes(id)
        ? current.filter((existing) => existing !== id)
        : [...current, id];
      setSelectedTokenIds(next);
    } else {
      setSelectedTokenId(id);
    }
  };
  // While Ctrl is held the user is in ad-hoc ruler mode; tokens become
  // non-interactive so clicks pass through to the Stage measure handler
  // instead of starting a token drag.
  const [ctrlPressed, setCtrlPressed] = useState(false);
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setCtrlPressed(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') setCtrlPressed(false);
    };
    const onBlur = () => setCtrlPressed(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
  const isDraggable = activeTool === 'select' && !pendingTokenPlacement && !ctrlPressed;
  const isInteractive = activeTool === 'select' && !pendingTokenPlacement && !ctrlPressed;

  return (
    <Layer listening={isInteractive}>
      {tokens.map((token) => {
        const isInGroupDrag =
          groupDrag != null &&
          groupDrag.leadId !== token.id &&
          selectedTokenIds.includes(token.id);
        return (
          <Token
            key={token.id}
            token={token}
            gridSize={gridSize}
            isDraggable={isDraggable}
            isSelected={selectedTokenIds.includes(token.id)}
            pendingPlacement={!!pendingTokenPlacement}
            groupDragOffset={
              isInGroupDrag && groupDrag
                ? { x: groupDrag.dx, y: groupDrag.dy }
                : null
            }
            onSelect={handleSelect}
            onContextMenu={onTokenContextMenu}
            onUpdate={onTokenUpdate}
            onDragMove={onTokenDragMove}
            onDragEnd={onTokenDragEnd}
          />
        );
      })}
    </Layer>
  );
};

export const TokenLayer = memo(TokenLayerComponent);
