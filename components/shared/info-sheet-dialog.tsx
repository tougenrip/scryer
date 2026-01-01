"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { InfoSheet, type InfoSheetContent } from "./info-sheet";

interface InfoSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: InfoSheetContent | null;
}

function getTitle(content: InfoSheetContent): string {
  switch (content.type) {
    case "spell":
      return content.data.name;
    case "equipment":
      return content.data.name;
    case "ability":
      return content.data.name;
    case "saving-throw":
      return `${content.data.ability} Saving Throw`;
    case "skill":
      return content.data.name;
    case "condition":
      return content.data.name;
    case "race":
      return content.data.name;
    case "class":
      return content.data.name;
    case "trait":
      return content.data.name;
    case "feature":
      return content.data.name;
    default:
      return "Information";
  }
}

export function InfoSheetDialog({ open, onOpenChange, content }: InfoSheetDialogProps) {
  if (!content) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm overflow-y-auto">
        <SheetTitle className="sr-only">{getTitle(content)}</SheetTitle>
        <InfoSheet content={content} onClose={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

