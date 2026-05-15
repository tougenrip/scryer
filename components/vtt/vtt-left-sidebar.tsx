"use client";

import { cn } from "@/lib/utils";
import { Library, Music, CheckCircle2, Swords, HelpCircle, BookOpen, Inbox, NotebookPen, Users, Dices } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VttLeftTab = "assets" | "music" | "objectives" | "combat" | "library" | "handouts" | "notes" | "party" | "tables" | null;

type NavButtonProps = {
  title: string;
  isActive: boolean;
  icon: LucideIcon;
  onClick: () => void;
};

function NavButton({
  title,
  isActive,
  icon: Icon,
  onClick,
  badge,
}: NavButtonProps & { badge?: boolean }) {
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
      {badge && (
        <span
          className="absolute right-3 top-2.5 h-2 w-2 rounded-full bg-amber-400 animate-pulse ring-2 ring-neutral-950"
          aria-label={`${title} has activity`}
        />
      )}
    </button>
  );
}

// Account for BOTH sidebar nav columns (left + right = 7rem) so the slide-
// out panel can never push past the opposite sidebar's nav column.
const PANEL_W_CLASS = "w-[min(360px,calc(100vw-7rem))]";
const PANEL_MINW_CLASS = "min-w-0 max-w-[min(360px,calc(100vw-7rem))]";
const ASSETS_PANEL_W_CLASS = "w-[min(760px,calc(100vw-7rem))]";
const ASSETS_PANEL_MINW_CLASS = "min-w-0 max-w-[min(760px,calc(100vw-7rem))]";

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
  handoutsPanel?: React.ReactNode;
  notesPanel?: React.ReactNode;
  partyPanel?: React.ReactNode;
  /** When true, the Party nav button shows a pulsing dot to draw attention
   * (e.g. there's a live duel waiting). */
  partyBadge?: boolean;
  /** Random tables panel — re-uses the dice slot (the dedicated dice
   *  history sidebar was removed in favour of in-session table rolls). */
  tablesPanel?: React.ReactNode;
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
  handoutsPanel,
  notesPanel,
  partyPanel,
  partyBadge,
  tablesPanel,
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
          {handoutsPanel && (
            <NavButton
              title="Handouts"
              isActive={activeTab === "handouts"}
              icon={Inbox}
              onClick={() => onActiveTabChange(activeTab === "handouts" ? null : "handouts")}
            />
          )}
          {notesPanel && (
            <NavButton
              title="Notes"
              isActive={activeTab === "notes"}
              icon={NotebookPen}
              onClick={() => onActiveTabChange(activeTab === "notes" ? null : "notes")}
            />
          )}
          {partyPanel && (
            <NavButton
              title="Party"
              isActive={activeTab === "party"}
              icon={Users}
              onClick={() => onActiveTabChange(activeTab === "party" ? null : "party")}
              badge={partyBadge}
            />
          )}
          {tablesPanel && (
            <NavButton
              title="Random tables"
              isActive={activeTab === "tables"}
              icon={Dices}
              onClick={() => onActiveTabChange(activeTab === "tables" ? null : "tables")}
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
            {activeTab === "handouts" && handoutsPanel}
            {activeTab === "notes" && notesPanel}
            {activeTab === "party" && partyPanel}
            {activeTab === "tables" && tablesPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
