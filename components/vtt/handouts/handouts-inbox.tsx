"use client";

import { useVttHandouts } from "@/hooks/useVttHandouts";
import { useHandoutsStore } from "@/lib/store/handouts-store";
import {
  Inbox,
  MapPinned,
  Image as ImageIcon,
  ScrollText,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string | null;
  userId: string | null;
  isDm: boolean;
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}

export function HandoutsInbox({ campaignId, userId, isDm }: Props) {
  const { handouts, reads, readCount } = useVttHandouts(campaignId, userId);
  const open = useHandoutsStore((s) => s.open);
  const closeCard = useHandoutsStore((s) => s.closeCard);
  // Subscribe to the cards array reference directly — deriving a new array
  // (.map) inside the selector returns a fresh value every render and breaks
  // useSyncExternalStore's snapshot caching ("infinite loop" warning).
  const cards = useHandoutsStore((s) => s.cards);
  const openSet = new Set(cards.map((c) => c.id));

  if (handouts.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        <Inbox className="mx-auto mb-2 h-5 w-5" />
        No handouts yet.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded border border-border overflow-hidden">
      {handouts.map((h) => {
        const own = reads[h.id];
        const unread = !own?.read_at;
        const counts = isDm ? readCount(h.id) : null;
        const s = h.snapshot;
        const isOpen = openSet.has(h.id);
        return (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => (isOpen ? closeCard(h.id) : open(h.id))}
              className={cn(
                "w-full text-left flex items-center gap-3 px-3 py-2 hover:bg-muted/40 transition-colors",
                unread && "bg-amber-500/5",
                isOpen && "bg-amber-500/10"
              )}
              title={isOpen ? "Close handout window" : "Open handout"}
            >
              <div className="h-9 w-9 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center">
                {s.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image_url} alt="" className="h-full w-full object-cover" />
                ) : s.kind === "pin" ? (
                  <MapPinned className="h-4 w-4 text-muted-foreground" />
                ) : s.kind === "bounty" ? (
                  <ScrollText className="h-4 w-4 text-amber-400" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {unread && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  )}
                  <p className="truncate text-sm font-medium">
                    {s.name || "(untitled)"}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {s.kind === "scene"
                    ? "Scene"
                    : s.kind === "bounty"
                    ? "Bounty"
                    : "Pin"}{" "}
                  · {relativeTime(h.created_at)}
                  {counts && ` · ${counts.read} read`}
                </p>
              </div>
              {isOpen && (
                <X className="h-4 w-4 text-amber-400 shrink-0" />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
