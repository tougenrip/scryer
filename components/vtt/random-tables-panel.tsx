"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDmRandomTables } from "@/hooks/useDmRandomTables";
import { useVttChat } from "@/hooks/useVttChat";
import type {
  DmRandomTable,
  DmRandomTableEntry,
} from "@/types/dm-random-tables";
import {
  BUILT_IN_TABLES,
  type BuiltInTable,
  rollBuiltIn,
} from "@/lib/dm-tables/built-in-tables";
import { cn } from "@/lib/utils";
import {
  Dices,
  ChevronRight,
  ChevronDown,
  Plus,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  campaignId: string;
  isDm: boolean;
}

/** Unified shape for rendering: either source has the same fields. */
interface RowTable {
  id: string;
  name: string;
  category: string;
  description: string | null;
  rolls_per_use: number;
  builtIn: boolean;
  // Source data for entry access / cloning.
  source: { kind: "builtin"; table: BuiltInTable } | { kind: "custom"; table: DmRandomTable };
}

/** Compact in-session roller. Built-in tables sit alongside DM-authored
 *  tables; both roll in-memory and post a markdown card to chat.
 *  Editing custom tables happens in Forge; built-ins are read-only but
 *  can be cloned with "Use as template" into a fresh editable copy.
 */
export function VttRandomTablesPanel({ campaignId, isDm }: Props) {
  const {
    tables: customTables,
    entriesByTable,
    createTable,
    roll,
    loading,
  } = useDmRandomTables(campaignId);
  const { sendMessage } = useVttChat(campaignId, null, false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Most recent roll per table id (custom or builtin).
  const [recent, setRecent] = useState<
    Record<string, Array<Pick<DmRandomTableEntry, "value" | "metadata">>>
  >({});
  const [rolling, setRolling] = useState<string | null>(null);

  // Merge built-ins + custom into a unified row list.
  const rows = useMemo<RowTable[]>(() => {
    const builtIn: RowTable[] = BUILT_IN_TABLES.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      rolls_per_use: t.rolls_per_use,
      builtIn: true,
      source: { kind: "builtin", table: t },
    }));
    const custom: RowTable[] = customTables.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category?.trim() || "other",
      description: t.description,
      rolls_per_use: t.rolls_per_use,
      builtIn: false,
      source: { kind: "custom", table: t },
    }));
    return [...builtIn, ...custom];
  }, [customTables]);

  // Group by category, then split each category into built-in vs custom
  // so the rendering can label them clearly.
  const grouped = useMemo(() => {
    const map = new Map<string, RowTable[]>();
    for (const r of rows) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, list]) => ({
        category,
        rows: [...list].sort((a, b) => {
          // Built-ins first within a category, then alpha.
          if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
          return a.name.localeCompare(b.name);
        }),
      }));
  }, [rows]);

  const entryCountFor = (r: RowTable) =>
    r.source.kind === "builtin"
      ? r.source.table.entries.length
      : (entriesByTable[r.id] ?? []).length;

  const handleRoll = (r: RowTable) => {
    const count = r.rolls_per_use;
    if (entryCountFor(r) === 0) {
      toast.error(`${r.name} has no entries yet.`);
      return;
    }
    setRolling(r.id);
    window.setTimeout(() => {
      const picks =
        r.source.kind === "builtin"
          ? rollBuiltIn(r.source.table, count).map((e) => ({
              value: e.value,
              metadata: e.metadata ?? {},
            }))
          : (roll(r.id, count) ?? []).map((e) => ({
              value: e.value,
              metadata: e.metadata,
            }));
      setRolling(null);
      if (picks.length === 0) return;
      setRecent((prev) => ({ ...prev, [r.id]: picks }));

      const lines: string[] = [`📜 **${r.name}** — rolled ${picks.length}`];
      for (const p of picks) {
        const price = p.metadata?.price ? ` · ${p.metadata.price}` : "";
        const rarity = p.metadata?.rarity ? ` · _${p.metadata.rarity}_` : "";
        lines.push(`• ${p.value}${price}${rarity}`);
      }
      void sendMessage(lines.join("\n"), {
        kind: "table_roll",
        table_id: r.id,
      });
    }, 280);
  };

  const handleNew = async () => {
    const name = window.prompt("Name for the new table?", "New table");
    if (!name) return;
    const t = await createTable({ name, category: "other", rolls_per_use: 1 });
    if (t) setExpandedId(t.id);
  };


  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
        <Dices className="h-4 w-4 text-amber-400" />
        <p
          className="text-xs font-bold text-amber-400 flex-1"
          style={{ fontVariant: "small-caps" }}
        >
          Random tables
        </p>
        {isDm && (
          <button
            type="button"
            onClick={handleNew}
            className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-0.5"
            title="Create a new table"
          >
            <Plus className="h-3 w-3" />
            New
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {loading ? (
          <p className="px-3 py-4 text-[11px] italic text-muted-foreground">
            Loading tables…
          </p>
        ) : (
          <ul className="py-2">
            {grouped.map(({ category, rows }) => (
              <li key={category} className="mb-2">
                <p className="px-3 py-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {category}
                </p>
                <ul>
                  {rows.map((r) => {
                    const isExpanded = expandedId === r.id;
                    const entryCount = entryCountFor(r);
                    const lastRoll = recent[r.id];
                    return (
                      <li
                        key={r.id}
                        className="border-b border-border/30 last:border-0"
                      >
                        <div className="flex items-stretch">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : r.id)
                            }
                            className="flex-1 flex items-center gap-1.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors min-w-0"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate text-xs font-medium">
                              {r.name}
                            </span>
                            {r.builtIn && (
                              <Sparkles
                                className="h-3 w-3 text-amber-400/70 shrink-0"
                                aria-label="Built-in table"
                              />
                            )}
                            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                              {entryCount}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRoll(r)}
                            disabled={
                              rolling === r.id || entryCount === 0
                            }
                            className={cn(
                              "shrink-0 px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors border-l border-border/30",
                              entryCount === 0
                                ? "text-muted-foreground/50 cursor-not-allowed"
                                : "text-amber-400 hover:bg-amber-500/10",
                              rolling === r.id && "animate-pulse"
                            )}
                            title={
                              entryCount === 0
                                ? "Add at least one entry first"
                                : "Roll on this table"
                            }
                          >
                            Roll
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="bg-muted/10 px-3 py-2 space-y-1.5">
                            {r.description && (
                              <p className="text-[11px] text-muted-foreground italic">
                                {r.description}
                              </p>
                            )}
                            {lastRoll && (
                              <div className="rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1.5">
                                <p className="text-[9px] uppercase tracking-wider text-amber-400 mb-1">
                                  Last roll
                                </p>
                                <ul className="space-y-0.5">
                                  {lastRoll.map((p, i) => (
                                    <li key={i} className="text-xs">
                                      <span className="font-medium">
                                        {p.value}
                                      </span>
                                      {typeof p.metadata?.price !==
                                        "undefined" && (
                                        <span className="ml-1.5 text-[10px] text-muted-foreground font-mono">
                                          {String(p.metadata.price)}
                                        </span>
                                      )}
                                      {typeof p.metadata?.rarity !==
                                        "undefined" && (
                                        <span className="ml-1.5 text-[9px] uppercase text-muted-foreground">
                                          {String(p.metadata.rarity)}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {isDm && !r.builtIn && (
                              <div className="pt-0.5">
                                <Link
                                  href={`/campaigns/${campaignId}/forge?tab=random-tables&table=${r.id}`}
                                  className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-amber-400"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Edit in Forge
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
