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
import { Trash2, Eye, EyeOff } from "lucide-react";
import { useVttStore } from "@/lib/store/vtt-store";
import { cn } from "@/lib/utils";

interface Props {
  isDm: boolean;
  onClearMine: () => void;
  onClearAll: () => void;
}

export function VttClearPopover({ isDm, onClearMine, onClearAll }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Clear marks</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-48 p-1" align="end">
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-xs hover:bg-muted rounded"
            onClick={() => {
              onClearMine();
              setOpen(false);
            }}
          >
            Clear my marks
          </button>
          {isDm && (
            <button
              type="button"
              className="flex w-full items-center px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10 rounded"
              onClick={() => {
                setOpen(false);
                setConfirmAllOpen(true);
              }}
            >
              Clear all marks (DM)
            </button>
          )}
        </PopoverContent>
      </Popover>
      <AlertDialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear every mark on this scene?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes every player&apos;s drawings and AOE areas on this map.
              The action cannot be undone.
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

export function VttPrivateToggle() {
  const { dmPrivateMode, setDmPrivateMode } = useVttStore();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={dmPrivateMode ? "default" : "ghost"}
          size="icon"
          className={cn(
            "h-8 w-8",
            dmPrivateMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          )}
          onClick={() => setDmPrivateMode(!dmPrivateMode)}
        >
          {dmPrivateMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {dmPrivateMode ? "DM private mode (on)" : "DM private mode"}
      </TooltipContent>
    </Tooltip>
  );
}
