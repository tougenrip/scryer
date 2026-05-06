'use client';

import React, { memo, useEffect, useState } from 'react';
import { Layer } from 'react-konva';
import { useVttStore } from '@/lib/store/vtt-store';
import { Token } from './Token';
import { Token as TokenType } from '@/types/vtt';
import type { WallSegment } from '@/types/vtt-walls';

interface TokenLayerProps {
  onTokenUpdate: (id: string, updates: Partial<TokenType>) => void;
  onTokenContextMenu?: (id: string, position: { x: number; y: number }) => void;
  onTokenDragMove?: (id: string, x: number, y: number) => void;
  onTokenDragEnd?: () => void;
  groupDrag?: { leadId: string; dx: number; dy: number } | null;
  /** When non-null, only tokens whose ids are in this set render (player view). */
  visibleTokenIds?: Set<string> | null;
  blockingSegments?: WallSegment[];
}

const TokenLayerComponent: React.FC<TokenLayerProps> = ({
  onTokenUpdate,
  onTokenContextMenu,
  onTokenDragMove,
  onTokenDragEnd,
  groupDrag,
  visibleTokenIds,
  blockingSegments,
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

  const renderedTokens = visibleTokenIds
    ? tokens.filter((t) => visibleTokenIds.has(t.id))
    : tokens;

  return (
    <Layer listening={isInteractive}>
      {renderedTokens.map((token) => {
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
            blockingSegments={blockingSegments}
          />
        );
      })}
    </Layer>
  );
};

export const TokenLayer = memo(TokenLayerComponent);
