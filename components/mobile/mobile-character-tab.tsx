"use client";

import { useState } from "react";
import { useCharacter } from "@/hooks/useDndContent";
import type { Character } from "@/hooks/useDndContent";
import { Button } from "@/components/ui/button";
import { Heart, Shield, Footprints, Zap, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DeathSaveTracker } from "@/components/vtt/death-save-tracker";
import { ConcentrationBadge } from "@/components/vtt/concentration-badge";
import { useVttChat } from "@/hooks/useVttChat";

interface Props {
  character: Character;
  campaignId: string;
  /** When false, render the sheet read-only — no HP editor, no save
   *  controls. Used when viewing another player's character from the
   *  Party tab. Defaults to true. */
  editable?: boolean;
}

const ABILITIES = [
  { key: "strength", label: "STR" },
  { key: "dexterity", label: "DEX" },
  { key: "constitution", label: "CON" },
  { key: "intelligence", label: "INT" },
  { key: "wisdom", label: "WIS" },
  { key: "charisma", label: "CHA" },
] as const;

function modifier(score: number): string {
  const m = Math.floor((score - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
}

/**
 * Mobile character tab — touch-first character readout. Shows the
 * current character's portrait, level/class, HP bar with big +/- HP
 * controls, AC / initiative / speed tiles, and ability score block.
 *
 * Subscribes to the character's realtime row so HP changes from
 * elsewhere (the VTT, the desktop sheet) appear instantly.
 */
export function MobileCharacterTab({
  character: initial,
  campaignId,
  editable = true,
}: Props) {
  const { character, updateCharacter } = useCharacter(initial.id);
  const { sendRollToChat } = useVttChat(campaignId, null, false);
  const c = character ?? initial;

  const [pendingDelta, setPendingDelta] = useState(0);

  const applyDelta = async (delta: number) => {
    const max = c.hp_max || 0;
    const cur = c.hp_current ?? 0;
    const next = Math.max(0, Math.min(max, cur + delta));
    if (next === cur) {
      setPendingDelta(0);
      return;
    }
    await updateCharacter({ hp_current: next });
    setPendingDelta(0);
  };

  const queueDelta = (delta: number) => setPendingDelta((p) => p + delta);

  const hpPct = c.hp_max > 0 ? (c.hp_current / c.hp_max) * 100 : 0;

  /** 5e death save roll — see vtt-combat-rail PcRailExtras for the
   *  same logic; centralized here for the mobile sheet. */
  const rollDeathSave = async () => {
    const successes = c.death_save_successes ?? 0;
    const failures = c.death_save_failures ?? 0;
    const isStable = !!c.is_stable;
    const die = Math.floor(Math.random() * 20) + 1;
    let nextSuccesses = successes;
    let nextFailures = failures;
    let nextStable = isStable;
    let label = "";
    if (die === 20) {
      void updateCharacter({ hp_current: 1 });
      label = "Death Save — NAT 20 (regain 1 HP)";
    } else if (die === 1) {
      nextFailures = Math.min(3, failures + 2);
      label = "Death Save — NAT 1 (2 failures)";
    } else if (die >= 10) {
      nextSuccesses = Math.min(3, successes + 1);
      if (nextSuccesses >= 3) nextStable = true;
      label = `Death Save — Success (${die})`;
    } else {
      nextFailures = Math.min(3, failures + 1);
      label = `Death Save — Failure (${die})`;
    }
    if (die !== 20) {
      void updateCharacter({
        death_save_successes: nextSuccesses,
        death_save_failures: nextFailures,
        is_stable: nextStable,
      });
    }
    void sendRollToChat({
      id: `${Date.now()}-ds`,
      expression: "1d20",
      result: die,
      breakdown: { rolls: [die], modifier: 0, total: die },
      label,
      characterId: c.id,
      characterName: c.name,
      campaignId,
      timestamp: new Date(),
    });
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-3">
      {/* Portrait + name */}
      <div className="flex gap-3 items-center">
        {c.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.image_url}
            alt=""
            className="h-16 w-16 rounded-full object-cover border-2 border-amber-500/30"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-neutral-800 flex items-center justify-center text-lg font-semibold border-2 border-amber-500/30">
            {c.name?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate">{c.name}</p>
          <p className="text-xs text-neutral-400 truncate">
            Lvl {c.level}
            {c.class_index ? ` · ${c.class_index}` : ""}
            {c.race_index ? ` · ${c.race_index}` : ""}
          </p>
        </div>
      </div>

      {/* HP bar + queued-delta editor */}
      <section className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
            <Heart className="h-3.5 w-3.5 text-rose-400" />
            HP
          </div>
          <p className="text-sm font-semibold tabular-nums">
            <span
              className={cn(
                hpPct < 25
                  ? "text-rose-400"
                  : hpPct < 60
                    ? "text-amber-400"
                    : "text-emerald-400"
              )}
            >
              {c.hp_current}
            </span>
            <span className="text-neutral-500"> / {c.hp_max}</span>
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              hpPct < 25
                ? "bg-rose-500"
                : hpPct < 60
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            )}
            style={{ width: `${hpPct}%` }}
          />
        </div>

        {editable && (
          <>
            {/* Touch-friendly delta editor — tap +/- to queue, Apply to commit */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1 h-10 text-base"
                onClick={() => queueDelta(-1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div
                className={cn(
                  "min-w-[64px] text-center font-mono font-semibold tabular-nums text-base",
                  pendingDelta > 0 && "text-emerald-400",
                  pendingDelta < 0 && "text-rose-400"
                )}
              >
                {pendingDelta > 0 ? `+${pendingDelta}` : pendingDelta}
              </div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1 h-10 text-base"
                onClick={() => queueDelta(1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              className="w-full mt-2 h-9"
              disabled={pendingDelta === 0}
              onClick={() => applyDelta(pendingDelta)}
            >
              {pendingDelta > 0
                ? `Heal ${pendingDelta}`
                : pendingDelta < 0
                  ? `Take ${-pendingDelta}`
                  : "Apply"}
            </Button>
          </>
        )}
      </section>

      {/* Death saves — visible only when downed (HP = 0). The
          tracker auto-hides itself once HP rises again because the
          server trigger zeroes the marks. */}
      {c.hp_max > 0 && c.hp_current <= 0 && (
        <section className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
          <p className="text-[10px] uppercase tracking-wider text-rose-300 mb-2">
            Death saves
          </p>
          <DeathSaveTracker
            successes={c.death_save_successes ?? 0}
            failures={c.death_save_failures ?? 0}
            isStable={!!c.is_stable}
            editable={editable}
            onRoll={editable ? rollDeathSave : undefined}
            onChange={(next) => {
              void updateCharacter({
                death_save_successes: next.successes,
                death_save_failures: next.failures,
                is_stable: next.isStable,
              });
            }}
          />
        </section>
      )}

      {/* Concentration — hidden while downed; 5e auto-drops it at 0 HP. */}
      {(c.hp_max <= 0 || c.hp_current > 0) && (
        <section className="mt-3 flex items-center gap-2">
          <ConcentrationBadge
            isConcentrating={!!c.is_concentrating}
            concentratingOn={c.concentrating_on ?? null}
            editable={editable}
            onChange={(next) => {
              void updateCharacter({
                is_concentrating: next.isConcentrating,
                concentrating_on: next.concentratingOn,
              });
            }}
          />
        </section>
      )}

      {/* Stat tiles */}
      <section className="mt-3 grid grid-cols-3 gap-2">
        <StatTile icon={Shield} label="AC" value={c.armor_class} />
        <StatTile icon={Zap} label="Init" value={modifier(c.dexterity)} />
        <StatTile icon={Footprints} label="Speed" value={`${c.speed}ft`} />
      </section>

      {/* Ability scores */}
      <section className="mt-3 grid grid-cols-6 gap-1">
        {ABILITIES.map((a) => (
          <div
            key={a.key}
            className="rounded border border-neutral-800 bg-neutral-900/60 p-1.5 text-center"
          >
            <p className="text-[9px] uppercase tracking-wider text-neutral-500">
              {a.label}
            </p>
            <p className="text-base font-semibold leading-tight">
              {modifier(c[a.key as keyof Character] as number)}
            </p>
            <p className="text-[9px] text-neutral-500 tabular-nums">
              {c[a.key as keyof Character] as number}
            </p>
          </div>
        ))}
      </section>

      {/* Conditions */}
      {c.conditions && c.conditions.length > 0 && (
        <section className="mt-3">
          <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">
            Conditions
          </p>
          <div className="flex flex-wrap gap-1">
            {c.conditions.map((cond) => (
              <span
                key={cond}
                className="text-[11px] px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300"
              >
                {cond}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Footer link to full sheet on desktop */}
      <p className="mt-6 text-center text-[10px] text-neutral-500">
        Full sheet, inventory, and spells live on the desktop site.
      </p>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Heart;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900/60 p-2 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto text-amber-400 mb-0.5" />
      <p className="text-[9px] uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className="text-base font-semibold leading-tight">{value}</p>
    </div>
  );
}
