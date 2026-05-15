"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dices,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Search,
  Library,
  X,
  Copy,
} from "lucide-react";
import type {
  DmRandomTable,
  DmRandomTableEntry,
} from "@/types/dm-random-tables";
import { useVttChat } from "@/hooks/useVttChat";
import { createClient } from "@/lib/supabase/client";

interface Props {
  campaignId: string;
  table: DmRandomTable;
  entries: DmRandomTableEntry[];
  onUpdateTable: (
    id: string,
    patch: Partial<
      Pick<DmRandomTable, "name" | "description" | "category" | "rolls_per_use">
    >
  ) => void;
  onAddEntry: (
    tableId: string,
    input: {
      value: string;
      weight?: number;
      metadata?: Record<string, unknown>;
    }
  ) => Promise<DmRandomTableEntry | null>;
  onUpdateEntry: (
    id: string,
    patch: Partial<Pick<DmRandomTableEntry, "value" | "weight">>
  ) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteTable: (id: string) => void;
  onRoll: (tableId: string, count?: number) => DmRandomTableEntry[] | null;
  /** Optional. When provided, the editor renders a "Use as template"
   *  button in the header that clones this table into a new editable
   *  copy. */
  onClone?: () => void;
}

const CATEGORY_PRESETS = [
  "npc",
  "shop",
  "weather",
  "plot",
  "dungeon",
  "encounter",
  "other",
];

interface RollLog {
  id: string;
  rolledAt: Date;
  picks: DmRandomTableEntry[];
}

export function CustomTableEditor({
  campaignId,
  table,
  entries,
  onUpdateTable,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onDeleteTable,
  onRoll,
  onClone,
}: Props) {
  const { sendMessage } = useVttChat(campaignId, null, false);
  const [newEntryValue, setNewEntryValue] = useState("");
  const [rollLog, setRollLog] = useState<RollLog[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [rollCount, setRollCount] = useState<number>(table.rolls_per_use);
  const [pickerOpen, setPickerOpen] = useState(false);
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);

  const handleAddEntry = async () => {
    const v = newEntryValue.trim();
    if (!v) return;
    const created = await onAddEntry(table.id, { value: v, weight: 1 });
    if (created) setNewEntryValue("");
  };

  const handleRoll = () => {
    setIsRolling(true);
    // Tiny suspense before showing the result.
    window.setTimeout(() => {
      const picks = onRoll(table.id, rollCount);
      setIsRolling(false);
      if (!picks || picks.length === 0) {
        toast.error("Add at least one entry first.");
        return;
      }
      setRollLog((prev) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            rolledAt: new Date(),
            picks,
          },
          ...prev,
        ].slice(0, 8)
      );
      // Post to chat as a markdown card so the party sees what was
      // rolled. Single line per pick keeps it compact in scrollback.
      const lines: string[] = [];
      lines.push(`📜 **${table.name}** — rolled ${picks.length}`);
      for (const p of picks) {
        const pricePart = p.metadata?.price
          ? ` · ${p.metadata.price}`
          : "";
        const rarityPart = p.metadata?.rarity
          ? ` · _${p.metadata.rarity}_`
          : "";
        lines.push(`• ${p.value}${pricePart}${rarityPart}`);
      }
      void sendMessage(lines.join("\n"), { kind: "table_roll", table_id: table.id });
    }, 320);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header card: name / description / category / delete ── */}
      <div className="sc-card" style={{ padding: 18 }}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <Input
              value={table.name}
              onChange={(e) => onUpdateTable(table.id, { name: e.target.value })}
              placeholder="Table name"
              className="text-lg font-serif font-semibold"
            />
            <Input
              value={table.description ?? ""}
              onChange={(e) =>
                onUpdateTable(table.id, {
                  description: e.target.value || null,
                })
              }
              placeholder="What does this table generate?"
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Category
              </span>
              <select
                value={table.category ?? ""}
                onChange={(e) =>
                  onUpdateTable(table.id, {
                    category: e.target.value || null,
                  })
                }
                className="h-7 rounded-md border border-border bg-background px-2 text-xs"
              >
                <option value="">(none)</option>
                {CATEGORY_PRESETS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <Badge variant="outline" className="text-[10px]">
                {entries.length} entries · total weight {totalWeight}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            {onClone && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onClone}
                title="Create an editable copy of this table"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={() => {
                if (confirm(`Delete table "${table.name}"? This can't be undone.`)) {
                  onDeleteTable(table.id);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Roll bar ───────────────────────────────────────────── */}
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
            disabled={isRolling || entries.length === 0}
          >
            <Dices className={cn("h-4 w-4", isRolling && "animate-spin")} />
            {isRolling ? "Rolling…" : "Roll"}
          </button>
        </div>
      </div>

      {/* ── Recent rolls ───────────────────────────────────────── */}
      {rollLog.length > 0 && (
        <div className="sc-card overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
          <div className="p-4 space-y-3">
            {rollLog.map((log, idx) => (
              <div
                key={log.id}
                className={cn(
                  "rounded-md border border-border/50 bg-muted/20 p-3",
                  idx === 0 && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  {idx === 0 ? "Latest roll" : `Roll #${rollLog.length - idx}`}
                </div>
                <ul className="space-y-1">
                  {log.picks.map((p, i) => (
                    <li key={`${log.id}-${i}`} className="text-sm">
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
            ))}
          </div>
        </div>
      )}

      {/* ── Entries editor ─────────────────────────────────────── */}
      <div className="sc-card" style={{ padding: 18 }}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">Entries</h4>
          <span className="text-[10px] text-muted-foreground">
            Tap weights to adjust likelihood
          </span>
        </div>

        {/* New entry input + library picker toggle */}
        <div className="flex items-center gap-2 mb-3">
          <Input
            value={newEntryValue}
            onChange={(e) => setNewEntryValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleAddEntry();
              }
            }}
            placeholder="New entry (press Enter to add)"
            className="text-sm"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setPickerOpen((v) => !v)}
            title="Pick an existing equipment / magic item from the library"
          >
            <Library className="h-3.5 w-3.5" />
            From library
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAddEntry}
            disabled={!newEntryValue.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {/* Library picker — searches SRD equipment + magic items.
            Picked rows insert as entries with metadata identifying the
            library item so renderers can decorate price/rarity etc. */}
        {pickerOpen && (
          <LibraryPicker
            onClose={() => setPickerOpen(false)}
            onPick={async ({ source, kind, index, name, rarity }) => {
              await onAddEntry(table.id, {
                value: name,
                weight: 1,
                metadata: {
                  source,
                  kind,
                  index,
                  ...(rarity ? { rarity } : {}),
                },
              });
            }}
          />
        )}

        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">
            No entries yet. Add your first row above.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                totalWeight={totalWeight}
                onUpdate={onUpdateEntry}
                onDelete={onDeleteEntry}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  totalWeight,
  onUpdate,
  onDelete,
}: {
  entry: DmRandomTableEntry;
  totalWeight: number;
  onUpdate: (
    id: string,
    patch: Partial<Pick<DmRandomTableEntry, "value" | "weight">>
  ) => void;
  onDelete: (id: string) => void;
}) {
  const [draftValue, setDraftValue] = useState(entry.value);
  const pct = totalWeight > 0 ? (entry.weight / totalWeight) * 100 : 0;

  return (
    <li className="group flex items-center gap-2 rounded-md border border-border/50 bg-muted/10 px-2 py-1.5 hover:border-border/80 transition-colors">
      {/* Weight stepper */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          className="h-6 w-6 rounded text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"
          onClick={() =>
            onUpdate(entry.id, { weight: Math.max(1, entry.weight - 1) })
          }
          aria-label="Decrease weight"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
        <span className="font-mono tabular-nums text-xs w-6 text-center">
          {entry.weight}
        </span>
        <button
          type="button"
          className="h-6 w-6 rounded text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"
          onClick={() =>
            onUpdate(entry.id, { weight: entry.weight + 1 })
          }
          aria-label="Increase weight"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>

      {/* Probability bar */}
      <div className="w-12 shrink-0">
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[8px] text-muted-foreground tabular-nums text-center mt-0.5">
          {pct.toFixed(0)}%
        </p>
      </div>

      {/* Value input */}
      <Input
        value={draftValue}
        onChange={(e) => setDraftValue(e.target.value)}
        onBlur={() => {
          if (draftValue !== entry.value)
            onUpdate(entry.id, { value: draftValue });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="h-7 text-sm flex-1"
      />

      <button
        type="button"
        className="h-6 w-6 rounded text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(entry.id)}
        aria-label="Delete entry"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

interface PickedItem {
  source: "srd";
  kind: "equipment" | "magic";
  index: string;
  name: string;
  rarity: string | null;
}

/**
 * Inline library picker. Searches SRD equipment + magic items (same
 * pattern as the loot-tables tab). Each result inserts as a new
 * entry with metadata identifying the library item.
 */
function LibraryPicker({
  onPick,
  onClose,
}: {
  onPick: (item: PickedItem) => Promise<void>;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<"equipment" | "magic">("magic");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const supabase = createClient();
    const fetchIt = async () => {
      const tableName = kind === "magic" ? "srd_magic_items" : "srd_equipment";
      const cols = kind === "magic" ? "index,name,rarity" : "index,name";
      const { data, error } = await supabase
        .from(tableName)
        .select(cols)
        .ilike("name", `%${q}%`)
        .limit(25);
      if (cancelled) return;
      if (error) {
        console.error("Library search failed:", error);
        setResults([]);
      } else {
        setResults(
          (data ?? []).map((d) => ({
            source: "srd" as const,
            kind,
            index: (d as { index: string }).index,
            name: (d as { name: string }).name,
            rarity: (d as { rarity?: string | null }).rarity ?? null,
          }))
        );
      }
      setSearching(false);
    };
    void fetchIt();
    return () => {
      cancelled = true;
    };
  }, [query, kind]);

  return (
    <div className="mb-3 rounded-md border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {(["magic", "equipment"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "h-7 px-2 rounded text-[11px] font-semibold uppercase tracking-wider transition-colors border",
                kind === k
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
              )}
            >
              {k === "magic" ? "Magic" : "Equipment"}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              kind === "magic"
                ? "Search magic items (e.g. potion, sword, ring)"
                : "Search equipment (e.g. shield, longbow)"
            }
            className="h-8 pl-7 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded text-muted-foreground hover:text-foreground flex items-center justify-center"
          aria-label="Close picker"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {query.trim().length < 2 ? (
        <p className="text-[11px] italic text-muted-foreground text-center py-2">
          Type at least 2 characters to search.
        </p>
      ) : searching ? (
        <p className="text-[11px] italic text-muted-foreground text-center py-2">
          Searching…
        </p>
      ) : results.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground text-center py-2">
          No matches.
        </p>
      ) : (
        <ul className="max-h-64 overflow-y-auto rounded border border-border/60 bg-background/40 divide-y divide-border/40">
          {results.map((r) => (
            <li key={`${r.kind}:${r.index}`}>
              <button
                type="button"
                onClick={async () => {
                  await onPick(r);
                  toast.success(`Added: ${r.name}`);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted/40 transition-colors"
              >
                <span className="flex-1 truncate">{r.name}</span>
                {r.rarity && (
                  <Badge variant="outline" className="text-[9px] uppercase shrink-0">
                    {r.rarity}
                  </Badge>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
