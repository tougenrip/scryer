"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDiceRoller, type RollResult } from "@/contexts/dice-roller-context";
import { cn } from "@/lib/utils";

type TrayItem = {
  id: string;
  total: number;
  detail: string;
  t: number;
};

type Props = {
  campaignId: string;
  sendRollToChat?: (roll: RollResult) => void | Promise<void>;
  compact?: boolean;
  className?: string;
};

export function VttDiceQuickBar({
  campaignId,
  sendRollToChat,
  compact = false,
  className,
}: Props) {
  const { rollDice, rollWithAdvantage, isRolling } = useDiceRoller();
  const [tray, setTray] = useState<TrayItem[]>([]);

  const pushTray = useCallback((detail: string, total: number) => {
    const id = crypto.randomUUID();
    setTray((prev) => [{ id, detail, total, t: Date.now() }, ...prev].slice(0, 6));
  }, []);

  const handle = async (notation: string, label?: string) => {
    const r = await rollDice(notation, {
      label,
      campaignId,
      shareWithCampaign: true,
    });
    if (!r) return;

    const mod =
      r.breakdown.modifier === 0
        ? ""
        : r.breakdown.modifier > 0
          ? `+${r.breakdown.modifier}`
          : `${r.breakdown.modifier}`;

    pushTray(
      `${r.expression}${mod ? ` ${mod}` : ""} - [${r.breakdown.rolls.join(", ")}]`,
      r.result
    );
    if (sendRollToChat) await sendRollToChat(r);
  };

  const handleAdv = async () => {
    const r = await rollWithAdvantage(0, {
      label: "Advantage",
      campaignId,
      shareWithCampaign: true,
    });
    if (!r) return;

    pushTray(`Adv ${r.expression} - [${r.breakdown.rolls.join(", ")}]`, r.result);
    if (sendRollToChat) await sendRollToChat(r);
  };

  const dice: { s: number; label: string }[] = [
    { s: 4, label: "d4" },
    { s: 6, label: "d6" },
    { s: 8, label: "d8" },
    { s: 10, label: "d10" },
    { s: 12, label: "d12" },
    { s: 20, label: "d20" },
    { s: 100, label: "d100" },
  ];
  const visibleTray = compact ? tray.slice(0, 3) : tray;

  return (
    <div
      className={cn(
        compact
          ? "w-48 space-y-2 rounded-md border border-neutral-800 bg-card/95 p-2 shadow-2xl backdrop-blur"
          : "space-y-2 border-b border-border p-3",
        className
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
          compact && "px-1"
        )}
      >
        Dice
      </p>
      <div className={cn("grid gap-1.5", compact ? "grid-cols-2" : "grid-cols-4")}>
        {dice.map(({ s, label }) => (
          <Button
            key={s}
            variant="secondary"
            size="sm"
            disabled={isRolling}
            className={cn(
              "flex flex-col gap-0 font-serif",
              compact ? "h-8 py-0.5 text-[10px]" : "h-10 py-1 text-[11px]"
            )}
            onClick={() => handle(`1d${s}`, label)}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="secondary"
          size="sm"
          disabled={isRolling}
          className={cn("text-[10px]", compact ? "col-span-2 h-8" : "col-span-4 h-10")}
          onClick={handleAdv}
        >
          {compact ? "Advantage" : "Advantage (2d20 keep high)"}
        </Button>
      </div>

      {visibleTray.length > 0 && (
        <div className={cn("flex gap-2 pt-1", compact ? "flex-col" : "flex-wrap")}>
          {visibleTray.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-lg border border-border bg-popover shadow-md",
                compact ? "px-2 py-1" : "px-2.5 py-1.5",
                "animate-in fade-in zoom-in-95 duration-200"
              )}
            >
              <div
                className={cn(
                  "truncate font-mono text-[9px] leading-tight text-muted-foreground",
                  compact ? "max-w-[150px]" : "max-w-[140px]"
                )}
              >
                {item.detail}
              </div>
              <div
                className={cn(
                  "font-serif leading-none text-primary",
                  compact ? "text-base" : "text-lg"
                )}
              >
                {item.total}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
