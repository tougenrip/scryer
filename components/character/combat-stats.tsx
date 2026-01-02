"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus } from "lucide-react";
import { Ac } from "dnd-icons/attribute";
import { Initiative } from "dnd-icons/combat";
import { Walking } from "dnd-icons/movement";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDiceRoller } from "@/contexts/dice-roller-context";
import { extractHitDice } from "@/lib/utils/dice-parser";

interface CombatStatsProps {
  hpMax: number;
  hpCurrent: number;
  hpTemp: number;
  armorClass: number;
  acBreakdown?: {
    base: number;
    armor?: { name: string; ac: number };
    shield?: { name: string; ac: number };
    dexModifier?: number;
  };
  initiative: number;
  speed: number;
  speedModifier?: number;
  hitDiceCurrent?: string | null;
  hitDiceTotal?: string | null;
  onHpChange?: (hpCurrent: number, hpTemp?: number) => void;
  onStatChange?: (stat: string, value: number) => void;
  editable?: boolean;
  characterId?: string;
  characterName?: string;
  campaignId?: string;
}

export function CombatStats({
  hpMax,
  hpCurrent,
  hpTemp,
  armorClass,
  acBreakdown,
  initiative,
  speed,
  speedModifier = 0,
  hitDiceCurrent,
  hitDiceTotal,
  onHpChange,
  onStatChange,
  editable = false,
  characterId,
  characterName,
  campaignId,
}: CombatStatsProps) {
  const { rollHitDice } = useDiceRoller();
  
  const handleHpAdjust = (delta: number) => {
    if (!onHpChange) return;
    const newHp = Math.max(0, Math.min(hpMax, hpCurrent + delta));
    onHpChange(newHp, hpTemp);
  };

  const handleTempHpAdjust = (delta: number) => {
    if (!onHpChange) return;
    const newTempHp = Math.max(0, hpTemp + delta);
    onHpChange(hpCurrent, newTempHp);
  };

  const hpPercentage = hpMax > 0 ? (hpCurrent / hpMax) * 100 : 0;
  const isLowHp = hpPercentage < 25;
  const isCriticalHp = hpPercentage < 10;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm">Combat Statistics</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2 space-y-1.5">
        {/* HP */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Hit Points</Label>
            <div className="text-xs text-muted-foreground">
              {hpCurrent} / {hpMax}
              {hpTemp > 0 && <span className="ml-1 text-orange-500">+{hpTemp}</span>}
            </div>
          </div>
          <div className="relative h-3 bg-muted rounded-md overflow-hidden">
            <div
              className={`h-full transition-all ${
                isCriticalHp
                  ? "bg-destructive"
                  : isLowHp
                  ? "bg-orange-500"
                  : "bg-primary"
              }`}
              style={{ width: `${Math.min(100, hpPercentage)}%` }}
            />
          </div>
          {editable && (
            <div className="flex gap-0.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHpAdjust(-1)}
                className="h-5 px-1.5 text-[10px]"
              >
                <Minus className="h-2.5 w-2.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHpAdjust(1)}
                className="h-5 px-1.5 text-[10px]"
              >
                <Plus className="h-2.5 w-2.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHpAdjust(-5)}
                className="h-5 px-1.5 text-[10px]"
              >
                -5
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleHpAdjust(5)}
                className="h-5 px-1.5 text-[10px]"
              >
                +5
              </Button>
            </div>
          )}
          {hpTemp > 0 && editable && (
            <div className="flex gap-0.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTempHpAdjust(-1)}
                className="h-5 px-1.5 text-[10px] flex-1"
              >
                <Minus className="h-2.5 w-2.5" /> T
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTempHpAdjust(1)}
                className="h-5 px-1.5 text-[10px] flex-1"
              >
                <Plus className="h-2.5 w-2.5" /> T
              </Button>
            </div>
          )}
        </div>

        {/* AC, Initiative, Speed */}
        <div className="grid grid-cols-3 gap-1.5">
          <div>
            <AcIconStat
              value={armorClass}
              breakdown={acBreakdown}
              editable={editable}
              onValueChange={(value) =>
                onStatChange?.("armor_class", value)
              }
            />
          </div>
          <div>
            <InitiativeIconStat
              value={initiative}
              editable={editable}
              onValueChange={(value) =>
                onStatChange?.("initiative", value)
              }
            />
          </div>
          <div>
            <SpeedIconStat
              value={speed}
              modifier={speedModifier}
              editable={editable}
              onValueChange={(value) =>
                onStatChange?.("speed", value)
              }
            />
          </div>
        </div>

        {/* Hit Dice */}
        {hitDiceCurrent && (
          <div className="space-y-1 pt-1 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Hit Dice</Label>
              <button
                type="button"
                className="inline-flex items-center justify-center shrink-0 px-1.5 py-0.5 text-xs font-semibold rounded border transition-all bg-muted/50 border-border/50 text-foreground hover:bg-muted hover:border-border"
                onClick={async () => {
                  if (characterId && hitDiceCurrent) {
                    const parsed = extractHitDice(hitDiceCurrent);
                    if (parsed) {
                      await rollHitDice(hitDiceCurrent, {
                        label: "Hit Dice Recovery",
                        characterId,
                        characterName,
                        campaignId,
                      });
                    }
                  }
                }}
              >
                {hitDiceCurrent}
                {hitDiceTotal && hitDiceTotal !== hitDiceCurrent && (
                  <span className="text-muted-foreground ml-1">/ {hitDiceTotal}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AcIconStat({
  value,
  breakdown,
  editable,
  onValueChange,
}: {
  value: number;
  breakdown?: {
    base: number;
    armor?: { name: string; ac: number };
    shield?: { name: string; ac: number };
    dexModifier?: number;
    magicBonus?: number;
  };
  editable: boolean;
  onValueChange?: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  // Sync editValue when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value.toString());
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    const numValue = parseInt(editValue) || 0;
    onValueChange?.(numValue);
    setIsEditing(false);
    setEditValue(numValue.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(value.toString());
      setIsEditing(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative w-full max-w-[64px] mx-auto">
          {/* Shield Container */}
          <div className="relative" style={{ width: "64px", height: "85px" }}>
            {/* Shield Icon as Background */}
            <div className="absolute inset-0 opacity-30">
              <Ac 
                size={64} 
                className="w-full h-full"
                style={{
                  color: "hsl(var(--muted-foreground))",
                }}
              />
            </div>
            
            {/* Content Overlay - Positioned inside shield */}
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center px-1.5 py-2 pointer-events-none"
              style={{ paddingTop: "8px", paddingBottom: "12px" }}
            >
              {/* ARMOR Text */}
              <div className="text-[7px] font-semibold text-foreground uppercase tracking-wide leading-tight mb-0.5">
                ARMOR
              </div>
              
              {/* AC Value */}
              {editable && isEditing ? (
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="w-10 h-6 text-center text-base font-bold border-2 border-primary bg-background/95 focus:bg-background p-0 pointer-events-auto z-10 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className={`text-lg font-bold leading-none my-0.5 text-foreground ${
                    editable ? "cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto" : ""
                  }`}
                  style={{
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                  onClick={() => editable && setIsEditing(true)}
                >
                  {value}
                </div>
              )}
              
              {/* CLASS Text */}
              <div className="text-[7px] font-semibold text-foreground uppercase tracking-wide leading-tight mt-0.5">
                CLASS
              </div>
            </div>
          </div>
          {/* AC Breakdown Tooltip */}
          {breakdown && (breakdown.armor || breakdown.shield || breakdown.magicBonus) && (
            <div className="mt-1 text-[9px] text-muted-foreground text-center space-y-0.5">
              {breakdown.armor && (
                <div>
                  {breakdown.armor.name}: {breakdown.armor.ac}
                  {breakdown.dexModifier !== undefined && breakdown.dexModifier !== 0 && (
                    <span> {breakdown.dexModifier >= 0 ? '+' : ''}{breakdown.dexModifier} Dex</span>
                  )}
                </div>
              )}
              {breakdown.shield && (
                <div>+{breakdown.shield.ac} {breakdown.shield.name}</div>
              )}
              {breakdown.magicBonus && breakdown.magicBonus > 0 && (
                <div className="text-primary">+{breakdown.magicBonus} Magic</div>
              )}
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-semibold">Armor Class: {value}</p>
          {breakdown && (
            <div className="text-[10px] space-y-0.5">
              {breakdown.base !== undefined && (
                <p>Base: {breakdown.base}</p>
              )}
              {breakdown.armor && (
                <p>Armor: {breakdown.armor.name} ({breakdown.armor.ac})</p>
              )}
              {breakdown.dexModifier !== undefined && breakdown.dexModifier !== 0 && (
                <p>Dexterity: {breakdown.dexModifier >= 0 ? '+' : ''}{breakdown.dexModifier}</p>
              )}
              {breakdown.shield && (
                <p>Shield: +{breakdown.shield.ac} ({breakdown.shield.name})</p>
              )}
              {breakdown.magicBonus && breakdown.magicBonus > 0 && (
                <p className="text-primary">Magic Bonus: +{breakdown.magicBonus}</p>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function InitiativeIconStat({
  value,
  editable,
  onValueChange,
}: {
  value: number;
  editable: boolean;
  onValueChange?: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value.toString());
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    const numValue = parseInt(editValue) || 0;
    onValueChange?.(numValue);
    setIsEditing(false);
    setEditValue(numValue.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(value.toString());
      setIsEditing(false);
    }
  };

  const displayValue = value >= 0 ? `+${value}` : value.toString();

  return (
    <div className="relative w-full max-w-[64px] mx-auto">
      {/* Icon Container */}
      <div className="relative" style={{ width: "64px", height: "85px" }}>
        {/* Initiative Icon as Background */}
        <div className="absolute inset-0 opacity-30">
          <Initiative 
            size={64} 
            className="w-full h-full"
            style={{
              color: "hsl(var(--muted-foreground))",
            }}
          />
        </div>
        
        {/* Content Overlay */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center px-1.5 py-2 pointer-events-none"
          style={{ paddingTop: "8px", paddingBottom: "12px" }}
        >
          {/* INIT Text */}
          <div className="text-[7px] font-semibold text-foreground uppercase tracking-wide leading-tight mb-0.5">
            INIT
          </div>
          
          {/* Initiative Value */}
          {editable && isEditing ? (
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-10 h-6 text-center text-base font-bold border-2 border-primary bg-background/95 focus:bg-background p-0 pointer-events-auto z-10 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className={`text-lg font-bold leading-none my-0.5 text-foreground ${
                editable ? "cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto" : ""
              }`}
              style={{
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
              onClick={() => editable && setIsEditing(true)}
            >
              {displayValue}
            </div>
          )}
          
          {/* BONUS Text */}
          <div className="text-[7px] font-semibold text-foreground uppercase tracking-wide leading-tight mt-0.5">
            BONUS
          </div>
        </div>
      </div>
    </div>
  );
}

function SpeedIconStat({
  value,
  modifier: speedModifier,
  editable,
  onValueChange,
}: {
  value: number;
  modifier?: number;
  editable: boolean;
  onValueChange?: (value: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());

  useEffect(() => {
    if (!isEditing) {
      setEditValue(value.toString());
    }
  }, [value, isEditing]);

  const handleBlur = () => {
    const numValue = parseInt(editValue) || 0;
    onValueChange?.(numValue);
    setIsEditing(false);
    setEditValue(numValue.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setEditValue(value.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className="relative w-full max-w-[64px] mx-auto">
      {/* Icon Container */}
      <div className="relative" style={{ width: "64px", height: "85px" }}>
        {/* Speed Icon as Background */}
        <div className="absolute inset-0 opacity-30">
          <Walking 
            size={64} 
            className="w-full h-full"
            style={{
              color: "hsl(var(--muted-foreground))",
            }}
          />
        </div>
        
        {/* Content Overlay */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center px-1.5 py-2 pointer-events-none"
          style={{ paddingTop: "8px", paddingBottom: "12px" }}
        >
          {/* SPEED Text */}
          <div className="text-[7px] font-semibold text-foreground uppercase tracking-wide leading-tight mb-0.5">
            SPEED
          </div>
          
          {/* Speed Value */}
          {editable && isEditing ? (
            <Input
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-10 h-6 text-center text-base font-bold border-2 border-primary bg-background/95 focus:bg-background p-0 pointer-events-auto z-10 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className={`text-lg font-bold leading-none my-0.5 text-foreground ${
                editable ? "cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto" : ""
              }`}
              style={{
                textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
              onClick={() => editable && setIsEditing(true)}
            >
              {value}
            </div>
          )}
          
          {/* FEET Text */}
          <div className="text-[7px] font-semibold text-foreground uppercase tracking-wide leading-tight mt-0.5">
            FEET
          </div>
        </div>
      </div>
      {/* Speed Modifier Tooltip */}
      {speedModifier !== undefined && speedModifier !== 0 && (
        <div className="mt-1 text-[9px] text-muted-foreground text-center">
          {speedModifier < 0 ? (
            <div className="text-destructive">{speedModifier} ft. penalty</div>
          ) : (
            <div className="text-green-600">+{speedModifier} ft. bonus</div>
          )}
        </div>
      )}
    </div>
  );
}

