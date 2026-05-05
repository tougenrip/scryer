"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type VttLeftDockTab = "assets" | "initiative" | "combat" | null;
export type VttRightDockTab = "table" | "music" | "goals" | null;

type BookmarkSpineButtonProps = {
  side: "left" | "right";
  title: string;
  isActive: boolean;
  openIcon: LucideIcon;
  onClick: () => void;
};

function BookmarkSpineButton({
  side,
  title,
  isActive,
  openIcon: OpenIcon,
  onClick,
}: BookmarkSpineButtonProps) {
  const CloseIcon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      title={isActive ? `Hide ${title}` : `Open ${title}`}
      aria-expanded={isActive}
      onClick={onClick}
      className={cn(
        "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 border-b border-border px-0.5 py-1.5 text-muted-foreground transition-colors last:border-b-0 hover:bg-card hover:text-foreground",
        isActive && "bg-card text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]"
      )}
    >
      {isActive ? (
        <CloseIcon className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <OpenIcon className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className="max-w-[2rem] text-center text-[8px] font-semibold uppercase leading-tight tracking-wide text-foreground">
        {title}
      </span>
    </button>
  );
}

/** Arbitrary width for bookmark panels — keep in sync in class strings below */
const PANEL_W_CLASS = "w-[min(360px,calc(100vw-5rem))]";
const PANEL_MINW_CLASS = "min-w-[min(360px,calc(100vw-5rem))]";

type LeftRailProps = {
  activeTab: VttLeftDockTab;
  onActiveTabChange: (tab: VttLeftDockTab) => void;
  assetsIcon: LucideIcon;
  initiativeIcon: LucideIcon;
  combatIcon: LucideIcon;
  assetsLabel?: string;
  initiativeLabel?: string;
  combatLabel?: string;
  assetsPanel: React.ReactNode;
  initiativePanel: React.ReactNode;
  combatPanel: React.ReactNode;
};

export function VttLeftBookmarkRail({
  activeTab,
  onActiveTabChange,
  assetsIcon,
  initiativeIcon,
  combatIcon,
  assetsLabel = "Scenes",
  initiativeLabel = "Order",
  combatLabel = "Battle",
  assetsPanel,
  initiativePanel,
  combatPanel,
}: LeftRailProps) {
  const open = activeTab !== null;

  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-0 z-30 flex"
      data-vtt-bookmark-left=""
    >
      <div className="pointer-events-auto flex h-full overflow-hidden rounded-r-lg border border-border bg-card shadow-xl">
        <div className="flex w-8 shrink-0 flex-col bg-muted">
          <BookmarkSpineButton
            side="left"
            title={assetsLabel}
            isActive={activeTab === "assets"}
            openIcon={assetsIcon}
            onClick={() =>
              onActiveTabChange(activeTab === "assets" ? null : "assets")
            }
          />
          <BookmarkSpineButton
            side="left"
            title={initiativeLabel}
            isActive={activeTab === "initiative"}
            openIcon={initiativeIcon}
            onClick={() =>
              onActiveTabChange(activeTab === "initiative" ? null : "initiative")
            }
          />
          <BookmarkSpineButton
            side="left"
            title={combatLabel}
            isActive={activeTab === "combat"}
            openIcon={combatIcon}
            onClick={() =>
              onActiveTabChange(activeTab === "combat" ? null : "combat")
            }
          />
        </div>
        <div
          className={cn(
            "min-h-0 overflow-hidden border-l border-border transition-[width] duration-300 ease-out",
            open ? PANEL_W_CLASS : "w-0 border-l-0"
          )}
        >
          <div
            className={cn(
              "flex h-full flex-col bg-card",
              PANEL_MINW_CLASS,
              !open && "pointer-events-none opacity-0"
            )}
          >
            {activeTab === "assets" && assetsPanel}
            {activeTab === "initiative" && initiativePanel}
            {activeTab === "combat" && combatPanel}
          </div>
        </div>
      </div>
    </div>
  );
}

type RightRailProps = {
  activeTab: VttRightDockTab;
  onActiveTabChange: (tab: VttRightDockTab) => void;
  tableIcon: LucideIcon;
  musicIcon: LucideIcon;
  goalsIcon: LucideIcon;
  tableLabel?: string;
  musicLabel?: string;
  goalsLabel?: string;
  tablePanel: React.ReactNode;
  musicPanel: React.ReactNode;
  goalsPanel: React.ReactNode;
};

export function VttRightBookmarkRail({
  activeTab,
  onActiveTabChange,
  tableIcon,
  musicIcon,
  goalsIcon,
  tableLabel = "Table",
  musicLabel = "Music",
  goalsLabel = "Goals",
  tablePanel,
  musicPanel,
  goalsPanel,
}: RightRailProps) {
  const open = activeTab !== null;

  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-30 flex flex-row-reverse"
      data-vtt-bookmark-right=""
    >
      <div className="pointer-events-auto flex h-full overflow-hidden rounded-l-lg border border-border bg-card shadow-xl">
        <div className="flex w-8 shrink-0 flex-col bg-muted">
          <BookmarkSpineButton
            side="right"
            title={tableLabel}
            isActive={activeTab === "table"}
            openIcon={tableIcon}
            onClick={() =>
              onActiveTabChange(activeTab === "table" ? null : "table")
            }
          />
          <BookmarkSpineButton
            side="right"
            title={musicLabel}
            isActive={activeTab === "music"}
            openIcon={musicIcon}
            onClick={() =>
              onActiveTabChange(activeTab === "music" ? null : "music")
            }
          />
          <BookmarkSpineButton
            side="right"
            title={goalsLabel}
            isActive={activeTab === "goals"}
            openIcon={goalsIcon}
            onClick={() =>
              onActiveTabChange(activeTab === "goals" ? null : "goals")
            }
          />
        </div>
        <div
          className={cn(
            "min-h-0 overflow-hidden border-r border-border transition-[width] duration-300 ease-out",
            open ? PANEL_W_CLASS : "w-0 border-r-0"
          )}
        >
          <div
            className={cn(
              "flex h-full flex-col bg-card",
              PANEL_MINW_CLASS,
              !open && "pointer-events-none opacity-0"
            )}
          >
            {activeTab === "table" && tablePanel}
            {activeTab === "music" && musicPanel}
            {activeTab === "goals" && goalsPanel}
          </div>
        </div>
      </div>
    </div>
  );
}
