import { create } from 'zustand';
import { Token, FogData, FogShape } from '@/types/vtt';

export type PendingTokenPlacement = {
  name: string;
  image_url: string | null;
  type: 'token' | 'prop';
  monster_source?: 'srd' | 'homebrew' | null;
  monster_index?: string | null;
  srd_monster_id?: string | null;
};

interface VttState {
  // Canvas State
  stageScale: number;
  stagePos: { x: number; y: number };
  
  // Grid State (gridSize = pixels per cell on the map image)
  gridSize: number;
  gridType: 'square' | 'hex';
  feetPerSquare: number;
  showGrid: boolean;
  gridColor: string;
  gridOpacity: number;

  // Map State
  mapId: string | null;
  mapUrl: string | null;
  mapDimensions: { width: number; height: number } | null;

  // Tokens State
  tokens: Token[];
  selectedTokenId: string | null;
  selectedTokenIds: string[];
  pendingTokenPlacement: PendingTokenPlacement | null;

  // Fog State
  fogData: FogData;

  // Weather State
  weatherType: 'none' | 'rain' | 'snow' | 'fog';
  weatherIntensity: number; // 0 to 1

  // Tools
  activeTool:
    | 'select'
    | 'pan'
    | 'measure'
    | 'fog'
    | 'ping'
    | 'draw'
    | 'erase'
    | 'aoe-circle'
    | 'aoe-cone'
    | 'aoe-line'
    | 'aoe-square'
    | 'aoe-ring';
  aoeShape: 'circle' | 'cone' | 'line' | 'square' | 'ring';
  dmPrivateMode: boolean;
  fogToolType: 'reveal' | 'hide';
  fogToolShape: 'rect' | 'circle' | 'polygon' | 'brush';
  fogBrushSize: number;
  fogBrushSmoothness: number;
  dmHideFog: boolean;
  
  // Actions
  setStageScale: (scale: number) => void;
  setStagePos: (pos: { x: number; y: number }) => void;
  setGridSize: (size: number) => void;
  setGridType: (type: 'square' | 'hex') => void;
  setFeetPerSquare: (ft: number) => void;
  setShowGrid: (show: boolean) => void;
  setGridColor: (color: string) => void;
  setGridOpacity: (opacity: number) => void;
  setMapId: (id: string | null) => void;
  setMapUrl: (url: string | null) => void;
  setMapDimensions: (dimensions: { width: number; height: number } | null) => void;
  setTokens: (tokens: Token[]) => void;
  updateToken: (id: string, updates: Partial<Token>) => void;
  addToken: (token: Token) => void;
  removeToken: (id: string) => void;
  setSelectedTokenId: (id: string | null) => void;
  setSelectedTokenIds: (ids: string[]) => void;
  setPendingTokenPlacement: (placement: PendingTokenPlacement | null) => void;
  
  setFogData: (data: FogData) => void;
  addFogShape: (shape: FogShape) => void;
  setFogToolType: (type: 'reveal' | 'hide') => void;
  setFogToolShape: (shape: 'rect' | 'circle' | 'polygon' | 'brush') => void;
  setFogBrushSize: (size: number) => void;
  setFogBrushSmoothness: (smoothness: number) => void;
  setDmHideFog: (hide: boolean) => void;

  setWeatherType: (type: 'none' | 'rain' | 'snow' | 'fog') => void;
  setWeatherIntensity: (intensity: number) => void;

  setActiveTool: (
    tool:
      | 'select'
      | 'pan'
      | 'measure'
      | 'fog'
      | 'ping'
      | 'aoe-circle'
      | 'aoe-cone'
      | 'aoe-line'
      | 'aoe-square'
      | 'aoe-ring'
  ) => void;
  setAoeShape: (shape: 'circle' | 'cone' | 'line' | 'square' | 'ring') => void;
  setDmPrivateMode: (on: boolean) => void;
  resetView: () => void;
}

export const useVttStore = create<VttState>((set) => ({
  stageScale: 1,
  stagePos: { x: 0, y: 0 },
  
  gridSize: 50,
  gridType: 'square',
  feetPerSquare: 5,
  showGrid: true,
  gridColor: '#000000',
  gridOpacity: 0.2,
  
  mapId: null,
  mapUrl: null,
  mapDimensions: null,
  
  tokens: [],
  selectedTokenId: null,
  selectedTokenIds: [],
  pendingTokenPlacement: null,

  fogData: { shapes: [], revealed: false },

  activeTool: 'select',
  aoeShape: 'circle',
  dmPrivateMode: false,
  fogToolType: 'reveal',
  fogToolShape: 'rect',
  fogBrushSize: 40,
  fogBrushSmoothness: 5,
  dmHideFog: false,
  
  weatherType: 'none',
  weatherIntensity: 0.5,

  setStageScale: (scale) => set({ stageScale: scale }),
  setStagePos: (pos) => set({ stagePos: pos }),
  setGridSize: (size) => set({ gridSize: size }),
  setGridType: (type) => set({ gridType: type }),
  setFeetPerSquare: (ft) => set({ feetPerSquare: ft }),
  setShowGrid: (show) => set({ showGrid: show }),
  setGridColor: (color) => set({ gridColor: color }),
  setGridOpacity: (opacity) => set({ gridOpacity: opacity }),
  setMapId: (id) => set({ mapId: id }),
  setMapUrl: (url) => set({ mapUrl: url }),
  setMapDimensions: (dimensions) => set({ mapDimensions: dimensions }),
  setTokens: (tokens) => set({ tokens }),
  updateToken: (id, updates) => set((state) => ({
    tokens: state.tokens.map((t) => (t.id === id ? { ...t, ...updates } : t)),
  })),
  addToken: (token) => set((state) => ({
    tokens: state.tokens.some((t) => t.id === token.id)
      ? state.tokens.map((t) => (t.id === token.id ? { ...t, ...token } : t))
      : [...state.tokens, token],
  })),
  removeToken: (id) => set((state) => ({
    tokens: state.tokens.filter((t) => t.id !== id),
  })),
  setSelectedTokenId: (id) =>
    set({ selectedTokenId: id, selectedTokenIds: id ? [id] : [] }),
  setSelectedTokenIds: (ids) =>
    set({ selectedTokenIds: ids, selectedTokenId: ids[0] ?? null }),
  setPendingTokenPlacement: (placement) => set({ pendingTokenPlacement: placement }),

  setFogData: (data) => set({ fogData: data }),
  addFogShape: (shape) => set((state) => ({
    fogData: {
      ...state.fogData,
      shapes: [...state.fogData.shapes, shape],
    }
  })),
  setFogToolType: (type) => set({ fogToolType: type }),
  setFogToolShape: (shape) => set({ fogToolShape: shape }),
  setFogBrushSize: (size) => set({ fogBrushSize: size }),
  setFogBrushSmoothness: (smoothness) => set({ fogBrushSmoothness: smoothness }),
  setDmHideFog: (hide) => set({ dmHideFog: hide }),

  setWeatherType: (type) => set({ weatherType: type }),
  setWeatherIntensity: (intensity) => set({ weatherIntensity: intensity }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  setAoeShape: (shape) => set({ aoeShape: shape }),
  setDmPrivateMode: (on) => set({ dmPrivateMode: on }),
  resetView: () => set({ stageScale: 1, stagePos: { x: 0, y: 0 } }),
}));
