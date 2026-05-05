"use client";

import { useRef, useEffect, useState } from "react";
import type { VttMessage } from "@/hooks/useVttChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseDiceExpression } from "@/lib/utils/dice-parser";
import { useDiceRoller, type RollResult } from "@/contexts/dice-roller-context";

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
      <ScrollArea className="flex-1 min-h-0 px-3">
        <div className="py-2 space-y-3">
          {loading && (
            <p className="text-xs text-muted-foreground">Loading messages…</p>
          )}
          {messages.map((m) => {
            const isRoll =
              m.payload && (m.payload as { kind?: string }).kind === "roll";
            return (
              <div key={m.id} className="text-xs leading-snug">
                <div>
                  <span className="font-semibold text-primary">
                    {m.display_name || "Player"}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-2">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={cn(
                    "mt-0.5",
                    isRoll && "font-mono text-[11px] text-muted-foreground"
                  )}
                >
                  {m.body}
                </div>
              </div>
            );
          })}
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
