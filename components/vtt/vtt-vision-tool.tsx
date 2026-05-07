"use client";

import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import {
  Eye,
  EyeOff,
  Slash,
  MousePointer2,
  DoorOpen,
} from "lucide-react";
import { useVttStore } from "@/lib/store/vtt-store";
import { cn } from "@/lib/utils";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";

interface Props {
  /** Whether vision (LOS) is enabled on this scene. */
  visionEnabled: boolean;
  /** Whether the scene is in "dark" lighting mode. */
  sceneDark: boolean;
  /** Toggle handlers — write to DB and update local state. */
  onToggleVision: (next: boolean) => void;
  onToggleSceneDark: (next: boolean) => void;
}

const WALL_MODES: Array<{
  mode: "pen" | "segment" | "door";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    mode: "pen",
    label: "Pen",
    description: "Multi-vertex polyline (double-click to finish)",
    icon: MousePointer2,
  },
  {
    mode: "segment",
    label: "Segment",
    description: "Two-click straight wall",
    icon: Slash,
  },
  {
    mode: "door",
    label: "Door",
    description: "Two-click door (anyone can toggle open/closed)",
    icon: DoorOpen,
  },
];

/**
 * Single DM-only popover that consolidates everything related to vision
 * on the current scene: the LOS toggle, the dark-scene toggle, and the
 * wall-drawing sub-tools. Keeps the toolbar from sprouting three icons
 * the DM can't tell apart.
 */
export function VttVisionTool({
  visionEnabled,
  sceneDark,
  onToggleVision,
  onToggleSceneDark,
}: Props) {
  const [open, setOpen] = useState(false);
  const { activeTool, setActiveTool, wallEditorMode, setWallEditorMode } =
    useVttStore();
  const tokens = useVttStore((s) => s.tokens);
  const previewAsUserId = useVttStore((s) => s.previewAsUserId);
  const setPreviewAsUserId = useVttStore((s) => s.setPreviewAsUserId);
  const isWallToolActive = activeTool === "wall";
  const buttonActive = isWallToolActive || visionEnabled || !!previewAsUserId;

  // Unique characters on the map (one entry per user_id with a token here).
  // Used for the "Preview as" dropdown so the DM can verify another user's LOS.
  const previewable = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of tokens) {
      const uid = (t as unknown as { character?: { user_id?: string | null } })
        .character?.user_id;
      if (!uid || seen.has(uid)) continue;
      seen.set(uid, cleanVttDisplayName(t.name ?? "Unknown") || "Unknown");
    }
    return Array.from(seen, ([userId, name]) => ({ userId, name }));
  }, [tokens]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={buttonActive ? "default" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                buttonActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {visionEnabled ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Vision &amp; walls</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          {/* Vision toggle */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">Line of sight</p>
              <p className="text-[10px] leading-snug text-muted-foreground">
                When on, players see only what their tokens can see, blocked by walls.
                Off: everyone sees the whole map.
              </p>
            </div>
            <Switch
              checked={visionEnabled}
              onCheckedChange={(v) => onToggleVision(v)}
              aria-label="Toggle line of sight"
            />
          </div>

          <div className="border-t border-border" />

          {/* Scene darkness */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-xs font-semibold",
                  !visionEnabled && "text-muted-foreground"
                )}
              >
                Dark scene
              </p>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Players only see within their tokens&apos; light radius (set per token in
                the inspector). Requires line of sight on.
              </p>
            </div>
            <Switch
              checked={sceneDark}
              disabled={!visionEnabled}
              onCheckedChange={(v) => onToggleSceneDark(v)}
              aria-label="Toggle dark scene"
            />
          </div>

          <div className="border-t border-border" />

          {/* Wall drawing tools */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Walls</p>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Block sight (when LOS is on) and movement (always). Pick a mode and
              click on the map.
            </p>
            <div className="flex items-center gap-1 pt-1">
              {WALL_MODES.map(({ mode, label, description, icon: Icon }) => (
                <Tooltip key={mode}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={
                        isWallToolActive && wallEditorMode === mode
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="h-8 flex-1 gap-1.5 text-xs"
                      onClick={() => {
                        setActiveTool("wall");
                        setWallEditorMode(mode);
                        setOpen(false);
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{description}</TooltipContent>
                </Tooltip>
              ))}
            </div>
            {isWallToolActive && (
              <button
                type="button"
                className="mt-1 w-full rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => {
                  setActiveTool("select");
                  setOpen(false);
                }}
              >
                Stop placing walls
              </button>
            )}
          </div>

          {visionEnabled && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-1.5">
                <p className="text-xs font-semibold">Preview as</p>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  Show the scene as one of your players would see it. The map
                  dims to their LOS, tokens they can&apos;t see hide. Reset to
                  return to your DM view.
                </p>
                <select
                  value={previewAsUserId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPreviewAsUserId(v === "" ? null : v);
                  }}
                  className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                  disabled={previewable.length === 0}
                >
                  <option value="">DM view (default)</option>
                  {previewable.map(({ userId, name }) => (
                    <option key={userId} value={userId}>
                      {name}
                    </option>
                  ))}
                </select>
                {previewable.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    No player-owned tokens on this map yet.
                  </p>
                )}
                {previewAsUserId && (
                  <button
                    type="button"
                    className="mt-1 w-full rounded-md border border-amber-400/40 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-600 hover:bg-amber-400/20 dark:text-amber-300"
                    onClick={() => setPreviewAsUserId(null)}
                  >
                    Exit preview
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
