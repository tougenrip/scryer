"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Spell } from "@/hooks/useDndContent";
import { 
  Action, 
  BonusAction, 
  Reaction 
} from "dnd-icons/combat";
import { 
  Vocal, 
  Somatic, 
  Material, 
  Concentration, 
  Ritual 
} from "dnd-icons/spell";
import { 
  Touch 
} from "dnd-icons/target";
import { 
  Range as RangeIcon 
} from "dnd-icons/attribute";
import { 
  Strength, 
  Dexterity, 
  Constitution, 
  Intelligence, 
  Wisdom, 
  Charisma 
} from "dnd-icons/ability";
import { Time } from "dnd-icons/entity";
import { Rest } from "dnd-icons/game";
import { 
  Wizard, 
  Cleric, 
  Druid, 
  Paladin, 
  Ranger, 
  Sorcerer, 
  Warlock, 
  Bard 
} from "dnd-icons/class";
import { Filter, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CharacterSpell {
  spell: Spell;
  prepared: boolean;
  alwaysPrepared: boolean;
}

interface SpellSlot {
  level: number;
  total: number;
  used: number;
}

interface SpellsTabProps {
  spells: CharacterSpell[];
  spellSlots: SpellSlot[];
  onSpellToggle?: (spellIndex: string, prepared: boolean) => void;
  onSpellClick?: (spell: Spell) => void;
  onSlotChange?: (level: number, used: number) => void;
  editable?: boolean;
}

const abilityScoreIcons: Record<string, any> = {
  STR: Strength,
  DEX: Dexterity,
  CON: Constitution,
  INT: Intelligence,
  WIS: Wisdom,
  CHA: Charisma,
};

const classIcons: Record<string, any> = {
  wizard: Wizard,
  cleric: Cleric,
  druid: Druid,
  paladin: Paladin,
  ranger: Ranger,
  sorcerer: Sorcerer,
  warlock: Warlock,
  bard: Bard,
};


function parseCastingTime(time: string): { type: 'action' | 'bonus' | 'reaction' | 'other'; value: string } {
  const lower = time.toLowerCase();
  if (lower.includes('bonus action')) {
    return { type: 'bonus', value: time };
  }
  if (lower.includes('reaction')) {
    return { type: 'reaction', value: time };
  }
  if (lower.includes('action')) {
    return { type: 'action', value: time };
  }
  return { type: 'other', value: time };
}

function parseRange(range: string): { type: 'touch' | 'self' | 'number'; value: string } {
  const lower = range.toLowerCase();
  if (lower.includes('touch')) {
    return { type: 'touch', value: range };
  }
  if (lower.includes('self')) {
    return { type: 'touch', value: range };
  }
  return { type: 'number', value: range };
}

function extractDCFromDescription(description: string): { ability: string; dc: number } | null {
  // Try to match patterns like "Wisdom saving throw DC 13" or "DEX save DC 15"
  const dcMatch = description.match(/(\w+)\s+(?:saving\s+)?throw.*?DC\s+(\d+)/i);
  if (dcMatch) {
    const ability = dcMatch[1].toUpperCase().substring(0, 3);
    const dc = parseInt(dcMatch[2]);
    return { ability, dc };
  }
  return null;
}

function extractDamageFromDescription(description: string): string | null {
  // Try to match damage dice like "2d8", "1d6+3", etc.
  const damageMatch = description.match(/(\d+d\d+(?:\+\d+)?)/i);
  return damageMatch ? damageMatch[1] : null;
}

function formatDuration(duration: string): string {
  // Simplify duration text
  if (duration.includes('minute')) {
    const match = duration.match(/(\d+)\s*minute/i);
    if (match) return `${match[1]}m`;
  }
  if (duration.includes('hour')) {
    const match = duration.match(/(\d+)\s*hour/i);
    if (match) return `${match[1]}h`;
  }
  if (duration.includes('instantaneous')) {
    return 'Inst';
  }
  return duration.length > 10 ? duration.substring(0, 10) + '...' : duration;
}

export function SpellsTab({
  spells,
  spellSlots,
  onSpellToggle,
  onSpellClick,
  onSlotChange,
  editable = false,
}: SpellsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<number | "all">("all");
  const [showConcentrationOnly, setShowConcentrationOnly] = useState(false);
  const [showRitualOnly, setShowRitualOnly] = useState(false);

  // Group spells by level
  const spellsByLevel = useMemo(() => {
    return spells.reduce((acc, cs) => {
      const level = cs.spell.level;
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(cs);
      return acc;
    }, {} as Record<number, CharacterSpell[]>);
  }, [spells]);

  // Filter spells
  const filteredSpells = useMemo(() => {
    let filtered = spells;

    // Level filter
    if (selectedLevel !== "all") {
      filtered = filtered.filter((cs) => cs.spell.level === selectedLevel);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((cs) => {
        const spell = cs.spell;
        return (
          spell.name.toLowerCase().includes(query) ||
          spell.casting_time.toLowerCase().includes(query) ||
          spell.description.toLowerCase().includes(query) ||
          spell.school.toLowerCase().includes(query)
        );
      });
    }

    // Concentration filter
    if (showConcentrationOnly) {
      filtered = filtered.filter((cs) => cs.spell.concentration);
    }

    // Ritual filter
    if (showRitualOnly) {
      filtered = filtered.filter((cs) => cs.spell.ritual);
    }

    return filtered;
  }, [spells, searchQuery, selectedLevel, showConcentrationOnly, showRitualOnly]);

  // Group filtered spells by level
  const filteredSpellsByLevel = useMemo(() => {
    return filteredSpells.reduce((acc, cs) => {
      const level = cs.spell.level;
      if (!acc[level]) {
        acc[level] = [];
      }
      acc[level].push(cs);
      return acc;
    }, {} as Record<number, CharacterSpell[]>);
  }, [filteredSpells]);

  const levelNames: Record<number, string> = {
    0: "CANTRIP",
    1: "1ST LEVEL",
    2: "2ND LEVEL",
    3: "3RD LEVEL",
    4: "4TH LEVEL",
    5: "5TH LEVEL",
    6: "6TH LEVEL",
    7: "7TH LEVEL",
    8: "8TH LEVEL",
    9: "9TH LEVEL",
  };

  const handleSlotClick = (level: number) => {
    if (!onSlotChange || !editable) return;
    const slot = spellSlots.find((s) => s.level === level);
    if (!slot) return;
    const newUsed = slot.used < slot.total ? slot.used + 1 : 0;
    onSlotChange(level, newUsed);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search Spell Names, Casting Times, Damage Types, Conditions or Tags"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button
              variant={showConcentrationOnly ? "default" : "outline"}
              size="icon"
              onClick={() => setShowConcentrationOnly(!showConcentrationOnly)}
              title="Show Concentration spells only"
            >
              <Concentration className="h-4 w-4" />
            </Button>
            <Button
              variant={showRitualOnly ? "default" : "outline"}
              size="icon"
              onClick={() => setShowRitualOnly(!showRitualOnly)}
              title="Show Ritual spells only"
            >
              <Ritual className="h-4 w-4" />
            </Button>
            {editable && (
              <Button variant="outline" size="sm">
                MANAGE SPELLS
              </Button>
            )}
          </div>
        </div>

        {/* Level Tabs */}
        <Tabs
          value={selectedLevel === "all" ? "all" : selectedLevel.toString()}
          onValueChange={(value) =>
            setSelectedLevel(value === "all" ? "all" : parseInt(value))
          }
        >
          <TabsList>
            <TabsTrigger value="all">ALL</TabsTrigger>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
              <TabsTrigger key={level} value={level.toString()}>
                {level === 0 ? "- 0 -" : `${level}${level === 1 ? "ST" : level === 2 ? "ND" : level === 3 ? "RD" : "TH"}`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Spell List */}
      {filteredSpells.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No spells found.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredSpellsByLevel)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([level, levelSpells]) => {
              const levelNum = parseInt(level);
              const slot = spellSlots.find((s) => s.level === levelNum);

              const slotsRemaining = slot ? slot.total - slot.used : 0;
              const hasAvailableSlots = slot && slotsRemaining > 0;

              const handleCastSpell = (spellLevel: number) => {
                if (!onSlotChange || !editable) return;
                const targetSlot = spellSlots.find((s) => s.level === spellLevel);
                if (!targetSlot || targetSlot.used >= targetSlot.total) return;
                onSlotChange(spellLevel, targetSlot.used + 1);
              };

              return (
                <div key={level} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-destructive uppercase">
                      {levelNames[levelNum]}
                    </h3>
                    {levelNum > 0 && slot && slot.total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: slot.total }).map((_, i) => (
                            <div
                              key={i}
                              className={cn(
                                "h-4 w-4 rounded-sm border transition-colors",
                                i < slot.used
                                  ? "bg-destructive border-destructive"
                                  : "border-muted-foreground/50 bg-transparent"
                              )}
                              title={`${slot.used} / ${slot.total} slots used`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {slotsRemaining}/{slot.total}
                        </span>
                        {editable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onSlotChange?.(levelNum, 0)}
                            disabled={slot.used === 0}
                          >
                            Reset
                          </Button>
                        )}
                      </div>
                    )}
                    {levelNum === 0 && (
                      <Badge variant="secondary" className="text-xs">
                        AT WILL
                      </Badge>
                    )}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        {editable && levelNum > 0 && (
                          <TableHead className="w-[80px]">USE</TableHead>
                        )}
                        <TableHead className="w-[200px]">NAME</TableHead>
                        <TableHead className="w-[80px]">TIME</TableHead>
                        <TableHead className="w-[100px]">RANGE</TableHead>
                        <TableHead className="w-[100px]">HIT / DC</TableHead>
                        <TableHead className="w-[150px]">EFFECT</TableHead>
                        <TableHead className="w-[200px]">NOTES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {levelSpells.map((cs) => {
                        const spell = cs.spell;
                        const castingTime = parseCastingTime(spell.casting_time);
                        const range = parseRange(spell.range);
                        const dcInfo = extractDCFromDescription(spell.description);
                        const damage = extractDamageFromDescription(spell.description);

                        return (
                          <TableRow
                            key={`${spell.source}-${spell.index}`}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onSpellClick?.(spell)}
                          >
                            {editable && levelNum > 0 && (
                              <TableCell>
                                <Button
                                  variant={hasAvailableSlots ? "default" : "outline"}
                                  size="sm"
                                  className={cn(
                                    "h-7 px-3 text-xs font-semibold",
                                    hasAvailableSlots 
                                      ? "bg-primary hover:bg-primary/90" 
                                      : "opacity-50"
                                  )}
                                  disabled={!hasAvailableSlots}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCastSpell(levelNum);
                                  }}
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  CAST
                                </Button>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {spell.concentration && (
                                      <Concentration className="h-4 w-4 text-primary" />
                                    )}
                                    {spell.ritual && (
                                      <Ritual className="h-4 w-4 text-primary" />
                                    )}
                                    <span className="font-medium">
                                      {spell.name}
                                    </span>
                                  </div>
                                  {spell.classes && spell.classes.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                      {spell.classes.slice(0, 3).map((className) => {
                                        const ClassIcon = classIcons[className.toLowerCase()];
                                        return ClassIcon ? (
                                          <ClassIcon key={className} className="h-3 w-3" />
                                        ) : (
                                          <span key={className} className="text-xs text-muted-foreground">
                                            {className}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {castingTime.type === "action" && (
                                  <Action className="h-4 w-4" />
                                )}
                                {castingTime.type === "bonus" && (
                                  <BonusAction className="h-4 w-4" />
                                )}
                                {castingTime.type === "reaction" && (
                                  <Reaction className="h-4 w-4" />
                                )}
                                <span className="text-xs">
                                  {castingTime.type === "other"
                                    ? castingTime.value
                                    : castingTime.value.match(/\d+/)?.[0] || ""}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {range.type === "touch" && (
                                  <Touch className="h-4 w-4" />
                                )}
                                {range.type === "number" && (
                                  <RangeIcon className="h-4 w-4" />
                                )}
                                <span className="text-xs">{range.value}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {dcInfo ? (
                                <div className="flex items-center gap-1">
                                  {abilityScoreIcons[dcInfo.ability] && (
                                    <>
                                      {(() => {
                                        const Icon = abilityScoreIcons[dcInfo.ability];
                                        return <Icon className="h-4 w-4" />;
                                      })()}
                                      <span className="text-xs">{dcInfo.dc}</span>
                                    </>
                                  )}
                                </div>
                              ) : damage ? (
                                <span className="text-xs">{damage}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                {damage && <span>{damage} damage</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                <div className="flex items-center gap-1">
                                  <Time className="h-3 w-3" />
                                  <span className="text-xs">
                                    {formatDuration(spell.duration)}
                                  </span>
                                </div>
                                {spell.components.includes("V") && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Vocal className="h-3 w-3" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Verbal</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {spell.components.includes("S") && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Somatic className="h-3 w-3" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Somatic</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {spell.components.includes("M") && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Material className="h-3 w-3" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Material</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
