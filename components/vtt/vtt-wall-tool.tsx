"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Construction, Slash, MousePointer2, DoorOpen } from "lucide-react";
import { useVttStore } from "@/lib/store/vtt-store";
import { cn } from "@/lib/utils";

const MODES: Array<{
  mode: "pen" | "segment" | "door";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: "pen", label: "Pen (polyline)", icon: MousePointer2 },
  { mode: "segment", label: "Segment", icon: Slash },
  { mode: "door", label: "Door segment", icon: DoorOpen },
];

export function VttWallTool() {
  const [open, setOpen] = useState(false);
  const { activeTool, setActiveTool, wallEditorMode, setWallEditorMode } =
    useVttStore();
  const isActive = activeTool === "wall";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              onClick={() => {
                if (!isActive) setActiveTool("wall");
              }}
            >
              <Construction className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Walls (DM)</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-1" align="end">
        <div className="flex items-center gap-1">
          {MODES.map(({ mode, label, icon: Icon }) => (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive && wallEditorMode === mode ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setActiveTool("wall");
                    setWallEditorMode(mode);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
