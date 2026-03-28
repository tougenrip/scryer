"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// localStorage keys
const STORAGE_KEYS = {
  colorTheme: "scryer_display_color_theme",
  edgeRoundness: "scryer_display_edge_roundness",
};

// Color theme options — 4 dark, 2 light
export const COLOR_THEMES = {
  obsidian: {
    name: "Obsidian",
    description: "Near-black tones with subtle warm accents — the classic dark mode",
    mode: "dark" as const,
    preview: {
      bg: "#111111",
      card: "#1a1a1a",
      accent: "#c9a84c",
    },
  },
  shadowforge: {
    name: "Shadowforge",
    description: "Deep charcoal and ember orange — forged in darkness",
    mode: "dark" as const,
    preview: {
      bg: "#1c1917",
      card: "#292524",
      accent: "#ea580c",
    },
  },
  nightfall: {
    name: "Nightfall",
    description: "Midnight blues and ethereal cyan — the hour between worlds",
    mode: "dark" as const,
    preview: {
      bg: "#0f172a",
      card: "#1e293b",
      accent: "#38bdf8",
    },
  },
  grimoire: {
    name: "Grimoire",
    description: "Ancient violet and mystic gold — spellbound pages",
    mode: "dark" as const,
    preview: {
      bg: "#1a1425",
      card: "#261e35",
      accent: "#c084fc",
    },
  },
  parchment: {
    name: "Parchment",
    description: "Warm ivory and ink — classical adventurer's journal",
    mode: "light" as const,
    preview: {
      bg: "#f5f0e8",
      card: "#ebe4d6",
      accent: "#92742d",
    },
  },
  silverlight: {
    name: "Silverlight",
    description: "Clean whites and cool steel — modern clarity",
    mode: "light" as const,
    preview: {
      bg: "#f8fafc",
      card: "#f1f5f9",
      accent: "#6366f1",
    },
  },
} as const;

export type ColorTheme = keyof typeof COLOR_THEMES;

// Edge roundness options
export const EDGE_ROUNDNESS = {
  none: {
    name: "Sharp",
    description: "No rounded corners",
    value: "0",
  },
  small: {
    name: "Subtle",
    description: "Slightly rounded corners",
    value: "0.25rem",
  },
  medium: {
    name: "Balanced",
    description: "Moderately rounded corners",
    value: "0.375rem",
  },
  large: {
    name: "Rounded",
    description: "Noticeably rounded corners",
    value: "0.5rem",
  },
  full: {
    name: "Pill",
    description: "Fully rounded corners",
    value: "0.75rem",
  },
} as const;

export type EdgeRoundness = keyof typeof EDGE_ROUNDNESS;

export interface DisplaySettings {
  colorTheme: ColorTheme;
  edgeRoundness: EdgeRoundness;
}

export interface DisplayContextType {
  settings: DisplaySettings;
  setColorTheme: (theme: ColorTheme) => void;
  setEdgeRoundness: (roundness: EdgeRoundness) => void;
}

const DisplayContext = createContext<DisplayContextType | null>(null);

export function useDisplay() {
  const context = useContext(DisplayContext);
  if (!context) {
    throw new Error("useDisplay must be used within a DisplayProvider");
  }
  return context;
}

// Safe hook that doesn't throw if provider is missing
export function useDisplaySafe(): DisplayContextType | null {
  return useContext(DisplayContext);
}

interface DisplayProviderProps {
  children: ReactNode;
}

export function DisplayProvider({ children }: DisplayProviderProps) {
  const [settings, setSettings] = useState<DisplaySettings>({
    colorTheme: "obsidian",
    edgeRoundness: "medium",
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedColorTheme = localStorage.getItem(STORAGE_KEYS.colorTheme) as ColorTheme | null;
    const storedEdgeRoundness = localStorage.getItem(STORAGE_KEYS.edgeRoundness) as EdgeRoundness | null;

    setSettings({
      colorTheme: storedColorTheme && storedColorTheme in COLOR_THEMES ? storedColorTheme : "obsidian",
      edgeRoundness: storedEdgeRoundness && storedEdgeRoundness in EDGE_ROUNDNESS ? storedEdgeRoundness : "medium",
    });
    setIsLoaded(true);
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window === "undefined" || !isLoaded) return;

    localStorage.setItem(STORAGE_KEYS.colorTheme, settings.colorTheme);
    localStorage.setItem(STORAGE_KEYS.edgeRoundness, settings.edgeRoundness);
  }, [settings, isLoaded]);

  // Apply CSS variables and dark/light mode when settings change
  useEffect(() => {
    if (typeof document === "undefined" || !isLoaded) return;

    const root = document.documentElement;
    const theme = COLOR_THEMES[settings.colorTheme];

    // Remove all theme classes
    Object.keys(COLOR_THEMES).forEach((t) => {
      root.classList.remove(`theme-${t}`);
    });

    // Add current theme class
    root.classList.add(`theme-${settings.colorTheme}`);

    // Set dark/light mode based on theme's mode property
    if (theme.mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }

    // Apply edge roundness
    root.style.setProperty("--radius", EDGE_ROUNDNESS[settings.edgeRoundness].value);
  }, [settings, isLoaded]);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setSettings((prev) => ({ ...prev, colorTheme: theme }));
  }, []);

  const setEdgeRoundness = useCallback((roundness: EdgeRoundness) => {
    setSettings((prev) => ({ ...prev, edgeRoundness: roundness }));
  }, []);

  const value: DisplayContextType = {
    settings,
    setColorTheme,
    setEdgeRoundness,
  };

  return (
    <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>
  );
}
