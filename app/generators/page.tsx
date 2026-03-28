"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/shared/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { NameGeneratorCard } from "@/components/ai/name-generator-card";
import { AIGenerationDialog, type GeneratorType } from "@/components/ai/ai-generation-dialog";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { formatJsonToMarkdown } from "@/lib/utils/ai-content-parser";
import { useOllama } from "@/contexts/ollama-context";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Sparkles,
  User as UserIcon,
  Users,
  Swords,
  MapPin,
  ScrollText,
  Loader2,
  Settings,
  Wand2,
  Crown,
  Shield,
  Skull,
  Heart,
  Star,
  Zap,
  FlaskConical,
  Compass,
  BookOpen,
  Target,
  Home,
  Map,
  Building,
  Lightbulb,
  FileText,
  UserPlus,
  Copy,
  CheckCircle2,
  X,
} from "lucide-react";
import Link from "next/link";

// AI Generator card configuration
const AI_GENERATORS: {
  type: GeneratorType;
  title: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: "character",
    title: "AI Character Generator",
    description: "Generate complete player character concepts",
    icon: <UserPlus className="h-5 w-5" />,
  },
  {
    type: "npc",
    title: "AI NPC Generator",
    description: "Create detailed NPCs with personality and backstory",
    icon: <UserIcon className="h-5 w-5" />,
  },
  {
    type: "quest",
    title: "AI Quest Generator",
    description: "Generate quests with hooks, objectives, and rewards",
    icon: <ScrollText className="h-5 w-5" />,
  },
  {
    type: "encounter",
    title: "AI Encounter Generator",
    description: "Design balanced combat encounters",
    icon: <Swords className="h-5 w-5" />,
  },
  {
    type: "magicItem",
    title: "AI Magic Item Generator",
    description: "Create unique magic items with lore",
    icon: <Wand2 className="h-5 w-5" />,
  },
  {
    type: "tavern",
    title: "AI Tavern Generator",
    description: "Generate detailed taverns with staff and rumors",
    icon: <Home className="h-5 w-5" />,
  },
  {
    type: "plotHook",
    title: "AI Plot Hook Generator",
    description: "Create intriguing story hooks",
    icon: <Lightbulb className="h-5 w-5" />,
  },
  {
    type: "campaign",
    title: "AI Campaign Generator",
    description: "Generate campaign premises and story arcs",
    icon: <Map className="h-5 w-5" />,
  },
  {
    type: "backstory",
    title: "AI Backstory Generator",
    description: "Create compelling character backstories",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    type: "faction",
    title: "AI Faction Generator",
    description: "Generate organizations with goals and structure",
    icon: <Users className="h-5 w-5" />,
  },
  {
    type: "location",
    title: "AI Location Generator",
    description: "Create detailed locations with atmosphere",
    icon: <MapPin className="h-5 w-5" />,
  },
  {
    type: "bounty",
    title: "AI Bounty Generator",
    description: "Generate bounty postings with targets and rewards",
    icon: <Target className="h-5 w-5" />,
  },
];

// Race name generator configurations
const RACE_NAME_GENERATORS = [
  { race: "Tiefling", icon: <Skull className="h-5 w-5" /> },
  { race: "Dragonborn", icon: <Shield className="h-5 w-5" /> },
  { race: "Aasimar", icon: <Star className="h-5 w-5" /> },
  { race: "Half-Elf", icon: <Heart className="h-5 w-5" /> },
  { race: "Kobold", icon: <Zap className="h-5 w-5" /> },
  { race: "Changeling", icon: <FlaskConical className="h-5 w-5" /> },
  { race: "Elf", icon: <Compass className="h-5 w-5" /> },
  { race: "Dwarf", icon: <Crown className="h-5 w-5" /> },
  { race: "Human", icon: <UserIcon className="h-5 w-5" /> },
  { race: "Halfling", icon: <Heart className="h-5 w-5" /> },
  { race: "Gnome", icon: <Sparkles className="h-5 w-5" /> },
  { race: "Half-Orc", icon: <Swords className="h-5 w-5" /> },
];

// Class name generator configurations
const CLASS_NAME_GENERATORS = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

export default function GeneratorsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings, isConnected } = useOllama();

  // AI Dialog state
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedGenerator, setSelectedGenerator] = useState<{
    type: GeneratorType;
    title: string;
  } | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [showGeneratedContent, setShowGeneratedContent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatorTitle, setGeneratorTitle] = useState<string>("");

  // Check authentication
  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, [router]);

  const openAIGenerator = (type: GeneratorType, title: string) => {
    setSelectedGenerator({ type, title });
    setAiDialogOpen(true);
  };

  const handleGenerated = (content: string) => {
    setGeneratedContent(content);
    setShowGeneratedContent(true);
    setGeneratorTitle(selectedGenerator?.title || "Generated Content");
    setCopied(false);
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
        <div className="container py-8 px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-serif text-4xl font-bold mb-2">
              D&D Name Generators
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Create authentic names for every race, class, and character type.
              Each generator includes etymology, pronunciation guides, and cultural context.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                20 free generations per day
              </Badge>
              {settings.enabled && isConnected && (
                <Badge variant="default" className="gap-1 bg-green-600">
                  <Wand2 className="h-3 w-3" />
                  AI Enhanced
                </Badge>
              )}
            </div>
          </div>

          {/* AI Status Alert */}
          {(!settings.enabled || !isConnected) && (
            <Alert className="mb-6 max-w-2xl mx-auto">
              <Sparkles className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Enable Ollama AI for enhanced name generation and AI content generators.
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="race" className="space-y-6">
            <TabsList className="grid w-full max-w-lg mx-auto grid-cols-4">
              <TabsTrigger value="race">Race Names</TabsTrigger>
              <TabsTrigger value="class">Class Names</TabsTrigger>
              <TabsTrigger value="special">Special</TabsTrigger>
              <TabsTrigger value="ai">AI Generators</TabsTrigger>
            </TabsList>

            {/* Race Names Tab */}
            <TabsContent value="race" className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="font-serif text-2xl font-semibold flex items-center justify-center gap-2">
                  <Users className="h-6 w-6" />
                  Race Names
                </h2>
                <p className="text-muted-foreground text-sm">
                  Names for every D&D race
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {RACE_NAME_GENERATORS.map(({ race, icon }) => (
                  <NameGeneratorCard
                    key={race}
                    title={`${race} Names`}
                    category="character"
                    icon={icon}
                    defaultRace={race}
                    showRaceSelector={false}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Class Names Tab */}
            <TabsContent value="class" className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="font-serif text-2xl font-semibold flex items-center justify-center gap-2">
                  <Swords className="h-6 w-6" />
                  Class Names
                </h2>
                <p className="text-muted-foreground text-sm">
                  Names suited to each class
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {CLASS_NAME_GENERATORS.map((className) => (
                  <NameGeneratorCard
                    key={className}
                    title={`${className} Names`}
                    description={`Names fitting for a ${className.toLowerCase()}`}
                    category="character"
                    icon={<Swords className="h-5 w-5" />}
                    showRaceSelector={true}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Special Generators Tab */}
            <TabsContent value="special" className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="font-serif text-2xl font-semibold flex items-center justify-center gap-2">
                  <Compass className="h-6 w-6" />
                  Special Generators
                </h2>
                <p className="text-muted-foreground text-sm">
                  NPCs, parties, and locations
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <NameGeneratorCard
                  title="NPC Names"
                  description="Generate named NPCs with first and last names"
                  category="npc"
                  icon={<UserIcon className="h-5 w-5" />}
                  showRaceSelector={true}
                />
                <NameGeneratorCard
                  title="Party Names"
                  description="Adventuring company and group names"
                  category="faction"
                  icon={<Users className="h-5 w-5" />}
                />
                <NameGeneratorCard
                  title="Tavern Names"
                  description="Names for inns, taverns, and pubs"
                  category="tavern"
                  icon={<Home className="h-5 w-5" />}
                />
                <NameGeneratorCard
                  title="Location Names"
                  description="Names for towns, cities, and regions"
                  category="location"
                  icon={<MapPin className="h-5 w-5" />}
                />
                <NameGeneratorCard
                  title="Faction Names"
                  description="Guild and organization names"
                  category="faction"
                  icon={<Shield className="h-5 w-5" />}
                />
                <NameGeneratorCard
                  title="Shop Names"
                  description="Names for stores and merchants"
                  category="shop"
                  icon={<Building className="h-5 w-5" />}
                />
              </div>
            </TabsContent>

            {/* AI Generators Tab */}
            <TabsContent value="ai" className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="font-serif text-2xl font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="h-6 w-6" />
                  AI Content Generators
                </h2>
                <p className="text-muted-foreground text-sm">
                  Generate detailed D&D content using AI
                </p>
              </div>

              {(!settings.enabled || !isConnected) && (
                <Alert className="max-w-2xl mx-auto mb-6">
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>
                      AI generators require Ollama to be configured and running.
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {AI_GENERATORS.map((generator) => (
                  <Card
                    key={generator.type}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${
                      !settings.enabled || !isConnected ? "opacity-60" : ""
                    }`}
                    onClick={() =>
                      settings.enabled &&
                      isConnected &&
                      openAIGenerator(generator.type, generator.title)
                    }
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {generator.icon}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="font-serif text-lg">
                            {generator.title}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{generator.description}</CardDescription>
                      {settings.enabled && isConnected && (
                        <Badge variant="secondary" className="mt-3 gap-1">
                          <Wand2 className="h-3 w-3" />
                          Click to Generate
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Generated Content Display */}
          {showGeneratedContent && generatedContent && (
            <Card className="mt-8 max-w-4xl mx-auto overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-serif">{generatorTitle}</CardTitle>
                      <CardDescription>AI-generated content ready to use</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="gap-1"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGeneratedContent(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-6">
                    <MarkdownRenderer content={formatJsonToMarkdown(generatedContent)} />
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* AI Generation Dialog */}
      {selectedGenerator && (
        <AIGenerationDialog
          open={aiDialogOpen}
          onOpenChange={setAiDialogOpen}
          generatorType={selectedGenerator.type}
          title={selectedGenerator.title}
          campaignId={null}
          onGenerated={handleGenerated}
        />
      )}
    </div>
  );
}
