"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bed, BedDouble, Dices } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { getAbilityModifier } from "@/lib/utils/character";

interface Props {
  characterId: string;
  hpMax: number;
  hpCurrent: number;
  constitution: number;
  hitDiceCurrent: string | null;
  hitDiceTotal: string | null;
  /** "{N}d{X}" parsed from hit_dice_total. */
  onUpdate: (
    updates: Partial<{
      hp_current: number;
      hp_temp: number;
      hit_dice_current: string | null;
    }>
  ) => Promise<void>;
  editable: boolean;
}

/** Parse "3d8" → { count: 3, die: 8 }. Falls back to nulls if malformed. */
function parseHitDice(s: string | null): { count: number; die: number } | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d+)d(\d+)$/i);
  if (!m) return null;
  return { count: parseInt(m[1], 10), die: parseInt(m[2], 10) };
}

export function RestControls({
  characterId,
  hpMax,
  hpCurrent,
  constitution,
  hitDiceCurrent,
  hitDiceTotal,
  onUpdate,
  editable,
}: Props) {
  const [longOpen, setLongOpen] = useState(false);
  const [shortOpen, setShortOpen] = useState(false);
  const [rolling, setRolling] = useState(false);

  if (!editable) return null;

  const total = parseHitDice(hitDiceTotal);
  const current = parseHitDice(hitDiceCurrent);
  const conMod = getAbilityModifier(constitution);

  // Long rest: full HP, zero temp HP, half hit dice recovered, every spell
  // slot used → 0. Exhaustion not tracked yet.
  const handleLongRest = async () => {
    const supabase = createClient();
    let nextHd = hitDiceCurrent;
    if (total && current) {
      const recover = Math.max(1, Math.floor(total.count / 2));
      const newCount = Math.min(total.count, current.count + recover);
      nextHd = `${newCount}d${total.die}`;
    } else if (total) {
      nextHd = `${total.count}d${total.die}`;
    }
    await onUpdate({
      hp_current: hpMax,
      hp_temp: 0,
      hit_dice_current: nextHd,
    });
    // Reset spell slots used → 0 in one shot.
    const { error } = await supabase
      .from("character_spell_slots")
      .update({ slots_used: 0 } as never)
      .eq("character_id", characterId);
    if (error) {
      console.error("Spell slot reset failed:", error);
      toast.error("HP restored but spell slots failed to reset");
      return;
    }
    toast.success("Long rest taken — HP, slots, and hit dice restored");
    setLongOpen(false);
  };

  // Short rest: spend one hit die — roll d{X} + CON mod, add to HP, decrement
  // hit_dice_current.
  const handleSpendHitDie = async () => {
    if (!current || !total || current.count <= 0 || rolling) return;
    setRolling(true);
    const roll = Math.floor(Math.random() * total.die) + 1;
    const heal = Math.max(0, roll + conMod);
    const newHp = Math.min(hpMax, hpCurrent + heal);
    const newHd = `${current.count - 1}d${total.die}`;
    await onUpdate({
      hp_current: newHp,
      hit_dice_current: newHd,
    });
    toast.success(`Hit die spent: rolled ${roll} + ${conMod} CON = ${heal} HP`);
    setRolling(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setShortOpen(true)}
        className="h-7 text-xs gap-1.5"
        disabled={!current || current.count <= 0}
        title={
          current && current.count > 0
            ? "Spend hit dice to recover HP"
            : "No hit dice remaining"
        }
      >
        <Bed className="h-3.5 w-3.5" />
        Short Rest
        {current && (
          <span className="text-muted-foreground">
            ({current.count}/{total?.count ?? "?"})
          </span>
        )}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setLongOpen(true)}
        className="h-7 text-xs gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
      >
        <BedDouble className="h-3.5 w-3.5" />
        Long Rest
      </Button>

      <AlertDialog open={longOpen} onOpenChange={setLongOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Take a long rest?</AlertDialogTitle>
            <AlertDialogDescription>
              Restores HP to full, zeroes out temp HP, recovers half your hit
              dice (rounded down, min 1), and resets every used spell slot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLongRest}>
              Take long rest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={shortOpen} onOpenChange={setShortOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Short rest — spend hit dice</AlertDialogTitle>
            <AlertDialogDescription>
              Each click rolls one d{total?.die ?? "?"} and adds (result + CON
              mod {conMod >= 0 ? `+${conMod}` : conMod}) to your HP. You have
              {" "}
              {current?.count ?? 0} of {total?.count ?? "?"} hit dice
              remaining.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-center py-3">
            <Button
              type="button"
              onClick={handleSpendHitDie}
              disabled={
                rolling || !current || current.count <= 0 || hpCurrent >= hpMax
              }
              className="gap-2"
            >
              <Dices className="h-4 w-4" />
              {hpCurrent >= hpMax
                ? "HP already full"
                : current && current.count <= 0
                ? "No hit dice"
                : `Spend 1d${total?.die ?? "?"}`}
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Done</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
