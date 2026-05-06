"use client";

import { useMemo } from "react";
import { useDiceRoller, type RollResult } from "@/contexts/dice-roller-context";
import { useVttStore } from "@/lib/store/vtt-store";
import { parseActions, partitionActions, type ParsedAction } from "@/lib/vtt/monster-actions";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string;
  sendRollToChat?: (roll: RollResult) => void | Promise<void>;
}

/**
 * Floating quick-action panel pinned to the bottom-left of the VTT view.
 * Shows when exactly one token is selected and that token has any monster
 * actions / reactions / legendary actions / special abilities. Clicking a
 * button rolls the attack and damage(s) into chat — same behaviour as the
 * inspector's action rows, just always-visible.
 */
export function VttTokenActionsBar({ campaignId, sendRollToChat }: Props) {
  const tokens = useVttStore((s) => s.tokens);
  const selectedTokenIds = useVttStore((s) => s.selectedTokenIds);
  const pendingTokenPlacement = useVttStore((s) => s.pendingTokenPlacement);
  const { rollDice } = useDiceRoller();

  const sel = useMemo(() => {
    if (selectedTokenIds.length !== 1) return null;
    return tokens.find((t) => t.id === selectedTokenIds[0]) ?? null;
  }, [selectedTokenIds, tokens]);

  const actions = useMemo<ParsedAction[]>(() => {
    if (!sel?.monster) return [];
    const { actions: regular, bonusActions } = partitionActions(sel.monster.actions);
    return [
      ...regular,
      ...bonusActions,
      ...parseActions(sel.monster.legendary_actions),
      ...parseActions(sel.monster.reactions),
    ].filter((a) => a.attackRoll !== null || a.damages.length > 0);
  }, [sel]);

  if (!sel || pendingTokenPlacement || actions.length === 0) return null;

  const tokenName = cleanVttDisplayName(sel.name ?? "");

  const runRoll = async (expression: string, label: string) => {
    const result = await rollDice(expression, {
      label,
      campaignId,
      shareWithCampaign: true,
    });
    if (result && sendRollToChat) await sendRollToChat(result);
  };

  const fire = async (action: ParsedAction) => {
    if (action.attackRoll) {
      await runRoll(action.attackRoll, `${tokenName} – ${action.name} (attack)`);
    }
    for (const dmg of action.damages) {
      const label = dmg.type
        ? `${tokenName} – ${action.name} (${dmg.type})`
        : `${tokenName} – ${action.name} (damage)`;
      await runRoll(dmg.dice, label);
    }
  };

  return (
    <div
      data-vtt-floating-panel
      className="pointer-events-auto absolute bottom-4 left-20 z-30 flex max-w-[min(640px,calc(100vw-200px))] flex-wrap items-center gap-1 rounded-lg border border-border bg-card/95 p-2 shadow-2xl backdrop-blur"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="mr-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
        {tokenName}
      </span>
      {actions.map((a) => {
        const summary: string[] = [];
        if (a.attackBonus !== null) {
          summary.push(a.attackBonus >= 0 ? `+${a.attackBonus}` : `${a.attackBonus}`);
        }
        if (a.damages.length > 0) summary.push(a.damages.map((d) => d.dice).join(", "));
        return (
          <button
            key={a.name}
            type="button"
            onClick={() => void fire(a)}
            title={a.desc || a.name}
            className={cn(
              "flex max-w-[220px] items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1 text-xs",
              "hover:border-amber-400/60 hover:bg-amber-400/10"
            )}
          >
            <span className="truncate font-medium">{a.name}</span>
            {summary.length > 0 && (
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                {summary.join(" · ")}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
