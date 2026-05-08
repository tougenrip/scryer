"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Dice6, Plus, Trash2, Send } from "lucide-react";
import {
  rollLootForEncounter,
  rerollMagicItem,
  type RolledLoot,
  type RolledItem,
  type RolledCoins,
} from "@/lib/loot/roll-loot";
import { usePartyTreasury } from "@/hooks/usePartyTreasury";
import { usePartyLoot } from "@/hooks/usePartyLoot";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  encounterId: string | null;
  encounterName: string | null;
  /** Monsters present in the encounter — drives CR-tier loot. */
  monsters: Array<{ challenge_rating: number }>;
  /** Run after commit so the parent can also call endEncounter(). */
  onCommitted: () => void | Promise<void>;
}

const RARITY_COLOR: Record<string, string> = {
  Common: "bg-neutral-500/20 text-neutral-200",
  Uncommon: "bg-emerald-500/20 text-emerald-300",
  Rare: "bg-sky-500/20 text-sky-300",
  "Very Rare": "bg-violet-500/20 text-violet-300",
  Legendary: "bg-amber-500/20 text-amber-300",
};

export function EndWithLootDialog({
  open,
  onOpenChange,
  campaignId,
  encounterId,
  encounterName,
  monsters,
  onCommitted,
}: Props) {
  const [rolling, setRolling] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [rolled, setRolled] = useState<RolledLoot | null>(null);
  /** Per-row keep/skip checkbox state, by item uid. */
  const [keep, setKeep] = useState<Record<string, boolean>>({});
  /** Editable coin overrides — DM might want to round 47gp to 50. */
  const [coinOverrides, setCoinOverrides] = useState<RolledCoins>({
    cp: 0,
    sp: 0,
    ep: 0,
    gp: 0,
    pp: 0,
  });
  const [adding, setAdding] = useState(false);

  const { addCoins } = usePartyTreasury(campaignId);
  const { insertItems } = usePartyLoot(campaignId);

  const doRoll = async () => {
    setRolling(true);
    const r = await rollLootForEncounter(monsters);
    setRolled(r);
    const initialKeep: Record<string, boolean> = {};
    for (const it of r.items) initialKeep[it.uid] = true;
    setKeep(initialKeep);
    setCoinOverrides(r.coins);
    setRolling(false);
  };

  // Roll once when the dialog opens.
  useEffect(() => {
    if (open && !rolled && !rolling) {
      void doRoll();
    }
    if (!open) {
      // Reset on close so reopening shows a fresh roll.
      setRolled(null);
      setKeep({});
      setCoinOverrides({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleRerollAll = async () => {
    await doRoll();
  };

  const handleRerollItem = async (uid: string) => {
    if (!rolled) return;
    const item = rolled.items.find((i) => i.uid === uid);
    if (!item) return;
    const fresh = await rerollMagicItem(item);
    if (!fresh) return;
    setRolled({
      ...rolled,
      items: rolled.items.map((i) => (i.uid === uid ? fresh : i)),
    });
    setKeep((prev) => {
      const next = { ...prev };
      delete next[uid];
      next[fresh.uid] = true;
      return next;
    });
  };

  const handleRemoveItem = (uid: string) => {
    if (!rolled) return;
    setRolled({ ...rolled, items: rolled.items.filter((i) => i.uid !== uid) });
    setKeep((prev) => {
      const next = { ...prev };
      delete next[uid];
      return next;
    });
  };

  const handleAddItem = async () => {
    setAdding(true);
    const supabase = createClient();
    // Pull a small candidate list — DM will pick. v1: just grab 50 random
    // magic items so they have something to choose from. (A full picker can
    // come later.)
    const { data } = await supabase
      .from("srd_magic_items")
      .select("index,name,rarity")
      .limit(50);
    setAdding(false);
    if (!data || data.length === 0 || !rolled) return;
    const pick = data[Math.floor(Math.random() * data.length)];
    const newItem: RolledItem = {
      uid: typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()),
      source: "srd",
      kind: "magic",
      index: pick.index as string,
      name: pick.name as string,
      rarity: (pick.rarity as string) ?? null,
    };
    setRolled({ ...rolled, items: [...rolled.items, newItem] });
    setKeep((prev) => ({ ...prev, [newItem.uid]: true }));
  };

  const handleCommit = async () => {
    if (!rolled || !campaignId) return;
    setCommitting(true);
    try {
      const itemsToKeep = rolled.items.filter((i) => keep[i.uid]);
      await Promise.all([
        addCoins(coinOverrides),
        insertItems(itemsToKeep, encounterId),
      ]);
      await onCommitted();
      onOpenChange(false);
    } finally {
      setCommitting(false);
    }
  };

  const items = rolled?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>End with loot</DialogTitle>
          <DialogDescription>
            {encounterName ? `${encounterName} · ` : ""}
            Tier {rolled?.trace.tier ?? "—"}. Reroll, edit, or remove anything
            that doesn&apos;t fit. On send, coin lands in the party treasury
            and items go to the shared inventory for players to claim.
          </DialogDescription>
        </DialogHeader>

        {rolling || !rolled ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Rolling…
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
            {/* Coin row */}
            <section className="rounded border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-amber-400">Coins</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleRerollAll}
                  className="h-7 text-xs"
                >
                  <Dice6 className="h-3.5 w-3.5 mr-1" /> Reroll all
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {(["cp", "sp", "ep", "gp", "pp"] as const).map((k) => (
                  <div key={k} className="space-y-1">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {k}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={coinOverrides[k]}
                      onChange={(e) =>
                        setCoinOverrides({
                          ...coinOverrides,
                          [k]: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Item list */}
            <section className="rounded border border-border p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">
                  Items{" "}
                  <span className="text-xs text-muted-foreground">
                    ({items.filter((i) => keep[i.uid]).length} keep / {items.length})
                  </span>
                </h3>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleAddItem}
                  disabled={adding}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="text-sm italic text-muted-foreground py-4 text-center">
                  No magic items rolled. Coin only this time.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((it) => (
                    <li
                      key={it.uid}
                      className={cn(
                        "flex items-center gap-2 py-2 transition-opacity",
                        !keep[it.uid] && "opacity-40"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={!!keep[it.uid]}
                        onChange={(e) =>
                          setKeep({ ...keep, [it.uid]: e.target.checked })
                        }
                        className="h-4 w-4 accent-amber-500"
                      />
                      <span className="flex-1 text-sm">{it.name}</span>
                      {it.rarity && (
                        <Badge
                          className={cn(
                            "text-[10px] uppercase tracking-wide",
                            RARITY_COLOR[it.rarity] ?? "bg-muted text-muted-foreground"
                          )}
                          variant="secondary"
                        >
                          {it.rarity}
                        </Badge>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRerollItem(it.uid)}
                        title="Reroll this item"
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-amber-400"
                      >
                        <Dice6 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.uid)}
                        title="Remove"
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={committing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCommit}
            disabled={committing || rolling || !rolled}
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            {committing ? "Sending…" : "Send to party & end encounter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
