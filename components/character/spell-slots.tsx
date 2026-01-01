"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

interface SpellSlot {
  level: number;
  total: number;
  used: number;
}

interface SpellSlotsProps {
  spellSlots: SpellSlot[];
  onSlotChange?: (level: number, used: number) => void;
  editable?: boolean;
}

export function SpellSlots({
  spellSlots,
  onSlotChange,
  editable = false,
}: SpellSlotsProps) {
  const handleSlotAdjust = (level: number, delta: number) => {
    if (!onSlotChange) return;
    const slot = spellSlots.find((s) => s.level === level);
    if (!slot) return;
    const newUsed = Math.max(0, Math.min(slot.total, slot.used + delta));
    onSlotChange(level, newUsed);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spell Slots</CardTitle>
      </CardHeader>
      <CardContent>
        {spellSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This character doesn't have spell slots.
          </p>
        ) : (
          <div className="space-y-3">
            {spellSlots.map((slot) => {
              const remaining = slot.total - slot.used;
              const percentage = slot.total > 0 ? (remaining / slot.total) * 100 : 0;

              return (
                <div key={slot.level} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Level {slot.level} {slot.level === 1 ? "Slot" : "Slots"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {remaining} / {slot.total} remaining
                    </span>
                  </div>
                  <div className="flex gap-2 items-center">
                    {editable && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSlotAdjust(slot.level, -1)}
                          disabled={slot.used <= 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex-1">
                          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSlotAdjust(slot.level, 1)}
                          disabled={slot.used >= slot.total}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {!editable && (
                      <div className="flex-1">
                        <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

