"use client";

import { useMemo } from "react";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import type { Character } from "@/hooks/useDndContent";
import { cn } from "@/lib/utils";
import { Heart, Shield } from "lucide-react";

interface Props {
  campaignId: string;
  userId: string;
  onSelect: (characterId: string) => void;
}

/**
 * Mobile party tab — read-only HP / AC / conditions for every PC in
 * the campaign. Subscribes to the same character realtime stream the
 * desktop uses, so HP changes ripple in instantly.
 */
export function MobilePartyTab({ campaignId, userId, onSelect }: Props) {
  const { characters, loading } = useCampaignCharacters(campaignId);

  // Sort: own characters first, then by name.
  const sorted = useMemo(() => {
    return [...characters].sort((a, b) => {
      const aMine = a.user_id === userId ? 0 : 1;
      const bMine = b.user_id === userId ? 0 : 1;
      if (aMine !== bMine) return aMine - bMine;
      return (a.name ?? "").localeCompare(b.name ?? "");
    });
  }, [characters, userId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-neutral-500">
        Loading party…
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-xs text-neutral-500">
          No characters in this campaign yet.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-3 pb-6 pt-3">
      <ul className="space-y-2">
        {sorted.map((c) => (
          <PartyRow
            key={c.id}
            c={c}
            mine={c.user_id === userId}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function PartyRow({
  c,
  mine,
  onClick,
}: {
  c: Character;
  mine: boolean;
  onClick: () => void;
}) {
  const max = c.hp_max ?? 0;
  const cur = c.hp_current ?? 0;
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const downed = max > 0 && cur <= 0;

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "w-full text-left rounded-lg border p-3 transition-colors",
          mine
            ? "border-amber-500/40 bg-amber-500/5 active:bg-amber-500/10"
            : "border-neutral-800 bg-neutral-900/60 active:bg-neutral-900",
          downed && "opacity-60"
        )}
      >
      <div className="flex items-center gap-3">
        {c.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image_url}
            alt=""
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-semibold shrink-0">
            {c.name?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{c.name}</p>
            {mine && (
              <span className="text-[9px] px-1 py-0.5 rounded border border-amber-500/40 text-amber-400 uppercase tracking-wider">
                You
              </span>
            )}
            {downed && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase tracking-wider">
                Down
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 truncate">
            Lvl {c.level ?? 1}
            {c.class_index ? ` · ${c.class_index}` : ""}
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-0.5 text-neutral-300">
            <Shield className="h-3 w-3 text-amber-400" />
            <span className="font-semibold tabular-nums">{c.armor_class}</span>
          </span>
        </div>
      </div>

      {/* HP bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-1">
          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-400">
            <Heart className="h-3 w-3 text-rose-400" />
            HP
          </span>
          <span className="text-[11px] font-semibold tabular-nums">
            <span
              className={cn(
                pct < 25
                  ? "text-rose-400"
                  : pct < 60
                    ? "text-amber-400"
                    : "text-emerald-400"
              )}
            >
              {cur}
            </span>
            <span className="text-neutral-500"> / {max}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              pct < 25
                ? "bg-rose-500"
                : pct < 60
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Conditions */}
      {c.conditions && c.conditions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {c.conditions.map((cond) => (
            <span
              key={cond}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300"
            >
              {cond}
            </span>
          ))}
        </div>
      )}
      </button>
    </li>
  );
}
