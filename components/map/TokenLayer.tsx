'use client';

import React from 'react';
import { Layer } from 'react-konva';
import { useVttStore } from '@/lib/store/vtt-store';
import { Token } from './Token';
import { Token as TokenType } from '@/types/vtt';

interface TokenLayerProps {
  onTokenUpdate: (id: string, updates: Partial<TokenType>) => void;
}

export const TokenLayer: React.FC<TokenLayerProps> = ({ onTokenUpdate }) => {
  const tokens = useVttStore((state) => state.tokens);

  return (
    <Layer>
      {tokens.map((token) => (
        <Token 
          key={token.id} 
          token={token} 
          onUpdate={onTokenUpdate} 
        />
      ))}
    </Layer>
  );
};
