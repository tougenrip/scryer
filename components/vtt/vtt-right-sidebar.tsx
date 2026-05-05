"use client";

import { cn } from "@/lib/utils";
import { LayoutGrid, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VttRightTabState = {
  inspector: boolean;
  chat: boolean;
};

type NavButtonProps = {
  title: string;
  isActive: boolean;
  icon: LucideIcon;
  onClick: () => void;
};

function NavButton({ title, isActive, icon: Icon, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "relative flex h-12 w-full items-center justify-center text-muted-foreground transition-colors hover:text-foreground",
        isActive && "text-amber-500"
      )}
    >
      {isActive && (
        <div className="absolute right-0 top-1/2 h-1/2 w-0.5 -translate-y-1/2 bg-amber-500 rounded-l-full" />
      )}
      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
    </button>
  );
}

const PANEL_W_CLASS = "w-[min(360px,calc(100vw-5rem))]";
const PANEL_MINW_CLASS = "min-w-[min(360px,calc(100vw-5rem))]";

type VttRightSidebarProps = {
  openState: VttRightTabState;
  onToggleTab: (tab: keyof VttRightTabState) => void;
  inspectorPanel: React.ReactNode;
  chatPanel: React.ReactNode;
  floatingPanel?: React.ReactNode;
};

export function VttRightSidebar({
  openState,
  onToggleTab,
  inspectorPanel,
  chatPanel,
  floatingPanel,
}: VttRightSidebarProps) {
  const isOpen = openState.inspector || openState.chat;

  return (
    <div data-vtt-sidebar="right" className="pointer-events-none absolute inset-y-0 right-0 z-30 flex flex-row-reverse items-start">
      <div className="pointer-events-auto flex h-full">
        {/* Nav Ribbon */}
        <div className="flex w-14 flex-col bg-neutral-950 border-l border-neutral-800 shadow-2xl z-10 py-4 gap-2">
          <NavButton
            title="Inspector"
            isActive={openState.inspector}
            icon={LayoutGrid}
            onClick={() => onToggleTab("inspector")}
          />
          <NavButton
            title="Chat"
            isActive={openState.chat}
            icon={MessageSquare}
            onClick={() => onToggleTab("chat")}
          />
        </div>

        {/* Slide-out Panel Container */}
        <div
          className={cn(
            "min-h-0 overflow-hidden border-l border-neutral-800 bg-neutral-900 shadow-xl transition-[width] duration-300 ease-out",
            isOpen ? PANEL_W_CLASS : "w-0 border-l-0"
          )}
        >
          <div
            className={cn(
              "flex h-full flex-col",
              PANEL_MINW_CLASS,
              !isOpen && "pointer-events-none opacity-0"
            )}
          >
            {openState.inspector && (
              <div className={cn("flex-1 min-h-0 overflow-y-auto", openState.chat && "border-b border-neutral-800")}>
                {inspectorPanel}
              </div>
            )}
            {openState.chat && (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {chatPanel}
              </div>
            )}
          </div>
        </div>
      </div>
      {floatingPanel && (
        <div className="pointer-events-auto mr-2 mt-4">
          {floatingPanel}
        </div>
      )}
    </div>
  );
}
