"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart } from "lucide-react";
import type { Token } from "@/types/vtt";
import { useCharacter } from "@/hooks/useDndContent";
import { useVttChat } from "@/hooks/useVttChat";
import { DeathSaveTracker } from "@/components/vtt/death-save-tracker";
import { ConcentrationBadge } from "@/components/vtt/concentration-badge";

interface Props {
  token: Token;
  screenX: number;
  screenY: number;
  onApplyDelta: (delta: number) => void;
  /** When set, enables the PC-only sections (death saves, concentration)
   *  by feeding them the campaign id for chat posting. Map id may be
   *  null (off-map context).  */
  campaignId?: string;
  mapId?: string | null;
}

/**
 * Tiny floating HP panel rendered above the selected token. Type a positive
 * number into the field, then click Damage to subtract or Heal to add. Enter
 * defaults to Damage so common attack flow stays a single keystroke.
 *
 * For PC tokens (`token.character_id` set) the HUD also surfaces:
 *   • a Concentration chip — drop / set with a spell label
 *   • a Death Save tracker (visible only when the PC is at 0 HP) with
 *     a "Roll save" button that posts a d20 to chat and applies the
 *     5e success / failure / stable / nat-20-revive rules.
 */
export function VttTokenDamageHud({
  token,
  screenX,
  screenY,
  onApplyDelta,
  campaignId,
  mapId = null,
}: Props) {
  const [value, setValue] = useState("");
  const cur = token.hp_current ?? null;
  const max = token.hp_max ?? null;

  const submit = (sign: 1 | -1) => {
    const trimmed = value.trim().replace(/^[+\-]/, "");
    if (!trimmed) return;
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n) || n <= 0) return;
    onApplyDelta(sign * n);
    setValue("");
  };

  const isPc = !!token.character_id;
  const isDowned =
    isPc && (max ?? 0) > 0 && (cur ?? 0) <= 0;

  return (
    <div
      data-vtt-floating-panel
      className="pointer-events-auto absolute z-30 flex -translate-x-1/2 -translate-y-full flex-col gap-1 rounded-md border border-border bg-popover p-1 shadow-2xl"
      style={{ left: screenX, top: screenY - 6 }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Damage / heal row. */}
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit(-1);
            }
          }}
          placeholder="amount"
          className="h-7 w-16 text-xs"
          autoFocus
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
          title="Damage (Enter)"
          onClick={() => submit(-1)}
        >
          Damage
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10 dark:text-emerald-400"
          title="Heal"
          onClick={() => submit(+1)}
        >
          Heal
        </Button>
        <span className="flex items-center gap-1 px-1 text-xs font-medium">
          <Heart className="h-3 w-3 text-rose-500" />
          {cur ?? "—"}
          <span className="text-muted-foreground">/ {max ?? "—"}</span>
        </span>
      </div>

      {/* PC-only block: death saves + concentration. Self-contained
          subcomponent so we don't fire useCharacter for monster tokens. */}
      {isPc && campaignId && (
        <PcDeathSaveBlock
          characterId={token.character_id as string}
          isDowned={isDowned}
          campaignId={campaignId}
          mapId={mapId}
        />
      )}
    </div>
  );
}

function PcDeathSaveBlock({
  characterId,
  isDowned,
  campaignId,
  mapId,
}: {
  characterId: string;
  isDowned: boolean;
  campaignId: string;
  mapId: string | null;
}) {
  const { character, updateCharacter } = useCharacter(characterId);
  const { sendRollToChat } = useVttChat(campaignId, mapId, false);
  if (!character) return null;

  const successes = character.death_save_successes ?? 0;
  const failures = character.death_save_failures ?? 0;
  const isStable = !!character.is_stable;
  const isConc = !!character.is_concentrating;
  const concOn = character.concentrating_on ?? null;

  // Concentration is automatically lost on falling to 0 HP (RAW), so
  // the toggle only makes sense for alive PCs. Death-save tracker is
  // the inverse: only shown when downed. Keep the block out of the
  // tree entirely when nothing is relevant.
  const showConcentration = !isDowned;
  if (!isDowned && !showConcentration) return null;

  /** 5e death save: see DeathSaveTracker docs for the rule table. */
  const rollDeathSave = async () => {
    const die = Math.floor(Math.random() * 20) + 1;
    let nextSuccesses = successes;
    let nextFailures = failures;
    let nextStable = isStable;
    let label = "";
    if (die === 20) {
      // Heal to 1 HP — the Postgres trigger clears marks via the heal path.
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
      characterId: character.id,
      characterName: character.name,
      campaignId,
      timestamp: new Date(),
    });
  };

  return (
    <div className="border-t border-border pt-1 space-y-1">
      {isDowned && (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-2">
          <DeathSaveTracker
            successes={successes}
            failures={failures}
            isStable={isStable}
            editable
            onRoll={rollDeathSave}
            onChange={(next) => {
              void updateCharacter({
                death_save_successes: next.successes,
                death_save_failures: next.failures,
                is_stable: next.isStable,
              });
            }}
          />
        </div>
      )}
      {showConcentration && (
        <ConcentrationBadge
          isConcentrating={isConc}
          concentratingOn={concOn}
          editable
          onChange={(next) => {
            void updateCharacter({
              is_concentrating: next.isConcentrating,
              concentrating_on: next.concentratingOn,
            });
          }}
        />
      )}
    </div>
  );
}
