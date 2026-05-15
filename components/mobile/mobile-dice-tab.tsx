"use client";

import { useState } from "react";
import { useVttChat } from "@/hooks/useVttChat";
import type { RollResult } from "@/contexts/dice-roller-context";
import type { Character } from "@/hooks/useDndContent";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";

interface Props {
  campaignId: string;
  character: Character | null;
  isDm: boolean;
}

const DIE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
type DieSides = (typeof DIE_SIDES)[number];

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

interface LocalRoll {
  id: string;
  expression: string;
  result: number;
  rolls: number[];
  modifier: number;
  advantage?: boolean;
  disadvantage?: boolean;
  ts: number;
}

/**
 * Mobile dice tab — touch-first dice roller. Big die buttons, a small
 * +/- modifier and quantity, adv/disadv toggle. Rolls post to the
 * campaign chat via the same `sendRollToChat` path the desktop uses,
 * so all clients see the same formatted result.
 */
export function MobileDiceTab({ campaignId, character, isDm }: Props) {
  void isDm;
  const { sendRollToChat } = useVttChat(campaignId, null);
  const [qty, setQty] = useState(1);
  const [mod, setMod] = useState(0);
  const [adv, setAdv] = useState<"none" | "adv" | "dis">("none");
  const [history, setHistory] = useState<LocalRoll[]>([]);

  const roll = async (sides: DieSides) => {
    const advActive = adv !== "none" && qty === 1 && sides === 20;
    const rolls: number[] = [];
    if (advActive) {
      rolls.push(rollDie(sides));
      rolls.push(rollDie(sides));
    } else {
      for (let i = 0; i < qty; i++) rolls.push(rollDie(sides));
    }

    let chosen: number;
    if (advActive) {
      chosen = adv === "adv" ? Math.max(...rolls) : Math.min(...rolls);
    } else {
      chosen = rolls.reduce((a, b) => a + b, 0);
    }
    const total = chosen + mod;
    const expression = `${advActive ? 1 : qty}d${sides}${mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : ""}`;

    const local: LocalRoll = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      expression,
      result: total,
      rolls,
      modifier: mod,
      advantage: adv === "adv" && advActive,
      disadvantage: adv === "dis" && advActive,
      ts: Date.now(),
    };
    setHistory((prev) => [local, ...prev].slice(0, 12));

    const rollResult: RollResult = {
      id: local.id,
      expression,
      result: total,
      breakdown: { rolls, modifier: mod, total },
      label: advActive ? `${adv === "adv" ? "Advantage" : "Disadvantage"} d20` : undefined,
      characterId: character?.id,
      characterName: character?.name,
      campaignId,
      advantage: local.advantage,
      disadvantage: local.disadvantage,
      timestamp: new Date(local.ts),
    };
    void sendRollToChat(rollResult, character?.name);

    // Reset adv toggle so it's a one-shot, like the desktop flow.
    if (advActive) setAdv("none");
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-6 pt-3">
      {/* Modifier + quantity controls */}
      <section className="grid grid-cols-2 gap-2">
        <Stepper
          label="Qty"
          value={qty}
          onChange={(n) => setQty(Math.max(1, Math.min(20, n)))}
        />
        <Stepper
          label="Mod"
          value={mod}
          onChange={(n) => setMod(Math.max(-20, Math.min(20, n)))}
          allowNegative
        />
      </section>

      {/* Advantage toggle (d20 only, single roll) */}
      <section className="mt-3 grid grid-cols-3 gap-2">
        {(["dis", "none", "adv"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setAdv(opt)}
            className={cn(
              "h-9 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors border",
              adv === opt
                ? "border-amber-500/60 bg-amber-500/15 text-amber-400"
                : "border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:text-neutral-200"
            )}
          >
            {opt === "adv" ? "Adv" : opt === "dis" ? "Dis" : "Normal"}
          </button>
        ))}
      </section>
      {adv !== "none" && (
        <p className="mt-1 text-[10px] text-amber-400/80 text-center">
          {adv === "adv" ? "Advantage" : "Disadvantage"} applies to a single d20 roll
        </p>
      )}

      {/* Die buttons */}
      <section className="mt-4 grid grid-cols-4 gap-2">
        {DIE_SIDES.map((sides) => (
          <Button
            key={sides}
            type="button"
            variant="outline"
            className="h-16 text-base font-semibold col-span-1 flex flex-col items-center justify-center gap-0.5"
            onClick={() => roll(sides)}
          >
            <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
              d{sides}
            </span>
            <span className="text-amber-400 font-bold">↺</span>
          </Button>
        ))}
      </section>

      {/* Recent rolls */}
      <section className="mt-5">
        <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-2">
          Recent
        </p>
        {history.length === 0 ? (
          <p className="text-xs text-neutral-500 italic">
            Roll a die to see results here.
          </p>
        ) : (
          <ul className="space-y-1">
            {history.map((h) => (
              <li
                key={h.id}
                className="rounded border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 text-xs flex items-center gap-2"
              >
                <span className="font-mono text-neutral-400 tabular-nums">
                  {h.expression}
                </span>
                <span className="text-neutral-600">→</span>
                <span className="font-mono text-neutral-500 truncate">
                  [{h.rolls.join(", ")}]
                  {h.modifier !== 0
                    ? h.modifier > 0
                      ? ` + ${h.modifier}`
                      : ` − ${Math.abs(h.modifier)}`
                    : ""}
                </span>
                <span className="ml-auto font-bold text-amber-400 tabular-nums">
                  {h.result}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  allowNegative,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  allowNegative?: boolean;
}) {
  const display = allowNegative && value > 0 ? `+${value}` : `${value}`;
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-900/60 p-1.5 flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        className="h-8 w-8 rounded bg-neutral-800 text-neutral-300 active:bg-neutral-700 flex items-center justify-center"
      >
        <Minus className="h-4 w-4" />
      </button>
      <div className="flex-1 text-center">
        <p className="text-[9px] uppercase tracking-wider text-neutral-500 leading-none">
          {label}
        </p>
        <p className="text-base font-semibold tabular-nums leading-tight">
          {display}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="h-8 w-8 rounded bg-neutral-800 text-neutral-300 active:bg-neutral-700 flex items-center justify-center"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
