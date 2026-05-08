"use client";

import { Info } from "lucide-react";
import { useQuickSearchStore, type EntityRef } from "@/lib/store/quick-search-store";
import { cn } from "@/lib/utils";

interface Props {
  target: EntityRef;
  className?: string;
  size?: "xs" | "sm";
  /** Tooltip text override. */
  title?: string;
}

/**
 * Small (i) button. Click opens the Quick Search drawer with the given entry
 * pre-selected. Renders as a <span role="button"> (not a real <button>) so it
 * can safely live inside other clickable rows without the "button-in-button"
 * hydration warning.
 */
export function InfoIconButton({ target, className, size = "sm", title }: Props) {
  const open = useQuickSearchStore((s) => s.open);
  const px = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        open(target);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.stopPropagation();
          e.preventDefault();
          open(target);
        }
      }}
      title={title ?? "Look up in Quick Search"}
      className={cn(
        "inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-amber-400 cursor-pointer transition-colors",
        className
      )}
    >
      <Info className={px} />
    </span>
  );
}
