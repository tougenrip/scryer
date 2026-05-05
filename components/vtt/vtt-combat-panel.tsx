"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { InitiativeTracker } from "@/components/combat/InitiativeTracker";

type Props = {
  campaignId: string;
  mapId: string | null;
  isDm: boolean;
};

export function VttCombatPanel({ campaignId, mapId, isDm }: Props) {
  if (!mapId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col p-3 text-xs text-muted-foreground">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-foreground">
          Combat
        </p>
        <p>Load a scene first, then use this bookmark to run the full combat tracker.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-1.5 pr-2">
        <InitiativeTracker campaignId={campaignId} mapId={mapId} isDm={isDm} />
      </div>
    </ScrollArea>
  );
}
