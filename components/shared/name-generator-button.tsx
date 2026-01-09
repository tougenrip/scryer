"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Dices, RefreshCw, Zap } from "lucide-react";
import { generateName, generateMultipleNames, NameCategory } from "@/lib/utils/name-generator";
import { cn } from "@/lib/utils";

interface NameGeneratorButtonProps {
  category: NameCategory;
  onGenerate: (name: string) => void;
  race?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export function NameGeneratorButton({
  category,
  onGenerate,
  race,
  className,
  variant = "outline",
  size,
  disabled = false,
}: NameGeneratorButtonProps) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateSuggestions = () => {
    setIsGenerating(true);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        const newSuggestions = generateMultipleNames(category, 8, race);
        setSuggestions(newSuggestions);
        setSelectedName(null);
      } catch (error) {
        console.error('Error generating names:', error);
      } finally {
        setIsGenerating(false);
      }
    }, 0);
  };

  const handleSelectName = (name: string) => {
    setSelectedName(name);
    onGenerate(name);
    setOpen(false);
  };

  const handleQuickGenerate = () => {
    try {
      const name = generateName(category, race);
      onGenerate(name);
    } catch (error) {
      console.error('Error generating name:', error);
    }
  };

  // Handle button click - generate and fill immediately
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ctrl+Click or Shift+Click opens popover for suggestions
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      setOpen(true);
      return;
    }
    
    // Regular click generates and fills immediately
    handleQuickGenerate();
  };

  // Generate suggestions when popover opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && suggestions.length === 0) {
      handleGenerateSuggestions();
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          className={cn("h-9 w-9 p-0 bg-[var(--primary)] hover:bg-[var(--primary)] border-border/50", className)}
          disabled={disabled}
          onClick={handleButtonClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          style={{ perspective: '200px' }}
        >
          <span 
            className="inline-block"
          >
            <Dices className="h-4 w-4 text-[var(--background)]" />
          </span>
        </Button>
      </PopoverAnchor>
      <PopoverContent className="w-80" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Generate Names</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleQuickGenerate}
                className="h-8 px-2 text-xs gap-1"
                disabled={isGenerating}
              >
                <Zap className="h-3 w-3" />
                Quick
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {isGenerating ? "Generating..." : "Suggestions:"}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleGenerateSuggestions}
                  className="h-7 px-2 text-xs gap-1"
                  disabled={isGenerating}
                >
                  <RefreshCw className={cn("h-3 w-3", isGenerating && "animate-spin")} />
                  Refresh
                </Button>
              </div>
              
              {isGenerating && suggestions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1 max-h-[200px] overflow-y-auto">
                  {suggestions.map((name, index) => (
                    <Button
                      key={`${name}-${index}`}
                      type="button"
                      variant={selectedName === name ? "default" : "ghost"}
                      size="sm"
                      className="justify-start text-left h-auto py-2 px-3 text-sm font-normal"
                      onClick={() => handleSelectName(name)}
                    >
                      {name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            
            {race && (
              <p className="text-xs text-muted-foreground italic">
                Style: {race}
              </p>
            )}
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Powered by Markov chains - names generated from fantasy name patterns
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Click the dice button to auto-fill, or Ctrl+Click for suggestions
              </p>
            </div>
          </div>
        </PopoverContent>
    </Popover>
  );
}

