"use client";

import { useState } from "react";
import { useDiceRoller, type RollResult } from "@/contexts/dice-roller-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export function RollHistory() {
  const { rollHistory, rollDice } = useDiceRoller();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const commonDice = [
    { label: "d4", expression: "1d4" },
    { label: "d6", expression: "1d6" },
    { label: "d8", expression: "1d8" },
    { label: "d10", expression: "1d10" },
    { label: "d12", expression: "1d12" },
    { label: "d20", expression: "1d20" },
    { label: "d100", expression: "1d100" },
  ];

  const handleDiceRoll = async (expression: string, label: string) => {
    await rollDice(expression, { label });
  };

  return (
    <Card
      className={cn(
        "fixed bottom-4 right-4 z-50 w-80 transition-all duration-300",
        isMinimized && "w-auto"
      )}
    >
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Roll History</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!isMinimized && (
        <CardContent className="px-3 pb-3 space-y-3">
          {/* Common Dice Row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {commonDice.map((dice) => (
              <Button
                key={dice.label}
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs font-semibold flex-1 min-w-[2.5rem]"
                onClick={() => handleDiceRoll(dice.expression, dice.label)}
              >
                {dice.label}
              </Button>
            ))}
          </div>
          
          {/* Roll History */}
          {rollHistory.length > 0 && (
            <ScrollArea className={cn("transition-all", isExpanded ? "h-96" : "h-48")}>
              <div className="space-y-2">
                {rollHistory.map((roll) => (
                  <RollHistoryItem key={roll.id} roll={roll} />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function RollHistoryItem({ roll }: { roll: RollResult }) {
  // Check if this is the current user's roll
  // If userId is not set, assume it's own roll (local roll)
  const isOwnRoll = !roll.userId;
  const displayName = roll.characterName || roll.userName || "Unknown";

  const formatBreakdown = (breakdown: RollResult["breakdown"]) => {
    if (!breakdown || breakdown.rolls.length === 0) {
      return roll.expression;
    }

    const rollsStr = breakdown.rolls.join(", ");
    const modifierStr =
      breakdown.modifier !== 0
        ? `${breakdown.modifier >= 0 ? "+" : ""}${breakdown.modifier}`
        : "";

    if (roll.advantage || roll.disadvantage) {
      const advantageStr = roll.advantage ? " (Adv)" : " (Dis)";
      return `[${rollsStr}]${modifierStr}${advantageStr} = ${breakdown.total}`;
    }

    return `[${rollsStr}]${modifierStr} = ${breakdown.total}`;
  };

  return (
    <div
      className={cn(
        "rounded-md border p-2 text-xs transition-colors",
        isOwnRoll ? "bg-primary/10 border-primary/20" : "bg-muted/50"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            {roll.label && (
              <span className="font-medium text-foreground truncate">
                {roll.label}
              </span>
            )}
            {!isOwnRoll && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                {displayName}
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground font-mono text-[11px]">
            {formatBreakdown(roll.breakdown)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(roll.timestamp, { addSuffix: true })}
          </div>
        </div>
        <div className="text-lg font-bold text-primary shrink-0">
          {roll.result}
        </div>
      </div>
    </div>
  );
}
