"use client";

import { useRef, useEffect, useState } from "react";
import type { VttMessage } from "@/hooks/useVttChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, Send, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseDiceExpression } from "@/lib/utils/dice-parser";
import { useDiceRoller, type RollResult } from "@/contexts/dice-roller-context";

interface RollPayload {
  kind: "roll";
  roll: {
    expression: string;
    result: number;
    breakdown: {
      rolls: number[];
      modifier: number;
      total: number;
    };
    label?: string;
    advantage?: boolean;
    disadvantage?: boolean;
  };
  display_name?: string;
}

function isRollPayload(p: unknown): p is RollPayload {
  return (
    !!p &&
    typeof p === "object" &&
    (p as { kind?: string }).kind === "roll" &&
    !!(p as { roll?: unknown }).roll
  );
}

type Props = {
  campaignId: string;
  messages: VttMessage[];
  loading: boolean;
  sendMessage: (body: string, payload?: Record<string, unknown>) => void;
  sendRollToChat: (roll: RollResult) => void | Promise<void>;
  localClear?: () => void;
  onRestoreView?: () => void;
  messagesHidden?: boolean;
};

export function VttChat({
  messages,
  loading,
  sendMessage,
  sendRollToChat,
  localClear,
  onRestoreView,
  messagesHidden,
  campaignId,
}: Props) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { rollDice } = useDiceRoller();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;

    const rollMatch = t.match(/^\/r\s+(.+)$/i);
    if (rollMatch) {
      const expr = rollMatch[1].trim();
      const parsed = parseDiceExpression(expr);
      if (!parsed.isValid) {
        sendMessage(`Invalid roll: ${expr}`, { kind: "error" });
        setText("");
        return;
      }
      const r = await rollDice(expr, { campaignId, shareWithCampaign: true });
      if (r) await sendRollToChat(r);
      setText("");
      return;
    }

    sendMessage(t);
    setText("");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Chat
        </span>
        {messagesHidden && onRestoreView && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={onRestoreView}>
            Restore
          </Button>
        )}
        {localClear && !messagesHidden && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={localClear}>
            Clear view
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0 px-3 overflow-x-hidden">
        <div className="py-2 space-y-2 w-full max-w-full">
          {loading && (
            <p className="text-xs text-muted-foreground">Loading messages…</p>
          )}
          {messages.map((m, i) => (
            <ChatRow key={m.id} message={m} isLast={i === messages.length - 1} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      <div className="p-2 border-t border-border flex gap-1.5">
        <Input
          className="h-9 text-xs"
          placeholder="Message… /r 1d20+5"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={submit}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ChatRow({ message, isLast }: { message: VttMessage; isLast: boolean }) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (isRollPayload(message.payload)) {
    return (
      <ChatRoll
        roll={message.payload.roll}
        displayName={message.display_name || message.payload.display_name || "Player"}
        time={time}
        isLast={isLast}
      />
    );
  }
  if (isDuelResultPayload(message.payload)) {
    return <ChatDuelResult message={message} time={time} />;
  }
  return (
    <div className={cn("text-xs leading-snug", isLast && "text-sm")}>
      <div>
        <span className={cn("font-semibold text-primary", isLast && "text-sm")}>
          {message.display_name || "Player"}
        </span>
        <span className="ml-2 text-[10px] text-muted-foreground">{time}</span>
      </div>
      <div className={cn("mt-0.5", isLast && "font-medium")}>{message.body}</div>
    </div>
  );
}

interface DuelResultPayload {
  kind: "duel-result";
  duel_id: string;
  game: "rps" | "coin";
  winner_character_id: string;
  loser_character_id: string;
  item_name: string | null;
  defender_choice: string | null;
  challenger_choice: string | null;
}

function isDuelResultPayload(p: unknown): p is DuelResultPayload {
  return (
    !!p &&
    typeof p === "object" &&
    (p as { kind?: string }).kind === "duel-result"
  );
}

function ChatDuelResult({
  message,
  time,
}: {
  message: VttMessage;
  time: string;
}) {
  const game = (message.payload as DuelResultPayload).game;
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <Swords className="h-3 w-3 text-amber-400" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
          Duel · {game === "rps" ? "RPS" : "Coin"}
        </span>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="text-[10px] text-muted-foreground">{time}</span>
      </div>
      <p className="mt-0.5 text-sm font-serif">{message.body}</p>
    </div>
  );
}

function ChatRoll({
  roll,
  displayName,
  time,
  isLast,
}: {
  roll: RollPayload["roll"];
  displayName: string;
  time: string;
  isLast: boolean;
}) {
  const exprLower = roll.expression.toLowerCase();
  const isAttack = /^1d20/.test(exprLower);
  const isD20 = exprLower.includes("d20");
  const single = roll.breakdown.rolls.length === 1;
  const isCritHit = isD20 && single && roll.breakdown.rolls[0] === 20;
  const isCritMiss = isD20 && single && roll.breakdown.rolls[0] === 1;

  const accent = isAttack
    ? "border-sky-500/40 bg-sky-500/[0.06]"
    : "border-rose-500/40 bg-rose-500/[0.06]";
  const accentLast = isAttack
    ? "border-sky-400 bg-sky-500/10"
    : "border-rose-400 bg-rose-500/10";
  const Icon = isAttack ? Swords : Flame;
  const iconClass = isAttack ? "text-sky-400" : "text-rose-400";

  // Outcomes need to be readable at a glance, but the chat sidebar is narrow
  // (~360px) so we cap how big the number can get to keep it from
  // overflowing on three-digit results.
  const totalClass = cn(
    "shrink-0 font-bold tabular-nums leading-none",
    isLast ? "text-4xl" : "text-2xl",
    isCritHit && "text-emerald-500",
    isCritMiss && "text-rose-500",
    !isCritHit && !isCritMiss && (isAttack ? "text-sky-300" : "text-rose-300")
  );

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 w-full max-w-full overflow-hidden",
        isLast ? accentLast : accent,
        isLast && "shadow-md"
      )}
    >
      {/* Top row: BIG result number + metadata stacked next to it. The
          number sits in the normal flow as `shrink-0` so it never gets
          pushed out, and the metadata column is `min-w-0` so any long
          title truncates with an ellipsis. */}
      <div className="flex items-start gap-2 min-w-0">
        <div className={cn(totalClass, "self-center")}>{roll.result}</div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon className={cn("h-3.5 w-3.5 shrink-0", iconClass)} />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
              {isAttack ? "Attack" : "Damage"}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">·</span>
            <span className="text-[10px] text-muted-foreground truncate">{time}</span>
          </div>
          <div
            className={cn(
              "mt-0.5 truncate font-medium",
              isLast ? "text-sm" : "text-xs"
            )}
            title={roll.label}
          >
            {roll.label || roll.expression}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{displayName}</div>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1 font-mono text-[9px] opacity-70">
        <span className="text-muted-foreground">{roll.expression}</span>
        <span className="text-muted-foreground">=</span>
        {roll.breakdown.rolls.map((r, idx) => (
          <span
            key={idx}
            className={cn(
              "rounded bg-muted px-1 py-0.5 text-foreground tabular-nums",
              isD20 && r === 20 && "bg-emerald-500/25 font-bold text-emerald-300",
              isD20 && r === 1 && "bg-rose-500/25 font-bold text-rose-300"
            )}
          >
            {r}
          </span>
        ))}
        {roll.breakdown.modifier !== 0 && (
          <span className="tabular-nums text-muted-foreground">
            {roll.breakdown.modifier > 0
              ? `+ ${roll.breakdown.modifier}`
              : `− ${Math.abs(roll.breakdown.modifier)}`}
          </span>
        )}
        {(roll.advantage || roll.disadvantage) && (
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
              roll.advantage
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-rose-500/15 text-rose-300"
            )}
          >
            {roll.advantage ? "Adv" : "Dis"}
          </span>
        )}
      </div>
    </div>
  );
}
