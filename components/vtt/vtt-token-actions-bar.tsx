"use client";

import { useEffect, useMemo, useState } from "react";
import { useDiceRoller, type RollResult } from "@/contexts/dice-roller-context";
import { useVttStore } from "@/lib/store/vtt-store";
import { parseActions, partitionActions, type ParsedAction } from "@/lib/vtt/monster-actions";
import {
  deriveWeaponAction,
  proficiencyBonusForLevel,
  type ParsedPcAction,
} from "@/lib/vtt/pc-actions";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Props {
  campaignId: string;
  sendRollToChat?: (roll: RollResult) => void | Promise<void>;
}

/**
 * Floating quick-action panel pinned to the bottom-left of the VTT view.
 * Shows when exactly one token is selected and that token has any monster
 * actions / reactions / legendary actions / special abilities, OR when the
 * token is a PC with equipped weapons. Clicking a button rolls the attack and
 * damage(s) into chat — same behaviour as the inspector's action rows, just
 * always-visible.
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

  // Monster actions (unchanged logic)
  const monsterActions = useMemo<ParsedAction[]>(() => {
    if (!sel?.monster) return [];
    const { actions: regular, bonusActions } = partitionActions(sel.monster.actions);
    return [
      ...regular,
      ...bonusActions,
      ...parseActions(sel.monster.legendary_actions),
      ...parseActions(sel.monster.reactions),
    ].filter((a) => a.attackRoll !== null || a.damages.length > 0);
  }, [sel]);

  // PC weapon actions — fetched when a PC token is selected
  const [pcActions, setPcActions] = useState<ParsedPcAction[]>([]);

  useEffect(() => {
    setPcActions([]);
    const cid = sel?.character_id;
    if (!cid) return;
    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const { data: charData } = await supabase
        .from("characters")
        .select("level, strength, dexterity, inventory")
        .eq("id", cid)
        .maybeSingle();
      if (cancelled || !charData) return;

      const inventoryJsonb = Array.isArray(charData.inventory)
        ? (charData.inventory as Array<{
            source: "srd" | "homebrew";
            index: string;
            equipped: boolean;
            attuned: boolean;
            quantity: number;
          }>)
        : [];
      const equipped = inventoryJsonb.filter((i) => i.equipped);
      if (equipped.length === 0) return;

      const srdIndices = equipped.filter((i) => i.source === "srd").map((i) => i.index);
      const homebrewIds = equipped.filter((i) => i.source === "homebrew").map((i) => i.index);

      const [srdResult, homebrewResult] = await Promise.all([
        srdIndices.length > 0
          ? supabase.from("srd_equipment").select("*").in("index", srdIndices)
          : Promise.resolve({ data: [] as unknown[] }),
        homebrewIds.length > 0
          ? supabase.from("homebrew_equipment").select("*").in("id", homebrewIds)
          : Promise.resolve({ data: [] as unknown[] }),
      ]);
      if (cancelled) return;

      const level = (charData.level as number | null) ?? 1;
      const profBonus = proficiencyBonusForLevel(level);
      const abilityScores = {
        strength: (charData.strength as number | null) ?? 10,
        dexterity: (charData.dexterity as number | null) ?? 10,
      };

      const derived: ParsedPcAction[] = [];
      for (const inv of equipped) {
        let eqData: unknown = null;
        if (inv.source === "srd") {
          eqData =
            (srdResult.data as Array<Record<string, unknown>>)?.find(
              (e) => e.index === inv.index
            ) ?? null;
        } else {
          eqData =
            (homebrewResult.data as Array<Record<string, unknown>>)?.find(
              (e) => e.id === inv.index
            ) ?? null;
        }
        if (!eqData) continue;
        const eqTyped = eqData as { name?: string } & Record<string, unknown>;
        const action = deriveWeaponAction(
          { name: (eqTyped.name as string) ?? inv.index, equipmentData: eqData },
          abilityScores,
          profBonus
        );
        if (action) derived.push(action);
      }

      setPcActions(derived);
    })();

    return () => {
      cancelled = true;
    };
  }, [sel?.character_id]);

  // Decide which set of actions to render
  const isMonster = !!sel?.monster && !sel.character_id;
  const isPc = !!sel?.character_id;

  const hasMonsterActions = monsterActions.length > 0;
  const hasPcActions = pcActions.length > 0;

  if (!sel || pendingTokenPlacement) return null;
  if (!hasMonsterActions && !hasPcActions) return null;

  const tokenName = cleanVttDisplayName(sel.name ?? "");

  const runRoll = async (expression: string, label: string) => {
    const result = await rollDice(expression, {
      label,
      campaignId,
      shareWithCampaign: true,
    });
    if (result && sendRollToChat) await sendRollToChat(result);
  };

  const fireMonster = async (action: ParsedAction) => {
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

  const firePc = async (action: ParsedPcAction) => {
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

      {/* Monster action buttons */}
      {isMonster &&
        monsterActions.map((a) => {
          const summary: string[] = [];
          if (a.attackBonus !== null) {
            summary.push(a.attackBonus >= 0 ? `+${a.attackBonus}` : `${a.attackBonus}`);
          }
          if (a.damages.length > 0) summary.push(a.damages.map((d) => d.dice).join(", "));
          return (
            <button
              key={a.name}
              type="button"
              onClick={() => void fireMonster(a)}
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

      {/* PC weapon action buttons */}
      {isPc &&
        pcActions.map((a) => {
          const summary: string[] = [];
          if (a.hitBonus !== null) summary.push(a.hitBonus);
          if (a.damages.length > 0) summary.push(a.damages.map((d) => d.dice).join(", "));
          return (
            <button
              key={a.name}
              type="button"
              onClick={() => void firePc(a)}
              title={a.description || a.name}
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
