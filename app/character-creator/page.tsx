"use client";

import React, { useState, useEffect, useRef } from "react";
import type { Equipment } from "@/hooks/useDndContent";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRaces, useClasses, useEquipment, useCreateCharacter, useBackgrounds, useCharacter, useSubclasses } from "@/hooks/useDndContent";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/shared/navbar";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  X,
  Loader2,
  Info,
  Star,
  Plus,
  Minus,
  Sun,
  Flame,
  Hammer,
  Leaf,
  Wrench,
  Mountain,
  TreePine,
  TreeDeciduous,
  Home,
  Axe,
  User,
  Zap,
  Cat,
  Bird,
  Waves,
  Droplets,
  Cog,
  Shell,
  Snowflake,
  Skull,
  Sword,
  Swords,
  Shield,
  Music,
  Cross,
  Wand2,
  Sparkles,
  Feather,
  Crosshair,
  Moon,
  Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useInfoSheet } from "@/hooks/useInfoSheet";
import { InfoSheetDialog } from "@/components/shared/info-sheet-dialog";
import { toast } from "sonner";
import { NameGeneratorButton } from "@/components/shared/name-generator-button";
import { Artificer, Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Ranger, Rogue, Sorcerer, Warlock, Wizard } from "dnd-icons/class";
import { Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma } from "dnd-icons/ability";
import { Character as CharacterIcon, Campaign } from "dnd-icons/game";
import { Weapon, Book, Person } from "dnd-icons/entity";
import {
  getAbilityModifier,
  getAbilityModifierString,
  getProficiencyBonus,
  STANDARD_ARRAY,
  POINT_BUY_COSTS,
  POINT_BUY_TOTAL,
  POINT_BUY_MIN,
  POINT_BUY_MAX,
  rollAbilityScore,
  DND_SKILLS,
  getFullAbilityName,
} from "@/lib/utils/character";
import {
  checkMulticlassPrerequisites,
  getHitDiceBreakdown,
  getMulticlassPrerequisite,
} from "@/lib/utils/multiclass";
import type { Race, DndClass } from "@/hooks/useDndContent";
import type { Character } from "@/hooks/useDndContent";

type AbilityScoreMethod = "point-buy" | "standard-array" | "manual";

interface CharacterClassForm {
  classSource: "srd" | "homebrew";
  classIndex: string;
  level: number;
  subclassSource?: "srd" | "homebrew" | null;
  subclassIndex?: string | null;
  isPrimary?: boolean;
}

interface CharacterFormData {
  sourceVersion: "2014" | "2024" | null;
  campaignId: string | null;
  characterType: "campaign" | "standalone" | null;
  raceSource: "srd" | "homebrew" | null;
  raceIndex: string | null;
  classes: CharacterClassForm[]; // Array of classes for multiclass support
  // Keep for backward compatibility during transition
  classSource: "srd" | "homebrew" | null;
  classIndex: string | null;
  subclassSource: "srd" | "homebrew" | null;
  subclassIndex: string | null;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  abilityScoreMethod: AbilityScoreMethod;
  background: string;
  alignment: string;
  name: string;
  level: number;
  selectedEquipment: Array<{
    itemIndex: string;
    itemSource: "srd" | "homebrew";
    quantity: number;
  }>;
  imageUrl: string | null;
  featureChoices: {
    skillProficiencies: string[]; // Selected skill names
    asiImprovements: Array<{ level: number; ability: string; bonus: number }>; // ASI choices
    otherChoices: Array<{ level: number; choiceName: string; selected: string }>; // Other feature choices
  };
  backgroundChoices: {
    languages: string[]; // Selected language names
    tools: string[]; // Selected tool proficiencies
  };
  description: {
    personalityTraits: string;
    ideals: string;
    bonds: string;
    flaws: string;
    appearance: string;
    backstory: string;
    age: string;
    gender: string;
    pronouns: string;
    eyes: string;
    hair: string;
    skin: string;
    height: string;
    weight: string;
    faith: string;
  };
}

// 3x3 alignment grid with short labels and flavor used by the picker
const ALIGNMENT_GRID: Array<{
  value: string;
  abbr: string;
  blurb: string;
}> = [
  { value: "Lawful Good",      abbr: "LG", blurb: "Honor & compassion" },
  { value: "Neutral Good",     abbr: "NG", blurb: "Kindness above rules" },
  { value: "Chaotic Good",     abbr: "CG", blurb: "Freedom & mercy" },
  { value: "Lawful Neutral",   abbr: "LN", blurb: "Order & tradition" },
  { value: "True Neutral",     abbr: "TN", blurb: "Balance & self" },
  { value: "Chaotic Neutral",  abbr: "CN", blurb: "Personal liberty" },
  { value: "Lawful Evil",      abbr: "LE", blurb: "Tyranny with rules" },
  { value: "Neutral Evil",     abbr: "NE", blurb: "Selfish pragmatism" },
  { value: "Chaotic Evil",     abbr: "CE", blurb: "Destructive whim" },
];

// Standard D&D 5e languages
const LANGUAGES = [
  "Common",
  "Dwarvish",
  "Elvish",
  "Giant",
  "Gnomish",
  "Goblin",
  "Halfling",
  "Orc",
  // Exotic languages
  "Abyssal",
  "Celestial",
  "Draconic",
  "Deep Speech",
  "Infernal",
  "Primordial",
  "Sylvan",
  "Undercommon",
];

// Tool categories for selection
const GAMING_SETS = [
  "Dice set",
  "Dragonchess set",
  "Playing card set",
  "Three-Dragon Ante set",
];

const ARTISAN_TOOLS = [
  "Alchemist's supplies",
  "Brewer's supplies",
  "Calligrapher's supplies",
  "Carpenter's tools",
  "Cartographer's tools",
  "Cobbler's tools",
  "Cook's utensils",
  "Glassblower's tools",
  "Jeweler's tools",
  "Leatherworker's tools",
  "Mason's tools",
  "Painter's supplies",
  "Potter's tools",
  "Smith's tools",
  "Tinker's tools",
  "Weaver's tools",
  "Woodcarver's tools",
];

const MUSICAL_INSTRUMENTS = [
  "Bagpipes",
  "Drum",
  "Dulcimer",
  "Flute",
  "Horn",
  "Lute",
  "Lyre",
  "Pan flute",
  "Shawm",
  "Viol",
];

// const OTHER_TOOLS = [
//   "Disguise kit",
//   "Forgery kit",
//   "Herbalism kit",
//   "Navigator's tools",
//   "Poisoner's kit",
//   "Thieves' tools",
//   "Vehicles (land)",
//   "Vehicles (water)",
// ];

// Helper to parse background requirements
function parseBackgroundLanguages(languageStr: string | null): { count: number; fixed: string[] } {
  if (!languageStr) return { count: 0, fixed: [] };
  
  const lowerStr = languageStr.toLowerCase();
  if (lowerStr.includes("two of your choice")) return { count: 2, fixed: [] };
  if (lowerStr.includes("one of your choice")) return { count: 1, fixed: [] };
  
  // If specific languages are listed, they are fixed
  return { count: 0, fixed: languageStr.split(",").map(s => s.trim()).filter(Boolean) };
}

function parseBackgroundTools(toolStr: string | null): { 
  gamingSet: boolean; 
  artisanTools: boolean; 
  musicalInstrument: boolean;
  fixed: string[];
} {
  if (!toolStr) return { gamingSet: false, artisanTools: false, musicalInstrument: false, fixed: [] };
  
  const lowerStr = toolStr.toLowerCase();
  const result = {
    gamingSet: lowerStr.includes("one type of gaming set"),
    artisanTools: lowerStr.includes("one type of artisan's tools"),
    musicalInstrument: lowerStr.includes("one type of musical instrument"),
    fixed: [] as string[],
  };
  
  // Extract fixed tools (those that aren't choices)
  const parts = toolStr.split(",").map(s => s.trim());
  for (const part of parts) {
    const lowerPart = part.toLowerCase();
    if (!lowerPart.includes("one type of") && part.length > 0) {
      result.fixed.push(part);
    }
  }
  
  return result;
}

// Map race index/name -> thematic lucide icon + tile accent hue.
// Hue is a CSS hue angle used in an hsl() tile background so each race has
// a recognizable color (e.g. Dragonborn = red, Elf = green, Tiefling = crimson).
const RACE_VISUAL: Record<
  string,
  { Icon: LucideIcon; hue: number }
> = {
  aasimar: { Icon: Sun, hue: 48 },              // celestial light
  dragonborn: { Icon: Flame, hue: 10 },         // dragon breath
  dwarf: { Icon: Hammer, hue: 25 },             // smiths / miners
  elf: { Icon: Leaf, hue: 130 },                // woodland
  gnome: { Icon: Wrench, hue: 200 },            // tinkerer
  goliath: { Icon: Mountain, hue: 220 },        // mountain folk
  "half-elf": { Icon: TreePine, hue: 160 },
  halfelf: { Icon: TreePine, hue: 160 },
  halfling: { Icon: Home, hue: 90 },            // hobbit-holes
  "half-orc": { Icon: Axe, hue: 100 },
  halforc: { Icon: Axe, hue: 100 },
  human: { Icon: User, hue: 35 },
  tiefling: { Icon: Zap, hue: 350 },            // infernal lightning
  firbolg: { Icon: TreeDeciduous, hue: 110 },
  tabaxi: { Icon: Cat, hue: 30 },
  kenku: { Icon: Bird, hue: 260 },
  genasi: { Icon: Droplets, hue: 190 },
  aarakocra: { Icon: Feather, hue: 205 },
  triton: { Icon: Waves, hue: 195 },
  tortle: { Icon: Shell, hue: 95 },
  warforged: { Icon: Cog, hue: 0 },             // neutral (s=0)
  bugbear: { Icon: Axe, hue: 15 },
  goblin: { Icon: Eye, hue: 80 },
  hobgoblin: { Icon: Swords, hue: 5 },
  kobold: { Icon: Flame, hue: 320 },
  lizardfolk: { Icon: Leaf, hue: 140 },
  "yuan-ti": { Icon: Eye, hue: 150 },
  yuanti: { Icon: Eye, hue: 150 },
  centaur: { Icon: Crosshair, hue: 40 },
  minotaur: { Icon: Axe, hue: 20 },
  satyr: { Icon: Music, hue: 75 },
  changeling: { Icon: Moon, hue: 290 },
  kalashtar: { Icon: Sparkles, hue: 270 },
  shifter: { Icon: Cat, hue: 50 },
  orc: { Icon: Axe, hue: 115 },
  "deep-gnome": { Icon: Wrench, hue: 240 },
  deepgnome: { Icon: Wrench, hue: 240 },
  "sea-elf": { Icon: Waves, hue: 180 },
  seaelf: { Icon: Waves, hue: 180 },
  "shadar-kai": { Icon: Moon, hue: 275 },
  shadarkai: { Icon: Moon, hue: 275 },
  eladrin: { Icon: Snowflake, hue: 205 },
  drow: { Icon: Skull, hue: 280 },
};

// Normalize race.size (which may be stored as a numeric category code like
// "3", "3-4", or a string like "medium") into a proper D&D size label.
const SIZE_CATEGORY_NAMES: Record<string, string> = {
  "1": "Tiny",
  "2": "Small",
  "3": "Medium",
  "4": "Large",
  "5": "Huge",
  "6": "Gargantuan",
  tiny: "Tiny",
  small: "Small",
  medium: "Medium",
  large: "Large",
  huge: "Huge",
  gargantuan: "Gargantuan",
  t: "Tiny",
  s: "Small",
  m: "Medium",
  l: "Large",
  h: "Huge",
  g: "Gargantuan",
};

function formatSize(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return "—";
  const trimmed = String(raw).trim();
  if (!trimmed) return "—";
  const parts = trimmed
    .split(/[\s/|,-]+|\bor\b/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const mapped = parts.map((p) => {
    const key = p.toLowerCase();
    return SIZE_CATEGORY_NAMES[key] || p.charAt(0).toUpperCase() + p.slice(1);
  });
  if (mapped.length <= 1) return mapped[0] || trimmed;
  return mapped.join(" / ");
}

function getRaceVisual(race: Race): {
  Icon: LucideIcon;
  hue: number;
  saturation: number;
} {
  const key = (race.index || race.name || "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const direct = RACE_VISUAL[key] || RACE_VISUAL[key.replace(/-/g, "")];
  if (direct) {
    return {
      Icon: direct.Icon,
      hue: direct.hue,
      saturation: key === "warforged" ? 0 : 55,
    };
  }
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return { Icon: User, hue, saturation: 55 };
}

// Map class index -> lucide icon + accent hue so class cards get a themed avatar.
const CLASS_VISUAL: Record<string, { Icon: LucideIcon; hue: number }> = {
  artificer: { Icon: Wrench, hue: 35 },
  barbarian: { Icon: Axe, hue: 10 },
  bard: { Icon: Music, hue: 320 },
  cleric: { Icon: Cross, hue: 48 },
  druid: { Icon: Leaf, hue: 110 },
  fighter: { Icon: Sword, hue: 220 },
  monk: { Icon: Flame, hue: 180 },         // inner chi
  paladin: { Icon: Shield, hue: 55 },
  ranger: { Icon: Crosshair, hue: 95 },
  rogue: { Icon: Eye, hue: 260 },
  sorcerer: { Icon: Sparkles, hue: 350 },
  warlock: { Icon: Skull, hue: 285 },
  wizard: { Icon: Wand2, hue: 210 },
};

function getClassVisual(cls: DndClass): {
  Icon: LucideIcon;
  hue: number;
} {
  const key = (cls.index || cls.name || "").toLowerCase();
  const direct = CLASS_VISUAL[key];
  if (direct) return direct;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return { Icon: Swords, hue: Math.abs(hash) % 360 };
}

export default function CharacterCreatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");
  const editId = searchParams.get("editId");
  const isEditMode = !!editId;

  const [step, setStep] = useState(isEditMode ? 2 : 1); // Start at step 1 (Home) for new characters, step 2 for edit mode
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingCharacter, setIsLoadingCharacter] = useState(isEditMode);

  const [formData, setFormData] = useState<CharacterFormData>({
    sourceVersion: "2024",
    characterType: campaignId ? "campaign" : null,
    campaignId: campaignId || null,
    raceSource: null,
    raceIndex: null,
    classes: [], // Array for multiclass support
    classSource: null,
    classIndex: null,
    subclassSource: null,
    subclassIndex: null,
    abilityScores: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    abilityScoreMethod: "point-buy",
    background: "",
    alignment: "True Neutral",
    name: "",
    level: 1,
    selectedEquipment: [],
    imageUrl: null,
    featureChoices: {
      skillProficiencies: [],
      asiImprovements: [],
      otherChoices: [],
    },
    backgroundChoices: {
      languages: [],
      tools: [],
    },
    description: {
      personalityTraits: "",
      ideals: "",
      bonds: "",
      flaws: "",
      appearance: "",
      backstory: "",
      age: "",
      gender: "",
      pronouns: "",
      eyes: "",
      hair: "",
      skin: "",
      height: "",
      weight: "",
      faith: "",
    },
  });

  // Load character data if in edit mode
  const { character: existingCharacter, loading: characterLoading } = useCharacter(editId || "");
  
  // Fetch campaigns for selection
  const { campaigns } = useCampaigns(userId);
  
  const { races, loading: racesLoading, error: racesError } = useRaces(formData.campaignId, formData.sourceVersion);
  const { classes, loading: classesLoading, error: classesError } = useClasses(formData.campaignId, formData.sourceVersion);
  const { subclasses } = useSubclasses(
    formData.classIndex,
    formData.classSource,
    formData.campaignId,
    formData.sourceVersion
  );
  const { equipment, loading: equipmentLoading } = useEquipment(formData.campaignId);
  const { createCharacter, loading: creating } = useCreateCharacter();
  const { backgrounds, loading: backgroundsLoading } = useBackgrounds(formData.sourceVersion);
  const infoSheet = useInfoSheet();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setUserId(user.id);
      } else {
        router.push("/auth/login?redirect=/character-creator");
      }
      setLoading(false);
    }
    getUser();
  }, [router]);

  // Load existing character data in edit mode
  useEffect(() => {
    if (isEditMode && existingCharacter && !characterLoading && races.length > 0 && classes.length > 0) {
      async function loadCharacterData() {
        const char = existingCharacter; // Store in const for type narrowing
        if (!char) return;
        
        // Determine source version from character's race/class source
        // For now, default to 2014 if not determinable, but we should store this
        const sourceVersion: "2014" | "2024" = "2014"; // TODO: Get from character.source_version if stored
        
        // Extract base ability scores (subtract racial bonuses)
        const selectedRaceForChar = races.find(r => r.source === char.race_source && r.index === char.race_index);
        let baseAbilityScores = {
          strength: char.strength || 10,
          dexterity: char.dexterity || 10,
          constitution: char.constitution || 10,
          intelligence: char.intelligence || 10,
          wisdom: char.wisdom || 10,
          charisma: char.charisma || 10,
        };
        
        // Subtract racial bonuses to get base scores
        if (selectedRaceForChar?.ability_bonuses) {
          const bonuses = selectedRaceForChar.ability_bonuses as Array<any>;
          bonuses.forEach((bonus: any) => {
            const abilityName = (bonus.ability_score?.index || bonus.ability_score?.name || bonus.ability || '').toLowerCase();
            if (abilityName.includes('str')) baseAbilityScores.strength -= bonus.bonus;
            else if (abilityName.includes('dex')) baseAbilityScores.dexterity -= bonus.bonus;
            else if (abilityName.includes('con')) baseAbilityScores.constitution -= bonus.bonus;
            else if (abilityName.includes('int')) baseAbilityScores.intelligence -= bonus.bonus;
            else if (abilityName.includes('wis')) baseAbilityScores.wisdom -= bonus.bonus;
            else if (abilityName.includes('cha')) baseAbilityScores.charisma -= bonus.bonus;
          });
        }
        
        // Fetch skill proficiencies from character_skills table
        // Only include skills that are from class skill choices (not automatic class/race/background skills)
        const supabase = createClient();
        const { data: characterSkills } = await supabase
          .from('character_skills')
          .select('skill_name')
          .eq('character_id', char.id)
          .eq('proficient', true);
        
        // Get the selected class to determine which skills are from class choices
        const selectedClassForChar = classes.find(c => c.source === char.class_source && c.index === char.class_index);
        const classProficiencyChoices = selectedClassForChar?.proficiency_choices as any;
        const skillChoices = Array.isArray(classProficiencyChoices) 
          ? classProficiencyChoices.find((choice: any) => 
              choice.type === 'skills' || choice.from?.option_set_type === 'options_array'
            )
          : null;
        
        // Get available skill options from class
        const availableSkillOptions = skillChoices?.from?.options?.map((opt: any) => 
          typeof opt === 'string' ? opt : opt.item?.name || opt.name || opt
        ) || [];
        
        // Only include skills that are in the class's skill choice options
        const allCharacterSkills = (characterSkills || []).map(s => s.skill_name);
        const skillProficiencies = allCharacterSkills.filter(skillName => {
          // Check if this skill is in the class's skill choice options
          return availableSkillOptions.some((opt: string) => {
            const optNormalized = opt.toLowerCase().replace(/\s+/g, '-');
            return skillName === optNormalized || skillName === opt;
          });
        });
        
        // Extract ASI improvements from class_features
        const asiImprovements: Array<{ level: number; ability: string; bonus: number }> = [];
        if (char.class_features && Array.isArray(char.class_features)) {
          char.class_features.forEach((feature: any) => {
            if (feature.choice && feature.choice.type === 'ability_score_improvement' && feature.choice.selected) {
              const selections = Array.isArray(feature.choice.selected) ? feature.choice.selected : [feature.choice.selected];
              selections.forEach((selection: any) => {
                if (typeof selection === 'object' && selection.ability && selection.bonus) {
                  asiImprovements.push({
                    level: feature.level || char.level || 1,
                    ability: selection.ability.toLowerCase(),
                    bonus: selection.bonus,
                  });
                }
              });
            }
          });
        }
        
        // Extract background choices from extras
        const backgroundLanguages: string[] = [];
        const backgroundTools: string[] = [];
        if (char.extras) {
          const extras = char.extras as any;
          if (extras.background_languages && Array.isArray(extras.background_languages)) {
            backgroundLanguages.push(...extras.background_languages);
          }
          if (extras.background_tools && Array.isArray(extras.background_tools)) {
            backgroundTools.push(...extras.background_tools);
          }
        }

        // Extract description fields from background_details
        const bd = (char.background_details || {}) as any;
        const bdCharacteristics = (bd.characteristics || {}) as any;
        const arrayToLines = (v: any): string =>
          Array.isArray(v) ? v.filter(Boolean).join("\n") : typeof v === "string" ? v : "";
        const loadedDescription = {
          personalityTraits: arrayToLines(bd.personality_traits),
          ideals: arrayToLines(bd.ideals),
          bonds: arrayToLines(bd.bonds),
          flaws: arrayToLines(bd.flaws),
          appearance: typeof bd.appearance === "string" ? bd.appearance : "",
          backstory: typeof bd.backstory === "string" ? bd.backstory : "",
          age: bdCharacteristics.age || "",
          gender: bdCharacteristics.gender || "",
          pronouns: bdCharacteristics.pronouns || "",
          eyes: bdCharacteristics.eyes || "",
          hair: bdCharacteristics.hair || "",
          skin: bdCharacteristics.skin || "",
          height: bdCharacteristics.height || "",
          weight: bdCharacteristics.weight || "",
          faith: bdCharacteristics.faith || "",
        };
        
        // Load character classes if multiclass
        let loadedClasses: CharacterClassForm[] = [];
        if (char.uses_multiclass) {
          // Fetch from character_classes table
          const { data: charClasses } = await supabase
            .from('character_classes')
            .select('*')
            .eq('character_id', char.id);
          
          if (charClasses && charClasses.length > 0) {
            loadedClasses = charClasses.map(cc => ({
              classSource: cc.class_source as 'srd' | 'homebrew',
              classIndex: cc.class_index,
              level: cc.level,
              subclassSource: cc.subclass_source as 'srd' | 'homebrew' | null | undefined,
              subclassIndex: cc.subclass_index || undefined,
              isPrimary: cc.is_primary_class || false,
            }));
          }
        } else {
          // Single class - create from legacy fields
          if (char.class_source && char.class_index) {
            loadedClasses = [{
              classSource: char.class_source as 'srd' | 'homebrew',
              classIndex: char.class_index,
              level: char.level || 1,
              subclassSource: char.subclass_source as 'srd' | 'homebrew' | null | undefined,
              subclassIndex: char.subclass_index || undefined,
              isPrimary: true,
            }];
          }
        }
        
        setFormData({
          sourceVersion,
          characterType: char.campaign_id ? "campaign" : "standalone",
          campaignId: char.campaign_id || null,
          raceSource: char.race_source,
          raceIndex: char.race_index,
          classes: loadedClasses,
          classSource: char.class_source,
          classIndex: char.class_index,
          subclassSource: char.subclass_source || null,
          subclassIndex: char.subclass_index || null,
          abilityScores: baseAbilityScores,
          abilityScoreMethod: "point-buy", // Default, could be stored
          background: char.background || "",
          alignment: char.alignment || "True Neutral",
          name: char.name,
          level: char.level || 1,
          selectedEquipment: (char.inventory || []).map((item: any) => ({
            itemIndex: item.index,
            itemSource: item.source,
            quantity: item.quantity || 1,
          })),
          imageUrl: char.image_url,
          featureChoices: {
            skillProficiencies,
            asiImprovements,
            otherChoices: [],
          },
          backgroundChoices: {
            languages: backgroundLanguages,
            tools: backgroundTools,
          },
          description: loadedDescription,
        });
        setIsLoadingCharacter(false);
      }
      
      loadCharacterData();
    }
  }, [isEditMode, existingCharacter, characterLoading, races, classes]);


  const selectedRace = formData.raceSource && formData.raceIndex
    ? races.find(r => r.source === formData.raceSource && r.index === formData.raceIndex)
    : null;

  const selectedClass = formData.classSource && formData.classIndex
    ? classes.find(c => c.source === formData.classSource && c.index === formData.classIndex)
    : null;

  const selectedSubclass = formData.subclassSource && formData.subclassIndex
    ? subclasses.find(s => s.source === formData.subclassSource && s.index === formData.subclassIndex)
    : null;

  // Calculate ability modifiers with racial bonuses and ASI improvements
  const getFinalAbilityScore = (ability: keyof typeof formData.abilityScores): number => {
    let base = formData.abilityScores[ability];
    
    // Add racial bonuses
    if (selectedRace?.ability_bonuses) {
      const bonuses = selectedRace.ability_bonuses as Array<any>;
      const abilityAbbrev = ability.toUpperCase().slice(0, 3);
      const raceBonus = bonuses.find(b => {
        const bonusAbility = b.ability_score?.index || b.ability_score?.name || b.ability || '';
        return bonusAbility.toUpperCase().slice(0, 3) === abilityAbbrev;
      });
      if (raceBonus) {
        base += raceBonus.bonus;
      }
    }
    
    // Add ASI improvements
    const asiBonus = formData.featureChoices.asiImprovements
      .filter(asi => asi.ability === ability)
      .reduce((sum, asi) => sum + asi.bonus, 0);
    base += asiBonus;
    
    return base;
  };

  const handleNext = () => {
    // Validate current step before proceeding
    if (step === 0 && !formData.sourceVersion) {
      toast.error("Please select a source version");
      return;
    }
    if (step === 1 && !formData.characterType) {
      toast.error("Please select character type");
      return;
    }
    if (step === 1 && formData.characterType === "campaign" && !formData.campaignId) {
      toast.error("Please select a campaign");
      return;
    }
    
    // Validation for current step
    if (step === 2 && formData.classes.length === 0) {
      toast.error("Please select at least one class");
      return;
    }
    if (step === 3 && (!formData.raceSource || !formData.raceIndex)) {
      toast.error("Please select a species");
      return;
    }
    
    const maxStep = isEditMode ? 11 : 11; // All steps available in edit mode (including race and class)
    if (step < maxStep) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    const minStep = isEditMode ? 2 : 1; // In edit mode, don't go below step 2 (class selection); otherwise step 1 (Home)
    if (step > minStep) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Missing user ID");
      return;
    }

    if (!isEditMode && (!formData.raceSource || !formData.raceIndex || formData.classes.length === 0)) {
      toast.error("Please complete all required fields");
      return;
    }
    
    // Validate level distribution for multiclass
    if (formData.classes.length > 0) {
      const totalLevels = formData.classes.reduce((sum, c) => sum + c.level, 0);
      if (totalLevels !== formData.level) {
        toast.error(`Total class levels (${totalLevels}) must equal character level (${formData.level})`);
        return;
      }
    }

    if (!formData.sourceVersion) {
      toast.error("Please select a source version");
      return;
    }

    const finalAbilityScores = {
      strength: getFinalAbilityScore("strength"),
      dexterity: getFinalAbilityScore("dexterity"),
      constitution: getFinalAbilityScore("constitution"),
      intelligence: getFinalAbilityScore("intelligence"),
      wisdom: getFinalAbilityScore("wisdom"),
      charisma: getFinalAbilityScore("charisma"),
    };

    const proficiencyBonus = getProficiencyBonus(formData.level);
    
    // Get primary class for backward compatibility and initial calculations
    const primaryClass = formData.classes.find(c => c.isPrimary) || formData.classes[0];
    const primaryClassData = classes.find(c => c.source === primaryClass?.classSource && c.index === primaryClass?.classIndex);
    const hitDie = primaryClassData?.hit_die || 8;
    const constitutionMod = getAbilityModifier(finalAbilityScores.constitution);
    const hpMax = hitDie + constitutionMod;
    
    // Calculate hit dice breakdown for multiclass
    // const { getHitDiceBreakdown } = require('@/lib/utils/multiclass');
    const hitDiceBreakdown = formData.classes.length > 1 
      ? getHitDiceBreakdown(formData.classes.map(c => ({
          class_source: c.classSource,
          class_index: c.classIndex,
          level: c.level,
        })), new Map(classes.map(c => [`${c.source}:${c.index}`, { hit_die: c.hit_die }])))
      : null;
    
    const hitDiceTotalStr = hitDiceBreakdown 
      ? Object.entries(hitDiceBreakdown).map(([die, count]) => `${count}${die}`).join(' + ')
      : `${formData.level}d${hitDie}`;

    const usesMulticlass = formData.classes.length > 1;
    
    const characterData: Partial<Character> & Omit<Character, "id" | "created_at" | "updated_at"> = {
      campaign_id: formData.campaignId,
      user_id: userId,
      name: formData.name || "Unnamed Character",
      race_source: formData.raceSource as "srd" | "homebrew",
      race_index: formData.raceIndex as string,
      // Keep for backward compatibility, but use primary class
      class_source: primaryClass ? primaryClass.classSource as "srd" | "homebrew" : null,
      class_index: primaryClass ? primaryClass.classIndex : null,
      subclass_source: primaryClass?.subclassSource || null,
      subclass_index: primaryClass?.subclassIndex || null,
      uses_multiclass: usesMulticlass,
      level: formData.level,
      experience_points: 0,
      background: formData.background && formData.background !== "custom" ? formData.background : null as string | null,
      alignment: formData.alignment || null as string | null,
      strength: finalAbilityScores.strength,
      dexterity: finalAbilityScores.dexterity,
      constitution: finalAbilityScores.constitution,
      intelligence: finalAbilityScores.intelligence,
      wisdom: finalAbilityScores.wisdom,
      charisma: finalAbilityScores.charisma,
      armor_class: 10,
      initiative: 0,
      speed: selectedRace?.speed || 30,
      hp_max: hpMax,
      hp_current: hpMax,
      hp_temp: 0,
      hit_dice_total: hitDiceTotalStr,
      hit_dice_current: hitDiceTotalStr,
      proficiency_bonus: proficiencyBonus,
      inspiration: false,
      conditions: [],
      notes: "",
      strength_save_prof: false,
      dexterity_save_prof: false,
      constitution_save_prof: false,
      intelligence_save_prof: false,
      wisdom_save_prof: false,
      charisma_save_prof: false,
      image_url: formData.imageUrl,
    };

    // Set saving throw proficiencies from primary class only (multiclass rule)
    if (primaryClassData?.saving_throws) {
      primaryClassData.saving_throws.forEach(ability => {
        const abilityKey = `${ability.toLowerCase().slice(0, 3)}_save_prof` as keyof typeof characterData;
        if (abilityKey in characterData) {
          (characterData as any)[abilityKey] = true;
        }
      });
    }

    if (isEditMode && editId) {
      // Update existing character
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('characters')
        .update(characterData)
        .eq('id', editId);

      if (updateError) {
        toast.error("Failed to update character");
        console.error(updateError);
        return;
      }

      toast.success("Character updated successfully");
      router.push(`/characters/${editId}`);
      return;
    }

    const result = await createCharacter(characterData);

    if (result.success && result.data?.id) {
      const supabase = createClient();
      const characterId = result.data.id;
      console.log('Character created with ID:', characterId);

      // Create character_classes entries for multiclass support
      if (formData.classes.length > 0) {
        const characterClasses = formData.classes.map((charClass, idx) => ({
          character_id: characterId,
          class_source: charClass.classSource,
          class_index: charClass.classIndex,
          level: charClass.level,
          subclass_source: charClass.subclassSource || null,
          subclass_index: charClass.subclassIndex || null,
          is_primary_class: charClass.isPrimary || idx === 0,
          level_acquired_at: idx === 0 ? 1 : formData.level, // First class at level 1, others at current level
        }));
        
        const { error: classesError } = await supabase
          .from('character_classes')
          .insert(characterClasses);
        
        if (classesError) {
          console.error('Error creating character classes:', classesError);
          toast.error('Character created but failed to save class information');
        }
      }

      // Add selected equipment to character inventory
      const inventoryItems: Array<{
        character_id: string;
        item_source: 'srd' | 'homebrew';
        item_index: string;
        quantity: number;
        equipped: boolean;
        attuned: boolean;
      }> = [];

      // Add manually selected equipment
      if (formData.selectedEquipment.length > 0) {
        console.log('Adding manually selected equipment:', formData.selectedEquipment.length, 'items');
        formData.selectedEquipment.forEach(item => {
          inventoryItems.push({
            character_id: characterId,
            item_source: item.itemSource,
            item_index: item.itemIndex,
            quantity: item.quantity,
            equipped: false,
            attuned: false,
          });
        });
      } else {
        // If no equipment was manually selected, try to add starting equipment from class
        console.log('No manually selected equipment, checking for starting equipment...');
        if (selectedClass?.starting_equipment) {
          const startingEq = selectedClass.starting_equipment as any;
          const autoItems = startingEq.starting_equipment || startingEq;
          
          if (Array.isArray(autoItems)) {
            console.log('Found starting equipment array:', autoItems.length, 'items');
            for (const item of autoItems) {
              const eqData = item.equipment || item;
              const itemIndex = eqData.index || eqData.name?.toLowerCase().replace(/\s+/g, '-');
              const quantity = item.quantity || eqData.quantity || 1;
              
              if (itemIndex) {
                // Try to find the equipment in the database to verify it exists
                const { data: equipmentCheck } = await supabase
                  .from('srd_equipment')
                  .select('index')
                  .eq('index', itemIndex)
                  .single();
                
                if (equipmentCheck) {
                  inventoryItems.push({
                    character_id: characterId,
                    item_source: 'srd',
                    item_index: itemIndex,
                    quantity: quantity,
                    equipped: false,
                    attuned: false,
                  });
                  console.log(`Added starting equipment: ${itemIndex} x${quantity}`);
                } else {
                  console.warn(`Starting equipment item not found in database: ${itemIndex}`);
                }
              }
            }
          }
        }
      }

      // Insert inventory items
      if (inventoryItems.length > 0) {
        const { error: inventoryError } = await supabase
          .from('character_inventory')
          .insert(inventoryItems);

        if (inventoryError) {
          console.error('Failed to add equipment to inventory:', inventoryError);
          toast.error('Character created but failed to add equipment');
        } else {
          console.log(`Successfully added ${inventoryItems.length} inventory items`);
        }
      } else {
        console.log('No inventory items to add');
      }

      // Add skill proficiencies from feature choices
      if (formData.featureChoices.skillProficiencies.length > 0) {
        const skillProficiencies = formData.featureChoices.skillProficiencies.map(skillName => ({
          character_id: characterId,
          skill_name: skillName,
          proficient: true,
          expertise: false,
        }));

        const { error: skillsError } = await supabase
          .from('character_skills')
          .insert(skillProficiencies);

        if (skillsError) {
          console.error('Failed to add skill proficiencies:', skillsError);
          toast.error('Character created but failed to add skill proficiencies');
        } else {
          console.log(`Successfully added ${skillProficiencies.length} skill proficiencies`);
        }
      }

      // Auto-attach spells for spellcasting classes
      if (selectedClass?.spellcasting) {
        try {
          console.log('Class has spellcasting, attempting to attach spells...');
          const spellcasting = selectedClass.spellcasting as any;
          const classIndex = selectedClass.index.toLowerCase();
          console.log('Class index:', classIndex);
          console.log('Spellcasting data:', spellcasting);
          
          // Get all spells for this class
          // Note: classes is a TEXT[] array, so we need to check if it contains the class name
          const { data: classSpells, error: spellsError } = await supabase
            .from('srd_spells')
            .select('index, level, name, classes')
            .order('level', { ascending: true })
            .order('name', { ascending: true });

          if (spellsError) {
            console.error('Error fetching spells:', spellsError);
          } else {
            console.log(`Fetched ${classSpells?.length || 0} total spells from database`);
          }

          // Filter spells that have this class in their classes array
          const filteredSpells = classSpells?.filter(spell => {
            if (!spell.classes || !Array.isArray(spell.classes)) return false;
            const matches = spell.classes.some((cls: string) => cls.toLowerCase() === classIndex);
            return matches;
          }) || [];

          console.log(`Found ${filteredSpells.length} spells for class ${classIndex}`);

          if (!spellsError && filteredSpells.length > 0) {
            const spellsToAdd: Array<{
              character_id: string;
              spell_source: 'srd';
              spell_index: string;
              prepared: boolean;
              always_prepared: boolean;
            }> = [];

            // Determine spell slots based on level
            const spellSlotsToAdd: Array<{
              character_id: string;
              spell_level: number;
              slots_total: number;
              slots_used: number;
            }> = [];

            // Get cantrips (level 0)
            const cantrips = filteredSpells.filter(s => s.level === 0);
            const cantripsKnown = spellcasting.cantrips_known?.[formData.level - 1] || 
                                 spellcasting.cantrips_known?.[0] || 
                                 3;
            const cantripsToAdd = cantrips.slice(0, cantripsKnown);
            console.log(`Adding ${cantripsToAdd.length} cantrips (out of ${cantrips.length} available, ${cantripsKnown} known at level ${formData.level})`);
            
            cantripsToAdd.forEach(cantrip => {
              spellsToAdd.push({
                character_id: characterId,
                spell_source: 'srd',
                spell_index: cantrip.index,
                prepared: false, // Cantrips are always available
                always_prepared: false,
              });
            });

            // Get 1st level spells
            const firstLevelSpells = filteredSpells.filter(s => s.level === 1);
            console.log(`Found ${firstLevelSpells.length} first-level spells available`);
            
            // For prepared casters (wizard, cleric, druid, paladin), add spells to spellbook
            // For known casters (sorcerer, bard, ranger, warlock), add known spells
            if (['wizard'].includes(classIndex)) {
              // Wizard: Add 6 first-level spells to spellbook at level 1
              const spellsForSpellbook = firstLevelSpells.slice(0, 6);
              spellsForSpellbook.forEach(spell => {
                spellsToAdd.push({
                  character_id: characterId,
                  spell_source: 'srd',
                  spell_index: spell.index,
                  prepared: false, // Wizards prepare spells daily
                  always_prepared: false,
                });
              });
              
              // Add spell slots: 2 first-level slots at level 1
              spellSlotsToAdd.push({
                character_id: characterId,
                spell_level: 1,
                slots_total: 2,
                slots_used: 0,
              });
            } else if (['cleric', 'druid'].includes(classIndex)) {
              // Prepared casters: Add all 1st level spells (they prepare daily)
              firstLevelSpells.forEach(spell => {
                spellsToAdd.push({
                  character_id: characterId,
                  spell_source: 'srd',
                  spell_index: spell.index,
                  prepared: true, // Auto-prepare at creation
                  always_prepared: false,
                });
              });
              
              spellSlotsToAdd.push({
                character_id: characterId,
                spell_level: 1,
                slots_total: 2,
                slots_used: 0,
              });
            } else if (['sorcerer', 'bard', 'ranger', 'warlock'].includes(classIndex)) {
              // Known casters: Add limited number of known spells
              const knownSpells = firstLevelSpells.slice(0, spellcasting.spells_known?.[formData.level - 1] || 2);
              knownSpells.forEach(spell => {
                spellsToAdd.push({
                  character_id: characterId,
                  spell_source: 'srd',
                  spell_index: spell.index,
                  prepared: true,
                  always_prepared: false,
                });
              });
              
              if (classIndex !== 'warlock') {
                spellSlotsToAdd.push({
                  character_id: characterId,
                  spell_level: 1,
                  slots_total: 2,
                  slots_used: 0,
                });
              } else {
                // Warlock has pact magic (different slot system)
                spellSlotsToAdd.push({
                  character_id: characterId,
                  spell_level: 1,
                  slots_total: 1,
                  slots_used: 0,
                });
              }
            }

            // Insert spells
            if (spellsToAdd.length > 0) {
              const { error: spellsInsertError } = await supabase
                .from('character_spells')
                .insert(spellsToAdd);

              if (spellsInsertError) {
                console.error('Failed to add spells:', spellsInsertError);
                toast.error('Character created but failed to add spells');
              } else {
                console.log(`Successfully added ${spellsToAdd.length} spells to character`);
              }
            }

            // Insert spell slots
            if (spellSlotsToAdd.length > 0) {
              const { error: slotsError } = await supabase
                .from('character_spell_slots')
                .insert(spellSlotsToAdd);

              if (slotsError) {
                console.error('Failed to add spell slots:', slotsError);
                toast.error('Character created but failed to add spell slots');
              } else {
                console.log(`Successfully added ${spellSlotsToAdd.length} spell slot entries`);
              }
            }
          } else {
            console.warn('No spells found for class:', classIndex, 'Error:', spellsError);
          }
        } catch (error) {
          console.error('Error attaching spells:', error);
          toast.error('Character created but failed to attach spells');
          // Don't fail character creation if spells fail
        }
      }

      // Build JSONB data for character record
      const spellsJsonb: Array<{
        source: 'srd' | 'homebrew';
        index: string;
        prepared: boolean;
        always_prepared: boolean;
      }> = [];

      const inventoryJsonb: Array<{
        source: 'srd' | 'homebrew';
        index: string;
        quantity: number;
        equipped: boolean;
        attuned: boolean;
        notes?: string | null;
      }> = [];

      const classFeaturesJsonb: Array<{
        level: number;
        name: string;
        description: string;
      }> = [];

      // Build spells JSONB from spellsToAdd (if spells were added)
      if (selectedClass?.spellcasting) {
        try {
          const spellcasting = selectedClass.spellcasting as any;
          const classIndex = selectedClass.index.toLowerCase();
          
          const { data: classSpells } = await supabase
            .from('srd_spells')
            .select('index, level, name, classes')
            .order('level', { ascending: true })
            .order('name', { ascending: true });

          const filteredSpells = classSpells?.filter(spell => {
            if (!spell.classes || !Array.isArray(spell.classes)) return false;
            return spell.classes.some((cls: string) => cls.toLowerCase() === classIndex);
          }) || [];

          if (filteredSpells.length > 0) {
            const cantrips = filteredSpells.filter(s => s.level === 0);
            const cantripsKnown = spellcasting.cantrips_known?.[formData.level - 1] || 
                                 spellcasting.cantrips_known?.[0] || 
                                 3;
            const cantripsToAdd = cantrips.slice(0, cantripsKnown);
            
            cantripsToAdd.forEach(cantrip => {
              spellsJsonb.push({
                source: 'srd',
                index: cantrip.index,
                prepared: false,
                always_prepared: false,
              });
            });

            const firstLevelSpells = filteredSpells.filter(s => s.level === 1);
            
            if (['wizard'].includes(classIndex)) {
              const spellsForSpellbook = firstLevelSpells.slice(0, 6);
              spellsForSpellbook.forEach(spell => {
                spellsJsonb.push({
                  source: 'srd',
                  index: spell.index,
                  prepared: false,
                  always_prepared: false,
                });
              });
            } else if (['cleric', 'druid'].includes(classIndex)) {
              firstLevelSpells.forEach(spell => {
                spellsJsonb.push({
                  source: 'srd',
                  index: spell.index,
                  prepared: true,
                  always_prepared: false,
                });
              });
            } else if (['sorcerer', 'bard', 'ranger', 'warlock'].includes(classIndex)) {
              const knownSpells = firstLevelSpells.slice(0, spellcasting.spells_known?.[formData.level - 1] || 2);
              knownSpells.forEach(spell => {
                spellsJsonb.push({
                  source: 'srd',
                  index: spell.index,
                  prepared: true,
                  always_prepared: false,
                });
              });
            }
          }
        } catch (error) {
          console.error('Error building spells JSONB:', error);
        }
      }

      // Build inventory JSONB from inventoryItems
      inventoryItems.forEach(item => {
        inventoryJsonb.push({
          source: item.item_source,
          index: item.item_index,
          quantity: item.quantity,
          equipped: item.equipped,
          attuned: item.attuned,
          notes: null,
        });
      });

      // Build class features JSONB from class levels
      if (selectedClass?.class_levels) {
        try {
          const classLevels = selectedClass.class_levels as any;
          
          for (let lvl = 1; lvl <= formData.level; lvl++) {
            const levelData = classLevels[lvl] || 
                             classLevels[`level_${lvl}`] || 
                             classLevels[`${lvl}`] ||
                             (Array.isArray(classLevels) ? classLevels[lvl - 1] : null);
            
            if (!levelData) continue;
            
            // Extract features from level data
            if (levelData.features) {
              if (Array.isArray(levelData.features)) {
                levelData.features.forEach((feat: any) => {
                  if (typeof feat === 'string') {
                    classFeaturesJsonb.push({ level: lvl, name: feat, description: '' });
                  } else if (feat.name || feat.index) {
                    classFeaturesJsonb.push({
                      level: lvl,
                      name: feat.name || feat.index || 'Feature',
                      description: feat.desc || feat.description || '',
                    });
                  }
                });
              } else if (typeof levelData.features === 'object') {
                Object.entries(levelData.features).forEach(([key, value]: [string, any]) => {
                  classFeaturesJsonb.push({
                    level: lvl,
                    name: value.name || key,
                    description: value.desc || value.description || '',
                  });
                });
              }
            }

            // Also check for feature_choices
            if (levelData.feature_choices) {
              if (Array.isArray(levelData.feature_choices)) {
                levelData.feature_choices.forEach((choice: any) => {
                  classFeaturesJsonb.push({
                    level: lvl,
                    name: choice.name || 'Feature Choice',
                    description: choice.desc || choice.description || 'Choose a feature',
                  });
                });
              }
            }

            // Display class-specific features
            if (levelData.class_specific) {
              Object.entries(levelData.class_specific).forEach(([key, value]: [string, any]) => {
                classFeaturesJsonb.push({
                  level: lvl,
                  name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  description: typeof value === 'object' ? JSON.stringify(value) : String(value),
                });
              });
            }
          }
        } catch (error) {
          console.error('Error building class features JSONB:', error);
        }
      }

      // Build background_details JSONB
      const linesToArray = (s: string): string[] =>
        s
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      const backgroundDetailsJsonb = {
        personality_traits: linesToArray(formData.description.personalityTraits),
        ideals: linesToArray(formData.description.ideals),
        bonds: linesToArray(formData.description.bonds),
        flaws: linesToArray(formData.description.flaws),
        appearance: formData.description.appearance || "",
        backstory: formData.description.backstory || "",
        characteristics: {
          alignment: formData.alignment || null,
          gender: formData.description.gender || "",
          pronouns: formData.description.pronouns || "",
          eyes: formData.description.eyes || "",
          size: "",
          height: formData.description.height || "",
          faith: formData.description.faith || "",
          hair: formData.description.hair || "",
          skin: formData.description.skin || "",
          age: formData.description.age || "",
          weight: formData.description.weight || "",
        },
      };

      // Build extras JSONB
      const extrasJsonb = {
        custom_actions: [],
        custom_features: [],
        notes: {},
        background_languages: formData.backgroundChoices.languages,
        background_tools: formData.backgroundChoices.tools,
        is_custom_background: formData.background === "custom",
      };

      // Update character record with JSONB columns
      const { error: updateError } = await supabase
        .from('characters')
        .update({
          spells: spellsJsonb,
          inventory: inventoryJsonb,
          class_features: classFeaturesJsonb,
          background_details: backgroundDetailsJsonb,
          extras: extrasJsonb,
        })
        .eq('id', characterId);

      if (updateError) {
        console.error('Failed to update character JSONB columns:', updateError);
        toast.error('Character created but failed to update data columns');
      } else {
        console.log('Successfully updated character JSONB columns');
      }

      toast.success("Character created successfully!");
      if (formData.campaignId) {
        router.push(`/campaigns/${formData.campaignId}/characters/${result.data.id}`);
      } else {
        router.push(`/characters/${result.data.id}`);
      }
    } else {
      toast.error(result.error?.message || "Failed to create character");
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="sc-card"
          style={{
            padding: 40,
            textAlign: "center",
            color: "var(--muted-foreground)",
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  const stepMeta: Array<{ label: string; Icon: React.ComponentType<{ size?: number }> }> = [
    { label: "Source", Icon: Book },
    { label: "Home", Icon: Campaign },
    { label: "Class", Icon: Fighter },
    { label: "Species", Icon: CharacterIcon },
    { label: "Background", Icon: Book },
    { label: "Abilities", Icon: Strength },
    { label: "Description", Icon: Star },
    { label: "Equipment", Icon: Weapon },
    { label: "Review", Icon: Check },
  ];

  const stepNumbers = isEditMode ? [2, 3, 4, 5, 6, 7, 8] : [1, 2, 3, 4, 5, 6, 7, 8];
  const currentStepMeta = stepMeta[step];
  const StepTitleIcon = currentStepMeta?.Icon ?? Book;
  const stepTitles: Record<number, string> = {
    0: "Source Version",
    1: "Home",
    2: "Choose Class",
    3: "Choose Species",
    4: "Choose Background",
    5: "Assign Ability Scores",
    6: "Describe Your Character",
    7: "Starting Equipment",
    8: `Review & ${isEditMode ? "Update" : "Create"}`,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main
        className="flex-1 mx-auto w-full"
        style={{ padding: "16px 20px", maxWidth: 1200 }}
      >
        {/* Title bar */}
        <div style={{ marginBottom: 14 }}>
          <div
            className="font-serif"
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Character Creator
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {isEditMode
              ? "Update your character's details, one forge-warmed anvil at a time"
              : "Forge a new hero through eight considered steps"}
          </div>
        </div>

        {/* Step Progress */}
        <div
          className="sc-card"
          style={{ padding: 12, marginBottom: 14, overflowX: "auto" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 0,
              minWidth: "fit-content",
            }}
          >
            {stepNumbers.map((stepNum, idx) => {
              const meta = stepMeta[stepNum];
              if (!meta) return null;
              const Icon = meta.Icon;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              const isLast = idx === stepNumbers.length - 1;
              return (
                <div
                  key={stepNum}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setStep(stepNum)}
                    title={`Go to ${meta.label}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      minWidth: 56,
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        background: isActive
                          ? "var(--primary)"
                          : isDone
                          ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                          : "var(--muted)",
                        color: isActive
                          ? "var(--primary-foreground)"
                          : isDone
                          ? "var(--primary)"
                          : "var(--muted-foreground)",
                        fontSize: 12,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        transition: "all 0.15s",
                        border: isActive
                          ? "1px solid var(--primary)"
                          : "1px solid var(--border)",
                      }}
                    >
                      {isDone ? <Check size={14} /> : stepNum + 1}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: isActive
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                        fontWeight: isActive ? 600 : 400,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Icon size={11} />
                      {meta.label}
                    </div>
                  </button>
                  {!isLast && (
                    <div
                      style={{
                        height: 2,
                        flex: 1,
                        margin: "0 6px",
                        marginTop: -18,
                        background: isDone
                          ? "var(--primary)"
                          : "var(--border)",
                        transition: "background 0.15s",
                        minWidth: 16,
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="sc-card" style={{ padding: 0 }}>
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <StepTitleIcon size={16} />
            <div
              className="font-serif"
              style={{ fontSize: 16, fontWeight: 600 }}
            >
              Step {step + 1}: {stepTitles[step]}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                marginTop: -4,
              }}
            >
              {step === 0 && "Choose between 2014 or 2024 SRD+PHB content"}
              {step === 1 && "Set up the basics: campaign, name, and starting level"}
              {step === 2 && "Choose a class, its features, and (if applicable) a subclass"}
              {step === 3 && "Select your character's species"}
              {step === 4 && "Choose a background to shape your character's origin"}
              {step === 5 && "Assign your ability scores using your preferred method"}
              {step === 6 && "Alignment, personality, appearance, and backstory"}
              {step === 7 && "Select starting equipment"}
              {step === 8 && `${isEditMode ? "Review and update" : "Review your character before creating"} your character`}
            </div>
            {/* Step 0: Source Version Selection */}
            {step === 0 && (
              <div className="space-y-4">
                <Label>Select Source Version</Label>
                <p className="text-sm text-muted-foreground">
                  Choose which version of the D&D rules to use for this character. This affects all available races, classes, backgrounds, and other content.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${formData.sourceVersion === "2014" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFormData({ ...formData, sourceVersion: "2014" })}
                  >
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold">2014 SRD + PHB</h3>
                        <p className="text-sm text-muted-foreground">Original 5th Edition rules</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card 
                    className={`cursor-pointer transition-all ${formData.sourceVersion === "2024" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setFormData({ ...formData, sourceVersion: "2024" })}
                  >
                    <CardContent className="pt-6">
                      <div className="text-center space-y-2">
                        <h3 className="font-semibold">2024 SRD + PHB</h3>
                        <p className="text-sm text-muted-foreground">Updated 5th Edition rules</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 1: Home (Campaign Type + Name + Starting Level) */}
            {step === 1 && (
              <HomeStep
                formData={formData}
                setFormData={setFormData}
                campaigns={campaigns}
                races={races}
              />
            )}

            {/* Step 2: Class (selection + features + subclass merged) */}
            {step === 2 && (
              <div className="space-y-6">
                <ClassSelectionStep
                  classes={classes}
                  loading={classesLoading}
                  selectedClasses={formData.classes}
                  error={classesError}
                  infoSheet={infoSheet}
                  abilityScores={formData.abilityScores}
                  onAddClass={(cls: DndClass) => {
                    if (
                      formData.classes.some(
                        (c) =>
                          c.classSource === cls.source &&
                          c.classIndex === cls.index
                      )
                    ) {
                      return;
                    }
                    const prereqError = checkMulticlassPrerequisites(
                      formData.abilityScores,
                      cls.index
                    );
                    if (prereqError && formData.classes.length > 0) {
                      toast.error(prereqError);
                      return;
                    }
                    const isFirstClass = formData.classes.length === 0;
                    const newClasses = [
                      ...formData.classes,
                      {
                        classSource: cls.source,
                        classIndex: cls.index,
                        level: isFirstClass ? formData.level : 1,
                        isPrimary: isFirstClass,
                      },
                    ];
                    setFormData({
                      ...formData,
                      classes: newClasses,
                      classSource: isFirstClass
                        ? cls.source
                        : formData.classSource,
                      classIndex: isFirstClass
                        ? cls.index
                        : formData.classIndex,
                    });
                  }}
                  onRemoveClass={(classSource, classIndex) => {
                    const newClasses = formData.classes.filter(
                      (c) =>
                        !(
                          c.classSource === classSource &&
                          c.classIndex === classIndex
                        )
                    );
                    if (
                      newClasses.length > 0 &&
                      formData.classes.find(
                        (c) =>
                          c.isPrimary &&
                          c.classSource === classSource &&
                          c.classIndex === classIndex
                      )
                    ) {
                      newClasses[0].isPrimary = true;
                    }
                    setFormData({
                      ...formData,
                      classes: newClasses,
                      classSource: newClasses[0]?.classSource || null,
                      classIndex: newClasses[0]?.classIndex || null,
                    });
                  }}
                  onSetPrimaryClass={(cls: DndClass) => {
                    // Replace the primary class while preserving any other multiclass picks.
                    // Avoid duplicating this class if it was already present as a multiclass.
                    const existingMulticlasses = formData.classes.filter(
                      (c) =>
                        !c.isPrimary &&
                        !(
                          c.classSource === cls.source &&
                          c.classIndex === cls.index
                        )
                    );
                    const usedByMulticlasses = existingMulticlasses.reduce(
                      (sum, c) => sum + c.level,
                      0
                    );
                    const primaryLevel = Math.max(
                      1,
                      formData.level - usedByMulticlasses
                    );
                    // Preserve any existing subclass pick on this class if it was already selected
                    const existingPickOfThisClass = formData.classes.find(
                      (c) =>
                        c.classSource === cls.source &&
                        c.classIndex === cls.index
                    );
                    const newClasses: CharacterClassForm[] = [
                      {
                        classSource: cls.source,
                        classIndex: cls.index,
                        level: primaryLevel,
                        isPrimary: true,
                        subclassSource:
                          existingPickOfThisClass?.subclassSource ?? null,
                        subclassIndex:
                          existingPickOfThisClass?.subclassIndex ?? null,
                      },
                      ...existingMulticlasses,
                    ];
                    setFormData({
                      ...formData,
                      classes: newClasses,
                      classSource: cls.source,
                      classIndex: cls.index,
                      subclassSource:
                        existingPickOfThisClass?.subclassSource ?? null,
                      subclassIndex:
                        existingPickOfThisClass?.subclassIndex ?? null,
                    });
                  }}
                />
                {formData.classes.length > 0 && (
                  <div
                    style={{
                      paddingTop: 14,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <FeatureChoicesStep
                      formData={formData}
                      setFormData={setFormData}
                      selectedClass={selectedClass}
                      classes={classes}
                      campaignId={formData.campaignId}
                      sourceVersion={formData.sourceVersion}
                      infoSheet={infoSheet}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Species (Race) */}
            {step === 3 && (
              <RaceSelectionStep
                races={races}
                loading={racesLoading}
                selectedRace={selectedRace}
                error={racesError}
                infoSheet={infoSheet}
                onSelect={(race) => {
                  setFormData({
                    ...formData,
                    raceSource: race.source,
                    raceIndex: race.index,
                  });
                }}
              />
            )}

            {/* Step 4: Background */}
            {step === 4 && (
              <BackgroundStep
                formData={formData}
                setFormData={setFormData}
                backgrounds={backgrounds}
                backgroundsLoading={backgroundsLoading}
                section="background"
              />
            )}

            {/* Step 5: Ability Scores */}
            {step === 5 && (
              <AbilityScoresStep
                formData={formData}
                setFormData={setFormData}
                selectedRace={selectedRace}
                getFinalAbilityScore={getFinalAbilityScore}
              />
            )}

            {/* Step 6: Description (alignment + personality + physical + backstory) */}
            {step === 6 && (
              <BackgroundStep
                formData={formData}
                setFormData={setFormData}
                backgrounds={backgrounds}
                backgroundsLoading={backgroundsLoading}
                section="description"
              />
            )}

            {/* Step 7: Equipment */}
            {step === 7 && (
              <EquipmentStep
                selectedClass={selectedClass}
                formData={formData}
                setFormData={setFormData}
                equipment={equipment}
                loading={equipmentLoading}
                campaignId={formData.campaignId}
              />
            )}

            {/* Step 8: Review */}
            {step === 8 && (
              <ReviewStep
                formData={formData}
                selectedRace={selectedRace}
                selectedClass={selectedClass}
                selectedSubclass={selectedSubclass}
                getFinalAbilityScore={getFinalAbilityScore}
              />
            )}

            {/* Navigation Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 14,
                marginTop: 4,
                borderTop: "1px solid var(--border)",
                gap: 10,
              }}
            >
              <button
                type="button"
                className="sc-btn sc-btn-sm"
                onClick={handleBack}
                disabled={step === (isEditMode ? 2 : 1)}
              >
                <ChevronLeft size={13} />
                Back
              </button>
              {step < 8 ? (
                <button
                  type="button"
                  className="sc-btn sc-btn-primary sc-btn-sm"
                  onClick={handleNext}
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  type="button"
                  className="sc-btn sc-btn-primary sc-btn-sm"
                  onClick={handleSubmit}
                  disabled={creating || isLoadingCharacter}
                >
                  {creating ? (
                    <>
                      <Loader2
                        size={13}
                        style={{ animation: "spin 1s linear infinite" }}
                      />
                      {isEditMode ? "Updating…" : "Creating…"}
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      {isEditMode ? "Update character" : "Create character"}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <InfoSheetDialog
        open={infoSheet.open}
        onOpenChange={infoSheet.setOpen}
        content={infoSheet.content}
      />
    </div>
  );
}

// Step Components

function RaceSelectionStep({
  races,
  loading,
  selectedRace,
  onSelect,
  error,
  infoSheet,
}: {
  races: Race[];
  loading: boolean;
  selectedRace: Race | null | undefined;
  onSelect: (race: Race) => void;
  error?: Error | null;
  infoSheet: ReturnType<typeof useInfoSheet>;
}) {
  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md bg-destructive/10">
        <p className="text-destructive font-medium">Error loading species</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="p-4 border border-muted rounded-md">
        <p className="text-muted-foreground">No species available. Please check your database connection.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
        gap: 8,
      }}
    >
      {races.map((race) => {
        const bonuses = race.ability_bonuses as Array<any> | null;
        const isSelected =
          selectedRace?.source === race.source && selectedRace?.index === race.index;
        const { Icon: RaceIcon, hue, saturation } = getRaceVisual(race);
        return (
          <div
            key={`${race.source}-${race.index}`}
            className="sc-card sc-card-hover"
            style={{
              cursor: "pointer",
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              borderColor: isSelected ? "var(--primary)" : undefined,
              background: isSelected
                ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                : undefined,
              boxShadow: isSelected
                ? "0 0 0 1px var(--primary) inset"
                : undefined,
            }}
            onClick={() => onSelect(race)}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: `hsl(${hue} ${saturation}% 50% / 0.18)`,
                  color: `hsl(${hue} ${saturation}% ${saturation === 0 ? 70 : 65}%)`,
                  border: `1px solid hsl(${hue} ${saturation}% 50% / 0.35)`,
                }}
              >
                <RaceIcon size={18} />
              </div>
              <div
                className="font-serif"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={race.name}
              >
                {race.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  className="sc-btn sc-btn-ghost"
                  style={{ padding: 2, height: 18, width: 18 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    infoSheet.showRace(race);
                  }}
                  title="Race details"
                >
                  <Info size={11} />
                </button>
                <span
                  className="sc-badge"
                  style={{
                    fontSize: 9,
                    padding: "1px 4px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {race.source}
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                fontSize: 10,
                color: "var(--muted-foreground)",
              }}
            >
              <span>
                <span style={{ opacity: 0.7 }}>SPD</span> {race.speed}ft
              </span>
              <span>
                <span style={{ opacity: 0.7 }}>SIZE</span> {formatSize(race.size)}
              </span>
            </div>
            {bonuses && bonuses.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {bonuses.map((b: any, i) => {
                  const abilityName =
                    b.ability_score?.name ||
                    b.ability_score?.index ||
                    b.ability ||
                    "";
                  const abbr = abilityName.slice(0, 3).toUpperCase();
                  return (
                    <span
                      key={i}
                      className="sc-badge"
                      style={{
                        fontSize: 9,
                        padding: "1px 4px",
                        letterSpacing: "0.02em",
                      }}
                      title={`${getFullAbilityName(abilityName)} +${b.bonus}`}
                    >
                      {abbr} +{b.bonus}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClassSelectionStep({
  classes,
  loading,
  selectedClasses,
  error,
  infoSheet,
  abilityScores,
  onAddClass,
  onRemoveClass,
  onSetPrimaryClass,
}: {
  classes: DndClass[];
  loading: boolean;
  selectedClasses: CharacterClassForm[];
  error?: Error | null;
  infoSheet: ReturnType<typeof useInfoSheet>;
  abilityScores: CharacterFormData['abilityScores'];
  onAddClass: (cls: DndClass) => void;
  onRemoveClass: (classSource: 'srd' | 'homebrew', classIndex: string) => void;
  onSetPrimaryClass: (cls: DndClass) => void;
}) {
  const [multiclassMode, setMulticlassMode] = useState(false);

  useEffect(() => {
    if (selectedClasses.length === 0 && multiclassMode) {
      setMulticlassMode(false);
    }
  }, [selectedClasses.length, multiclassMode]);
  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md bg-destructive/10">
        <p className="text-destructive font-medium">Error loading classes</p>
        <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="p-4 border border-muted rounded-md">
        <p className="text-muted-foreground">No classes available. Please check your database connection.</p>
      </div>
    );
  }

  const selectedClassIndices = new Set(
    selectedClasses.map((c: CharacterClassForm) => `${c.classSource}:${c.classIndex}`)
  );
  
  return (
    <div className="space-y-4">
      {/* Show selected classes */}
      {selectedClasses.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Classes</Label>
          <div className="flex flex-wrap gap-2">
            {selectedClasses.map((charClass: CharacterClassForm, idx: number) => {
              const cls = classes.find(c => c.source === charClass.classSource && c.index === charClass.classIndex);
              return (
                <Badge key={idx} variant={charClass.isPrimary ? "default" : "secondary"} className="text-sm px-3 py-1">
                  {cls?.name || charClass.classIndex} {charClass.isPrimary && "(Primary)"}
                  <button
                    type="button"
                    onClick={() => onRemoveClass(charClass.classSource, charClass.classIndex)}
                    className="ml-2 hover:bg-destructive/20 rounded px-1"
                    title={charClass.isPrimary ? "Remove primary class" : "Remove class"}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        </div>
      )}
      
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: 8,
        }}
      >
        {classes.map((cls) => {
          const savingThrows = cls.saving_throws || [];
          const isSelected = selectedClassIndices.has(`${cls.source}:${cls.index}`);
          const prereq = getMulticlassPrerequisite(cls.index);
          const prereqMet = prereq
            ? (abilityScores[prereq.ability as keyof typeof abilityScores] ?? 0) >=
              prereq.min
            : true;
          // Only treat as multiclass pick when multiclass mode is active and we'd be ADDING (not replacing)
          const isMulticlassPick = multiclassMode && !isSelected;
          const prereqError = isMulticlassPick && !prereqMet
            ? checkMulticlassPrerequisites(abilityScores, cls.index)
            : null;
          const disabled = !!prereqError && !isSelected;
          const { Icon: ClassIcon, hue } = getClassVisual(cls);

          return (
            <div
              key={`${cls.source}-${cls.index}`}
              className="sc-card sc-card-hover"
              style={{
                cursor: disabled ? "not-allowed" : "pointer",
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                opacity: isMulticlassPick && !prereqMet ? 0.55 : 1,
                borderColor: isSelected ? "var(--primary)" : undefined,
                background: isSelected
                  ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                  : undefined,
                boxShadow: isSelected
                  ? "0 0 0 1px var(--primary) inset"
                  : undefined,
              }}
              onClick={() => {
                if (disabled) return;
                if (multiclassMode) {
                  if (isSelected) {
                    onRemoveClass(cls.source, cls.index);
                  } else {
                    onAddClass(cls);
                  }
                } else {
                  onSetPrimaryClass(cls);
                }
              }}
              title={
                multiclassMode
                  ? isSelected
                    ? "Click to remove class"
                    : prereqError ||
                      (prereq
                        ? `Multiclass prereq: ${prereq.ability.charAt(0).toUpperCase()}${prereq.ability.slice(1)} ${prereq.min}+`
                        : "Click to add as multiclass")
                  : isSelected
                    ? "This is your current class"
                    : "Click to choose this class"
              }
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <div
                  aria-hidden
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: `hsl(${hue} 55% 50% / 0.18)`,
                    color: `hsl(${hue} 55% 65%)`,
                    border: `1px solid hsl(${hue} 55% 50% / 0.35)`,
                  }}
                >
                  <ClassIcon size={18} />
                </div>
                <div
                  className="font-serif"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={cls.name}
                >
                  {cls.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    className="sc-btn sc-btn-ghost"
                    style={{ padding: 2, height: 18, width: 18 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      infoSheet.showClass(cls);
                    }}
                    title="Class details"
                  >
                    <Info size={11} />
                  </button>
                  <span
                    className="sc-badge"
                    style={{
                      fontSize: 9,
                      padding: "1px 4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                      background: isSelected
                        ? "color-mix(in srgb, var(--primary) 18%, transparent)"
                        : undefined,
                      color: isSelected ? "var(--primary)" : undefined,
                      borderColor: isSelected ? "transparent" : undefined,
                    }}
                  >
                    {isSelected ? (
                      <>
                        <Check size={9} />
                        SELECTED
                      </>
                    ) : (
                      cls.source
                    )}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  fontSize: 10,
                  color: "var(--muted-foreground)",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  <span style={{ opacity: 0.7 }}>HIT</span> d{cls.hit_die}
                </span>
                {savingThrows.length > 0 && (
                  <span>
                    <span style={{ opacity: 0.7 }}>SAVES</span>{" "}
                    {savingThrows
                      .map((st) => st.slice(0, 3).toUpperCase())
                      .join(", ")}
                  </span>
                )}
              </div>
              {prereq && isMulticlassPick && !isSelected && (() => {
                const currentScore =
                  abilityScores[prereq.ability as keyof typeof abilityScores] ?? 0;
                const abbr = prereq.ability.slice(0, 3).toUpperCase();
                const failing = !prereqMet;
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 4,
                      fontSize: 10,
                      padding: "3px 6px",
                      borderRadius: 4,
                      background: failing
                        ? "color-mix(in srgb, var(--destructive) 12%, transparent)"
                        : "color-mix(in srgb, var(--muted-foreground) 10%, transparent)",
                      color: failing
                        ? "var(--destructive)"
                        : "var(--muted-foreground)",
                    }}
                    title={
                      failing
                        ? `Multiclass requires ${abbr} ${prereq.min}+ (current: ${currentScore})`
                        : `Multiclass prerequisite met: ${abbr} ${prereq.min}+`
                    }
                  >
                    <span style={{ opacity: 0.75 }}>MULTICLASS REQ</span>
                    <span
                      style={{
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {abbr} {prereq.min}+{" "}
                      <span style={{ opacity: 0.75, fontWeight: 400 }}>
                        ({currentScore})
                      </span>
                    </span>
                  </div>
                );
              })()}
              {isMulticlassPick && prereq && !prereqMet && (
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--destructive)",
                    lineHeight: 1.3,
                  }}
                >
                  Can&apos;t add as multiclass — prerequisite not met
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {selectedClasses.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-4">
          Select a class to begin. You can switch freely by clicking another class.
        </div>
      )}

      {selectedClasses.length > 0 && selectedClasses.length < 3 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "8px 10px",
            borderRadius: 6,
            background: multiclassMode
              ? "color-mix(in srgb, var(--primary) 10%, transparent)"
              : "var(--muted)",
            border: multiclassMode
              ? "1px solid var(--primary)"
              : "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              lineHeight: 1.4,
            }}
          >
            {multiclassMode ? (
              <>
                <strong style={{ color: "var(--primary)" }}>Multiclass mode</strong> — click classes to add them. Prereqs: 13+ in the required ability.
              </>
            ) : (
              <>
                Click any class to change your choice. Want to multiclass?
              </>
            )}
          </div>
          <button
            type="button"
            className={multiclassMode ? "sc-btn sc-btn-sm" : "sc-btn sc-btn-primary sc-btn-sm"}
            onClick={() => setMulticlassMode((v) => !v)}
          >
            {multiclassMode ? (
              <>
                <Check size={12} />
                Done
              </>
            ) : (
              <>
                <Plus size={12} />
                Add multiclass
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function LevelDistributionStep({
  formData,
  setFormData,
  classes,
}: {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  classes: DndClass[];
}) {
  const totalLevel = formData.classes.reduce((sum, c) => sum + c.level, 0);
  const remainingLevels = formData.level - totalLevel;
  
  const updateClassLevel = (index: number, newLevel: number) => {
    if (newLevel < 1) return;
    
    const newClasses = [...formData.classes];
    newClasses[index] = { ...newClasses[index], level: newLevel };
    
    // Ensure total doesn't exceed character level
    const newTotal = newClasses.reduce((sum, c) => sum + c.level, 0);
    if (newTotal > formData.level) {
      toast.error(`Total class levels cannot exceed character level ${formData.level}`);
      return;
    }
    
    setFormData({ ...formData, classes: newClasses });
  };
  
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Distribute your {formData.level} character level(s) among your classes.
        Total class levels: {totalLevel} / {formData.level}
        {remainingLevels !== 0 && (
          <span className="text-destructive ml-2">
            {remainingLevels > 0 ? `${remainingLevels} level(s) remaining` : `${Math.abs(remainingLevels)} level(s) over`}
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {formData.classes.map((charClass, idx) => {
          const cls = classes.find(c => c.source === charClass.classSource && c.index === charClass.classIndex);
          return (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{cls?.name || charClass.classIndex}</div>
                    {charClass.isPrimary && (
                      <Badge variant="outline" className="mt-1">Primary Class</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateClassLevel(idx, charClass.level - 1)}
                      disabled={charClass.level <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={formData.level}
                      value={charClass.level}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        updateClassLevel(idx, value);
                      }}
                      className="w-16 text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateClassLevel(idx, charClass.level + 1)}
                      disabled={totalLevel >= formData.level}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {remainingLevels < 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-sm text-destructive">
          Total class levels exceed character level. Please reduce class levels.
        </div>
      )}
    </div>
  );
}

// function SubclassSelectionStep({
//   subclasses,
//   loading,
//   selectedSubclass,
//   selectedClass,
//   onSelect,
//   onSkip,
//   error,
//   infoSheet,
// }: {
//   subclasses: Subclass[];
//   loading: boolean;
//   selectedSubclass: Subclass | null | undefined;
//   selectedClass: DndClass | null | undefined;
//   onSelect: (subclass: Subclass) => void;
//   onSkip: () => void;
//   error?: Error | null;
//   infoSheet: ReturnType<typeof useInfoSheet>;
// }) {
//   if (!selectedClass) {
//     return (
//       <div className="p-4 border border-muted rounded-md">
//         <p className="text-muted-foreground">Please select a class first.</p>
//       </div>
//     );
//   }

//   if (loading) {
//     return <Skeleton className="h-64 w-full" />;
//   }

//   if (error) {
//     return (
//       <div className="p-4 border border-destructive rounded-md bg-destructive/10">
//         <p className="text-destructive font-medium">Error loading subclasses</p>
//         <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center justify-between">
//         <p className="text-sm text-muted-foreground">
//           {subclasses.length === 0 
//             ? "No subclasses available for this class. You can skip this step."
//             : "Select a subclass for your character. Subclasses are optional but provide additional features."}
//         </p>
//         <Button variant="outline" onClick={onSkip}>
//           Skip Subclass
//         </Button>
//       </div>

//       {subclasses.length > 0 && (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//           {subclasses.map((subclass) => (
//             <Card
//               key={`${subclass.source}-${subclass.index}`}
//               className={`cursor-pointer transition-all hover:shadow-md ${
//                 selectedSubclass?.source === subclass.source && selectedSubclass?.index === subclass.index
//                   ? "ring-2 ring-primary"
//                   : ""
//               }`}
//               onClick={() => onSelect(subclass)}
//             >
//               <CardHeader>
//                 <div className="flex items-center justify-between">
//                   <CardTitle className="text-lg">{subclass.name}</CardTitle>
//                   <div className="flex items-center gap-2">
//                     <Button
//                       variant="ghost"
//                       size="icon"
//                       className="h-6 w-6"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         // Show full subclass info including features
//                         infoSheet.showSubclass(subclass, selectedClass?.name);
//                       }}
//                     >
//                       <Info className="h-4 w-4" />
//                     </Button>
//                     <Badge variant={subclass.source === "srd" ? "default" : "secondary"}>
//                       {subclass.source}
//                     </Badge>
//                   </div>
//                 </div>
//                 {subclass.subclass_flavor && (
//                   <CardDescription>{subclass.subclass_flavor}</CardDescription>
//                 )}
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-2">
//                   {subclass.description && (
//                     <p className="text-sm text-muted-foreground line-clamp-2">
//                       {subclass.description}
//                     </p>
//                   )}
//                   <div className="text-xs text-muted-foreground mt-2">
//                     Click <Info className="h-3 w-3 inline" /> for full subclass features
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// Single class subclass selector (used within MulticlassSubclassStep)
function SingleClassSubclassSelector({
  charClass,
  classData,
  campaignId,
  sourceVersion,
  infoSheet,
  onSubclassChange,
}: {
  charClass: CharacterClassForm;
  classData: DndClass | undefined;
  campaignId: string | null;
  sourceVersion: "2014" | "2024" | null;
  infoSheet: ReturnType<typeof useInfoSheet>;
  onSubclassChange: (subclassSource: "srd" | "homebrew" | null, subclassIndex: string | null) => void;
}) {
  const { subclasses, loading, error } = useSubclasses(
    charClass.classIndex,
    charClass.classSource,
    campaignId,
    sourceVersion
  );

  if (loading) {
    return (
      <div className="p-4 border rounded-md">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md bg-destructive/10">
        <p className="text-destructive text-sm">Error loading subclasses for {classData?.name}</p>
      </div>
    );
  }

  const selectedSubclass = subclasses.find(
    s => s.source === charClass.subclassSource && s.index === charClass.subclassIndex
  );

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{classData?.name || charClass.classIndex}</h4>
        {charClass.isPrimary && <Badge variant="outline">Primary</Badge>}
      </div>
      
      {subclasses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subclasses available for this class.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* None option */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-sm p-3 ${
              !charClass.subclassIndex ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onSubclassChange(null, null)}
          >
            <div className="text-sm font-medium">No Subclass</div>
            <div className="text-xs text-muted-foreground">Skip subclass selection</div>
          </Card>
          
          {subclasses.map((subclass) => (
            <Card
              key={`${subclass.source}-${subclass.index}`}
              className={`cursor-pointer transition-all hover:shadow-sm p-3 ${
                charClass.subclassSource === subclass.source && charClass.subclassIndex === subclass.index
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => onSubclassChange(subclass.source, subclass.index)}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{subclass.name}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    infoSheet.showSubclass(subclass, classData?.name);
                  }}
                >
                  <Info className="h-3 w-3" />
                </Button>
              </div>
              {subclass.subclass_flavor && (
                <div className="text-xs text-muted-foreground mt-1">{subclass.subclass_flavor}</div>
              )}
            </Card>
          ))}
        </div>
      )}
      
      {selectedSubclass && (
        <div className="text-sm text-primary">
          Selected: {selectedSubclass.name}
        </div>
      )}
    </div>
  );
}

// Multiclass subclass step - allows selecting subclass for each class
function MulticlassSubclassStep({
  formData,
  setFormData,
  classes,
  campaignId,
  sourceVersion,
  infoSheet,
  onSkip,
}: {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  classes: DndClass[];
  campaignId: string | null;
  sourceVersion: "2014" | "2024" | null;
  infoSheet: ReturnType<typeof useInfoSheet>;
  onSkip: () => void;
}) {
  if (formData.classes.length === 0) {
    return (
      <div className="p-4 border border-muted rounded-md">
        <p className="text-muted-foreground">Please select at least one class first.</p>
      </div>
    );
  }

  const handleSubclassChange = (classIndex: number, subclassSource: "srd" | "homebrew" | null, subclassIndex: string | null) => {
    const newClasses = [...formData.classes];
    newClasses[classIndex] = {
      ...newClasses[classIndex],
      subclassSource,
      subclassIndex,
    };
    
    // Also update legacy fields if this is the primary class
    const primaryIdx = newClasses.findIndex(c => c.isPrimary);
    const updatedFormData: CharacterFormData = {
      ...formData,
      classes: newClasses,
    };
    
    if (classIndex === primaryIdx || (primaryIdx === -1 && classIndex === 0)) {
      updatedFormData.subclassSource = subclassSource;
      updatedFormData.subclassIndex = subclassIndex;
    }
    
    setFormData(updatedFormData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select subclasses for your character. Subclasses are optional and provide additional features.
        </p>
        <Button variant="outline" onClick={onSkip}>
          Continue
        </Button>
      </div>

      <div className="space-y-4">
        {formData.classes.map((charClass, idx) => {
          const classData = classes.find(
            c => c.source === charClass.classSource && c.index === charClass.classIndex
          );
          
          return (
            <SingleClassSubclassSelector
              key={`${charClass.classSource}-${charClass.classIndex}`}
              charClass={charClass}
              classData={classData}
              campaignId={campaignId}
              sourceVersion={sourceVersion}
              infoSheet={infoSheet}
              onSubclassChange={(subSource, subIndex) => handleSubclassChange(idx, subSource, subIndex)}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ClassFeatureRow {
  index: string;
  name: string;
  level: number;
  description: string | null;
  subclass_index: string | null;
  feature_specific: any;
}

function isASIFeatureName(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("ability score improvement") ||
    n === "asi" ||
    n.includes("ability score increase")
  );
}

// Subclass unlock level per class index. Most classes unlock at level 3;
// spellcasters with signature subclass features unlock earlier.
const SUBCLASS_UNLOCK_LEVEL: Record<string, number> = {
  cleric: 1,
  sorcerer: 1,
  warlock: 1,
  druid: 2,
  wizard: 2,
};
function getSubclassUnlockLevel(classIndex?: string): number {
  if (!classIndex) return 3;
  return SUBCLASS_UNLOCK_LEVEL[classIndex.toLowerCase()] ?? 3;
}

function ClassFeaturesList({
  charClass,
  classData,
  classIdx,
  formData,
  setFormData,
  campaignId,
  sourceVersion,
  infoSheet,
  onSubclassChange,
}: {
  charClass: CharacterClassForm;
  classData: DndClass | undefined;
  classIdx: number;
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  campaignId: string | null;
  sourceVersion: "2014" | "2024" | null;
  infoSheet: ReturnType<typeof useInfoSheet>;
  onSubclassChange: (
    classIdx: number,
    subclassSource: "srd" | "homebrew" | null,
    subclassIndex: string | null
  ) => void;
}) {
  const [features, setFeatures] = useState<ClassFeatureRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classData?.index) {
      setFeatures([]);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("srd_features")
        .select("index, name, level, description, subclass_index, feature_specific")
        .eq("class_index", classData.index)
        .not("level", "is", null)
        .lte("level", charClass.level)
        .order("level", { ascending: true })
        .order("name", { ascending: true });
      if (mounted) {
        if (!error && data) {
          const filtered = (data as ClassFeatureRow[]).filter((f) => {
            if (!f.subclass_index) return true;
            return (
              !!charClass.subclassIndex &&
              f.subclass_index === charClass.subclassIndex
            );
          });
          setFeatures(filtered);
        } else {
          setFeatures([]);
        }
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [classData?.index, charClass.level, charClass.subclassIndex]);

  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Load subclasses for the inline subclass accordion
  const { subclasses: availableSubclasses } = useSubclasses(
    charClass.classIndex,
    charClass.classSource,
    campaignId,
    sourceVersion
  );

  // Skill proficiency choices from the class (only if this is primary class)
  const proficiencyChoices = (classData?.proficiency_choices || null) as any;
  const skillChoices = Array.isArray(proficiencyChoices)
    ? proficiencyChoices.find(
        (choice: any) =>
          choice.type === "skills" ||
          choice.from?.option_set_type === "options_array"
      )
    : null;
  const availableSkills: string[] = skillChoices?.from?.options
    ? skillChoices.from.options.map((opt: any) => {
        if (typeof opt === "string") return opt;
        if (opt.item?.name) return opt.item.name;
        if (opt.item?.index) {
          const skill = DND_SKILLS.find((s) => s.name === opt.item.index);
          return skill?.name || opt.item.index;
        }
        return opt.name || opt;
      })
    : [];
  const isPrimaryClass = !!charClass.isPrimary;

  const selectedSubclass = availableSubclasses.find(
    (s) =>
      s.source === charClass.subclassSource &&
      s.index === charClass.subclassIndex
  );

  const handleSkillToggle = (skillName: string) => {
    const current = formData.featureChoices.skillProficiencies;
    const maxChoices = skillChoices?.choose || 0;
    if (current.includes(skillName)) {
      setFormData({
        ...formData,
        featureChoices: {
          ...formData.featureChoices,
          skillProficiencies: current.filter((s) => s !== skillName),
        },
      });
    } else if (current.length < maxChoices) {
      setFormData({
        ...formData,
        featureChoices: {
          ...formData.featureChoices,
          skillProficiencies: [...current, skillName],
        },
      });
    }
  };

  const handleASIBonusClick = (level: number, ability: string, bonus: number) => {
    const levelASIs = formData.featureChoices.asiImprovements.filter(
      (asi) => asi.level === level
    );
    const existing = levelASIs.find((asi) => asi.ability === ability);
    const totalBonus = levelASIs.reduce((sum, asi) => sum + asi.bonus, 0);
    if (existing) {
      setFormData({
        ...formData,
        featureChoices: {
          ...formData.featureChoices,
          asiImprovements: formData.featureChoices.asiImprovements.filter(
            (asi) => !(asi.level === level && asi.ability === ability)
          ),
        },
      });
    } else if (totalBonus + bonus <= 2) {
      setFormData({
        ...formData,
        featureChoices: {
          ...formData.featureChoices,
          asiImprovements: [
            ...formData.featureChoices.asiImprovements,
            { level, ability, bonus },
          ],
        },
      });
    }
  };

  if (!classData) return null;

  const subclassUnlockLevel = getSubclassUnlockLevel(classData?.index);
  const subclassUnlocked = charClass.level >= subclassUnlockLevel;
  const subclassAccordion =
    availableSubclasses.length > 0 && subclassUnlocked ? (
      <details
        key="__subclass"
        className="sc-card"
        style={{ padding: 0, borderRadius: 6 }}
        open={!charClass.subclassIndex}
      >
        <summary
          style={{
            cursor: "pointer",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              className="font-serif"
              style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}
            >
              Subclass{selectedSubclass ? `: ${selectedSubclass.name}` : ""}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
                marginTop: 2,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>Choose a subclass for {classData.name}</span>
              {!charClass.subclassIndex && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span style={{ color: "var(--primary)" }}>Choice required</span>
                </>
              )}
            </div>
          </div>
          <ChevronRight
            size={16}
            className="sc-details-chev"
            style={{
              flexShrink: 0,
              color: "var(--muted-foreground)",
              transition: "transform 0.15s",
            }}
          />
        </summary>
        <div style={{ padding: "0 12px 12px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
            }}
          >
            <div
              className={`sc-card sc-card-hover ${
                !charClass.subclassIndex ? "sc-card-selected" : ""
              }`}
              onClick={() => onSubclassChange(classIdx, null, null)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                outline: !charClass.subclassIndex
                  ? "2px solid var(--primary)"
                  : "none",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600 }}>No Subclass</div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  marginTop: 2,
                }}
              >
                Skip subclass selection
              </div>
            </div>
            {availableSubclasses.map((sub) => {
              const active =
                charClass.subclassSource === sub.source &&
                charClass.subclassIndex === sub.index;
              return (
                <div
                  key={`${sub.source}-${sub.index}`}
                  className="sc-card sc-card-hover"
                  onClick={() =>
                    onSubclassChange(classIdx, sub.source, sub.index)
                  }
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    outline: active ? "2px solid var(--primary)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {sub.name}
                    </div>
                    <button
                      type="button"
                      className="sc-btn sc-btn-sm sc-btn-ghost"
                      style={{ padding: 2 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        infoSheet.showSubclass(sub, classData.name);
                      }}
                      title={`Info: ${sub.name}`}
                    >
                      <Info size={12} />
                    </button>
                  </div>
                  {sub.subclass_flavor && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        marginTop: 2,
                      }}
                    >
                      {sub.subclass_flavor}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </details>
    ) : null;

  const proficienciesAccordion =
    isPrimaryClass && skillChoices && availableSkills.length > 0 ? (() => {
      const selectedCount =
        formData.featureChoices.skillProficiencies.length;
      const maxCount = skillChoices.choose || 0;
      const needsChoice = selectedCount < maxCount;
      return (
        <details
          key="__proficiencies"
          className="sc-card"
          style={{ padding: 0, borderRadius: 6 }}
          open={needsChoice}
        >
          <summary
            style={{
              cursor: "pointer",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                className="font-serif"
                style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}
              >
                Skill Proficiencies
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  marginTop: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>
                  Choose {maxCount} · 1st level · {selectedCount}/{maxCount}{" "}
                  selected
                </span>
                {needsChoice && (
                  <>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span style={{ color: "var(--primary)" }}>
                      Choice required
                    </span>
                  </>
                )}
              </div>
            </div>
            <ChevronRight
              size={16}
              className="sc-details-chev"
              style={{
                flexShrink: 0,
                color: "var(--muted-foreground)",
                transition: "transform 0.15s",
              }}
            />
          </summary>
          <div style={{ padding: "0 12px 12px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 6,
              }}
            >
              {availableSkills.map((skillOption: string) => {
                const skill = DND_SKILLS.find(
                  (s) =>
                    s.name === skillOption.toLowerCase().replace(/\s+/g, "-") ||
                    s.name === skillOption
                );
                const skillName =
                  skill?.name ||
                  skillOption.toLowerCase().replace(/\s+/g, "-");
                const isSelected =
                  formData.featureChoices.skillProficiencies.includes(skillName);
                const maxReached = selectedCount >= maxCount;
                const displayName = skill?.name
                  ? skill.name
                      .split("-")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")
                  : skillOption;
                return (
                  <button
                    key={skillOption}
                    type="button"
                    className="sc-btn sc-btn-sm"
                    onClick={() => handleSkillToggle(skillName)}
                    disabled={!isSelected && maxReached}
                    style={{
                      justifyContent: "flex-start",
                      background: isSelected
                        ? "var(--primary)"
                        : "var(--secondary)",
                      color: isSelected
                        ? "var(--primary-foreground)"
                        : "var(--secondary-foreground)",
                      fontWeight: isSelected ? 600 : 500,
                      opacity: !isSelected && maxReached ? 0.45 : 1,
                    }}
                  >
                    {isSelected && <Check size={12} />}
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>
        </details>
      );
    })() : null;

  return (
    <div style={{ marginTop: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingBottom: 6,
          marginBottom: 8,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            fontWeight: 600,
            color: "var(--muted-foreground)",
          }}
        >
          {classData.name} Features
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--muted-foreground)",
            opacity: 0.7,
          }}
        >
          {loading
            ? "Loading…"
            : `${features.length} feature${features.length === 1 ? "" : "s"}`}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(() => {
          type Row =
            | { kind: "synthetic"; level: number; sort: number; key: string; node: React.ReactNode }
            | { kind: "feature"; level: number; sort: number; key: string; feature: ClassFeatureRow };
          const rows: Row[] = [];
          if (proficienciesAccordion) {
            rows.push({
              kind: "synthetic",
              level: 1,
              sort: 0.1,
              key: "__proficiencies",
              node: proficienciesAccordion,
            });
          }
          if (subclassAccordion) {
            rows.push({
              kind: "synthetic",
              level: subclassUnlockLevel,
              sort: subclassUnlockLevel + 0.5,
              key: "__subclass",
              node: subclassAccordion,
            });
          }
          features.forEach((feat) => {
            rows.push({
              kind: "feature",
              level: feat.level,
              sort: feat.level,
              key: feat.index,
              feature: feat,
            });
          });
          rows.sort((a, b) => a.sort - b.sort);

          if (rows.length === 0 && !loading) {
            return (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted-foreground)",
                  padding: "8px 10px",
                  background: "var(--muted)",
                  borderRadius: 6,
                }}
              >
                No features listed for {classData.name} up to level {charClass.level}.
              </div>
            );
          }

          return rows.map((row) => {
            if (row.kind === "synthetic") {
              return (
                <React.Fragment key={row.key}>{row.node}</React.Fragment>
              );
            }
            const f = row.feature;
            const isASI = isASIFeatureName(f.name);
            const hasChoices =
              isASI ||
              (f.feature_specific &&
                (f.feature_specific.choices ||
                  f.feature_specific.choice ||
                  f.feature_specific.options ||
                  f.feature_specific.from));

            let choiceComplete: boolean | null = null;
            if (isASI) {
              const totalForLevel = formData.featureChoices.asiImprovements
                .filter((asi) => asi.level === f.level)
                .reduce((sum, asi) => sum + asi.bonus, 0);
              choiceComplete = totalForLevel >= 2;
            }

            return (
              <details
                key={f.index}
                className="sc-card"
              style={{ padding: 0, borderRadius: 6 }}
              open={hasChoices && choiceComplete === false}
            >
              <summary
                style={{
                  cursor: "pointer",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    className="font-serif"
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {f.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      marginTop: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span>{ordinal(f.level)} level</span>
                    {hasChoices && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span
                          style={{
                            color:
                              choiceComplete === false
                                ? "var(--primary)"
                                : "var(--muted-foreground)",
                          }}
                        >
                          {choiceComplete === false
                            ? "Choice required"
                            : "Choices"}
                        </span>
                      </>
                    )}
                    {f.subclass_index && (
                      <>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>Subclass</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="sc-details-chev"
                  style={{
                    flexShrink: 0,
                    color: "var(--muted-foreground)",
                    transition: "transform 0.15s",
                  }}
                />
              </summary>
              <div style={{ padding: "0 12px 12px" }}>
                {f.description && (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "var(--foreground)",
                      whiteSpace: "pre-wrap",
                      opacity: 0.9,
                    }}
                  >
                    {f.description}
                  </div>
                )}
                {isASI && (() => {
                  const levelASIs = formData.featureChoices.asiImprovements.filter(
                    (asi) => asi.level === f.level
                  );
                  const totalBonus = levelASIs.reduce(
                    (sum, asi) => sum + asi.bonus,
                    0
                  );
                  const remaining = 2 - totalBonus;
                  return (
                    <div
                      style={{
                        marginTop: f.description ? 12 : 0,
                        padding: 10,
                        borderRadius: 6,
                        border: "1px solid var(--border)",
                        background: "var(--muted)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.05em",
                          color: "var(--muted-foreground)",
                          marginBottom: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>
                          Distribute +2 across ability scores
                        </span>
                        <span
                          style={{
                            color:
                              remaining === 0
                                ? "var(--muted-foreground)"
                                : "var(--primary)",
                            fontWeight: 600,
                          }}
                        >
                          {remaining}/2 remaining
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(96px, 1fr))",
                          gap: 6,
                        }}
                      >
                        {[
                          "strength",
                          "dexterity",
                          "constitution",
                          "intelligence",
                          "wisdom",
                          "charisma",
                        ].map((ability) => {
                          const abilityASI = levelASIs.find(
                            (asi) => asi.ability === ability
                          );
                          const currentBonus = abilityASI?.bonus || 0;
                          return (
                            <div key={ability}>
                              <div
                                style={{
                                  fontSize: 10,
                                  letterSpacing: "0.05em",
                                  color: "var(--muted-foreground)",
                                  textTransform: "uppercase",
                                  textAlign: "center",
                                  marginBottom: 3,
                                  fontWeight: 600,
                                }}
                              >
                                {ability.slice(0, 3)}
                              </div>
                              <div style={{ display: "flex", gap: 3 }}>
                                <button
                                  type="button"
                                  className="sc-btn sc-btn-sm"
                                  onClick={() =>
                                    handleASIBonusClick(f.level, ability, 1)
                                  }
                                  disabled={remaining < 1 && currentBonus < 1}
                                  style={{
                                    flex: 1,
                                    justifyContent: "center",
                                    padding: "3px 4px",
                                    fontSize: 11,
                                    background:
                                      currentBonus >= 1
                                        ? "var(--primary)"
                                        : "var(--secondary)",
                                    color:
                                      currentBonus >= 1
                                        ? "var(--primary-foreground)"
                                        : "var(--secondary-foreground)",
                                  }}
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  className="sc-btn sc-btn-sm"
                                  onClick={() =>
                                    handleASIBonusClick(f.level, ability, 2)
                                  }
                                  disabled={
                                    (remaining < 2 && currentBonus < 2) ||
                                    currentBonus >= 1
                                  }
                                  style={{
                                    flex: 1,
                                    justifyContent: "center",
                                    padding: "3px 4px",
                                    fontSize: 11,
                                    background:
                                      currentBonus >= 2
                                        ? "var(--primary)"
                                        : "var(--secondary)",
                                    color:
                                      currentBonus >= 2
                                        ? "var(--primary-foreground)"
                                        : "var(--secondary-foreground)",
                                  }}
                                >
                                  +2
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </details>
          );
          });
        })()}
      </div>
    </div>
  );
}

function FeatureChoicesStep({
  formData,
  setFormData,
  selectedClass,
  classes,
  campaignId,
  sourceVersion,
  infoSheet,
}: {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  selectedClass: DndClass | null | undefined;
  classes: DndClass[];
  campaignId: string | null;
  sourceVersion: "2014" | "2024" | null;
  infoSheet: ReturnType<typeof useInfoSheet>;
}) {
  if (!selectedClass) {
    return (
      <div className="p-4 border border-muted rounded-md">
        <p className="text-muted-foreground">Please select a class first.</p>
      </div>
    );
  }

  const isMulticlass = formData.classes.length > 1;

  const handleSubclassChange = (
    classIndex: number,
    subclassSource: "srd" | "homebrew" | null,
    subclassIndex: string | null
  ) => {
    const newClasses = [...formData.classes];
    newClasses[classIndex] = {
      ...newClasses[classIndex],
      subclassSource,
      subclassIndex,
    };
    const primaryIdx = newClasses.findIndex((c) => c.isPrimary);
    const updatedFormData: CharacterFormData = { ...formData, classes: newClasses };
    if (classIndex === primaryIdx || (primaryIdx === -1 && classIndex === 0)) {
      updatedFormData.subclassSource = subclassSource;
      updatedFormData.subclassIndex = subclassIndex;
    }
    setFormData(updatedFormData);
  };

  const updateClassLevel = (index: number, newLevel: number) => {
    if (newLevel < 1) return;
    const newClasses = [...formData.classes];
    newClasses[index] = { ...newClasses[index], level: newLevel };
    const newTotal = newClasses.reduce((sum, c) => sum + c.level, 0);
    if (newTotal > formData.level) {
      toast.error(
        `Total class levels cannot exceed character level ${formData.level}`
      );
      return;
    }
    setFormData({ ...formData, classes: newClasses });
  };

  const totalClassLevel = formData.classes.reduce((sum, c) => sum + c.level, 0);
  const levelsRemaining = formData.level - totalClassLevel;

  // Change character level — for single class, sync the primary class's level.
  // For multiclass, keep class distribution and adjust primary to absorb diff.
  const handleCharacterLevelChange = (newLevel: number) => {
    const clamped = Math.max(1, Math.min(20, newLevel));
    if (formData.classes.length === 0) {
      setFormData({ ...formData, level: clamped });
      return;
    }
    if (formData.classes.length === 1) {
      const updatedClasses = [{ ...formData.classes[0], level: clamped }];
      setFormData({ ...formData, level: clamped, classes: updatedClasses });
      return;
    }
    // Multiclass: keep non-primary levels, adjust primary.
    const nonPrimaryTotal = formData.classes
      .filter((c) => !c.isPrimary)
      .reduce((sum, c) => sum + c.level, 0);
    const newPrimaryLevel = Math.max(1, clamped - nonPrimaryTotal);
    const updatedClasses = formData.classes.map((c) =>
      c.isPrimary ? { ...c, level: newPrimaryLevel } : c
    );
    setFormData({ ...formData, level: clamped, classes: updatedClasses });
  };

  // HP / Hit Dice summary
  const hitDiceBreakdown: Record<string, number> = {};
  for (const charClass of formData.classes) {
    const cls = classes.find(
      (c) =>
        c.source === charClass.classSource && c.index === charClass.classIndex
    );
    const die = `d${cls?.hit_die || 8}`;
    hitDiceBreakdown[die] = (hitDiceBreakdown[die] || 0) + charClass.level;
  }
  const hitDiceStr =
    Object.entries(hitDiceBreakdown)
      .map(([die, count]) => `${count}${die}`)
      .join(" + ") || "—";
  const conMod = getAbilityModifier(formData.abilityScores.constitution || 10);
  const primaryHitDie =
    classes.find(
      (c) =>
        c.source === formData.classes.find((x) => x.isPrimary)?.classSource &&
        c.index === formData.classes.find((x) => x.isPrimary)?.classIndex
    )?.hit_die || 8;
  // Level 1: max of primary hit die + con. Subsequent levels: avg rounded up (hit_die/2 + 1) + con
  let maxHp = 0;
  if (formData.classes.length > 0) {
    maxHp = primaryHitDie + conMod;
    for (const charClass of formData.classes) {
      const cls = classes.find(
        (c) =>
          c.source === charClass.classSource &&
          c.index === charClass.classIndex
      );
      const die = cls?.hit_die || 8;
      let levelsFromThisClass = charClass.level;
      if (charClass.isPrimary) levelsFromThisClass -= 1;
      levelsFromThisClass = Math.max(0, levelsFromThisClass);
      const avg = Math.floor(die / 2) + 1;
      maxHp += levelsFromThisClass * (avg + conMod);
    }
    maxHp = Math.max(1, maxHp);
  }

  return (
    <div className="space-y-6">
      {/* Character Level & HP Header (DDB-style) */}
      <div
        className="sc-card"
        style={{
          padding: 14,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            className="sc-btn sc-btn-sm"
            onClick={() => handleCharacterLevelChange(formData.level - 1)}
            disabled={formData.level <= 1}
            aria-label="Decrease character level"
          >
            <Minus size={14} />
          </button>
          <div style={{ textAlign: "center", minWidth: 110 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--muted-foreground)",
              }}
            >
              Character Level
            </div>
            <div
              className="font-serif"
              style={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formData.level}
            </div>
          </div>
          <button
            type="button"
            className="sc-btn sc-btn-sm"
            onClick={() => handleCharacterLevelChange(formData.level + 1)}
            disabled={formData.level >= 20}
            aria-label="Increase character level"
          >
            <Plus size={14} />
          </button>
        </div>

        {formData.classes.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "8px 14px",
              borderRadius: 6,
              background: "var(--muted)",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                Max Hit Points
              </div>
              <div
                className="font-serif"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {maxHp}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                }}
              >
                Hit Dice
              </div>
              <div
                className="font-serif"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {hitDiceStr}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-class level breakdown (DDB-style: each class with its level) */}
      {formData.classes.length > 0 && (
        <div className="space-y-3">
          {formData.classes.map((charClass, idx) => {
            const cls = classes.find(
              (c) =>
                c.source === charClass.classSource &&
                c.index === charClass.classIndex
            );
            const { Icon: ClassIcon, hue } = cls
              ? getClassVisual(cls)
              : { Icon: Fighter, hue: 0 };
            return (
              <div key={`${charClass.classSource}-${charClass.classIndex}`}>
              <div
                className="sc-card"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    aria-hidden
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `hsl(${hue} 55% 50% / 0.18)`,
                      color: `hsl(${hue} 55% 65%)`,
                      border: `1px solid hsl(${hue} 55% 50% / 0.35)`,
                    }}
                  >
                    <ClassIcon size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="font-serif"
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        lineHeight: 1.1,
                      }}
                    >
                      {cls?.name || charClass.classIndex}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "var(--muted-foreground)",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {charClass.isPrimary ? (
                        <span
                          className="sc-badge"
                          style={{
                            fontSize: 9,
                            padding: "1px 5px",
                            letterSpacing: "0.05em",
                          }}
                        >
                          PRIMARY
                        </span>
                      ) : (
                        <span
                          className="sc-badge"
                          style={{
                            fontSize: 9,
                            padding: "1px 5px",
                            letterSpacing: "0.05em",
                          }}
                        >
                          MULTICLASS
                        </span>
                      )}
                      <span>Hit Die: d{cls?.hit_die || 8}</span>
                    </div>
                  </div>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    Level
                  </div>
                  <select
                    value={charClass.level}
                    onChange={(e) =>
                      updateClassLevel(idx, parseInt(e.target.value) || 1)
                    }
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--background)",
                      color: "var(--foreground)",
                      fontSize: 13,
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                      cursor: "pointer",
                    }}
                  >
                    {Array.from({ length: formData.level }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      )
                    )}
                  </select>
                  {isMulticlass && !charClass.isPrimary && (
                    <button
                      type="button"
                      className="sc-btn sc-btn-sm sc-btn-ghost"
                      onClick={() => {
                        const newClasses = formData.classes.filter(
                          (c) =>
                            !(
                              c.classSource === charClass.classSource &&
                              c.classIndex === charClass.classIndex
                            )
                        );
                        setFormData({
                          ...formData,
                          classes: newClasses,
                          classSource: newClasses[0]?.classSource || null,
                          classIndex: newClasses[0]?.classIndex || null,
                        });
                      }}
                      title="Remove multiclass"
                      style={{ color: "var(--destructive)" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <ClassFeaturesList
                charClass={charClass}
                classData={cls}
                classIdx={idx}
                formData={formData}
                setFormData={setFormData}
                campaignId={campaignId}
                sourceVersion={sourceVersion}
                infoSheet={infoSheet}
                onSubclassChange={handleSubclassChange}
              />
              </div>
            );
          })}
          {levelsRemaining !== 0 && isMulticlass && (
            <div
              style={{
                fontSize: 11,
                padding: "6px 10px",
                borderRadius: 6,
                background:
                  levelsRemaining < 0
                    ? "color-mix(in srgb, var(--destructive) 12%, transparent)"
                    : "color-mix(in srgb, var(--primary) 10%, transparent)",
                color:
                  levelsRemaining < 0
                    ? "var(--destructive)"
                    : "var(--muted-foreground)",
              }}
            >
              {levelsRemaining < 0
                ? `Class levels exceed character level by ${Math.abs(levelsRemaining)}. Reduce a class's level.`
                : `${levelsRemaining} character level(s) unassigned. Assign them to a class.`}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

function AbilityScoresStep({
  formData,
  setFormData,
  selectedRace,
  getFinalAbilityScore,
}: {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  selectedRace: Race | null | undefined;
  getFinalAbilityScore: (ability: keyof typeof formData.abilityScores) => number;
}) {
  const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
  const [standardArrayAssignments, setStandardArrayAssignments] = useState<Map<string, number>>(new Map());

  const handleMethodChange = (method: AbilityScoreMethod) => {
    if (method === "standard-array") {
      // Don't auto-assign, let user choose
      setFormData({
        ...formData,
        abilityScoreMethod: method,
        abilityScores: {
          strength: 8,
          dexterity: 8,
          constitution: 8,
          intelligence: 8,
          wisdom: 8,
          charisma: 8,
        },
      });
      setStandardArrayAssignments(new Map());
    } else if (method === "manual") {
      // Roll ability scores
      setFormData({
        ...formData,
        abilityScoreMethod: method,
        abilityScores: {
          strength: rollAbilityScore(),
          dexterity: rollAbilityScore(),
          constitution: rollAbilityScore(),
          intelligence: rollAbilityScore(),
          wisdom: rollAbilityScore(),
          charisma: rollAbilityScore(),
        },
      });
    } else {
      // Point buy - reset to 8s
      setFormData({
        ...formData,
        abilityScoreMethod: method,
        abilityScores: {
          strength: 8,
          dexterity: 8,
          constitution: 8,
          intelligence: 8,
          wisdom: 8,
          charisma: 8,
        },
      });
    }
  };

  const calculatePointBuyTotal = () => {
    return abilities.reduce((total, ability) => {
      const score = formData.abilityScores[ability];
      return total + (POINT_BUY_COSTS[score] || 0);
    }, 0);
  };

  const pointBuyTotal = calculatePointBuyTotal();
  const pointBuyRemaining = POINT_BUY_TOTAL - pointBuyTotal;

  const adjustScore = (ability: typeof abilities[number], delta: number) => {
    if (formData.abilityScoreMethod !== "point-buy") return;

    const current = formData.abilityScores[ability];
    const newScore = current + delta;

    if (newScore < POINT_BUY_MIN || newScore > POINT_BUY_MAX) return;
    
    // Calculate the cost difference for this change
    const currentCost = POINT_BUY_COSTS[current] || 0;
    const newCost = POINT_BUY_COSTS[newScore] || 0;
    const costDifference = newCost - currentCost;
    
    // For increments, check if we have enough remaining points
    if (delta > 0 && pointBuyRemaining < costDifference) {
      return;
    }

    setFormData({
      ...formData,
      abilityScores: {
        ...formData.abilityScores,
        [ability]: newScore,
      },
    });
  };

  const handleStandardArraySelect = (ability: typeof abilities[number], value: string) => {
    const numValue = parseInt(value);
    if (isNaN(numValue)) return;

    const newAssignments = new Map(standardArrayAssignments);
    const oldValue = newAssignments.get(ability);
    
    // Remove old assignment if exists
    if (oldValue !== undefined) {
      newAssignments.delete(ability);
    }
    
    // Check if value is already assigned to another ability
    const alreadyAssigned = Array.from(newAssignments.values()).includes(numValue);
    if (alreadyAssigned && oldValue !== numValue) {
      // Find and remove the conflicting assignment
      for (const [key, val] of newAssignments.entries()) {
        if (val === numValue) {
          newAssignments.delete(key);
          break;
        }
      }
    }
    
    // Add new assignment
    newAssignments.set(ability, numValue);
    setStandardArrayAssignments(newAssignments);
    
    // Update form data
    setFormData({
      ...formData,
      abilityScores: {
        ...formData.abilityScores,
        [ability]: numValue,
      },
    });
  };

  const handleReroll = () => {
    if (formData.abilityScoreMethod !== "manual") return;
    setFormData({
      ...formData,
      abilityScores: {
        strength: rollAbilityScore(),
        dexterity: rollAbilityScore(),
        constitution: rollAbilityScore(),
        intelligence: rollAbilityScore(),
        wisdom: rollAbilityScore(),
        charisma: rollAbilityScore(),
      },
    });
  };

  const methodOptions: Array<{ value: AbilityScoreMethod; label: string; sub: string }> = [
    { value: "point-buy", label: "Point Buy", sub: "27 points" },
    { value: "standard-array", label: "Standard Array", sub: STANDARD_ARRAY.join(", ") },
    { value: "manual", label: "Roll 4d6", sub: "drop lowest" },
  ];

  const abilityIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    strength: Strength,
    dexterity: Dexterity,
    constitution: Constitution,
    intelligence: Intelligence,
    wisdom: Wisdom,
    charisma: Charisma,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Method picker - three compact pill buttons */}
      <div>
        <div
          className="sc-label"
          style={{ fontSize: 10, marginBottom: 6, textTransform: "uppercase" }}
        >
          Generation Method
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {methodOptions.map((opt) => {
            const active = formData.abilityScoreMethod === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleMethodChange(opt.value)}
                className="sc-card sc-card-hover"
                style={{
                  flex: "1 1 140px",
                  padding: "8px 10px",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  borderColor: active ? "var(--primary)" : undefined,
                  background: active
                    ? "color-mix(in srgb, var(--primary) 10%, transparent)"
                    : undefined,
                  boxShadow: active ? "0 0 0 1px var(--primary) inset" : undefined,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.label}</span>
                <span style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
                  {opt.sub}
                </span>
              </button>
            );
          })}
        </div>

        {formData.abilityScoreMethod === "point-buy" && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--muted-foreground)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Points remaining:{" "}
            <strong
              style={{
                color:
                  pointBuyRemaining === 0
                    ? "var(--primary)"
                    : pointBuyRemaining < 0
                      ? "var(--destructive)"
                      : undefined,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {pointBuyRemaining}
            </strong>{" "}
            / {POINT_BUY_TOTAL}
          </div>
        )}
        {formData.abilityScoreMethod === "manual" && (
          <button
            type="button"
            className="sc-btn sc-btn-sm"
            style={{ marginTop: 8 }}
            onClick={handleReroll}
          >
            Reroll All
          </button>
        )}
      </div>

      {/* Compact ability tiles - all six side-by-side in a single row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 6,
        }}
      >
        {abilities.map((ability) => {
          const baseScore = formData.abilityScores[ability];
          const finalScore = getFinalAbilityScore(ability);
          const modifier = getAbilityModifierString(finalScore);
          const hasRacialBonus = selectedRace && baseScore !== finalScore;
          const AbilityIcon = abilityIcons[ability];

          return (
            <div
              key={ability}
              className="sc-card"
              style={{
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    minWidth: 0,
                  }}
                >
                  {AbilityIcon && <AbilityIcon size={14} />}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--muted-foreground)",
                    }}
                  >
                    {ability.slice(0, 3)}
                  </span>
                </div>
                {formData.abilityScoreMethod === "point-buy" && (
                  <div style={{ display: "flex", gap: 2 }}>
                    <button
                      type="button"
                      className="sc-btn sc-btn-ghost"
                      style={{ padding: 0, height: 18, width: 18, fontSize: 12 }}
                      onClick={() => adjustScore(ability, -1)}
                      disabled={baseScore <= POINT_BUY_MIN}
                      aria-label={`Decrease ${ability}`}
                    >
                      <Minus size={11} />
                    </button>
                    <button
                      type="button"
                      className="sc-btn sc-btn-ghost"
                      style={{ padding: 0, height: 18, width: 18, fontSize: 12 }}
                      onClick={() => adjustScore(ability, 1)}
                      disabled={
                        baseScore >= POINT_BUY_MAX || pointBuyRemaining <= 0
                      }
                      aria-label={`Increase ${ability}`}
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                )}
              </div>

              {formData.abilityScoreMethod === "standard-array" && (
                <Select
                  value={baseScore.toString()}
                  onValueChange={(value) => handleStandardArraySelect(ability, value)}
                >
                  <SelectTrigger
                    style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                  >
                    <SelectValue placeholder="Value" />
                  </SelectTrigger>
                  <SelectContent>
                    {STANDARD_ARRAY.map((val) => {
                      const isUsed =
                        Array.from(standardArrayAssignments.values()).includes(val) &&
                        standardArrayAssignments.get(ability) !== val;
                      return (
                        <SelectItem
                          key={val}
                          value={val.toString()}
                          disabled={isUsed}
                        >
                          {val} {isUsed && "(used)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 6,
                }}
              >
                <span
                  className="font-serif"
                  style={{
                    fontSize: 22,
                    fontWeight: 600,
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {finalScore}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--primary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {modifier}
                </span>
              </div>
              {hasRacialBonus && (
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--muted-foreground)",
                    marginTop: -2,
                  }}
                  title={`Base ${baseScore} + ${finalScore - baseScore} racial`}
                >
                  {baseScore} + {finalScore - baseScore}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// "Home" step — DDB's character builder Home tab: campaign type, campaign
// selection, character name, and starting level in one consolidated screen.
function HomeStep({
  formData,
  setFormData,
  campaigns,
  races,
}: {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  campaigns:
    | ReturnType<typeof useCampaigns>["campaigns"]
    | null
    | undefined;
  races: Race[];
}) {
  return (
    <div className="space-y-5">
      {/* Character Name */}
      <div>
        <Label htmlFor="home-name" className="flex items-center gap-2">
          <CharacterIcon size={18} />
          Character Name
        </Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="home-name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Enter character name"
            className="flex-1"
          />
          <NameGeneratorButton
            category="character"
            onGenerate={(generatedName) =>
              setFormData({ ...formData, name: generatedName })
            }
            race={
              formData.raceSource && formData.raceIndex
                ? races.find(
                    (r) =>
                      r.source === formData.raceSource &&
                      r.index === formData.raceIndex
                  )?.name
                : undefined
            }
          />
        </div>
      </div>

      {/* Campaign Type */}
      <div>
        <Label className="flex items-center gap-2">
          <Campaign size={18} />
          Character Type
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Is this character part of an existing campaign, or a standalone hero?
        </p>
        <div className="space-y-3 mt-3">
          <Card
            className={`cursor-pointer transition-all ${
              formData.characterType === "standalone"
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() =>
              setFormData({
                ...formData,
                characterType: "standalone",
                campaignId: null,
              })
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Person size={24} />
                <div>
                  <h3 className="font-semibold">Standalone Character</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a character not tied to any campaign
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all ${
              formData.characterType === "campaign"
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() =>
              setFormData({ ...formData, characterType: "campaign" })
            }
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Campaign size={24} />
                <div>
                  <h3 className="font-semibold">Campaign Character</h3>
                  <p className="text-sm text-muted-foreground">
                    Create a character for a specific campaign
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {formData.characterType === "campaign" && (
          <div className="mt-4 space-y-2">
            <Label>Select Campaign</Label>
            <Select
              value={formData.campaignId || ""}
              onValueChange={(value) =>
                setFormData({ ...formData, campaignId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns?.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Character Portrait */}
      <div>
        <Label className="flex items-center gap-2">
          <Person size={18} />
          Character Portrait (Optional)
        </Label>
        <CharacterImageUpload
          imageUrl={formData.imageUrl}
          onImageChange={(url: string | null) =>
            setFormData({ ...formData, imageUrl: url })
          }
        />
      </div>
    </div>
  );
}

function BackgroundStep({
  formData,
  setFormData,
  backgrounds,
  backgroundsLoading,
  section = "background",
}: {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  backgrounds: Array<{ id: string; index: string; name: string; description: string | null; skill_proficiencies: string | null; tool_proficiencies: string | null; languages: string | null; equipment: string | null; feature: string | null; ability_score_increase: string | null; created_at: string }>;
  backgroundsLoading: boolean;
  section?: "background" | "description";
}) {
  const selectedBackground = backgrounds.find(bg => bg.name === formData.background || bg.index === formData.background.toLowerCase().replace(/\s+/g, '-'));
  const isCustomBackground = formData.background === "custom";
  
  // Parse language and tool requirements
  const languageReqs = isCustomBackground 
    ? { count: 2, fixed: [] } // Custom background gets 2 language choices
    : parseBackgroundLanguages(selectedBackground?.languages || null);
  
  const toolReqs = isCustomBackground
    ? { gamingSet: false, artisanTools: false, musicalInstrument: false, fixed: [] }
    : parseBackgroundTools(selectedBackground?.tool_proficiencies || null);
  
  // Handle language selection
  const handleLanguageChange = (index: number, value: string) => {
    const newLanguages = [...formData.backgroundChoices.languages];
    newLanguages[index] = value;
    setFormData({
      ...formData,
      backgroundChoices: {
        ...formData.backgroundChoices,
        languages: newLanguages,
      },
    });
  };
  
  // Handle tool selection
  const handleToolChange = (toolType: string, value: string) => {
    const newTools = formData.backgroundChoices.tools.filter(t => {
      // Remove existing tool of same type
      if (toolType === 'gaming' && GAMING_SETS.includes(t)) return false;
      if (toolType === 'artisan' && ARTISAN_TOOLS.includes(t)) return false;
      if (toolType === 'musical' && MUSICAL_INSTRUMENTS.includes(t)) return false;
      if (toolType === 'custom' && t === formData.backgroundChoices.tools.find(x => !GAMING_SETS.includes(x) && !ARTISAN_TOOLS.includes(x) && !MUSICAL_INSTRUMENTS.includes(x))) return false;
      return true;
    });
    if (value) {
      newTools.push(value);
    }
    setFormData({
      ...formData,
      backgroundChoices: {
        ...formData.backgroundChoices,
        tools: newTools,
      },
    });
  };
  
  // Get currently selected tool of a type
  const getSelectedTool = (toolType: 'gaming' | 'artisan' | 'musical'): string => {
    const toolList = toolType === 'gaming' ? GAMING_SETS : toolType === 'artisan' ? ARTISAN_TOOLS : MUSICAL_INSTRUMENTS;
    return formData.backgroundChoices.tools.find(t => toolList.includes(t)) || '';
  };

  // Reset choices when background changes
  const handleBackgroundChange = (value: string) => {
    setFormData({
      ...formData,
      background: value,
      backgroundChoices: {
        languages: [],
        tools: [],
      },
    });
  };

  return (
    <div className="space-y-4">
      {section === "background" && (
      <>
      <div>
        <Label htmlFor="background" className="flex items-center gap-2">
          <Book size={18} />
          Background
        </Label>
        <Select
          value={formData.background}
          onValueChange={handleBackgroundChange}
          disabled={backgroundsLoading}
        >
          <SelectTrigger className="w-full mt-2">
            <SelectValue placeholder={backgroundsLoading ? "Loading backgrounds..." : "Select a background"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom Background</SelectItem>
            {backgrounds.map((bg) => (
              <SelectItem key={bg.index} value={bg.name}>
                {bg.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBackground && (
          <div className="mt-2 p-3 bg-muted/50 rounded-md text-xs space-y-1">
            {selectedBackground.skill_proficiencies && (
              <div><strong>Skills:</strong> {selectedBackground.skill_proficiencies}</div>
            )}
            {selectedBackground.tool_proficiencies && (
              <div><strong>Tools:</strong> {selectedBackground.tool_proficiencies}</div>
            )}
            {selectedBackground.languages && (
              <div><strong>Languages:</strong> {selectedBackground.languages}</div>
            )}
            {selectedBackground.feature && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <strong>Feature:</strong> {selectedBackground.feature}
              </div>
            )}
          </div>
        )}
        {isCustomBackground && (
          <div className="mt-2 p-3 bg-muted/50 rounded-md text-xs">
            <p className="text-muted-foreground">
              Custom background allows you to choose any 2 skill proficiencies, 2 languages, and create your own feature.
            </p>
          </div>
        )}
      </div>

      {/* Language Selection */}
      {(languageReqs.count > 0 || isCustomBackground) && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Book size={18} />
            Choose Languages ({isCustomBackground ? "2 of your choice" : `${languageReqs.count} of your choice`})
          </Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Array.from({ length: isCustomBackground ? 2 : languageReqs.count }).map((_, index) => (
              <Select
                key={index}
                value={formData.backgroundChoices.languages[index] || ''}
                onValueChange={(value) => handleLanguageChange(index, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select language ${index + 1}`} />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES
                    .filter(lang => !formData.backgroundChoices.languages.includes(lang) || formData.backgroundChoices.languages[index] === lang)
                    .map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ))}
          </div>
        </div>
      )}

      {/* Tool Selection - Gaming Set */}
      {(toolReqs.gamingSet || isCustomBackground) && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Weapon size={18} />
            {isCustomBackground ? "Gaming Set (Optional)" : "Choose a Gaming Set"}
          </Label>
          <Select
            value={getSelectedTool('gaming')}
            onValueChange={(value) => handleToolChange('gaming', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a gaming set" />
            </SelectTrigger>
            <SelectContent>
              {isCustomBackground && <SelectItem value="">None</SelectItem>}
              {GAMING_SETS.map((tool) => (
                <SelectItem key={tool} value={tool}>
                  {tool}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tool Selection - Artisan's Tools */}
      {(toolReqs.artisanTools || isCustomBackground) && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Weapon size={18} />
            {isCustomBackground ? "Artisan's Tools (Optional)" : "Choose Artisan's Tools"}
          </Label>
          <Select
            value={getSelectedTool('artisan')}
            onValueChange={(value) => handleToolChange('artisan', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select artisan's tools" />
            </SelectTrigger>
            <SelectContent>
              {isCustomBackground && <SelectItem value="">None</SelectItem>}
              {ARTISAN_TOOLS.map((tool) => (
                <SelectItem key={tool} value={tool}>
                  {tool}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tool Selection - Musical Instrument */}
      {(toolReqs.musicalInstrument || isCustomBackground) && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Weapon size={18} />
            {isCustomBackground ? "Musical Instrument (Optional)" : "Choose a Musical Instrument"}
          </Label>
          <Select
            value={getSelectedTool('musical')}
            onValueChange={(value) => handleToolChange('musical', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a musical instrument" />
            </SelectTrigger>
            <SelectContent>
              {isCustomBackground && <SelectItem value="">None</SelectItem>}
              {MUSICAL_INSTRUMENTS.map((tool) => (
                <SelectItem key={tool} value={tool}>
                  {tool}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Show fixed tool proficiencies */}
      {toolReqs.fixed.length > 0 && (
        <div className="p-3 bg-muted/30 rounded-md">
          <Label className="text-sm font-medium">Fixed Tool Proficiencies:</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {toolReqs.fixed.map((tool, i) => (
              <Badge key={i} variant="secondary">{tool}</Badge>
            ))}
          </div>
        </div>
      )}

      </>
      )}

      {section === "description" && (
      <>
      {/* Alignment — 3x3 grid picker */}
      <div>
        <Label className="flex items-center gap-2">
          <Book size={18} />
          Alignment
        </Label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 6,
            marginTop: 8,
          }}
        >
          {ALIGNMENT_GRID.map((a) => {
            const isActive = formData.alignment === a.value;
            return (
              <button
                key={a.value}
                type="button"
                className="sc-card sc-card-hover"
                onClick={() =>
                  setFormData({ ...formData, alignment: a.value })
                }
                style={{
                  padding: "10px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                  background: isActive
                    ? "color-mix(in srgb, var(--primary) 14%, var(--card))"
                    : "var(--card)",
                  borderColor: isActive
                    ? "var(--primary)"
                    : "var(--border)",
                  transition: "all 0.15s",
                }}
              >
                <div
                  className="font-serif"
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: isActive ? "var(--primary)" : "var(--foreground)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {a.abbr}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted-foreground)",
                    marginTop: 2,
                    letterSpacing: "0.04em",
                  }}
                >
                  {a.value}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--muted-foreground)",
                    marginTop: 4,
                    fontStyle: "italic",
                    lineHeight: 1.3,
                  }}
                >
                  {a.blurb}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------- Description & Physical Details -------------- */}
      <DescriptionSection formData={formData} setFormData={setFormData} />
      </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Description section — personality, ideals, bonds, flaws, physical details,
// appearance and backstory. Backed by formData.description.
// ---------------------------------------------------------------------------

const PERSONALITY_SUGGESTIONS = [
  "I idolize a particular hero of my faith and constantly refer to that person's deeds and example.",
  "I've been isolated for so long that I rarely speak, preferring gestures and the occasional grunt.",
  "I am tolerant (or intolerant) of other faiths and respect (or condemn) the worship of other gods.",
  "I've enjoyed fine food, drink, and high society among my temple's elite. Rough living grates on me.",
  "I've spent so long in the temple that I have little practical experience dealing with people in the outside world.",
  "I quote (or misquote) sacred texts and proverbs in almost every situation.",
  "I am heedless of my personal safety in combat when acting on my faith.",
  "I am inflexible in my thinking and prone to lecturing.",
];
const IDEAL_SUGGESTIONS = [
  "Tradition. The ancient traditions of worship and sacrifice must be preserved and upheld. (Lawful)",
  "Charity. I always try to help those in need, no matter the personal cost. (Good)",
  "Change. We must help bring about the changes the gods are constantly working in the world. (Chaotic)",
  "Power. I hope to one day rise to the top of my faith's religious hierarchy. (Lawful)",
  "Faith. I trust that my deity will guide my actions. I have faith that if I work hard, things will go well. (Lawful)",
  "Aspiration. I seek to prove myself worthy of my god's favor by matching my actions against their teachings. (Any)",
];
const BOND_SUGGESTIONS = [
  "I would die to recover an ancient relic of my faith that was lost long ago.",
  "I will someday get revenge on the corrupt temple hierarchy who branded me a heretic.",
  "I owe my life to the priest who took me in when my parents died.",
  "Everything I do is for the common people.",
  "I will do anything to protect the temple where I served.",
  "I seek to preserve a sacred text that my enemies consider heretical and seek to destroy.",
];
const FLAW_SUGGESTIONS = [
  "I judge others harshly, and myself even more severely.",
  "I put too much trust in those who wield power within my temple's hierarchy.",
  "My piety sometimes leads me to blindly trust those that profess faith in my god.",
  "I am inflexible in my thinking.",
  "I am suspicious of strangers and expect the worst of them.",
  "Once I pick a goal, I become obsessed with it to the detriment of everything else in my life.",
];

function pickRandom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

function DescriptionSection({
  formData,
  setFormData,
}: {
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
}) {
  const desc = formData.description;
  const update = (patch: Partial<CharacterFormData["description"]>) => {
    setFormData({
      ...formData,
      description: { ...formData.description, ...patch },
    });
  };

  const addSuggestion = (
    key: keyof CharacterFormData["description"],
    list: string[],
  ) => {
    const current = desc[key] as string;
    const next = pickRandom(list);
    update({ [key]: current ? `${current}\n${next}` : next } as Partial<
      CharacterFormData["description"]
    >);
  };

  const textareaStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 72,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
    fontSize: 12.5,
    lineHeight: 1.5,
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
  };

  const fieldInputStyle: React.CSSProperties = {
    width: "100%",
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
    fontSize: 12.5,
    fontFamily: "inherit",
    outline: "none",
  };

  const traitBlock = (
    key: keyof CharacterFormData["description"],
    title: string,
    placeholder: string,
    suggestions: string[],
  ) => (
    <div
      className="sc-card"
      style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div className="sc-label">{title}</div>
        <button
          type="button"
          className="sc-btn sc-btn-sm sc-btn-ghost"
          onClick={() => addSuggestion(key, suggestions)}
          title="Add a suggested entry"
        >
          <Plus size={11} />
          Suggest
        </button>
      </div>
      <textarea
        value={desc[key] as string}
        onChange={(e) =>
          update({ [key]: e.target.value } as Partial<
            CharacterFormData["description"]
          >)
        }
        placeholder={placeholder}
        style={textareaStyle}
      />
      <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>
        One entry per line · tone-setters, not scripts
      </div>
    </div>
  );

  const detailField = (
    key: keyof CharacterFormData["description"],
    label: string,
    placeholder?: string,
  ) => (
    <div>
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <input
        type="text"
        value={desc[key] as string}
        onChange={(e) =>
          update({ [key]: e.target.value } as Partial<
            CharacterFormData["description"]
          >)
        }
        placeholder={placeholder}
        style={fieldInputStyle}
      />
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingTop: 14,
        marginTop: 4,
        borderTop: "1px solid var(--border)",
      }}
    >
      <div>
        <div
          className="font-serif"
          style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}
        >
          Character description
        </div>
        <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
          Flesh out who your character is beyond the numbers — traits, physical
          details, and the story that brought them here.
        </div>
      </div>

      {/* Personality / Ideals / Bonds / Flaws */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        {traitBlock(
          "personalityTraits",
          "Personality traits",
          "What small quirks or mannerisms define this character?",
          PERSONALITY_SUGGESTIONS,
        )}
        {traitBlock(
          "ideals",
          "Ideals",
          "The principles this character will not compromise on.",
          IDEAL_SUGGESTIONS,
        )}
        {traitBlock(
          "bonds",
          "Bonds",
          "Ties to people, places, or objects that drive them.",
          BOND_SUGGESTIONS,
        )}
        {traitBlock(
          "flaws",
          "Flaws",
          "Vices, fears, or failings that get in their way.",
          FLAW_SUGGESTIONS,
        )}
      </div>

      {/* Physical details */}
      <div
        className="sc-card"
        style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}
      >
        <div className="sc-label">Physical description</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {detailField("age", "Age", "e.g. 27")}
          {detailField("gender", "Gender", "e.g. Woman")}
          {detailField("pronouns", "Pronouns", "e.g. she/her")}
          {detailField("height", "Height", `e.g. 5'10"`)}
          {detailField("weight", "Weight", "e.g. 160 lb")}
          {detailField("eyes", "Eyes", "e.g. Grey")}
          {detailField("hair", "Hair", "e.g. Auburn")}
          {detailField("skin", "Skin", "e.g. Olive")}
          {detailField("faith", "Faith / Deity", "e.g. Moradin")}
        </div>
      </div>

      {/* Appearance */}
      <div
        className="sc-card"
        style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}
      >
        <div className="sc-label">Appearance</div>
        <textarea
          value={desc.appearance}
          onChange={(e) => update({ appearance: e.target.value })}
          placeholder="Scars, tattoos, clothing, posture — how others see them at a glance."
          style={{ ...textareaStyle, minHeight: 90 }}
        />
      </div>

      {/* Backstory */}
      <div
        className="sc-card"
        style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}
      >
        <div className="sc-label">Backstory</div>
        <textarea
          value={desc.backstory}
          onChange={(e) => update({ backstory: e.target.value })}
          placeholder="Where did they come from? Who shaped them? What's unfinished?"
          style={{ ...textareaStyle, minHeight: 140 }}
        />
      </div>
    </div>
  );
}

// Character Image Upload Component
function CharacterImageUpload({
  imageUrl,
  onImageChange,
}: {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get file extension
      const fileExt = file.name.split(".").pop();
      const fileName = `temp_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Delete old image if it exists
      if (imageUrl) {
        try {
          const urlParts = imageUrl.split("/character-portraits/");
          if (urlParts.length > 1) {
            const oldFileName = urlParts[1].split("?")[0];
            await supabase.storage.from("character-portraits").remove([oldFileName]);
          }
        } catch (err) {
          console.warn("Failed to delete old image:", err);
        }
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from("character-portraits")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("character-portraits")
        .getPublicUrl(filePath);

      // Update form data with new image URL
      onImageChange(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      const supabase = createClient();
      
      // Extract filename from URL
      const urlParts = imageUrl.split("/character-portraits/");
      if (urlParts.length > 1) {
        const fileName = urlParts[1].split("?")[0];
        
        // Try to delete from storage (ignore errors for temp files)
        try {
          await supabase.storage.from("character-portraits").remove([fileName]);
        } catch (err) {
          console.warn("Failed to delete file from storage:", err);
        }
      }

      // Update form data
      onImageChange(null);
      toast.success("Image removed");
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error(error.message || "Failed to remove image");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="mt-2 space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="relative group">
        <div 
          className="relative h-32 w-32 rounded-lg overflow-hidden border-2 border-border bg-muted cursor-pointer"
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Character portrait"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-2xl font-bold text-primary/60">
                {getInitials("Character")}
              </span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}

          {/* Hover overlay */}
          {!uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <Upload className="h-6 w-6 text-white" />
              <div className="text-center space-y-0.5 px-2">
                <p className="text-xs font-medium text-white">
                  Click to {imageUrl ? "change" : "upload"}
                </p>
                <p className="text-[10px] text-white/80">
                  PNG, JPG, WEBP up to 5MB
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {imageUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemoveImage}
          disabled={uploading}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Remove Image
        </Button>
      )}
    </div>
  );
}

function EquipmentStep({
  selectedClass,
  formData,
  setFormData,
  equipment,
  loading,
  // campaignId,
}: {
  selectedClass: DndClass | null | undefined;
  formData: CharacterFormData;
  setFormData: (data: CharacterFormData) => void;
  equipment: Equipment[];
  loading: boolean;
  // campaignId: string | null;
}) {
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(
    new Map(formData.selectedEquipment.map(item => [`${item.itemSource}-${item.itemIndex}`, item.quantity]))
  );

  useEffect(() => {
    // Initialize with class starting equipment if available and no equipment selected yet
    if (selectedClass?.starting_equipment && formData.selectedEquipment.length === 0) {
      const startingEq = selectedClass.starting_equipment as any;
      const initialItems = new Map<string, number>();

      // Handle automatic starting equipment
      // Structure can be: { starting_equipment: [...] } or just an array
      const autoItems = startingEq.starting_equipment || startingEq;
      if (Array.isArray(autoItems)) {
        autoItems.forEach((item: any) => {
          // Handle different structures: { equipment: { index: "..." }, quantity: 1 } or { index: "...", quantity: 1 }
          const eqData = item.equipment || item;
          const itemIndex = eqData.index || eqData.name?.toLowerCase().replace(/\s+/g, '-');
          if (itemIndex) {
            const key = `srd-${itemIndex}`;
            initialItems.set(key, item.quantity || eqData.quantity || 1);
          }
        });
      }

      if (initialItems.size > 0) {
        setSelectedItems(initialItems);
        setFormData({
          ...formData,
          selectedEquipment: Array.from(initialItems.entries()).map(([key, quantity]) => {
            const [source, ...indexParts] = key.split('-');
            const index = indexParts.join('-');
            return {
              itemIndex: index,
              itemSource: source as "srd" | "homebrew",
              quantity,
            };
          }),
        });
      }
    }
  }, [selectedClass?.starting_equipment]);

  const handleItemToggle = (itemIndex: string, itemSource: "srd" | "homebrew", quantity: number = 1) => {
    const key = `${itemSource}-${itemIndex}`;
    const newSelected = new Map(selectedItems);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.set(key, quantity);
    }

    setSelectedItems(newSelected);
    setFormData({
      ...formData,
      selectedEquipment: Array.from(newSelected.entries()).map(([k, qty]) => {
        const [src, ...idxParts] = k.split('-');
        const idx = idxParts.join('-');
        return {
          itemIndex: idx,
          itemSource: src as "srd" | "homebrew",
          quantity: qty,
        };
      }),
    });
  };

  const handleQuantityChange = (itemIndex: string, itemSource: "srd" | "homebrew", newQuantity: number) => {
    if (newQuantity < 1) return;
    const key = `${itemSource}-${itemIndex}`;
    const newSelected = new Map(selectedItems);
    newSelected.set(key, newQuantity);
    setSelectedItems(newSelected);
    setFormData({
      ...formData,
      selectedEquipment: Array.from(newSelected.entries()).map(([k, qty]) => {
        const [src, ...idxParts] = k.split('-');
        const idx = idxParts.join('-');
        return {
          itemIndex: idx,
          itemSource: src as "srd" | "homebrew",
          quantity: qty,
        };
      }),
    });
  };

  const getEquipmentByIndex = (index: string, source: "srd" | "homebrew") => {
    return equipment.find(eq => eq.index === index && eq.source === source);
  };

  const startingEquipment = selectedClass?.starting_equipment as any;
  const equipmentChoices = startingEquipment?.starting_equipment_options || [];

  if (!selectedClass) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Please select a class first to see starting equipment options.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weapon size={20} />
            Starting Equipment
          </CardTitle>
          <CardDescription>
            Select your starting equipment. You'll receive automatic items, and can choose from available options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Automatic Starting Equipment */}
          {(() => {
            const startingEq = startingEquipment?.starting_equipment || startingEquipment;
            if (Array.isArray(startingEq) && startingEq.length > 0) {
              return (
                <div>
                  <h4 className="font-medium mb-2">Automatic Starting Equipment</h4>
                  <div className="space-y-2">
                    {startingEq.map((item: any, idx: number) => {
                      const eqItem = item.equipment || item;
                      const itemIndex = eqItem.index || eqItem.name?.toLowerCase().replace(/\s+/g, '-');
                      const key = `srd-${itemIndex}`;
                      const isSelected = selectedItems.has(key);
                      const quantity = selectedItems.get(key) || item.quantity || eqItem.quantity || 1;
                      const eqData = getEquipmentByIndex(itemIndex, "srd");

                      return (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded-md bg-muted/30">
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleItemToggle(itemIndex, "srd", item.quantity || eqItem.quantity || 1)}
                              className="h-4 w-4"
                              disabled={true}
                            />
                            <div className="flex-1">
                              <span className="font-medium">{eqItem.name || itemIndex}</span>
                              {quantity > 1 && <span className="text-sm text-muted-foreground ml-2">×{quantity}</span>}
                              {eqData && eqData.cost && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({eqData.cost.quantity} {eqData.cost.unit})
                                </span>
                              )}
                            </div>
                          </div>
                          <input type="checkbox" checked={true} disabled className="h-4 w-4" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Equipment Choices */}
          {equipmentChoices.length > 0 && equipmentChoices.map((choice: any, choiceIdx: number) => {
            const choose = choice.choose || 1;
            // Handle different choice structures
            const from = choice.from?.equipment_category?.equipment 
              || choice.from?.equipment
              || choice.from 
              || [];
            
            if (!Array.isArray(from) || from.length === 0) return null;
            
            return (
              <div key={choiceIdx} className="border-t pt-4">
                <h4 className="font-medium mb-2">
                  Choose {choose} {choiceIdx > 0 ? `(Option ${choiceIdx + 1})` : ''}
                </h4>
                <div className="space-y-2">
                  {from.map((option: any) => {
                    const itemIndex = option.index || option.equipment?.index || option.name?.toLowerCase().replace(/\s+/g, '-');
                    if (!itemIndex) return null;
                    
                    const key = `srd-${itemIndex}`;
                    const isSelected = selectedItems.has(key);
                    const quantity = selectedItems.get(key) || 1;
                    const eqData = getEquipmentByIndex(itemIndex, "srd");
                    const displayName = option.name || option.equipment?.name || itemIndex;

                    return (
                      <div key={itemIndex} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50">
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleItemToggle(itemIndex, "srd", 1)}
                            className="h-4 w-4"
                          />
                          <div className="flex-1">
                            <span className="font-medium">{displayName}</span>
                            {eqData && (
                              <div className="text-xs text-muted-foreground">
                                {eqData.equipment_category && <span>{eqData.equipment_category}</span>}
                                {eqData.cost && (
                                  <span className="ml-2">
                                    {eqData.cost.quantity} {eqData.cost.unit}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(itemIndex, "srd", quantity - 1)}
                              disabled={quantity <= 1}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(itemIndex, "srd", quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Selected Equipment Summary */}
          {selectedItems.size > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Selected Equipment ({selectedItems.size} items)</h4>
              <div className="space-y-1">
                {Array.from(selectedItems.entries()).map(([key, quantity]) => {
                  const [source, ...indexParts] = key.split('-');
                  const index = indexParts.join('-');
                  const eqData = getEquipmentByIndex(index, source as "srd" | "homebrew");
                  return (
                    <div key={key} className="text-sm p-2 bg-muted/50 rounded">
                      {eqData?.name || index} {quantity > 1 && `×${quantity}`}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(!startingEquipment?.starting_equipment && equipmentChoices.length === 0) && (
            <p className="text-sm text-muted-foreground">
              No starting equipment options available for this class. You can add equipment after character creation.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep({
  formData,
  selectedRace,
  selectedClass,
  // selectedSubclass,
  getFinalAbilityScore,
}: {
  formData: CharacterFormData;
  selectedRace: Race | null | undefined;
  selectedClass: DndClass | null | undefined;
  // selectedSubclass: Subclass | null | undefined;
  getFinalAbilityScore: (ability: keyof typeof formData.abilityScores) => number;
}) {
  const abilities = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
  const proficiencyBonus = getProficiencyBonus(formData.level);
  const { backgrounds } = useBackgrounds(formData.sourceVersion);
  const { equipment } = useEquipment(formData.campaignId);
  
  const selectedBackground = backgrounds.find(bg => bg.name === formData.background || bg.index === formData.background.toLowerCase().replace(/\s+/g, '-'));
  
  // Get equipment names
  const getEquipmentName = (index: string, source: "srd" | "homebrew") => {
    const eq = equipment.find(e => e.index === index && e.source === source);
    return eq?.name || index;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CharacterIcon size={20} />
              Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {formData.imageUrl && (
              <div className="mb-4">
                <div className="relative h-32 w-32 rounded-lg overflow-hidden border-2 border-border bg-muted">
                  <img
                    src={formData.imageUrl}
                    alt="Character portrait"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            <div>
              <span className="font-medium">Name:</span> {formData.name || "Unnamed"}
            </div>
            <div>
              <span className="font-medium">Species:</span> {selectedRace?.name || "Not selected"}
            </div>
            <div>
              <span className="font-medium">Class:</span> {selectedClass?.name || "Not selected"}
            </div>
            <div>
              <span className="font-medium">Level:</span> {formData.level}
            </div>
            <div>
              <span className="font-medium">Background:</span> {formData.background === "custom" ? "Custom Background" : formData.background || "None"}
            </div>
            <div>
              <span className="font-medium">Alignment:</span> {formData.alignment}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Strength size={20} />
              Ability Scores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {abilities.map((ability) => {
              const baseScore = formData.abilityScores[ability];
              const finalScore = getFinalAbilityScore(ability);
              const modifier = getAbilityModifierString(finalScore);
              const racialBonus = selectedRace?.ability_bonuses 
                ? (selectedRace.ability_bonuses as Array<any>)
                    .find(b => {
                      const bonusAbility = b.ability_score?.index || b.ability_score?.name || b.ability || '';
                      return bonusAbility.toUpperCase().slice(0, 3) === ability.toUpperCase().slice(0, 3);
                    })?.bonus || 0
                : 0;
              
              return (
                <div key={ability} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="capitalize font-medium">{ability}:</span>
                    <span className="font-bold">
                      {finalScore} ({modifier})
                    </span>
                  </div>
                  {racialBonus > 0 && (
                    <div className="text-xs text-muted-foreground pl-2">
                      Base: {baseScore} + Racial: +{racialBonus} = {finalScore}
                    </div>
                  )}
                  {racialBonus === 0 && baseScore !== finalScore && (
                    <div className="text-xs text-muted-foreground pl-2">
                      Base: {baseScore}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pt-2 border-t mt-2">
              <span className="font-medium">Proficiency Bonus:</span> +{proficiencyBonus}
            </div>
            {selectedClass?.saving_throws && selectedClass.saving_throws.length > 0 && (
              <div className="pt-2 border-t mt-2">
                <div className="font-medium mb-1">Saving Throw Proficiencies:</div>
                <div className="flex flex-wrap gap-1">
                  {selectedClass.saving_throws.map((st, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {st}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedRace && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Person size={20} />
              Racial Traits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Speed:</span> {selectedRace.speed} ft
                </div>
                <div>
                  <span className="font-medium">Size:</span> {selectedRace.size}
                </div>
              </div>
              
              {selectedRace.ability_bonuses && Array.isArray(selectedRace.ability_bonuses) && selectedRace.ability_bonuses.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Ability Score Increases:</div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedRace.ability_bonuses as Array<any>).map((bonus, i) => {
                      const abilityName = bonus.ability_score?.name || bonus.ability_score?.index || bonus.ability || '';
                      return (
                        <Badge key={i} variant="default">
                          {getFullAbilityName(abilityName)} +{bonus.bonus}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {selectedRace.traits && (
                <div>
                  <div className="font-medium mb-2">Racial Traits:</div>
                  <div className="space-y-2">
                    {Array.isArray(selectedRace.traits) ? (
                      selectedRace.traits.map((trait: any, i: number) => (
                        <div key={i} className="p-2 bg-muted/30 rounded border-l-2 border-primary/30">
                          <div className="font-semibold">{trait.name || `Trait ${i + 1}`}</div>
                          <div className="text-muted-foreground text-xs mt-1">
                            {typeof trait === "string" ? trait : trait.desc || trait.description || JSON.stringify(trait)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground">{String(selectedRace.traits)}</div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedRace.languages && (
                <div>
                  <div className="font-medium mb-1">Languages:</div>
                  <div className="text-muted-foreground">
                    {selectedRace.language_desc || (Array.isArray(selectedRace.languages) ? selectedRace.languages.join(", ") : String(selectedRace.languages))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const classIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
                  artificer: Artificer,
                  barbarian: Barbarian,
                  bard: Bard,
                  cleric: Cleric,
                  druid: Druid,
                  fighter: Fighter,
                  monk: Monk,
                  paladin: Paladin,
                  ranger: Ranger,
                  rogue: Rogue,
                  sorcerer: Sorcerer,
                  warlock: Warlock,
                  wizard: Wizard,
                };
                const ClassIcon = classIcons[selectedClass.index.toLowerCase()];
                return ClassIcon ? <ClassIcon size={20} /> : <Fighter size={20} />;
              })()}
              Class Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Hit Die:</span> d{selectedClass.hit_die}
                </div>
                <div>
                  <span className="font-medium">Proficiency Bonus:</span> +{proficiencyBonus}
                </div>
              </div>
              
              {selectedClass.saving_throws && selectedClass.saving_throws.length > 0 && (
                <div>
                  <span className="font-medium">Saving Throw Proficiencies:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedClass.saving_throws.map((st, i) => (
                      <Badge key={i} variant="outline">
                        {st}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedClass.class_levels && (() => {
                const classLevels = selectedClass.class_levels as any;
                const features: Array<{ level: number; name: string; description: string }> = [];
                
                // Extract features up to the selected level
                if (classLevels) {
                  const levels = typeof classLevels === 'object' && !Array.isArray(classLevels)
                    ? Object.keys(classLevels)
                        .map(key => {
                          const levelNum = parseInt(key.replace('level_', '').replace('level', '')) || parseInt(key) || 1;
                          return { level: levelNum, data: classLevels[key] };
                        })
                        .filter(({ level }) => level <= formData.level)
                        .sort((a, b) => a.level - b.level)
                    : Array.isArray(classLevels)
                    ? classLevels.slice(0, formData.level).map((data: any, idx: number) => ({ level: idx + 1, data }))
                    : [];
                  
                  levels.forEach(({ level, data }) => {
                    if (!data) return;
                    
                    if (data.features) {
                      if (Array.isArray(data.features)) {
                        data.features.forEach((feat: any) => {
                          if (typeof feat === 'string') {
                            features.push({ level, name: feat, description: '' });
                          } else if (feat.name || feat.index) {
                            features.push({
                              level,
                              name: feat.name || feat.index || 'Feature',
                              description: feat.desc || feat.description || ''
                            });
                          }
                        });
                      }
                    }
                    
                    if (data.feature_choices) {
                      if (Array.isArray(data.feature_choices)) {
                        data.feature_choices.forEach((choice: any) => {
                          features.push({
                            level,
                            name: choice.name || 'Feature Choice',
                            description: choice.desc || choice.description || 'Choose a feature'
                          });
                        });
                      }
                    }
                  });
                }
                
                if (features.length > 0) {
                  return (
                    <div>
                      <div className="font-medium mb-2">Features at Level {formData.level}:</div>
                      <div className="space-y-2">
                        {features.map((feat, idx) => (
                          <div key={idx} className="p-2 bg-muted/30 rounded border-l-2 border-primary/30">
                            <div className="font-semibold">{feat.name}</div>
                            {feat.description && (
                              <div className="text-muted-foreground text-xs mt-1">{feat.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              {selectedClass.spellcasting && (
                <div>
                  <div className="font-medium mb-2">Spellcasting:</div>
                  <div className="text-muted-foreground text-xs">
                    This class has spellcasting abilities. Spells will be automatically added during character creation.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {formData.selectedEquipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Weapon size={20} />
              Starting Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {formData.selectedEquipment.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                  <span>{getEquipmentName(item.itemIndex, item.itemSource)}</span>
                  {item.quantity > 1 && <span className="text-muted-foreground">×{item.quantity}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {(selectedBackground || formData.background === "custom") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book size={20} />
              Background
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> {selectedBackground?.name || "Custom Background"}
              </div>
              {selectedBackground?.description && (
                <div>
                  <div className="font-medium mb-1">Description:</div>
                  <div className="text-muted-foreground text-xs">{selectedBackground.description}</div>
                </div>
              )}
              {selectedBackground?.skill_proficiencies && (
                <div>
                  <span className="font-medium">Skill Proficiencies:</span> {selectedBackground.skill_proficiencies}
                </div>
              )}
              {(selectedBackground?.tool_proficiencies || formData.backgroundChoices.tools.length > 0) && (
                <div>
                  <span className="font-medium">Tool Proficiencies:</span>{" "}
                  {formData.backgroundChoices.tools.length > 0 
                    ? formData.backgroundChoices.tools.join(", ")
                    : selectedBackground?.tool_proficiencies}
                  {selectedBackground?.tool_proficiencies && formData.backgroundChoices.tools.length > 0 && (
                    <span className="text-muted-foreground"> (includes selected tools)</span>
                  )}
                </div>
              )}
              {(selectedBackground?.languages || formData.backgroundChoices.languages.length > 0) && (
                <div>
                  <span className="font-medium">Languages:</span>{" "}
                  {formData.backgroundChoices.languages.length > 0 
                    ? formData.backgroundChoices.languages.join(", ")
                    : selectedBackground?.languages}
                </div>
              )}
              {selectedBackground?.feature && (
                <div>
                  <div className="font-medium mb-1">Feature:</div>
                  <div className="text-muted-foreground text-xs">{selectedBackground.feature}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

