"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pencil, Eraser, Trash2 } from "lucide-react";
import { useVttStore } from "@/lib/store/vtt-store";
import { cn } from "@/lib/utils";

interface Props {
  isDm: boolean;
  /** Fires `vtt:clear-mine` (handled in GameCanvas). */
  onClearMine: () => void;
  /** Fires `vtt:clear-all` (DM only — confirmed via dialog). */
  onClearAll: () => void;
}

/**
 * One toolbar entry that consolidates the three drawing-related controls:
 * the Draw tool, the Eraser tool (drawings-only), Clear my marks, and the
 * DM's Clear all. Replaces the previous three separate toolbar buttons.
 */
export function VttDrawingsTool({ isDm, onClearMine, onClearAll }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const { activeTool, setActiveTool } = useVttStore();
  const isDraw = activeTool === "draw";
  const isErase = activeTool === "erase";
  const buttonActive = isDraw || isErase;

  const onPickDraw = () => {
    setActiveTool(isDraw ? "select" : "draw");
    setOpen(false);
  };
  const onPickErase = () => {
    setActiveTool(isErase ? "select" : "erase");
    setOpen(false);
  };

  return (
    <>
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
                <Pencil className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Drawings</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-60 p-2" align="end">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tools
            </p>
            <div className="grid grid-cols-2 gap-1">
              <Button
                type="button"
                variant={isDraw ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={onPickDraw}
              >
                <Pencil className="h-3.5 w-3.5" />
                Draw
              </Button>
              <Button
                type="button"
                variant={isErase ? "default" : "outline"}
                size="sm"
                className="h-9 gap-1.5 text-xs"
                onClick={onPickErase}
              >
                <Eraser className="h-3.5 w-3.5" />
                Eraser
              </Button>
            </div>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Drag to draw. Shift+release a stroke to keep it. The eraser
              removes drawings only — AOE shapes have their own delete
              handle.
            </p>

            <div className="border-t border-border my-1" />

            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Clear
            </p>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
              onClick={() => {
                onClearMine();
                setOpen(false);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              Clear my marks
            </button>
            {isDm && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setOpen(false);
                  setConfirmAllOpen(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all marks (DM)
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear every mark on this scene?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes every player&apos;s drawings and AOE areas on this
              map. The action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onClearAll()}
            >
              Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
