"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dices, Copy, Sparkles } from "lucide-react";
import {
  rollBuiltIn,
  type BuiltInTable,
} from "@/lib/dm-tables/built-in-tables";
import { useVttChat } from "@/hooks/useVttChat";
import { toast } from "sonner";

interface Props {
  campaignId: string;
  table: BuiltInTable;
  onClone: () => Promise<void> | void;
  cloning: boolean;
}

/**
 * Read-only viewer for a built-in table in the Forge tab. Same look
 * as the editable custom-table view but no field can be changed; the
 * primary action is "Use as template" which forks the table into a
 * fresh editable copy.
 */
export function BuiltInTableViewer({
  campaignId,
  table,
  onClone,
  cloning,
}: Props) {
  const { sendMessage } = useVttChat(campaignId, null, false);
  const [rollCount, setRollCount] = useState<number>(table.rolls_per_use);
  const [isRolling, setIsRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<BuiltInTable["entries"][number][] | null>(null);

  const totalWeight = table.entries.reduce((s, e) => s + e.weight, 0);

  const handleRoll = () => {
    setIsRolling(true);
    window.setTimeout(() => {
      const picks = rollBuiltIn(table, rollCount);
      setIsRolling(false);
      setLastRoll(picks);

      const lines: string[] = [`📜 **${table.name}** — rolled ${picks.length}`];
      for (const p of picks) {
        const price = p.metadata?.price ? ` · ${p.metadata.price}` : "";
        const rarity = p.metadata?.rarity ? ` · _${p.metadata.rarity}_` : "";
        lines.push(`• ${p.value}${price}${rarity}`);
      }
      void sendMessage(lines.join("\n"), {
        kind: "table_roll",
        builtin_id: table.id,
      });
      toast.success("Rolled — posted to chat.");
    }, 280);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="sc-card" style={{ padding: 18 }}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-serif font-semibold">{table.name}</h3>
              <Sparkles
                className="h-4 w-4 text-amber-400/70"
                aria-label="Built-in table"
              />
              <Badge variant="outline" className="text-[10px] uppercase">
                Built-in
              </Badge>
            </div>
            {table.description && (
              <p className="text-sm text-muted-foreground">
                {table.description}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <Badge variant="outline" className="text-[10px]">
                {table.category}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {table.entries.length} entries · total weight {totalWeight}
              </Badge>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void onClone()}
            disabled={cloning}
            className="shrink-0"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Use as template
          </Button>
        </div>
      </div>

      {/* Roll bar */}
      <div className="sc-card" style={{ padding: 18 }}>
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rolls per use</span>
              <Badge variant="outline" className="font-mono">
                {rollCount}
              </Badge>
            </div>
            <Slider
              value={[rollCount]}
              onValueChange={([v]) => setRollCount(v)}
              min={1}
              max={Math.max(8, table.rolls_per_use)}
              step={1}
              className="w-full"
            />
          </div>
          <button
            type="button"
            className={cn(
              "sc-btn sc-btn-primary sc-btn-sm shrink-0 min-w-[140px] justify-center",
              isRolling && "animate-pulse"
            )}
            onClick={handleRoll}
            disabled={isRolling}
          >
            <Dices className={cn("h-4 w-4", isRolling && "animate-spin")} />
            {isRolling ? "Rolling…" : "Roll"}
          </button>
        </div>
      </div>

      {/* Last roll */}
      {lastRoll && lastRoll.length > 0 && (
        <div className="sc-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
              Latest roll
            </div>
            <ul className="space-y-1">
              {lastRoll.map((p, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{p.value}</span>
                  {typeof p.metadata?.price !== "undefined" && (
                    <span className="text-muted-foreground ml-2 font-mono text-xs">
                      {String(p.metadata.price)}
                    </span>
                  )}
                  {typeof p.metadata?.rarity !== "undefined" && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-[9px] uppercase"
                    >
                      {String(p.metadata.rarity)}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Read-only entries list */}
      <div className="sc-card" style={{ padding: 18 }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">Entries</h4>
          <span className="text-[10px] text-muted-foreground italic">
            Built-in tables are read-only. Clone to edit.
          </span>
        </div>
        <ul className="space-y-1">
          {table.entries.map((e, idx) => {
            const pct = totalWeight > 0 ? (e.weight / totalWeight) * 100 : 0;
            return (
              <li
                key={`${e.value}-${idx}`}
                className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 px-2 py-1.5"
              >
                <span className="font-mono tabular-nums text-xs w-6 text-center text-muted-foreground">
                  ×{e.weight}
                </span>
                <div className="w-12 shrink-0">
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-muted-foreground tabular-nums text-center mt-0.5">
                    {pct.toFixed(0)}%
                  </p>
                </div>
                <span className="flex-1 text-sm">{e.value}</span>
                {typeof e.metadata?.price !== "undefined" && (
                  <span className="text-xs font-mono text-muted-foreground shrink-0">
                    {String(e.metadata.price)}
                  </span>
                )}
                {typeof e.metadata?.rarity !== "undefined" && (
                  <Badge
                    variant="outline"
                    className="text-[9px] uppercase shrink-0"
                  >
                    {String(e.metadata.rarity)}
                  </Badge>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
