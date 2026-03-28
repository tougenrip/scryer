"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  testConnection,
  getModelNames,
  generateText,
  generateTextStreamToString,
} from "@/lib/ollama";
import { getSystemPrompt, getPromptGenerator, type GeneratorOptions } from "@/lib/utils/ai-prompts";

// localStorage keys
const STORAGE_KEYS = {
  baseUrl: "scryer_ollama_base_url",
  model: "scryer_ollama_model",
  enabled: "scryer_ollama_enabled",
};

// Default values
const DEFAULT_BASE_URL = "http://localhost:11434";

export interface OllamaSettings {
  baseUrl: string;
  model: string | null;
  enabled: boolean;
}

export interface OllamaContextType {
  // Settings
  settings: OllamaSettings;
  setBaseUrl: (url: string) => void;
  setModel: (model: string | null) => void;
  setEnabled: (enabled: boolean) => void;

  // Connection state
  isConnected: boolean;
  isChecking: boolean;
  availableModels: string[];
  lastError: string | null;

  // Actions
  checkConnection: () => Promise<boolean>;
  refreshModels: () => Promise<string[]>;

  // Generation
  generate: (
    generatorType: string,
    options?: GeneratorOptions,
    onProgress?: (text: string) => void
  ) => Promise<string>;
  generateRaw: (
    prompt: string,
    systemPrompt?: string,
    onProgress?: (text: string) => void
  ) => Promise<string>;
  isGenerating: boolean;
}

const OllamaContext = createContext<OllamaContextType | null>(null);

export function useOllama() {
  const context = useContext(OllamaContext);
  if (!context) {
    throw new Error("useOllama must be used within an OllamaProvider");
  }
  return context;
}

// Safe hook that doesn't throw if provider is missing
export function useOllamaSafe(): OllamaContextType | null {
  return useContext(OllamaContext);
}

interface OllamaProviderProps {
  children: ReactNode;
}

export function OllamaProvider({ children }: OllamaProviderProps) {
  // Settings state
  const [settings, setSettings] = useState<OllamaSettings>({
    baseUrl: DEFAULT_BASE_URL,
    model: null,
    enabled: false,
  });

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedBaseUrl = localStorage.getItem(STORAGE_KEYS.baseUrl);
    const storedModel = localStorage.getItem(STORAGE_KEYS.model);
    const storedEnabled = localStorage.getItem(STORAGE_KEYS.enabled);

    setSettings({
      baseUrl: storedBaseUrl || DEFAULT_BASE_URL,
      model: storedModel || null,
      enabled: storedEnabled === "true",
    });
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem(STORAGE_KEYS.baseUrl, settings.baseUrl);
    if (settings.model) {
      localStorage.setItem(STORAGE_KEYS.model, settings.model);
    } else {
      localStorage.removeItem(STORAGE_KEYS.model);
    }
    localStorage.setItem(STORAGE_KEYS.enabled, String(settings.enabled));
  }, [settings]);

  // Check connection when enabled or baseUrl changes
  useEffect(() => {
    if (settings.enabled && settings.baseUrl) {
      checkConnection();
    } else {
      setIsConnected(false);
      setAvailableModels([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.enabled, settings.baseUrl]);

  const setBaseUrl = useCallback((url: string) => {
    setSettings((prev) => ({ ...prev, baseUrl: url }));
    setIsConnected(false);
    setLastError(null);
  }, []);

  const setModel = useCallback((model: string | null) => {
    setSettings((prev) => ({ ...prev, model }));
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, enabled }));
    if (!enabled) {
      setIsConnected(false);
      setAvailableModels([]);
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    setLastError(null);

    try {
      const result = await testConnection(settings.baseUrl);
      setIsConnected(result.connected);

      if (result.connected) {
        // Fetch available models
        const models = await getModelNames(settings.baseUrl);
        setAvailableModels(models);

        // Auto-select first model if none selected
        if (!settings.model && models.length > 0) {
          setModel(models[0]);
        }
      } else {
        setLastError(result.error || "Could not connect to Ollama server. Make sure Ollama is running.");
        setAvailableModels([]);
      }

      return result.connected;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Connection failed";
      setLastError(errorMessage);
      setIsConnected(false);
      setAvailableModels([]);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, [settings.baseUrl, settings.model, setModel]);

  const refreshModels = useCallback(async (): Promise<string[]> => {
    if (!isConnected) {
      return [];
    }

    try {
      const models = await getModelNames(settings.baseUrl);
      setAvailableModels(models);
      return models;
    } catch (error) {
      console.error("Failed to refresh models:", error);
      return availableModels;
    }
  }, [isConnected, settings.baseUrl, availableModels]);

  /**
   * Generate content using a predefined generator type
   */
  const generate = useCallback(
    async (
      generatorType: string,
      options: GeneratorOptions = {},
      onProgress?: (text: string) => void
    ): Promise<string> => {
      if (!settings.enabled || !isConnected || !settings.model) {
        throw new Error("Ollama is not configured or connected");
      }

      setIsGenerating(true);
      setLastError(null);

      try {
        const systemPrompt = getSystemPrompt(generatorType as any);
        const promptGenerator = getPromptGenerator(generatorType);
        const prompt = promptGenerator(options);

        const result = await generateTextStreamToString(
          settings.baseUrl,
          settings.model,
          prompt,
          {
            system: systemPrompt,
            temperature: 0.8,
            maxTokens: 2048,
            onToken: onProgress,
          }
        );

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Generation failed";
        setLastError(errorMessage);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [settings, isConnected]
  );

  /**
   * Generate content using a raw prompt
   */
  const generateRaw = useCallback(
    async (
      prompt: string,
      systemPrompt?: string,
      onProgress?: (text: string) => void
    ): Promise<string> => {
      if (!settings.enabled || !isConnected || !settings.model) {
        throw new Error("Ollama is not configured or connected");
      }

      setIsGenerating(true);
      setLastError(null);

      try {
        const result = await generateTextStreamToString(
          settings.baseUrl,
          settings.model,
          prompt,
          {
            system: systemPrompt,
            temperature: 0.8,
            maxTokens: 2048,
            onToken: onProgress,
          }
        );

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Generation failed";
        setLastError(errorMessage);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [settings, isConnected]
  );

  const value: OllamaContextType = {
    settings,
    setBaseUrl,
    setModel,
    setEnabled,
    isConnected,
    isChecking,
    availableModels,
    lastError,
    checkConnection,
    refreshModels,
    generate,
    generateRaw,
    isGenerating,
  };

  return (
    <OllamaContext.Provider value={value}>{children}</OllamaContext.Provider>
  );
}
