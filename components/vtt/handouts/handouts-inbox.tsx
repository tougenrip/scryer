"use client";

import { useMemo, useState } from "react";
import { useVttHandouts, type HandoutKind } from "@/hooks/useVttHandouts";
import { useHandoutsStore } from "@/lib/store/handouts-store";
import { Input } from "@/components/ui/input";
import {
  Inbox,
  MapPinned,
  Image as ImageIcon,
  ScrollText,
  User as UserIcon,
  Search,
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

type KindFilter = "all" | HandoutKind;
type ReadFilter = "all" | "unread";

const KIND_TABS: Array<{ id: KindFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "scene", label: "Scenes" },
  { id: "pin", label: "Pins" },
  { id: "bounty", label: "Bounties" },
  { id: "npc", label: "NPCs" },
];

export function HandoutsInbox({ campaignId, userId, isDm }: Props) {
  const { handouts, reads, readCount } = useVttHandouts(campaignId, userId);
  const open = useHandoutsStore((s) => s.open);
  const closeCard = useHandoutsStore((s) => s.closeCard);
  const cards = useHandoutsStore((s) => s.cards);
  const openSet = new Set(cards.map((c) => c.id));

  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return handouts.filter((h) => {
      if (kindFilter !== "all" && h.snapshot.kind !== kindFilter) return false;
      if (readFilter === "unread" && reads[h.id]?.read_at) return false;
      if (q) {
        const hay = `${h.snapshot.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [handouts, kindFilter, readFilter, reads, query]);

  if (handouts.length === 0) {
    return (
      <div className="rounded border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        <Inbox className="mx-auto mb-2 h-5 w-5" />
        No handouts yet.
      </div>
    );
  }

  // Counts for the kind-tab badges (computed against the read filter +
  // search so they reflect what the user would actually see).
  const tabCounts = (kind: KindFilter) =>
    handouts.filter((h) => {
      if (kind !== "all" && h.snapshot.kind !== kind) return false;
      if (readFilter === "unread" && reads[h.id]?.read_at) return false;
      const q = query.trim().toLowerCase();
      if (q && !(h.snapshot.name ?? "").toLowerCase().includes(q)) return false;
      return true;
    }).length;

  return (
    <div className="space-y-2">
      {/* Filters */}
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="h-3 w-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search handouts…"
            className="h-7 pl-7 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {KIND_TABS.map((t) => {
            const count = tabCounts(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setKindFilter(t.id)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded font-medium transition-colors",
                  kindFilter === t.id
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}{" "}
                <span className="opacity-60 tabular-nums">{count}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() =>
              setReadFilter(readFilter === "unread" ? "all" : "unread")
            }
            className={cn(
              "text-[10px] px-2 py-0.5 rounded font-medium transition-colors ml-auto",
              readFilter === "unread"
                ? "bg-amber-500/20 text-amber-400"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
            title="Show only unread"
          >
            Unread
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-2 py-3 text-[11px] italic text-muted-foreground text-center">
          No handouts match these filters.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded border border-border overflow-hidden">
          {filtered.map((h) => {
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
                ) : s.kind === "npc" ? (
                  <UserIcon className="h-4 w-4 text-amber-400" />
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
                    : s.kind === "npc"
                    ? "NPC"
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
      )}
    </div>
  );
}
