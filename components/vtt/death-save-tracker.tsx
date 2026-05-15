"use client";

import { cn } from "@/lib/utils";
import { Heart, ShieldCheck, Dice5 } from "lucide-react";

interface Props {
  successes: number;
  failures: number;
  isStable: boolean;
  /** When false, the dots are display-only. */
  editable?: boolean;
  /** Called with the new value after a click. The parent persists. */
  onChange?: (next: {
    successes: number;
    failures: number;
    isStable: boolean;
  }) => void;
  /** Compact (combat rail) vs full (mobile sheet). */
  compact?: boolean;
  /** Optional roll handler — when provided, a "Roll" button is
   *  rendered that calls back with a fresh d20 result. The parent
   *  decides what to do with it (post to chat, apply to state). */
  onRoll?: () => void;
}

/**
 * D&D 5e death-save tracker. Three success dots, three failure dots,
 * a stabilize toggle. Clicking a dot toggles it on (if off) or clears
 * it back to count-1 (lets the DM/player undo a misclick without a
 * full reset). Stabilizing locks both rows visually and pings the
 * `is_stable` flag so the combat rail can stop highlighting the
 * downed token as urgently.
 */
export function DeathSaveTracker({
  successes,
  failures,
  isStable,
  editable = true,
  onChange,
  compact = false,
  onRoll,
}: Props) {
  const apply = (
    nextSuccesses: number,
    nextFailures: number,
    stable = isStable
  ) => {
    onChange?.({
      successes: nextSuccesses,
      failures: nextFailures,
      isStable: stable,
    });
  };

  const clickSuccess = (idx: number) => {
    if (!editable || isStable) return;
    // Click an unmarked → fill up to that index. Click a marked at
    // current count → step back one. Lets a misclick cost only one
    // tap to undo.
    if (idx + 1 <= successes) apply(idx, failures);
    else apply(idx + 1, failures);
  };
  const clickFailure = (idx: number) => {
    if (!editable || isStable) return;
    if (idx + 1 <= failures) apply(successes, idx);
    else apply(successes, idx + 1);
  };

  const dotSize = compact ? "h-2.5 w-2.5" : "h-3 w-3";
  const labelClass = compact
    ? "text-[8px]"
    : "text-[10px]";
  const showRoll = !!onRoll && editable && !isStable;

  return (
    <div
      className={cn(
        compact
          ? "space-y-0.5 rounded border border-white/15 bg-black/55 px-1 py-1 backdrop-blur-sm"
          : "space-y-0.5",
        isStable && "opacity-70"
      )}
    >
      {/* Roll button — auto-d20 + apply success/failure. Sits above
          the dots so it's the first thing the eye lands on. */}
      {showRoll && (
        <button
          type="button"
          onClick={onRoll}
          className={cn(
            "w-full inline-flex items-center justify-center gap-1 rounded font-semibold uppercase tracking-wider transition-colors",
            "bg-rose-500/20 text-rose-200 border border-rose-400/40 hover:bg-rose-500/30 active:scale-95",
            compact ? "h-6 text-[9px] mb-1" : "h-7 text-[10px] mb-1"
          )}
          title="Roll a death saving throw (d20)"
        >
          <Dice5 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Roll save
        </button>
      )}

      {/* Successes */}
      <div className="flex items-center gap-1">
        <Heart
          className={cn(
            compact ? "h-2.5 w-2.5" : "h-3 w-3",
            "text-emerald-400 shrink-0"
          )}
        />
        {!compact && (
          <span className={cn(labelClass, "uppercase tracking-wider text-emerald-400 w-12")}>
            Saves
          </span>
        )}
        {[0, 1, 2].map((i) => {
          const filled = i < successes;
          return (
            <button
              key={`s-${i}`}
              type="button"
              disabled={!editable || isStable}
              onClick={() => clickSuccess(i)}
              className={cn(
                "rounded-full border transition-colors",
                dotSize,
                filled
                  ? "bg-emerald-500 border-emerald-300"
                  : "bg-transparent border-emerald-500/40 hover:border-emerald-400",
                !editable && "cursor-default",
                editable && !isStable && "active:scale-90"
              )}
              aria-label={`Death save success ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Failures */}
      <div className="flex items-center gap-1">
        <Heart
          className={cn(
            compact ? "h-2.5 w-2.5" : "h-3 w-3",
            "text-rose-400 shrink-0"
          )}
        />
        {!compact && (
          <span className={cn(labelClass, "uppercase tracking-wider text-rose-400 w-12")}>
            Fails
          </span>
        )}
        {[0, 1, 2].map((i) => {
          const filled = i < failures;
          return (
            <button
              key={`f-${i}`}
              type="button"
              disabled={!editable || isStable}
              onClick={() => clickFailure(i)}
              className={cn(
                "rounded-full border transition-colors",
                dotSize,
                filled
                  ? "bg-rose-500 border-rose-300"
                  : "bg-transparent border-rose-500/40 hover:border-rose-400",
                !editable && "cursor-default",
                editable && !isStable && "active:scale-90"
              )}
              aria-label={`Death save failure ${i + 1}`}
            />
          );
        })}
      </div>

      {/* Stabilize toggle (full size only) */}
      {!compact && editable && (
        <button
          type="button"
          onClick={() =>
            apply(successes, failures, !isStable)
          }
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 border transition-colors",
            isStable
              ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-300"
              : "border-neutral-700 bg-neutral-800/40 text-neutral-400 hover:text-neutral-200"
          )}
        >
          <ShieldCheck className="h-3 w-3" />
          {isStable ? "Stable" : "Stabilize"}
        </button>
      )}
      {compact && isStable && (
        <p className="text-[8px] uppercase tracking-wider text-cyan-300 leading-none">
          Stable
        </p>
      )}
    </div>
  );
}
