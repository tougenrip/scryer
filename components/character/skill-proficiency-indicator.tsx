"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillProficiencyIndicatorProps {
  proficient: boolean;
  expertise: boolean;
  editable?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function SkillProficiencyIndicator({
  proficient,
  expertise,
  editable = false,
  onToggle,
  className,
}: SkillProficiencyIndicatorProps) {
  const handleClick = () => {
    if (editable && onToggle) {
      onToggle();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-all",
        editable && onToggle && "cursor-pointer hover:opacity-80",
        className
      )}
      onClick={handleClick}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={(e) => {
        if (editable && onToggle && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      {expertise ? (
        <Star
          size={12}
          className="text-primary fill-primary"
          strokeWidth={2}
          title="Expertise (double proficiency)"
        />
      ) : proficient ? (
        <div
          className="w-3 h-3 rounded border border-primary bg-primary"
          title="Proficient"
        />
      ) : (
        <div
          className="w-3 h-3 rounded border border-border/50 bg-muted/30"
          title="Not proficient"
        />
      )}
    </div>
  );
}
