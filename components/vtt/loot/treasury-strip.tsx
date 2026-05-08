"use client";

import { usePartyTreasury } from "@/hooks/usePartyTreasury";
import { Coins } from "lucide-react";

interface Props {
  campaignId: string | null;
  isDm: boolean;
}

const COIN_ORDER = ["pp", "gp", "ep", "sp", "cp"] as const;
const COIN_LABEL: Record<(typeof COIN_ORDER)[number], string> = {
  pp: "PP",
  gp: "GP",
  ep: "EP",
  sp: "SP",
  cp: "CP",
};
const COIN_COLOR: Record<(typeof COIN_ORDER)[number], string> = {
  pp: "text-cyan-300",
  gp: "text-amber-400",
  ep: "text-yellow-200",
  sp: "text-neutral-200",
  cp: "text-orange-400",
};

export function TreasuryStrip({ campaignId, isDm }: Props) {
  const { treasury, addCoins } = usePartyTreasury(campaignId);

  return (
    <div className="rounded border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Coins className="h-4 w-4 text-amber-400" />
        <h3 className="text-xs uppercase tracking-wider font-bold text-amber-400">
          Party Treasury
        </h3>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {COIN_ORDER.map((k) => {
          const v = treasury?.[k] ?? 0;
          return (
            <div
              key={k}
              className="flex flex-col items-center rounded bg-background/50 border border-border/50 p-1.5"
            >
              <span
                className={`font-mono font-bold tabular-nums text-base ${COIN_COLOR[k]}`}
              >
                {v.toLocaleString()}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {COIN_LABEL[k]}
              </span>
              {isDm && (
                <div className="flex gap-0.5 mt-0.5">
                  <button
                    type="button"
                    onClick={() => void addCoins({ [k]: -1 })}
                    className="h-4 w-4 text-[10px] rounded text-muted-foreground hover:text-rose-400 hover:bg-muted"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => void addCoins({ [k]: 1 })}
                    className="h-4 w-4 text-[10px] rounded text-muted-foreground hover:text-emerald-400 hover:bg-muted"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
