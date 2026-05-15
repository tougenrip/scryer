"use client";

import { cn } from "@/lib/utils";
import {
  Map,
  Dices,
  MessageSquare,
  Users,
  type LucideIcon,
} from "lucide-react";

export type MobileTab = "vtt" | "dice" | "chat" | "party";

interface Props {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
}

const TABS: Array<{
  id: MobileTab;
  label: string;
  icon: LucideIcon;
}> = [
  { id: "vtt", label: "VTT", icon: Map },
  { id: "dice", label: "Dice", icon: Dices },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "party", label: "Party", icon: Users },
];

export function MobileTabBar({ active, onChange }: Props) {
  return (
    <nav
      aria-label="Mobile companion tabs"
      className="shrink-0 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-sm"
      // env(safe-area-inset-bottom) keeps the bar above the home
      // indicator on iOS devices.
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.id;
          return (
            <li key={t.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(t.id)}
                className={cn(
                  "w-full flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors min-h-[60px]",
                  isActive
                    ? "text-amber-400"
                    : "text-neutral-400 hover:text-neutral-200"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="uppercase tracking-wider">{t.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
