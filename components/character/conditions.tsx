"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { X, Plus } from "lucide-react";

const DND_CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
] as const;

const EXHAUSTION_LEVELS = [
  { level: 0, description: "No exhaustion" },
  { level: 1, description: "Disadvantage on ability checks" },
  { level: 2, description: "Speed halved" },
  { level: 3, description: "Disadvantage on attack rolls and saving throws" },
  { level: 4, description: "Hit point maximum halved" },
  { level: 5, description: "Speed reduced to 0" },
  { level: 6, description: "Death" },
];

interface ConditionsProps {
  conditions: string[];
  onConditionsChange?: (conditions: string[]) => void;
  onConditionClick?: (condition: string) => void;
  editable?: boolean;
}

export function Conditions({
  conditions,
  onConditionsChange,
  onConditionClick,
  editable = false,
}: ConditionsProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Parse exhaustion level from conditions array
  // Look for "Exhaustion: X" format or just "Exhaustion" (defaults to level 1)
  const getExhaustionLevel = (): number => {
    const exhaustionEntry = conditions.find(c => c.startsWith("Exhaustion"));
    if (!exhaustionEntry) return 0;
    
    const match = exhaustionEntry.match(/Exhaustion:?\s*(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    // If just "Exhaustion" without a level, default to 1
    return exhaustionEntry === "Exhaustion" ? 1 : 0;
  };

  const exhaustionLevel = getExhaustionLevel();
  
  // Filter out exhaustion from regular conditions
  const regularConditions = conditions.filter(c => !c.startsWith("Exhaustion"));

  const handleAddCondition = (condition: string) => {
    if (!onConditionsChange) return;
    if (!regularConditions.includes(condition)) {
      const newConditions = [...regularConditions, condition];
      // Re-add exhaustion if it exists
      if (exhaustionLevel > 0) {
        newConditions.push(`Exhaustion: ${exhaustionLevel}`);
      }
      onConditionsChange(newConditions);
    }
  };

  const handleRemoveCondition = (condition: string) => {
    if (!onConditionsChange) return;
    const newConditions = regularConditions.filter((c) => c !== condition);
    // Re-add exhaustion if it exists
    if (exhaustionLevel > 0) {
      newConditions.push(`Exhaustion: ${exhaustionLevel}`);
    }
    onConditionsChange(newConditions);
  };

  const handleExhaustionChange = (level: number) => {
    if (!onConditionsChange) return;
    const newConditions = [...regularConditions];
    if (level > 0) {
      newConditions.push(`Exhaustion: ${level}`);
    }
    onConditionsChange(newConditions);
  };

  // Combine exhaustion and regular conditions for display
  const allConditionsForDisplay = [
    ...(exhaustionLevel > 0 ? [`Exhaustion L${exhaustionLevel}`] : []),
    ...regularConditions
  ];

  return (
    <div className="space-y-1.5">
      {/* Conditions - Compact Display */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Conditions</Label>
          {editable && (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 px-2 text-[10px]">
                  <Plus className="h-3 w-3 mr-1" />
                  Manage
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-sm">
                <SheetHeader>
                  <SheetTitle>Manage Conditions</SheetTitle>
                  <SheetDescription>
                    Add or remove conditions affecting this character.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  {/* Exhaustion Management */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Exhaustion Level</Label>
                    <Select
                      value={exhaustionLevel.toString()}
                      onValueChange={(value) => handleExhaustionChange(parseInt(value, 10))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXHAUSTION_LEVELS.map(({ level, description }) => (
                          <SelectItem key={level} value={level.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">Level {level}</span>
                              {level > 0 && (
                                <span className="text-xs text-muted-foreground">{description}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {exhaustionLevel > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {EXHAUSTION_LEVELS[exhaustionLevel].description}
                      </p>
                    )}
                  </div>

                  {/* Active Conditions */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Active Conditions</Label>
                    {regularConditions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active conditions</p>
                    ) : (
                      <div className="space-y-2">
                        {regularConditions.map((condition) => (
                          <div
                            key={condition}
                            className="flex items-center justify-between p-2 border rounded-md"
                          >
                            <Badge
                              variant={condition === "Unconscious" ? "destructive" : "secondary"}
                              className="cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => {
                                onConditionClick?.(condition);
                                setSheetOpen(false);
                              }}
                            >
                              {condition}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveCondition(condition)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Available Conditions to Add */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Add Condition</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {DND_CONDITIONS.filter((c) => !regularConditions.includes(c)).map((condition) => (
                        <Button
                          key={condition}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleAddCondition(condition);
                          }}
                          className="h-9 text-xs"
                        >
                          {condition}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
        {allConditionsForDisplay.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {exhaustionLevel > 0 && (
              <Badge
                variant={exhaustionLevel >= 5 ? "destructive" : exhaustionLevel >= 3 ? "default" : "secondary"}
                className="flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity text-[10px] px-1.5 py-0"
                onClick={() => editable && setSheetOpen(true)}
              >
                Exhaustion L{exhaustionLevel}
              </Badge>
            )}
            {regularConditions.map((condition) => (
              <Badge
                key={condition}
                variant={condition === "Unconscious" ? "destructive" : "secondary"}
                className="flex items-center gap-0.5 cursor-pointer hover:opacity-80 transition-opacity text-[10px] px-1.5 py-0"
                onClick={() => onConditionClick?.(condition)}
              >
                {condition}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

