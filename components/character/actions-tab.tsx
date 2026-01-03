"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { getAbilityModifier, getAbilityModifierString } from "@/lib/utils/character";
import { 
  Action, 
  BonusAction, 
  Reaction 
} from "dnd-icons/combat";
import { 
  Strength, 
  Dexterity, 
  Constitution, 
  Intelligence, 
  Wisdom, 
  Charisma 
} from "dnd-icons/ability";
import { 
  Bludgeoning,
  Piercing,
  Slashing,
  Acid,
  Cold,
  Fire,
  Force,
  Lightning,
  Necrotic,
  Poison,
  Psychic,
  Radiant,
  Thunder
} from "dnd-icons/damage";
import { Range as RangeIcon } from "dnd-icons/attribute";
import { Filter, Zap, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Character } from "@/hooks/useDndContent";
import { useDiceRoller } from "@/contexts/dice-roller-context";
import type { EnrichedInventoryItem } from "@/lib/utils/equipment-effects";

interface ActionsTabProps {
  character: Character;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  inventory: EnrichedInventoryItem[];
  proficiencyBonus?: number;
  classFeatures?: Array<{
    level: number;
    name: string;
    description: string;
  }>;
  editable?: boolean;
  characterId?: string;
  characterName?: string;
  campaignId?: string;
}

interface ActionItem {
  name: string;
  type: "action" | "bonus-action" | "reaction" | "other";
  description: string;
  damage?: string;
  damageType?: string;
  range?: string;
  hit?: string;
  dc?: string;
  dcAbility?: string;
  uses?: string;
  source?: "weapon" | "feature" | "unarmed";
}

const abilityScoreIcons: Record<string, any> = {
  STR: Strength,
  DEX: Dexterity,
  CON: Constitution,
  INT: Intelligence,
  WIS: Wisdom,
  CHA: Charisma,
};

const damageTypeIcons: Record<string, any> = {
  bludgeoning: Bludgeoning,
  piercing: Piercing,
  slashing: Slashing,
  acid: Acid,
  cold: Cold,
  fire: Fire,
  force: Force,
  lightning: Lightning,
  necrotic: Necrotic,
  poison: Poison,
  psychic: Psychic,
  radiant: Radiant,
  thunder: Thunder,
};

function parseActionType(description: string): "action" | "bonus-action" | "reaction" | "other" {
  const lower = description.toLowerCase();
  if (lower.includes("bonus action")) {
    return "bonus-action";
  }
  if (lower.includes("reaction")) {
    return "reaction";
  }
  if (lower.includes("action")) {
    return "action";
  }
  return "other";
}

function extractDCFromDescription(description: string): { ability: string; dc: number } | null {
  const dcMatch = description.match(/(\w+)\s+(?:saving\s+)?throw.*?DC\s+(\d+)/i);
  if (dcMatch) {
    const ability = dcMatch[1].toUpperCase().substring(0, 3);
    const dc = parseInt(dcMatch[2]);
    return { ability, dc };
  }
  return null;
}

function extractDamageFromDescription(description: string): { dice: string; type: string } | null {
  const damageMatch = description.match(/(\d+d\d+(?:\+\d+)?)\s+(\w+)/i);
  if (damageMatch) {
    return { dice: damageMatch[1], type: damageMatch[2].toLowerCase() };
  }
  return null;
}

function extractHitFromDescription(description: string): string | null {
  const hitMatch = description.match(/\+(\d+)\s+to\s+hit/i);
  if (hitMatch) {
    return `+${hitMatch[1]}`;
  }
  return null;
}

function extractRangeFromDescription(description: string): string | null {
  const rangeMatch = description.match(/(\d+)\s*(?:feet|ft)/i);
  if (rangeMatch) {
    return `${rangeMatch[1]} ft`;
  }
  if (description.toLowerCase().includes("touch")) {
    return "Touch";
  }
  if (description.toLowerCase().includes("self")) {
    return "Self";
  }
  return null;
}

function extractUsesFromDescription(description: string): string | null {
  const usesMatch = description.match(/(\d+)\s*(?:times?|uses?)\s*(?:per|\/)\s*(?:short|long)?\s*rest/i);
  if (usesMatch) {
    return `${usesMatch[1]}/rest`;
  }
  return null;
}

/**
 * Doubles the dice in a damage expression for critical hits
 * Examples: "1d8+3" → "2d8+3", "2d6+5" → "4d6+5", "1d4" → "2d4"
 */
function doubleDiceForCrit(expression: string): string {
  // Match dice patterns like "1d8", "2d6", etc. and double the count
  return expression.replace(/(\d+)d(\d+)/g, (match, count, sides) => {
    const doubledCount = parseInt(count, 10) * 2;
    return `${doubledCount}d${sides}`;
  });
}

function getWeaponAction(
  weapon: EnrichedInventoryItem,
  abilityScores: { strength: number; dexterity: number },
  proficiencyBonus: number
): ActionItem | null {
  const eq = weapon.equipmentData;
  if (!eq?.weapon_category) return null;

  const damage = eq.damage as { damage_dice?: string; damage_type?: { name?: string; index?: string } } | null;
  
  // Check weapon properties - handle both array of objects and array of strings
  const properties = eq.properties as Array<{ index?: string; name?: string } | string> | null;
  const isFinesse = properties?.some((p) => {
    if (typeof p === 'string') return p.toLowerCase() === 'finesse';
    return p.index === 'finesse' || p.name?.toLowerCase() === 'finesse';
  }) || false;
  const isRanged = eq.weapon_range === 'Ranged';
  const isThrown = properties?.some((p) => {
    if (typeof p === 'string') return p.toLowerCase() === 'thrown';
    return p.index === 'thrown' || p.name?.toLowerCase() === 'thrown';
  }) || false;
  
  // Choose ability modifier (STR for melee, DEX for ranged, best for finesse)
  const strMod = Math.floor((abilityScores.strength - 10) / 2);
  const dexMod = Math.floor((abilityScores.dexterity - 10) / 2);
  const abilityMod = isRanged ? dexMod : (isFinesse ? Math.max(strMod, dexMod) : strMod);
  
  const hitBonus = abilityMod + proficiencyBonus;
  const damageBonus = abilityMod;
  
  // Build damage string
  let damageStr = damage?.damage_dice || "";
  if (damageStr && damageBonus !== 0) {
    damageStr += damageBonus >= 0 ? `+${damageBonus}` : `${damageBonus}`;
  }
  
  // Build range string
  let rangeStr = eq.weapon_range === 'Melee' ? '5 ft' : '';
  const range = eq.range as { normal?: number; long?: number } | null;
  if (range?.normal) {
    if (isThrown && eq.weapon_range === 'Melee') {
      rangeStr = `5 ft (${range.normal}/${range.long || range.normal * 3} ft thrown)`;
    } else {
      rangeStr = `${range.normal}/${range.long || range.normal * 4} ft`;
    }
  }

  // Build description with weapon properties
  const propertyNames = properties?.map((p) => {
    if (typeof p === 'string') return p;
    return p.name || p.index || '';
  }).filter(Boolean).join(', ') || '';

  return {
    name: weapon.name,
    type: "action",
    description: `${eq.weapon_category} ${eq.weapon_range} Weapon${propertyNames ? ` (${propertyNames})` : ''}`,
    damage: damageStr || undefined,
    damageType: damage?.damage_type?.name?.toLowerCase() || damage?.damage_type?.index,
    hit: `+${hitBonus}`,
    range: rangeStr,
    source: "weapon",
  };
}

export function ActionsTab({
  character,
  abilityScores,
  inventory,
  proficiencyBonus = 2,
  classFeatures = [],
  editable = false,
  characterId,
  characterName,
  campaignId,
}: ActionsTabProps) {
  const { rollDice } = useDiceRoller();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showLimitedUseOnly, setShowLimitedUseOnly] = useState(false);
  // Track pending critical hits by action name
  const [pendingCrits, setPendingCrits] = useState<Set<string>>(new Set());

  // Get equipped weapons only (exclude tools and armor)
  const equippedWeapons = useMemo(() => {
    return inventory.filter(item => {
      if (!item.equipped) return false;
      const eq = item.equipmentData;
      // Only include items that are weapons (have weapon_category)
      // Exclude armor, tools, and other non-weapon equipment
      return eq?.weapon_category !== null && eq?.weapon_category !== undefined;
    });
  }, [inventory]);

  // Build all actions
  const allActions = useMemo(() => {
    const actions: ActionItem[] = [];

    // Unarmed Strike
    const strMod = getAbilityModifier(abilityScores.strength);
    const unarmedHit = strMod + proficiencyBonus;
    // Format damage as "1+X" or "1-X" for clarity (flat damage, not rollable)
    const unarmedDamageStr = strMod >= 0 ? `1+${strMod}` : `1${strMod}`;
    actions.push({
      name: "Unarmed Strike",
      type: "action",
      description: "Melee Weapon Attack",
      damage: unarmedDamageStr,
      damageType: "bludgeoning",
      hit: `+${unarmedHit}`,
      range: "5 ft",
      source: "unarmed",
    });

    // Equipped weapons - extract actual stats from equipment data
    equippedWeapons.forEach(weapon => {
      const weaponAction = getWeaponAction(weapon, abilityScores, proficiencyBonus);
      if (weaponAction) {
        actions.push(weaponAction);
      }
      // Note: Non-weapon equipment (tools, armor, etc.) are filtered out above
    });

    // Class features that are actions
    classFeatures.forEach(feature => {
      const actionType = parseActionType(feature.description);
      if (actionType !== "other" || feature.description.toLowerCase().includes("attack")) {
        const dcInfo = extractDCFromDescription(feature.description);
        const damageInfo = extractDamageFromDescription(feature.description);
        const hit = extractHitFromDescription(feature.description);
        const range = extractRangeFromDescription(feature.description);
        const uses = extractUsesFromDescription(feature.description);

        actions.push({
          name: feature.name,
          type: actionType,
          description: feature.description,
          damage: damageInfo?.dice,
          damageType: damageInfo?.type,
          dc: dcInfo ? dcInfo.dc.toString() : undefined,
          dcAbility: dcInfo?.ability,
          hit: hit ?? undefined,
          range: range ?? undefined,
          uses: uses ?? undefined,
          source: "feature",
        });
      }
    });

    return actions;
  }, [equippedWeapons, classFeatures, abilityScores, proficiencyBonus]);

  // Filter actions
  const filteredActions = useMemo(() => {
    let filtered = allActions;

    // Type filter
    if (selectedType !== "all") {
      filtered = filtered.filter(action => action.type === selectedType);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(action => {
        return (
          action.name.toLowerCase().includes(query) ||
          action.description.toLowerCase().includes(query) ||
          action.damageType?.toLowerCase().includes(query) ||
          action.range?.toLowerCase().includes(query)
        );
      });
    }

    // Limited use filter
    if (showLimitedUseOnly) {
      filtered = filtered.filter(action => action.uses !== undefined);
    }

    return filtered;
  }, [allActions, searchQuery, selectedType, showLimitedUseOnly]);

  // Group actions by type
  const actionsByType = useMemo(() => {
    return filteredActions.reduce((acc, action) => {
      if (!acc[action.type]) {
        acc[action.type] = [];
      }
      acc[action.type].push(action);
      return acc;
    }, {} as Record<string, ActionItem[]>);
  }, [filteredActions]);

  const typeLabels: Record<string, string> = {
    "all": "ALL",
    "action": "ACTION",
    "bonus-action": "BONUS ACTION",
    "reaction": "REACTION",
    "other": "OTHER",
  };

  return (
    <Card className="p-0">
      <CardContent className="space-y-4 p-4">
        {/* Search and Filters */}
        <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search Action Names, Damage Types, Conditions or Tags"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button
              variant={showLimitedUseOnly ? "default" : "outline"}
              size="icon"
              onClick={() => setShowLimitedUseOnly(!showLimitedUseOnly)}
              title="Show Limited Use actions only"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Type Tabs */}
        <Tabs
          value={selectedType}
          onValueChange={setSelectedType}
        >
          <TabsList>
            <TabsTrigger value="all">ALL</TabsTrigger>
            <TabsTrigger value="action">ACTION</TabsTrigger>
            <TabsTrigger value="bonus-action">BONUS ACTION</TabsTrigger>
            <TabsTrigger value="reaction">REACTION</TabsTrigger>
            <TabsTrigger value="other">OTHER</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Actions List */}
      {filteredActions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No actions found.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(actionsByType)
            .sort(([a], [b]) => {
              const order = ["action", "bonus-action", "reaction", "other"];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([type, typeActions]) => {
              return (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-destructive uppercase">
                      {typeLabels[type] || type.toUpperCase()}
                    </h3>
                    {typeActions.some(a => a.uses) && (
                      <Badge variant="secondary" className="text-xs">
                        LIMITED USE
                      </Badge>
                    )}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        {editable && (
                          <TableHead className="w-[80px]">USE</TableHead>
                        )}
                        <TableHead className="w-[200px]">NAME</TableHead>
                        <TableHead className="w-[80px]">TYPE</TableHead>
                        <TableHead className="w-[100px]">RANGE</TableHead>
                        <TableHead className="w-[100px]">HIT / DC</TableHead>
                        <TableHead className="w-[150px]">DAMAGE</TableHead>
                        <TableHead className="w-[200px]">NOTES</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {typeActions.map((action, index) => {
                        const DamageIcon = action.damageType ? damageTypeIcons[action.damageType] : null;

                        return (
                          <TableRow
                            key={`${action.name}-${index}`}
                            className="cursor-pointer hover:bg-muted/50"
                          >
                            {editable && (
                              <TableCell>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className={cn(
                                    "h-7 px-3 text-xs font-semibold",
                                    "bg-primary hover:bg-primary/90"
                                  )}
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  USE
                                </Button>
                              </TableCell>
                            )}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <span className="font-medium">
                                    {action.name}
                                  </span>
                                  {action.source === "unarmed" && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      UNARMED
                                    </Badge>
                                  )}
                                  {action.source === "weapon" && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      WEAPON
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {action.type === "action" && (
                                  <Action className="h-4 w-4" />
                                )}
                                {action.type === "bonus-action" && (
                                  <BonusAction className="h-4 w-4" />
                                )}
                                {action.type === "reaction" && (
                                  <Reaction className="h-4 w-4" />
                                )}
                                <span className="text-xs capitalize">
                                  {action.type.replace("-", " ")}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {action.range?.toLowerCase().includes("touch") && (
                                  <Hand className="h-4 w-4" />
                                )}
                                {action.range && !action.range.toLowerCase().includes("touch") && (
                                  <RangeIcon className="h-4 w-4" />
                                )}
                                <span className="text-xs">{action.range || "-"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {action.dc ? (
                                <div className="flex items-center gap-1">
                                  {action.dcAbility && abilityScoreIcons[action.dcAbility] && (
                                    <>
                                      {(() => {
                                        const Icon = abilityScoreIcons[action.dcAbility!];
                                        return <Icon className="h-4 w-4" />;
                                      })()}
                                      <button
                                        type="button"
                                        className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded border transition-all bg-muted/50 border-border/50 text-foreground hover:bg-muted hover:border-border"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (characterId && action.dc) {
                                            await rollDice(`1d20`, {
                                              label: `${action.name} - DC ${action.dc} Save`,
                                              characterId,
                                              characterName,
                                              campaignId,
                                            });
                                          }
                                        }}
                                      >
                                        DC {action.dc}
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : action.hit ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded border transition-all bg-muted/50 border-border/50 text-foreground hover:bg-muted hover:border-border"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (characterId && action.hit) {
                                      const hitMod = parseInt(action.hit.replace('+', '')) || 0;
                                      const result = await rollDice(`1d20${hitMod >= 0 ? '+' : ''}${hitMod}`, {
                                        label: `${action.name} Attack`,
                                        characterId,
                                        characterName,
                                        campaignId,
                                      });
                                      
                                      // Check for natural 20 (critical hit)
                                      if (result && result.breakdown.rolls.includes(20)) {
                                        setPendingCrits(prev => new Set(prev).add(action.name));
                                      } else {
                                        // Clear any pending crit for this action on non-crit roll
                                        setPendingCrits(prev => {
                                          const next = new Set(prev);
                                          next.delete(action.name);
                                          return next;
                                        });
                                      }
                                    }
                                  }}
                                >
                                  {action.hit}
                                </button>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {action.damage ? (
                                // Only make rollable if damage contains dice notation (has 'd')
                                action.damage.includes('d') ? (
                                  (() => {
                                    const hasPendingCrit = pendingCrits.has(action.name);
                                    const displayDamage = hasPendingCrit 
                                      ? doubleDiceForCrit(action.damage) 
                                      : action.damage;
                                    
                                    return (
                                      <button
                                        type="button"
                                        className={cn(
                                          "inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold rounded border transition-all",
                                          hasPendingCrit
                                            ? "bg-yellow-500/20 border-yellow-500 text-yellow-500 hover:bg-yellow-500/30 animate-pulse"
                                            : "bg-muted/50 border-border/50 text-foreground hover:bg-muted hover:border-border"
                                        )}
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (characterId && action.damage) {
                                            const damageExpr = hasPendingCrit 
                                              ? doubleDiceForCrit(action.damage) 
                                              : action.damage;
                                            
                                            await rollDice(damageExpr, {
                                              label: hasPendingCrit 
                                                ? `${action.name} CRITICAL Damage` 
                                                : `${action.name} Damage`,
                                              characterId,
                                              characterName,
                                              campaignId,
                                            });
                                            
                                            // Clear the pending crit after rolling damage
                                            if (hasPendingCrit) {
                                              setPendingCrits(prev => {
                                                const next = new Set(prev);
                                                next.delete(action.name);
                                                return next;
                                              });
                                            }
                                          }
                                        }}
                                      >
                                        {hasPendingCrit && (
                                          <span className="text-yellow-500 font-bold">CRIT!</span>
                                        )}
                                        {DamageIcon && (
                                          <DamageIcon className="h-4 w-4" />
                                        )}
                                        <span>
                                          {displayDamage}
                                          {action.damageType && (
                                            <span className={hasPendingCrit ? "text-yellow-400 ml-1" : "text-muted-foreground ml-1"}>
                                              {action.damageType}
                                            </span>
                                          )}
                                        </span>
                                      </button>
                                    );
                                  })()
                                ) : (
                                  // Flat damage (no dice) - display only, not rollable
                                  <div className="flex items-center gap-1">
                                    {DamageIcon && (
                                      <DamageIcon className="h-4 w-4" />
                                    )}
                                    <span className="text-xs">
                                      {action.damage}
                                      {action.damageType && (
                                        <span className="text-muted-foreground ml-1">
                                          {action.damageType}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                {action.uses && (
                                  <Badge variant="secondary" className="text-xs">
                                    {action.uses}
                                  </Badge>
                                )}
                                {action.description && action.description.length > 50 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs text-muted-foreground cursor-help">
                                        {action.description.substring(0, 50)}...
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="max-w-xs">{action.description}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {action.description && action.description.length <= 50 && (
                                  <span className="text-xs text-muted-foreground">
                                    {action.description}
                                  </span>
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
      </CardContent>
    </Card>
  );
}

