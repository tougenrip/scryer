"use client";

import { useCombat } from "@/hooks/useCombat";
import { useVttStore } from "@/lib/store/vtt-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2 } from "lucide-react";

type Props = {
  campaignId: string;
  mapId: string | null;
  isDm: boolean;
  onOpenFullTracker?: () => void;
};

export function VttInitiativePanel({
  campaignId,
  mapId,
  isDm,
  onOpenFullTracker,
}: Props) {
  const setSelectedTokenId = useVttStore((s) => s.setSelectedTokenId);
  const selectedTokenId = useVttStore((s) => s.selectedTokenId);

  const {
    activeEncounter,
    participants,
    loading,
    nextTurn,
    prevTurn,
  } = useCombat(campaignId, mapId ?? undefined);

  if (!mapId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3 text-xs text-muted-foreground">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground">
          Initiative
        </p>
        <p>Load a scene from the Scenes bookmark to track combat on this map.</p>
      </div>
    );
  }

  const sorted = [...participants].sort((a, b) => a.turn_order - b.turn_order);
  const currentIndex = activeEncounter?.current_turn_index ?? 0;

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 text-xs text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-border px-2 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Initiative
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          title="Open full combat tracker"
          onClick={() => onOpenFullTracker?.()}
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1.5 p-2">
          {!activeEncounter && (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">
              No encounter. Open the <span className="font-medium text-foreground">Battle</span>{" "}
              bookmark to start combat.
            </p>
          )}
          {sorted.map((p, index) => {
            const token = p.token;
            const name = token?.name || "Unknown";
            const isTurn = index === currentIndex;
            const isSel = token && selectedTokenId === token.id;
            const hp = token?.hp_current ?? 0;
            const maxHp = token?.hp_max ?? 1;
            const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => token && setSelectedTokenId(token.id)}
                className={cn(
                  "relative w-full rounded-md border px-2 py-1.5 text-left transition-colors",
                  isTurn
                    ? "border-2 border-primary bg-card"
                    : isSel
                      ? "border-border bg-muted"
                      : "border-border bg-background hover:bg-muted"
                )}
              >
                {isTurn && (
                  <div className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-primary" />
                )}
                <div className="flex items-center gap-2 pl-1">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                    {p.initiative_roll}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{name}</div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-all",
                          hpPct > 60
                            ? "bg-emerald-500"
                            : hpPct > 25
                              ? "bg-amber-500"
                              : "bg-destructive"
                        )}
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {isDm && activeEncounter && sorted.length > 0 && (
        <div className="flex gap-1 border-t border-border p-2">
          <Button variant="outline" size="sm" className="h-8 flex-1 text-xs" onClick={() => prevTurn()}>
            Prev
          </Button>
          <Button size="sm" className="h-8 flex-1 text-xs" onClick={() => nextTurn()}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
