"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useOllama } from "@/contexts/ollama-context";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { formatJsonToMarkdown } from "@/lib/utils/ai-content-parser";
import { enrichContextWithMentions } from "@/lib/utils/ai-context-enricher";
import { MentionInput } from "@/components/shared/mention-input";
import { useMentionables } from "@/hooks/useMentionables";
import type { GeneratorOptions } from "@/lib/utils/ai-prompts";
import type { MentionMetadata } from "@/lib/utils/mention-parser";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  AlertCircle,
  Settings,
  Wand2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export type GeneratorType =
  | "npc"
  | "quest"
  | "encounter"
  | "magicItem"
  | "tavern"
  | "plotHook"
  | "campaign"
  | "backstory"
  | "name"
  | "character"
  | "faction"
  | "location"
  | "bounty";

interface AIGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatorType: GeneratorType;
  title: string;
  description?: string;
  onGenerated: (content: string) => void;
  campaignId?: string | null; // Add campaignId for mention system
  // Optional pre-filled options
  defaultOptions?: GeneratorOptions;
  // Custom option fields to show
  showOptions?: Array<keyof GeneratorOptions>;
}

// Generator type configurations
const GENERATOR_CONFIGS: Record<
  GeneratorType,
  {
    label: string;
    icon: string;
    defaultOptions: Array<keyof GeneratorOptions>;
    optionLabels: Record<string, string>;
    optionPlaceholders: Record<string, string>;
    selectOptions?: Record<string, string[]>;
  }
> = {
  npc: {
    label: "NPC",
    icon: "user",
    defaultOptions: ["npcRace", "npcRole", "additionalContext"],
    optionLabels: {
      npcRace: "Race",
      npcClass: "Class/Occupation",
      npcRole: "Role",
      npcAlignment: "Alignment",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      npcRace: "e.g., Human, Elf, Dwarf",
      npcClass: "e.g., Merchant, Guard, Wizard",
      npcRole: "e.g., Quest giver, Villain, Ally",
      npcAlignment: "e.g., Lawful Good, Chaotic Neutral",
      additionalContext: "Any specific details or requirements...",
    },
    selectOptions: {
      npcRole: ["Quest Giver", "Villain", "Ally", "Merchant", "Authority Figure", "Mysterious Stranger", "Comic Relief", "Rival"],
      npcAlignment: ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"],
    },
  },
  quest: {
    label: "Quest",
    icon: "scroll",
    defaultOptions: ["questType", "questDifficulty", "additionalContext"],
    optionLabels: {
      questType: "Quest Type",
      questDifficulty: "Difficulty",
      questLocation: "Location",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      questType: "e.g., Rescue, Investigation, Dungeon Crawl",
      questDifficulty: "e.g., Easy, Medium, Hard",
      questLocation: "e.g., Forest, City, Dungeon",
      additionalContext: "Any specific requirements or themes...",
    },
    selectOptions: {
      questType: ["Rescue", "Retrieve Item", "Investigation", "Escort", "Hunt Monster", "Dungeon Crawl", "Heist", "Diplomacy", "Defense"],
      questDifficulty: ["Easy", "Medium", "Hard", "Deadly"],
    },
  },
  encounter: {
    label: "Encounter",
    icon: "swords",
    defaultOptions: ["partyLevel", "partySize", "encounterDifficulty", "encounterEnvironment"],
    optionLabels: {
      partyLevel: "Party Level",
      partySize: "Party Size",
      encounterDifficulty: "Difficulty",
      encounterEnvironment: "Environment",
      encounterTheme: "Theme",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      partyLevel: "e.g., 5",
      partySize: "e.g., 4",
      encounterEnvironment: "e.g., Forest, Cave, Castle",
      encounterTheme: "e.g., Undead, Bandits, Demons",
      additionalContext: "Any specific requirements...",
    },
    selectOptions: {
      encounterDifficulty: ["Easy", "Medium", "Hard", "Deadly"],
    },
  },
  magicItem: {
    label: "Magic Item",
    icon: "wand",
    defaultOptions: ["itemType", "itemRarity", "additionalContext"],
    optionLabels: {
      itemType: "Item Type",
      itemRarity: "Rarity",
      itemTheme: "Theme",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      itemType: "e.g., Weapon, Armor, Wondrous Item",
      itemTheme: "e.g., Fire, Shadow, Holy",
      additionalContext: "Any specific properties or lore...",
    },
    selectOptions: {
      itemType: ["Weapon", "Armor", "Wondrous Item", "Ring", "Rod", "Staff", "Wand", "Potion", "Scroll"],
      itemRarity: ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"],
    },
  },
  tavern: {
    label: "Tavern",
    icon: "beer",
    defaultOptions: ["tavernQuality", "tavernLocation", "additionalContext"],
    optionLabels: {
      tavernType: "Type",
      tavernQuality: "Quality",
      tavernLocation: "Location",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      tavernType: "e.g., Inn, Tavern, Restaurant",
      tavernQuality: "e.g., Seedy, Modest, Upscale",
      tavernLocation: "e.g., City, Village, Crossroads",
      additionalContext: "Any specific atmosphere or features...",
    },
    selectOptions: {
      tavernType: ["Tavern", "Inn", "Restaurant", "Alehouse", "Wine Bar", "Gambling Den"],
      tavernQuality: ["Seedy", "Modest", "Comfortable", "Upscale", "Luxurious"],
    },
  },
  plotHook: {
    label: "Plot Hook",
    icon: "lightbulb",
    defaultOptions: ["setting", "additionalContext"],
    optionLabels: {
      setting: "Setting",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      setting: "e.g., Urban, Wilderness, Dungeon",
      additionalContext: "Any themes or elements to include...",
    },
    selectOptions: {},
  },
  campaign: {
    label: "Campaign",
    icon: "map",
    defaultOptions: ["campaignTheme", "campaignTone", "additionalContext"],
    optionLabels: {
      campaignTheme: "Theme",
      campaignTone: "Tone",
      campaignLength: "Length",
      setting: "Setting",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      campaignTheme: "e.g., War, Mystery, Exploration",
      setting: "e.g., High Fantasy, Dark Fantasy, Steampunk",
      additionalContext: "Any specific elements or restrictions...",
    },
    selectOptions: {
      campaignTone: ["Heroic", "Dark", "Comedic", "Political", "Mystery", "Horror", "Epic"],
      campaignLength: ["One-Shot", "Short (5-10 sessions)", "Medium (15-30 sessions)", "Long (30+ sessions)"],
    },
  },
  backstory: {
    label: "Backstory",
    icon: "book",
    defaultOptions: ["characterRace", "characterClass", "characterBackground", "additionalContext"],
    optionLabels: {
      characterRace: "Race",
      characterClass: "Class",
      characterBackground: "Background",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      characterRace: "e.g., Human, Elf, Tiefling",
      characterClass: "e.g., Fighter, Wizard, Rogue",
      characterBackground: "e.g., Soldier, Noble, Criminal",
      additionalContext: "Any specific events or relationships...",
    },
    selectOptions: {},
  },
  name: {
    label: "Names",
    icon: "tag",
    defaultOptions: ["nameRace", "nameGender", "nameCount"],
    optionLabels: {
      nameRace: "Race/Culture",
      nameGender: "Gender",
      nameStyle: "Style",
      nameCount: "Number of Names",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      nameRace: "e.g., Elven, Dwarven, Human",
      nameStyle: "e.g., Noble, Common, Ancient",
      nameCount: "e.g., 10",
      additionalContext: "Any specific naming conventions...",
    },
    selectOptions: {
      nameGender: ["Any", "Male", "Female", "Neutral"],
    },
  },
  character: {
    label: "Character",
    icon: "user-plus",
    defaultOptions: ["characterRace", "characterClass", "additionalContext"],
    optionLabels: {
      characterRace: "Race",
      characterClass: "Class",
      characterBackground: "Background",
      setting: "Setting",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      characterRace: "e.g., Human, Elf, Dragonborn",
      characterClass: "e.g., Paladin, Warlock, Bard",
      characterBackground: "e.g., Acolyte, Sailor, Outlander",
      setting: "Campaign setting context",
      additionalContext: "Playstyle preferences or restrictions...",
    },
    selectOptions: {},
  },
  faction: {
    label: "Faction",
    icon: "users",
    defaultOptions: ["factionType", "factionAlignment", "additionalContext"],
    optionLabels: {
      factionType: "Type",
      factionAlignment: "Alignment",
      factionSize: "Size",
      setting: "Setting",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      factionType: "e.g., Guild, Cult, Military Order",
      factionSize: "e.g., Small, Medium, Large, Vast",
      setting: "Campaign setting context",
      additionalContext: "Goals or specific characteristics...",
    },
    selectOptions: {
      factionType: ["Guild", "Cult", "Military Order", "Noble House", "Criminal Organization", "Religious Order", "Secret Society", "Merchant Company"],
      factionAlignment: ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"],
      factionSize: ["Tiny (< 10)", "Small (10-50)", "Medium (50-200)", "Large (200-1000)", "Vast (1000+)"],
    },
  },
  location: {
    label: "Location",
    icon: "map-pin",
    defaultOptions: ["locationType", "locationDanger", "additionalContext"],
    optionLabels: {
      locationType: "Type",
      locationSize: "Size",
      locationDanger: "Danger Level",
      setting: "Setting",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      locationType: "e.g., Dungeon, Forest, City District",
      locationSize: "e.g., Small, Medium, Large",
      locationDanger: "e.g., Safe, Moderate, Dangerous",
      setting: "Campaign setting context",
      additionalContext: "History or notable features...",
    },
    selectOptions: {
      locationType: ["Dungeon", "Cave", "Forest", "City", "Village", "Castle", "Temple", "Ruins", "Wilderness", "Underwater", "Extraplanar"],
      locationSize: ["Tiny", "Small", "Medium", "Large", "Vast"],
      locationDanger: ["Safe", "Low", "Moderate", "High", "Extreme"],
    },
  },
  bounty: {
    label: "Bounty",
    icon: "target",
    defaultOptions: ["bountyTarget", "bountyDifficulty", "additionalContext"],
    optionLabels: {
      bountyTarget: "Target Type",
      bountyDifficulty: "Difficulty",
      bountyReward: "Reward Level",
      setting: "Setting",
      additionalContext: "Additional Details",
    },
    optionPlaceholders: {
      bountyTarget: "e.g., Bandit, Monster, Fugitive",
      bountyDifficulty: "e.g., Easy, Medium, Hard",
      bountyReward: "e.g., Low, Medium, High",
      setting: "Campaign setting context",
      additionalContext: "Complications or background info...",
    },
    selectOptions: {
      bountyTarget: ["Bandit", "Monster", "Fugitive", "Criminal", "Assassin", "Cultist", "Creature", "Beast"],
      bountyDifficulty: ["Easy", "Medium", "Hard", "Deadly"],
      bountyReward: ["Low (10-50 gp)", "Medium (50-200 gp)", "High (200-1000 gp)", "Very High (1000+ gp)"],
    },
  },
};

export function AIGenerationDialog({
  open,
  onOpenChange,
  generatorType,
  title,
  description,
  onGenerated,
  campaignId,
  defaultOptions = {},
  showOptions,
}: AIGenerationDialogProps) {
  const { settings, isConnected, isGenerating, generate, lastError } = useOllama();
  const [options, setOptions] = useState<GeneratorOptions>(defaultOptions);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [streamingContent, setStreamingContent] = useState<string>("");
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Fetch mentionables for autocomplete
  const { mentionables } = useMentionables(campaignId || null);

  const config = GENERATOR_CONFIGS[generatorType];
  const optionsToShow = showOptions || config.defaultOptions;

  const handleOptionChange = (key: keyof GeneratorOptions, value: string | number) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = useCallback(async () => {
    setStreamingContent("");
    setGeneratedContent("");
    setHasGenerated(false);

    try {
      // Enrich additionalContext with mentioned entities
      let enrichedOptions = { ...options };
      if (options.additionalContext && mentionables.length > 0) {
        const enrichedContext = await enrichContextWithMentions(
          options.additionalContext,
          mentionables
        );
        enrichedOptions = {
          ...options,
          additionalContext: enrichedContext,
        };
      }

      const result = await generate(generatorType, enrichedOptions, (token) => {
        setStreamingContent((prev) => prev + token);
      });
      setGeneratedContent(result);
      setHasGenerated(true);
    } catch (error) {
      console.error("Generation failed:", error);
    }
  }, [generate, generatorType, options, mentionables]);

  const handleUseContent = () => {
    onGenerated(generatedContent);
    onOpenChange(false);
    // Reset state
    setGeneratedContent("");
    setStreamingContent("");
    setHasGenerated(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after close
    setTimeout(() => {
      setGeneratedContent("");
      setStreamingContent("");
      setHasGenerated(false);
      setCopied(false);
    }, 200);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const displayContent = generatedContent || streamingContent;

  // Not connected state
  if (!settings.enabled || !isConnected) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {title}
            </DialogTitle>
            <DialogDescription>
              {description || `Generate ${config.label} content using AI`}
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Ollama AI is not configured or connected. Please configure it in settings to use AI generation.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button asChild>
              <Link href="/settings">
                <Settings className="h-4 w-4 mr-2" />
                Go to Settings
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || `Generate ${config.label} content using AI`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Options Form */}
          {!hasGenerated && (
            <div className="grid gap-4 sm:grid-cols-2">
              {optionsToShow.map((optionKey) => {
                const label = config.optionLabels[optionKey] || optionKey;
                const placeholder = config.optionPlaceholders[optionKey] || "";
                const selectOpts = config.selectOptions?.[optionKey];

                // Special handling for numeric fields
                if (optionKey === "partyLevel" || optionKey === "partySize" || optionKey === "nameCount") {
                  return (
                    <div key={optionKey} className="space-y-2">
                      <Label htmlFor={optionKey}>{label}</Label>
                      <Input
                        id={optionKey}
                        type="number"
                        placeholder={placeholder}
                        value={(options[optionKey] as number) || ""}
                        onChange={(e) =>
                          handleOptionChange(optionKey, parseInt(e.target.value) || 0)
                        }
                        min={1}
                        max={optionKey === "nameCount" ? 20 : 20}
                      />
                    </div>
                  );
                }

                // Select fields
                if (selectOpts && selectOpts.length > 0) {
                  return (
                    <div key={optionKey} className="space-y-2">
                      <Label htmlFor={optionKey}>{label}</Label>
                      <Select
                        value={(options[optionKey] as string) || ""}
                        onValueChange={(value) => handleOptionChange(optionKey, value)}
                      >
                        <SelectTrigger id={optionKey}>
                          <SelectValue placeholder={placeholder || `Select ${label.toLowerCase()}...`} />
                        </SelectTrigger>
                        <SelectContent>
                          {selectOpts.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }

                // Text area for additional context (with mention support)
                if (optionKey === "additionalContext") {
                  return (
                    <div key={optionKey} className="space-y-2 sm:col-span-2">
                      <Label htmlFor={optionKey}>{label}</Label>
                      <MentionInput
                        id={optionKey}
                        placeholder={placeholder}
                        value={(options[optionKey] as string) || ""}
                        onChange={(value) => handleOptionChange(optionKey, value)}
                        campaignId={campaignId || null}
                        rows={2}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tip: Use @mentions to reference NPCs, Locations, Quests, or Factions from your campaign
                      </p>
                    </div>
                  );
                }

                // Default text input
                return (
                  <div key={optionKey} className="space-y-2">
                    <Label htmlFor={optionKey}>{label}</Label>
                    <Input
                      id={optionKey}
                      placeholder={placeholder}
                      value={(options[optionKey] as string) || ""}
                      onChange={(e) => handleOptionChange(optionKey, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Generated Content Display */}
          {(isGenerating || displayContent) && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Label className="font-medium">Generated Content</Label>
                  {isGenerating && (
                    <Badge variant="secondary" className="gap-1 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating...
                    </Badge>
                  )}
                  {hasGenerated && !isGenerating && (
                    <Badge variant="default" className="gap-1 bg-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Complete
                    </Badge>
                  )}
                </div>
                {hasGenerated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 gap-1"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
              <Card className="flex-1 overflow-hidden border-2 border-dashed border-border/50 bg-gradient-to-b from-card to-muted/20">
                <ScrollArea className="h-72 p-4">
                  {displayContent ? (
                    <MarkdownRenderer
                      content={isGenerating ? displayContent : formatJsonToMarkdown(displayContent)}
                      streaming={isGenerating}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Generating content...
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>
          )}

          {/* Error Display */}
          {lastError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{lastError}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {hasGenerated ? (
            <>
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
              <Button onClick={handleUseContent}>
                <Check className="h-4 w-4 mr-2" />
                Use This
              </Button>
            </>
          ) : (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy usage
export function useAIGenerationDialog() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    generatorType: GeneratorType;
    title: string;
    description?: string;
    defaultOptions?: GeneratorOptions;
    showOptions?: Array<keyof GeneratorOptions>;
    onGenerated: (content: string) => void;
  }>({
    open: false,
    generatorType: "npc",
    title: "",
    onGenerated: () => {},
  });

  const openDialog = useCallback(
    (config: {
      generatorType: GeneratorType;
      title: string;
      description?: string;
      defaultOptions?: GeneratorOptions;
      showOptions?: Array<keyof GeneratorOptions>;
      onGenerated: (content: string) => void;
    }) => {
      setDialogState({ ...config, open: true });
    },
    []
  );

  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, open: false }));
  }, []);

  const DialogComponent = useCallback(
    () => (
      <AIGenerationDialog
        open={dialogState.open}
        onOpenChange={(open) => !open && closeDialog()}
        generatorType={dialogState.generatorType}
        title={dialogState.title}
        description={dialogState.description}
        defaultOptions={dialogState.defaultOptions}
        showOptions={dialogState.showOptions}
        onGenerated={dialogState.onGenerated}
      />
    ),
    [dialogState, closeDialog]
  );

  return {
    openDialog,
    closeDialog,
    DialogComponent,
  };
}
