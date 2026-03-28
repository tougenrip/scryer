/**
 * Ollama API Client
 * Provides functions for interacting with a local Ollama instance
 * Uses Next.js API routes to proxy requests (avoids CORS issues)
 */

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaTagsResponse {
  models: OllamaModel[];
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
  };
  system?: string;
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/**
 * Test connection to Ollama server (via API proxy)
 */
export async function testConnection(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<{ connected: boolean; error?: string }> {
  try {
    const response = await fetch('/api/ollama', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'test',
        baseUrl,
      }),
    });

    const data = await response.json();
    return { 
      connected: data.connected === true,
      error: data.error 
    };
  } catch (error) {
    console.error('Ollama connection test failed:', error);
    return { 
      connected: false, 
      error: 'Failed to connect to server' 
    };
  }
}

/**
 * Get list of available models from Ollama (via API proxy)
 */
export async function getAvailableModels(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<OllamaModel[]> {
  try {
    const response = await fetch('/api/ollama', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'models',
        baseUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('Failed to get Ollama models:', error);
    return [];
  }
}

/**
 * Get model names as a simple string array
 */
export async function getModelNames(baseUrl: string = DEFAULT_OLLAMA_URL): Promise<string[]> {
  const models = await getAvailableModels(baseUrl);
  return models.map((m) => m.name);
}

/**
 * Generate text using Ollama (non-streaming, via API proxy)
 */
export async function generateText(
  baseUrl: string = DEFAULT_OLLAMA_URL,
  model: string,
  prompt: string,
  options?: {
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  try {
    const response = await fetch('/api/ollama', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'generate',
        baseUrl,
        model,
        prompt,
        system: options?.system,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Ollama generation failed:', error);
    throw error;
  }
}

/**
 * Generate text using Ollama with streaming (via API proxy)
 * Returns an async generator that yields chunks of text
 */
export async function* generateTextStream(
  baseUrl: string = DEFAULT_OLLAMA_URL,
  model: string,
  prompt: string,
  options?: {
    system?: string;
    temperature?: number;
    maxTokens?: number;
    onToken?: (token: string) => void;
  }
): AsyncGenerator<string, void, unknown> {
  const params = new URLSearchParams({
    baseUrl,
    model,
    prompt,
  });
  
  if (options?.system) {
    params.set('system', options.system);
  }

  const response = await fetch(`/api/ollama?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`Generation failed: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      if (text) {
        options?.onToken?.(text);
        yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Helper to collect streaming response into a single string
 */
export async function generateTextStreamToString(
  baseUrl: string = DEFAULT_OLLAMA_URL,
  model: string,
  prompt: string,
  options?: {
    system?: string;
    temperature?: number;
    maxTokens?: number;
    onToken?: (token: string) => void;
  }
): Promise<string> {
  let result = '';
  for await (const chunk of generateTextStream(baseUrl, model, prompt, options)) {
    result += chunk;
  }
  return result;
}

/**
 * Check if a specific model is available
 */
export async function isModelAvailable(
  baseUrl: string = DEFAULT_OLLAMA_URL,
  modelName: string
): Promise<boolean> {
  const models = await getModelNames(baseUrl);
  return models.some((m) => m === modelName || m.startsWith(`${modelName}:`));
}

/**
 * Default export for convenience
 */
const ollama = {
  testConnection,
  getAvailableModels,
  getModelNames,
  generateText,
  generateTextStream,
  generateTextStreamToString,
  isModelAvailable,
};

export default ollama;
