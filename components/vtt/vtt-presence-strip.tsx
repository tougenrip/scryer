"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { VttPresencePeer } from "@/hooks/useVttPresence";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  peers: VttPresencePeer[];
  currentUserId: string | null;
  dmUserId: string | null | undefined;
  className?: string;
};

export function VttPresenceStrip({
  peers,
  currentUserId,
  dmUserId,
  className,
}: Props) {
  const count = peers.length;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-muted shrink-0",
            className
          )}
        >
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex -space-x-2">
            {peers.slice(0, 6).map((p) => (
              <Avatar
                key={p.userId}
                className={cn(
                  "h-6 w-6 border-2 border-background text-[10px]",
                  p.userId === dmUserId && "ring-2 ring-amber-500"
                )}
              >
                <AvatarFallback
                  className={cn(
                    "font-semibold",
                    p.userId === currentUserId && "bg-primary text-primary-foreground"
                  )}
                >
                  {initials(p.displayName)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
            {count}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px]">
        <p className="text-xs font-semibold mb-1">On this scene</p>
        <ul className="text-xs space-y-0.5">
          {peers.map((p) => (
            <li key={p.userId}>
              {p.displayName}
              {p.userId === dmUserId ? " (DM)" : ""}
              {p.userId === currentUserId ? " · you" : ""}
            </li>
          ))}
        </ul>
        {count === 0 && (
          <p className="text-xs text-muted-foreground">Connecting…</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}
