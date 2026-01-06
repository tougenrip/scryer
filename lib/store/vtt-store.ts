import { create } from 'zustand';
import { Token, FogData, FogShape } from '@/types/vtt';

interface VttState {
  // Canvas State
  stageScale: number;
  stagePos: { x: number; y: number };
  
  // Grid State
  gridSize: number;
  gridType: 'square' | 'hex';
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

  // Fog State
  fogData: FogData;

  // Weather State
  weatherType: 'none' | 'rain' | 'snow' | 'fog';
  weatherIntensity: number; // 0 to 1

  // Tools
  activeTool: 'select' | 'pan' | 'measure' | 'fog';
  fogToolType: 'reveal' | 'hide';
  fogToolShape: 'rect' | 'circle' | 'polygon';
  
  // Actions
  setStageScale: (scale: number) => void;
  setStagePos: (pos: { x: number; y: number }) => void;
  setGridSize: (size: number) => void;
  setGridType: (type: 'square' | 'hex') => void;
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
  
  setFogData: (data: FogData) => void;
  addFogShape: (shape: FogShape) => void;
  setFogToolType: (type: 'reveal' | 'hide') => void;
  setFogToolShape: (shape: 'rect' | 'circle' | 'polygon') => void;

  setWeatherType: (type: 'none' | 'rain' | 'snow' | 'fog') => void;
  setWeatherIntensity: (intensity: number) => void;

  setActiveTool: (tool: 'select' | 'pan' | 'measure' | 'fog') => void;
  resetView: () => void;
}

export const useVttStore = create<VttState>((set) => ({
  stageScale: 1,
  stagePos: { x: 0, y: 0 },
  
  gridSize: 50,
  gridType: 'square',
  showGrid: true,
  gridColor: '#000000',
  gridOpacity: 0.2,
  
  mapId: null,
  mapUrl: null,
  mapDimensions: null,
  
  tokens: [],
  selectedTokenId: null,

  fogData: { shapes: [], revealed: false },

  activeTool: 'select',
  fogToolType: 'reveal',
  fogToolShape: 'rect',
  
  weatherType: 'none',
  weatherIntensity: 0.5,

  setStageScale: (scale) => set({ stageScale: scale }),
  setStagePos: (pos) => set({ stagePos: pos }),
  setGridSize: (size) => set({ gridSize: size }),
  setGridType: (type) => set({ gridType: type }),
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
  addToken: (token) => set((state) => ({ tokens: [...state.tokens, token] })),
  removeToken: (id) => set((state) => ({
    tokens: state.tokens.filter((t) => t.id !== id),
  })),
  setSelectedTokenId: (id) => set({ selectedTokenId: id }),

  setFogData: (data) => set({ fogData: data }),
  addFogShape: (shape) => set((state) => ({
    fogData: {
      ...state.fogData,
      shapes: [...state.fogData.shapes, shape],
    }
  })),
  setFogToolType: (type) => set({ fogToolType: type }),
  setFogToolShape: (shape) => set({ fogToolShape: shape }),

  setWeatherType: (type) => set({ weatherType: type }),
  setWeatherIntensity: (intensity) => set({ weatherIntensity: intensity }),

  setActiveTool: (tool) => set({ activeTool: tool }),
  resetView: () => set({ stageScale: 1, stagePos: { x: 0, y: 0 } }),
}));
