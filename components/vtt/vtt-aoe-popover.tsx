"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Circle, Triangle, Minus, Square, CircleDot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVttStore } from "@/lib/store/vtt-store";

const SHAPES: Array<{
  shape: "circle" | "cone" | "line" | "square" | "ring";
  tool:
    | "aoe-circle"
    | "aoe-cone"
    | "aoe-line"
    | "aoe-square"
    | "aoe-ring";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { shape: "circle", tool: "aoe-circle", label: "Sphere / Circle", icon: Circle },
  { shape: "cone", tool: "aoe-cone", label: "Cone", icon: Triangle },
  { shape: "line", tool: "aoe-line", label: "Line", icon: Minus },
  { shape: "square", tool: "aoe-square", label: "Square / Cube", icon: Square },
  { shape: "ring", tool: "aoe-ring", label: "Ring", icon: CircleDot },
];

export function VttAoePopover() {
  const [open, setOpen] = useState(false);
  const { activeTool, setActiveTool, setAoeShape } = useVttStore();
  const isActive = activeTool.startsWith("aoe-");

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
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>AOE shapes</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-1" align="end">
        <div className="flex items-center gap-1">
          {SHAPES.map(({ shape, tool, label, icon: Icon }) => (
            <Tooltip key={shape}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setAoeShape(shape);
                    setActiveTool(tool);
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
