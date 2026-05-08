"use client";

import { cn } from "@/lib/utils";
import { Library, Music, CheckCircle2, Swords, HelpCircle, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VttLeftTab = "assets" | "music" | "objectives" | "combat" | "library" | null;

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
        <div className="absolute left-0 top-1/2 h-1/2 w-0.5 -translate-y-1/2 bg-amber-500 rounded-r-full" />
      )}
      <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
    </button>
  );
}

const PANEL_W_CLASS = "w-[min(360px,calc(100vw-5rem))]";
const PANEL_MINW_CLASS = "min-w-[min(360px,calc(100vw-5rem))]";
const ASSETS_PANEL_W_CLASS = "w-[min(760px,calc(100vw-5rem))]";
const ASSETS_PANEL_MINW_CLASS = "min-w-[min(760px,calc(100vw-5rem))]";

type VttLeftSidebarProps = {
  activeTab: VttLeftTab;
  onActiveTabChange: (tab: VttLeftTab) => void;
  showCombat?: boolean;
  showObjectives?: boolean;
  assetsPanel: React.ReactNode;
  assetsLabel?: string;
  assetsIcon?: LucideIcon;
  musicPanel: React.ReactNode;
  objectivesPanel: React.ReactNode;
  combatPanel?: React.ReactNode;
  libraryPanel?: React.ReactNode;
};

export function VttLeftSidebar({
  activeTab,
  onActiveTabChange,
  showCombat = false,
  showObjectives = true,
  assetsPanel,
  assetsLabel = "Assets",
  assetsIcon = Library,
  musicPanel,
  objectivesPanel,
  combatPanel,
  libraryPanel,
}: VttLeftSidebarProps) {
  const open = activeTab !== null;
  const panelWidthClass = activeTab === "assets" ? ASSETS_PANEL_W_CLASS : PANEL_W_CLASS;
  const panelMinWidthClass = activeTab === "assets" ? ASSETS_PANEL_MINW_CLASS : PANEL_MINW_CLASS;

  return (
    <div data-vtt-sidebar="left" className="pointer-events-none absolute inset-y-0 left-0 z-30 flex">
      <div className="pointer-events-auto flex h-full">
        {/* Nav Ribbon */}
        <div className="flex w-14 flex-col bg-neutral-950 border-r border-neutral-800 shadow-2xl z-10 py-4 gap-2">
          <NavButton
            title={assetsLabel}
            isActive={activeTab === "assets"}
            icon={assetsIcon}
            onClick={() => onActiveTabChange(activeTab === "assets" ? null : "assets")}
          />
          <NavButton
            title="Music"
            isActive={activeTab === "music"}
            icon={Music}
            onClick={() => onActiveTabChange(activeTab === "music" ? null : "music")}
          />
          {showObjectives && (
            <NavButton
              title="Objectives"
              isActive={activeTab === "objectives"}
              icon={CheckCircle2}
              onClick={() => onActiveTabChange(activeTab === "objectives" ? null : "objectives")}
            />
          )}
          {libraryPanel && (
            <NavButton
              title="Quick Search · Rules Library"
              isActive={activeTab === "library"}
              icon={BookOpen}
              onClick={() => onActiveTabChange(activeTab === "library" ? null : "library")}
            />
          )}
          <div className="flex-1" />
          {showCombat && (
            <NavButton
              title="Combat & Order"
              isActive={activeTab === "combat"}
              icon={Swords}
              onClick={() => onActiveTabChange(activeTab === "combat" ? null : "combat")}
            />
          )}
          <NavButton
            title="Keyboard shortcuts (?)"
            isActive={false}
            icon={HelpCircle}
            onClick={() =>
              window.dispatchEvent(new CustomEvent("vtt:show-shortcuts"))
            }
          />
        </div>

        {/* Slide-out Panel Container */}
        <div
          className={cn(
            "min-h-0 overflow-hidden border-r border-neutral-800 bg-neutral-900 shadow-xl transition-[width] duration-300 ease-out",
            open ? panelWidthClass : "w-0 border-r-0"
          )}
        >
          <div
            className={cn(
              "flex h-full flex-col",
              panelMinWidthClass,
              !open && "pointer-events-none opacity-0"
            )}
          >
            {activeTab === "assets" && assetsPanel}
            {activeTab === "music" && musicPanel}
            {activeTab === "objectives" && objectivesPanel}
            {activeTab === "combat" && combatPanel}
            {activeTab === "library" && libraryPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
