"use client";

import { useEffect, useState } from "react";
import {
  useCustomLootTables,
  fetchEntries,
  insertEntry,
  deleteEntry,
  type CustomLootTable,
  type CustomLootTableEntry,
} from "@/hooks/useCustomLootTables";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Trash2,
  Edit2,
  Coins,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string;
  isDm: boolean;
}

const RARITY_COLOR: Record<string, string> = {
  Common: "bg-neutral-500/20 text-neutral-200 border-neutral-500/30",
  Uncommon: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Rare: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  "Very Rare": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Legendary: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function LootTablesTab({ campaignId, isDm }: Props) {
  const { tables, createTable, updateTable, deleteTable } =
    useCustomLootTables(campaignId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tables.find((t) => t.id === selectedId) ?? null;

  if (!isDm) {
    return (
      <div className="p-6 text-sm text-muted-foreground italic text-center">
        Custom loot tables are DM-only.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col lg:flex-row gap-3 p-3 min-h-0">
      <aside className="lg:w-72 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold flex-1">Loot tables</h2>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            New
          </Button>
        </div>
        {tables.length === 0 ? (
          <p className="text-xs italic text-muted-foreground py-3 text-center">
            No tables yet. Create one to get started.
          </p>
        ) : (
          <ul className="space-y-1">
            {tables.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "w-full text-left rounded border bg-background/50 px-2 py-1.5 text-xs hover:bg-muted/40 transition-colors",
                    selectedId === t.id && "border-amber-500/50 bg-amber-500/5"
                  )}
                >
                  <p className="font-medium truncate">{t.name}</p>
                  {t.description && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {t.rolls_per_use} roll{t.rolls_per_use === 1 ? "" : "s"}/use
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className="flex-1 min-w-0 min-h-0">
        {selected ? (
          <TableEditor
            table={selected}
            onUpdate={updateTable}
            onDelete={async () => {
              await deleteTable(selected.id);
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm italic text-muted-foreground border border-dashed rounded">
            Pick a table on the left or create one.
          </div>
        )}
      </main>

      <CreateTableDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (vals) => {
          const t = await createTable(vals);
          if (t) setSelectedId(t.id);
        }}
      />
    </div>
  );
}

function CreateTableDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (vals: {
    name: string;
    description?: string;
    rolls_per_use?: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rolls, setRolls] = useState(1);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setRolls(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New loot table</DialogTitle>
          <DialogDescription>
            Each row in a table is one possible result, weighted by relative
            frequency.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="lt-name">Name</Label>
            <Input
              id="lt-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Goblin warband loot"
            />
          </div>
          <div>
            <Label htmlFor="lt-desc">Description (optional)</Label>
            <Textarea
              id="lt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this represents…"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="lt-rolls">Rolls per use</Label>
            <Input
              id="lt-rolls"
              type="number"
              min={1}
              max={20}
              value={rolls}
              onChange={(e) =>
                setRolls(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Rolling on this table picks this many random rows (with
              replacement). Use 1 for "pick one of these," 3 for "give the
              party 3 of these," etc.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={async () => {
              await onCreate({
                name: name.trim(),
                description: description.trim() || undefined,
                rolls_per_use: rolls,
              });
              onOpenChange(false);
            }}
          >
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TableEditor({
  table,
  onUpdate,
  onDelete,
}: {
  table: CustomLootTable;
  onUpdate: (
    id: string,
    updates: Partial<Pick<CustomLootTable, "name" | "description" | "rolls_per_use">>
  ) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [entries, setEntries] = useState<CustomLootTableEntry[]>([]);
  const [name, setName] = useState(table.name);
  const [description, setDescription] = useState(table.description ?? "");
  const [rolls, setRolls] = useState(table.rolls_per_use);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    setName(table.name);
    setDescription(table.description ?? "");
    setRolls(table.rolls_per_use);
  }, [table.id, table.name, table.description, table.rolls_per_use]);

  const reload = async () => {
    setEntries(await fetchEntries(table.id));
  };
  useEffect(() => {
    void reload();
  }, [table.id]);

  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);

  return (
    <div className="space-y-3">
      <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Edit2 className="h-3.5 w-3.5 text-amber-400" />
          <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
            Table settings
          </p>
          <div className="flex-1" />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-rose-400 hover:bg-rose-500/10"
            onClick={() => {
              if (confirm(`Delete "${table.name}"?`)) void onDelete();
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" /> Delete table
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-2">
            <Label className="text-[10px]">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                if (name.trim() && name !== table.name)
                  void onUpdate(table.id, { name: name.trim() });
              }}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-[10px]">Rolls/use</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={rolls}
              onChange={(e) =>
                setRolls(Math.max(1, parseInt(e.target.value, 10) || 1))
              }
              onBlur={() => {
                if (rolls !== table.rolls_per_use)
                  void onUpdate(table.id, { rolls_per_use: rolls });
              }}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div>
          <Label className="text-[10px]">Description</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (table.description ?? ""))
                void onUpdate(table.id, {
                  description: description.trim() || null,
                });
            }}
          />
        </div>
      </div>

      <div className="rounded border border-border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold flex-1">
            Rows{" "}
            <span className="text-xs text-muted-foreground">
              ({entries.length} · total weight {totalWeight})
            </span>
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add row
          </Button>
        </div>
        {entries.length === 0 ? (
          <p className="text-xs italic text-muted-foreground py-3 text-center">
            No rows yet. Add at least one before this table can be rolled.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2 py-2 text-sm"
              >
                <span
                  className="shrink-0 inline-flex items-center justify-center min-w-[2rem] rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono"
                  title="Weight (relative odds)"
                >
                  ×{e.weight}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="truncate block">
                    {e.label || e.item_name || coinSummary(e) || "(empty row)"}
                  </span>
                  {e.item_rarity && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] mt-0.5",
                        RARITY_COLOR[e.item_rarity]
                      )}
                    >
                      {e.item_rarity}
                    </Badge>
                  )}
                  {(e.cp || e.sp || e.ep || e.gp || e.pp) && (
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      <Coins className="inline h-3 w-3 mb-0.5" />{" "}
                      {coinSummary(e)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteEntry(e.id);
                    await reload();
                  }}
                  title="Remove row"
                  className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-rose-400 hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AddEntryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tableId={table.id}
        onAdded={() => {
          setAddOpen(false);
          void reload();
        }}
      />
    </div>
  );
}

function coinSummary(e: CustomLootTableEntry): string {
  const parts: string[] = [];
  if (e.pp) parts.push(`${e.pp}pp`);
  if (e.gp) parts.push(`${e.gp}gp`);
  if (e.ep) parts.push(`${e.ep}ep`);
  if (e.sp) parts.push(`${e.sp}sp`);
  if (e.cp) parts.push(`${e.cp}cp`);
  return parts.join(" ");
}

function AddEntryDialog({
  open,
  onOpenChange,
  tableId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tableId: string;
  onAdded: () => void;
}) {
  const [weight, setWeight] = useState(1);
  const [label, setLabel] = useState("");
  const [coins, setCoins] = useState({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
  const [picked, setPicked] = useState<{
    source: "srd";
    kind: "equipment" | "magic";
    index: string;
    name: string;
    rarity: string | null;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [searchKind, setSearchKind] = useState<"equipment" | "magic">("magic");
  const [results, setResults] = useState<
    Array<{ index: string; name: string; rarity: string | null; kind: "equipment" | "magic" }>
  >([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) {
      setWeight(1);
      setLabel("");
      setCoins({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
      setPicked(null);
      setSearch("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const supabase = createClient();
    const fetchIt = async () => {
      const table = searchKind === "magic" ? "srd_magic_items" : "srd_equipment";
      const { data } = await supabase
        .from(table)
        .select(searchKind === "magic" ? "index,name,rarity" : "index,name")
        .ilike("name", `%${q}%`)
        .limit(20);
      if (cancelled) return;
      setResults(
        (data ?? []).map((d) => ({
          index: (d as { index: string }).index,
          name: (d as { name: string }).name,
          rarity:
            (d as { rarity?: string | null }).rarity ??
            (searchKind === "equipment" ? null : null),
          kind: searchKind,
        }))
      );
      setSearching(false);
    };
    void fetchIt();
    return () => {
      cancelled = true;
    };
  }, [search, searchKind]);

  const submit = async () => {
    await insertEntry({
      table_id: tableId,
      weight,
      label: label.trim() || null,
      item_source: picked ? "srd" : null,
      item_kind: picked?.kind ?? null,
      item_index: picked?.index ?? null,
      item_name: picked?.name ?? null,
      item_rarity: picked?.rarity ?? null,
      cp: coins.cp,
      sp: coins.sp,
      ep: coins.ep,
      gp: coins.gp,
      pp: coins.pp,
    });
    onAdded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add row</DialogTitle>
          <DialogDescription>
            A row can grant an item, coin, or both. Weight controls how often
            this row is picked relative to the others.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label className="text-[10px]">Label (optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="A pouch of gems"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px]">Weight</Label>
              <Input
                type="number"
                min={1}
                value={weight}
                onChange={(e) =>
                  setWeight(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="rounded border border-border p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Item
              </p>
              {picked && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] ml-auto"
                  onClick={() => setPicked(null)}
                >
                  Clear
                </Button>
              )}
            </div>
            {picked ? (
              <div className="rounded bg-muted/50 px-2 py-1.5 text-sm">
                {picked.name}
                {picked.rarity && (
                  <Badge
                    variant="outline"
                    className={cn("ml-2 text-[9px]", RARITY_COLOR[picked.rarity])}
                  >
                    {picked.rarity}
                  </Badge>
                )}
              </div>
            ) : (
              <>
                <div className="flex gap-1">
                  {(["magic", "equipment"] as const).map((k) => (
                    <Button
                      key={k}
                      type="button"
                      size="sm"
                      variant={searchKind === k ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setSearchKind(k)}
                    >
                      {k === "magic" ? "Magic items" : "Equipment"}
                    </Button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search…"
                    className="h-8 pl-7 text-xs"
                  />
                </div>
                {searching && (
                  <p className="text-[10px] italic text-muted-foreground">
                    Searching…
                  </p>
                )}
                {results.length > 0 && (
                  <ul className="max-h-40 overflow-y-auto divide-y divide-border">
                    {results.map((r) => (
                      <li key={`${r.kind}-${r.index}`}>
                        <button
                          type="button"
                          className="w-full text-left px-2 py-1.5 hover:bg-muted text-xs"
                          onClick={() =>
                            setPicked({
                              source: "srd",
                              kind: r.kind,
                              index: r.index,
                              name: r.name,
                              rarity: r.rarity,
                            })
                          }
                        >
                          {r.name}
                          {r.rarity && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "ml-2 text-[9px]",
                                RARITY_COLOR[r.rarity]
                              )}
                            >
                              {r.rarity}
                            </Badge>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="rounded border border-border p-2 space-y-1">
            <div className="flex items-center gap-2">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Coin
              </p>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {(["cp", "sp", "ep", "gp", "pp"] as const).map((k) => (
                <div key={k}>
                  <Label className="text-[9px] uppercase">{k}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={coins[k]}
                    onChange={(e) =>
                      setCoins({
                        ...coins,
                        [k]: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={
              !picked &&
              !coins.cp &&
              !coins.sp &&
              !coins.ep &&
              !coins.gp &&
              !coins.pp
            }
          >
            Add row
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
