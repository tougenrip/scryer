"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHORTCUTS: Array<{ keys: string; label: string }> = [
  { keys: "?", label: "Show this shortcut help" },
  { keys: "Alt + Click", label: "Drop a ping at cursor" },
  { keys: "Right-click + drag", label: "Pan the camera" },
  { keys: "Mouse wheel", label: "Zoom in / out" },
  { keys: "Shift + release", label: "Persist a drawing or AOE shape" },
  { keys: "Click an AOE / drawing", label: "Select it" },
  { keys: "Drag a selected AOE", label: "Move it (cone/line: yellow handle = rotate)" },
  { keys: "Delete / Backspace", label: "Delete selected AOE or drawing" },
  { keys: "Ctrl + Z", label: "Undo last create or erase" },
  { keys: "Esc", label: "Deselect / cancel placement" },
];

export function VttShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (editable) return;
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onShow = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("vtt:show-shortcuts", onShow);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("vtt:show-shortcuts", onShow);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Press ? any time to toggle this dialog.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="contents">
              <kbd className="self-start rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
