"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVttChat, type VttMessage } from "@/hooks/useVttChat";
import type { Character } from "@/hooks/useDndContent";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string;
  userId: string;
  character: Character | null;
}

interface RollPayload {
  kind: "roll";
  roll: {
    expression: string;
    result: number;
    breakdown: { rolls: number[]; modifier: number; total: number };
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

function relTime(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/**
 * Mobile chat tab — read campaign chat + send messages. Roll rows
 * render as a chip with the breakdown so the player can see what
 * happened at a glance. Auto-scrolls to the newest on each update.
 */
export function MobileChatTab({ campaignId, userId, character }: Props) {
  void character;
  const { messages, sendMessage } = useVttChat(campaignId, null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Realtime + initial fetch may interleave order; sort ascending so
  // the newest appears at the bottom like a conventional chat.
  const ordered = useMemo(
    () => [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    [messages]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ordered.length]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    void sendMessage(t);
    setText("");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        {ordered.length === 0 ? (
          <p className="text-xs text-neutral-500 italic text-center mt-6">
            No messages yet. Say hello.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordered.map((m) => (
              <ChatMessage key={m.id} m={m} mine={m.user_id === userId} />
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        className="shrink-0 border-t border-neutral-800 bg-neutral-950 px-2 py-2 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          enterKeyHint="send"
          className="flex-1 h-10 rounded-md bg-neutral-900 border border-neutral-800 px-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
        />
        <Button
          type="submit"
          size="icon"
          className="h-10 w-10 shrink-0"
          disabled={!text.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function ChatMessage({ m, mine }: { m: VttMessage; mine: boolean }) {
  const roll = isRollPayload(m.payload) ? m.payload : null;
  return (
    <li
      className={cn(
        "flex flex-col",
        mine ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "max-w-[88%] rounded-lg px-3 py-1.5 text-sm break-words",
          mine
            ? "bg-amber-500/15 text-amber-100 border border-amber-500/30"
            : "bg-neutral-900 text-neutral-100 border border-neutral-800"
        )}
      >
        {!mine && m.display_name && (
          <p className="text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5">
            {m.display_name}
          </p>
        )}
        {roll ? (
          <div className="space-y-0.5">
            {roll.roll.label && (
              <p className="text-[10px] uppercase tracking-wider text-amber-400">
                {roll.roll.label}
              </p>
            )}
            <p className="text-xs font-mono text-neutral-400">
              {roll.roll.expression} → [{roll.roll.breakdown.rolls.join(", ")}]
              {roll.roll.breakdown.modifier !== 0 &&
                (roll.roll.breakdown.modifier > 0
                  ? ` + ${roll.roll.breakdown.modifier}`
                  : ` − ${Math.abs(roll.roll.breakdown.modifier)}`)}
            </p>
            <p className="text-lg font-bold text-amber-400 tabular-nums">
              {roll.roll.result}
            </p>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{m.body}</p>
        )}
      </div>
      <p className="text-[9px] text-neutral-600 mt-0.5 px-1">
        {relTime(m.created_at)}
      </p>
    </li>
  );
}
