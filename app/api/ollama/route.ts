import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy endpoint for Ollama API requests
 * This avoids CORS issues when calling Ollama from the browser
 */

// Helper to fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, baseUrl, model, prompt, system } = body;

    if (!baseUrl) {
      return NextResponse.json(
        { error: "baseUrl is required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "test": {
        // Test connection by fetching tags
        try {
          const response = await fetchWithTimeout(
            `${baseUrl}/api/tags`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            },
            5000 // 5 second timeout for test
          );
          return NextResponse.json({ connected: response.ok });
        } catch (err) {
          // Connection failed - Ollama not running or not accessible
          console.error("Ollama connection test failed:", err);
          return NextResponse.json({ 
            connected: false, 
            error: err instanceof Error && err.name === 'AbortError' 
              ? "Connection timeout - is Ollama running?" 
              : "Cannot connect to Ollama server"
          });
        }
      }

      case "models": {
        // Get available models
        try {
          const response = await fetchWithTimeout(
            `${baseUrl}/api/tags`,
            {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            },
            5000
          );

          if (!response.ok) {
            return NextResponse.json(
              { error: "Failed to fetch models", models: [] },
              { status: 200 } // Return 200 so client doesn't throw
            );
          }

          const data = await response.json();
          return NextResponse.json({
            models: data.models || [],
          });
        } catch (err) {
          console.error("Failed to fetch models:", err);
          return NextResponse.json({ 
            models: [], 
            error: "Cannot connect to Ollama server" 
          });
        }
      }

      case "generate": {
        // Generate text (non-streaming)
        if (!model || !prompt) {
          return NextResponse.json(
            { error: "model and prompt are required" },
            { status: 400 }
          );
        }

        try {
          const response = await fetchWithTimeout(
            `${baseUrl}/api/generate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model,
                prompt,
                stream: false,
                system,
                options: {
                  temperature: 0.8,
                  num_predict: 2048,
                },
              }),
            },
            120000 // 2 minute timeout for generation
          );

          if (!response.ok) {
            const errorText = await response.text().catch(() => "Unknown error");
            return NextResponse.json(
              { error: `Generation failed: ${errorText}` },
              { status: 200 } // Return 200 so we can show error message
            );
          }

          const data = await response.json();
          return NextResponse.json({ response: data.response });
        } catch (err) {
          console.error("Generation failed:", err);
          return NextResponse.json({ 
            error: err instanceof Error && err.name === 'AbortError'
              ? "Generation timeout - try a shorter prompt"
              : "Cannot connect to Ollama server"
          });
        }
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Ollama proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy error" },
      { status: 500 }
    );
  }
}

/**
 * Streaming endpoint for text generation
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const baseUrl = searchParams.get("baseUrl");
  const model = searchParams.get("model");
  const prompt = searchParams.get("prompt");
  const system = searchParams.get("system");

  if (!baseUrl || !model || !prompt) {
    return new Response(
      JSON.stringify({ error: "baseUrl, model, and prompt are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout

    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        system: system || undefined,
        options: {
          temperature: 0.8,
          num_predict: 2048,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "Unknown error");
      return new Response(
        JSON.stringify({ error: `Generation failed: ${errorText}` }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create a TransformStream to pass through the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Parse each line and extract just the response text
            const text = decoder.decode(value);
            const lines = text.split("\n").filter(line => line.trim());
            
            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                if (json.response) {
                  controller.enqueue(encoder.encode(json.response));
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Ollama streaming error:", error);
    const message = error instanceof Error 
      ? (error.name === 'AbortError' ? 'Generation timeout' : error.message)
      : "Cannot connect to Ollama server";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
}
