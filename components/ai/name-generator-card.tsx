"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useOllama, useOllamaSafe } from "@/contexts/ollama-context";
import { generateMultipleNames, type NameCategory, getRaceSuggestions } from "@/lib/utils/name-generator";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  Bot,
  Dice6,
} from "lucide-react";
import { toast } from "sonner";

interface NameGeneratorCardProps {
  title: string;
  description?: string;
  category: NameCategory;
  icon?: React.ReactNode;
  raceOptions?: string[];
  showRaceSelector?: boolean;
  defaultRace?: string;
  className?: string;
}

export function NameGeneratorCard({
  title,
  description,
  category,
  icon,
  raceOptions,
  showRaceSelector = false,
  defaultRace,
  className,
}: NameGeneratorCardProps) {
  const ollama = useOllamaSafe();
  const [names, setNames] = useState<string[]>([]);
  const ANY_RACE_VALUE = "__any__";
  const [selectedRace, setSelectedRace] = useState<string>(defaultRace || ANY_RACE_VALUE);
  const [useAI, setUseAI] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const canUseAI = ollama?.settings.enabled && ollama?.isConnected;

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);

    try {
      if (useAI && canUseAI && ollama) {
        // Use AI generation
        const raceForPrompt = selectedRace === ANY_RACE_VALUE ? undefined : selectedRace;
        const prompt = `Generate 10 unique ${raceForPrompt ? `${raceForPrompt} ` : ""}${category} names for Dungeons & Dragons. 
${raceForPrompt ? `These should be appropriate for the ${raceForPrompt} race/culture.` : ""}
Return ONLY a numbered list of names, one per line. No explanations or additional text.
Example format:
1. Aldric Stormwind
2. Elena Brightwood
...`;

        const result = await ollama.generateRaw(prompt, "You are a fantasy name generator. Generate unique, pronounceable names appropriate for D&D settings. Return only the names in a numbered list format.");
        
        // Parse the AI response to extract names
        const extractedNames = result
          .split("\n")
          .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
          .filter((name) => name.length > 0 && name.length < 50);
        
        setNames(extractedNames.slice(0, 10));
      } else {
        // Use Markov chain generation
        const raceForGen = selectedRace === ANY_RACE_VALUE ? undefined : selectedRace;
        const generatedNames = generateMultipleNames(
          category,
          10,
          raceForGen
        );
        setNames(generatedNames);
      }
    } catch (error) {
      console.error("Name generation failed:", error);
      toast.error("Failed to generate names");
      // Fallback to Markov
      const raceForGen = selectedRace === ANY_RACE_VALUE ? undefined : selectedRace;
      const fallbackNames = generateMultipleNames(
        category,
        10,
        raceForGen
      );
      setNames(fallbackNames);
    } finally {
      setIsGenerating(false);
    }
  }, [useAI, canUseAI, ollama, selectedRace, category]);

  const copyName = useCallback((name: string, index: number) => {
    navigator.clipboard.writeText(name);
    setCopiedIndex(index);
    toast.success("Name copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const races = raceOptions || getRaceSuggestions();

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {icon}
              </div>
            )}
            <div>
              <CardTitle className="font-serif text-lg">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-1">{description}</CardDescription>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {useAI ? "AI" : "Markov"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col gap-3">
          {showRaceSelector && (
            <div className="space-y-1.5">
              <Label htmlFor={`race-${category}`} className="text-sm">
                Race/Culture
              </Label>
              <Select value={selectedRace} onValueChange={setSelectedRace}>
                <SelectTrigger id={`race-${category}`} className="h-9">
                  <SelectValue placeholder="Any race" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_RACE_VALUE}>Any</SelectItem>
                  {races.map((race) => (
                    <SelectItem key={race} value={race}>
                      {race}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            {canUseAI && (
              <div className="flex items-center gap-2">
                <Switch
                  id={`ai-${category}`}
                  checked={useAI}
                  onCheckedChange={setUseAI}
                />
                <Label
                  htmlFor={`ai-${category}`}
                  className="text-sm flex items-center gap-1 cursor-pointer"
                >
                  <Bot className="h-3 w-3" />
                  Use AI
                </Label>
              </div>
            )}

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="gap-2"
              size="sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  {useAI ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Dice6 className="h-4 w-4" />
                  )}
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Generated Names */}
        {names.length > 0 && (
          <>
            <Separator />
            <ScrollArea className="h-48">
              <div className="space-y-1">
                {names.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted group"
                  >
                    <span className="text-sm">{name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyName(name, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Refresh button when names exist */}
        {names.length > 0 && !isGenerating && (
          <Button
            variant="outline"
            onClick={handleGenerate}
            className="w-full gap-2"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
            Generate More
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
