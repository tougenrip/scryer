"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart } from "lucide-react";
import type { Token } from "@/types/vtt";

interface Props {
  token: Token;
  screenX: number;
  screenY: number;
  onApplyDelta: (delta: number) => void;
}

/**
 * Tiny floating HP panel rendered above the selected token. Type a positive
 * number into the field, then click Damage to subtract or Heal to add. Enter
 * defaults to Damage so common attack flow stays a single keystroke.
 */
export function VttTokenDamageHud({ token, screenX, screenY, onApplyDelta }: Props) {
  const [value, setValue] = useState("");
  const cur = token.hp_current ?? null;
  const max = token.hp_max ?? null;

  const submit = (sign: 1 | -1) => {
    const trimmed = value.trim().replace(/^[+\-]/, "");
    if (!trimmed) return;
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n) || n <= 0) return;
    onApplyDelta(sign * n);
    setValue("");
  };

  return (
    <div
      data-vtt-floating-panel
      className="pointer-events-auto absolute z-30 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-md border border-border bg-popover p-1 shadow-2xl"
      style={{ left: screenX, top: screenY - 6 }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit(-1);
          }
        }}
        placeholder="amount"
        className="h-7 w-16 text-xs"
        autoFocus
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
        title="Damage (Enter)"
        onClick={() => submit(-1)}
      >
        Damage
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10 dark:text-emerald-400"
        title="Heal"
        onClick={() => submit(+1)}
      >
        Heal
      </Button>
      <span className="flex items-center gap-1 px-1 text-xs font-medium">
        <Heart className="h-3 w-3 text-rose-500" />
        {cur ?? "—"}
        <span className="text-muted-foreground">/ {max ?? "—"}</span>
      </span>
    </div>
  );
}
