"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureOptionCardProps {
  index: string;
  name: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function FeatureOptionCard({
  index,
  name,
  description,
  selected,
  onClick,
  disabled = false,
}: FeatureOptionCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all",
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border hover:border-primary/50 hover:shadow-sm",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1">{name}</div>
            {description && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </div>
            )}
          </div>
          {selected && (
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
