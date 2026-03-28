"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/shared/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useOllama } from "@/contexts/ollama-context";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Bot,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Sparkles,
  Settings,
  ArrowLeft,
  Palette,
  Square,
  CircleDot,
  Moon,
  Sun,
} from "lucide-react";
import {
  useDisplay,
  COLOR_THEMES,
  EDGE_ROUNDNESS,
  type ColorTheme,
  type EdgeRoundness,
} from "@/contexts/display-context";
import Link from "next/link";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");

  const {
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
  } = useOllama();

  const {
    settings: displaySettings,
    setColorTheme,
    setEdgeRoundness,
  } = useDisplay();

  // Check authentication (but don't require it for settings page)
  useEffect(() => {
    async function getUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Auth check failed:", error);
        // Continue anyway - settings page can work without auth
      }
      setLoading(false);
    }
    getUser();
  }, []);

  // Initialize URL input from settings
  useEffect(() => {
    setUrlInput(settings.baseUrl);
  }, [settings.baseUrl]);

  const handleSaveUrl = () => {
    // Normalize URL (remove trailing slash)
    let normalizedUrl = urlInput.trim();
    if (normalizedUrl.endsWith("/")) {
      normalizedUrl = normalizedUrl.slice(0, -1);
    }
    setBaseUrl(normalizedUrl);
  };

  const handleTestConnection = async () => {
    handleSaveUrl();
    await checkConnection();
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar user={user} />

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container max-w-4xl py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href="/campaigns">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Link>
            </Button>
            <h1 className="font-serif text-3xl font-bold flex items-center gap-3">
              <Settings className="h-8 w-8" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure your Scryer experience
            </p>
          </div>

          <div className="space-y-6">
            {/* Ollama AI Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-serif">Ollama AI Integration</CardTitle>
                      <CardDescription>
                        Connect to a local Ollama instance for AI-powered content generation
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={settings.enabled}
                    onCheckedChange={setEnabled}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Connection Status */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Status:</span>
                  {!settings.enabled ? (
                    <Badge variant="secondary" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Disabled
                    </Badge>
                  ) : isChecking ? (
                    <Badge variant="secondary" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Checking...
                    </Badge>
                  ) : isConnected ? (
                    <Badge variant="default" className="gap-1 bg-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Disconnected
                    </Badge>
                  )}
                </div>

                {/* Error Alert */}
                {lastError && settings.enabled && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{lastError}</AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* URL Input */}
                <div className="space-y-2">
                  <Label htmlFor="ollama-url">Ollama API URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ollama-url"
                      placeholder="http://localhost:11434"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      disabled={!settings.enabled}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={!settings.enabled || isChecking}
                    >
                      {isChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Default: http://localhost:11434. Make sure Ollama is running on your machine.
                  </p>
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ollama-model">Model</Label>
                    {isConnected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={refreshModels}
                        className="h-8 gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh
                      </Button>
                    )}
                  </div>
                  <Select
                    value={settings.model || ""}
                    onValueChange={setModel}
                    disabled={!settings.enabled || !isConnected || availableModels.length === 0}
                  >
                    <SelectTrigger id="ollama-model">
                      <SelectValue placeholder="Select a model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isConnected && availableModels.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No models found. Pull a model using: <code className="bg-muted px-1 rounded">ollama pull llama3.2</code>
                    </p>
                  )}
                  {!isConnected && settings.enabled && (
                    <p className="text-xs text-muted-foreground">
                      Connect to Ollama to see available models.
                    </p>
                  )}
                </div>

                {/* Info Section */}
                <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    What can Ollama AI do?
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                    <li>Generate unique NPCs with personalities and backstories</li>
                    <li>Create engaging quests and plot hooks</li>
                    <li>Design balanced encounters for your party</li>
                    <li>Generate magic items with lore</li>
                    <li>Create taverns, locations, and factions</li>
                    <li>Generate character backstories</li>
                    <li>Enhance name generation with AI suggestions</li>
                  </ul>
                </div>

                {/* Setup Instructions */}
                {!isConnected && settings.enabled && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="text-sm font-medium">Setup Instructions</div>
                    <ol className="text-sm text-muted-foreground space-y-2 ml-6 list-decimal">
                      <li>
                        Install Ollama from{" "}
                        <a
                          href="https://ollama.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          ollama.ai
                        </a>
                      </li>
                      <li>
                        Open a terminal and run: <code className="bg-muted px-1 rounded">ollama serve</code>
                      </li>
                      <li>
                        Pull a model: <code className="bg-muted px-1 rounded">ollama pull llama3.2</code>
                      </li>
                      <li>Click "Test Connection" above</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-2">
                      Recommended models: llama3.2, mistral, mixtral, or any model with good creative writing capabilities.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Other Settings (placeholder for future) */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Palette className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="font-serif">Display Settings</CardTitle>
                    <CardDescription>
                      Customize how Scryer looks and feels
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Color Theme Selection */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Label>Theme</Label>
                  </div>

                  {/* Dark Themes */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Moon className="h-3 w-3" />
                      Dark Themes
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(Object.entries(COLOR_THEMES) as [ColorTheme, typeof COLOR_THEMES[ColorTheme]][])
                        .filter(([, t]) => t.mode === "dark")
                        .map(([key, theme]) => (
                          <button
                            key={key}
                            onClick={() => setColorTheme(key)}
                            className={`relative flex flex-col items-center gap-2.5 p-4 rounded-lg border-2 transition-all hover:border-primary/50 hover:scale-[1.02] ${
                              displaySettings.colorTheme === key
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border"
                            }`}
                          >
                            <div
                              className="w-10 h-10 rounded-full border-2 border-border/50 flex items-center justify-center shadow-inner"
                              style={{
                                background: `linear-gradient(135deg, ${theme.preview.bg} 0%, ${theme.preview.card} 50%, ${theme.preview.accent} 100%)`,
                              }}
                            >
                              {displaySettings.colorTheme === key && (
                                <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />
                              )}
                            </div>
                            <span className="text-xs font-medium">{theme.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Light Themes */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sun className="h-3 w-3" />
                      Light Themes
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(Object.entries(COLOR_THEMES) as [ColorTheme, typeof COLOR_THEMES[ColorTheme]][])
                        .filter(([, t]) => t.mode === "light")
                        .map(([key, theme]) => (
                          <button
                            key={key}
                            onClick={() => setColorTheme(key)}
                            className={`relative flex flex-col items-center gap-2.5 p-4 rounded-lg border-2 transition-all hover:border-primary/50 hover:scale-[1.02] ${
                              displaySettings.colorTheme === key
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border"
                            }`}
                          >
                            <div
                              className="w-10 h-10 rounded-full border-2 border-border/50 flex items-center justify-center shadow-inner"
                              style={{
                                background: `linear-gradient(135deg, ${theme.preview.bg} 0%, ${theme.preview.card} 50%, ${theme.preview.accent} 100%)`,
                              }}
                            >
                              {displaySettings.colorTheme === key && (
                                <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />
                              )}
                            </div>
                            <span className="text-xs font-medium">{theme.name}</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {COLOR_THEMES[displaySettings.colorTheme].description}
                  </p>
                </div>

                <Separator />

                {/* Edge Roundness Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4 text-muted-foreground" />
                    <Label>Edge Roundness</Label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {(Object.entries(EDGE_ROUNDNESS) as [EdgeRoundness, typeof EDGE_ROUNDNESS[EdgeRoundness]][]).map(
                      ([key, roundness]) => (
                        <button
                          key={key}
                          onClick={() => setEdgeRoundness(key)}
                          className={`relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:border-primary/50 ${
                            displaySettings.edgeRoundness === key
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <div
                            className="w-10 h-6 border-2 border-current bg-muted"
                            style={{
                              borderRadius: roundness.value,
                            }}
                          />
                          <span className="text-xs font-medium">{roundness.name}</span>
                        </button>
                      )
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {EDGE_ROUNDNESS[displaySettings.edgeRoundness].description}
                  </p>
                </div>

                <Separator />

                {/* Theme Mode Info */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CircleDot className="h-4 w-4" />
                    <span>
                      Each theme includes its own light or dark mode. You can also quickly switch themes from the palette icon in the navigation bar.
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
