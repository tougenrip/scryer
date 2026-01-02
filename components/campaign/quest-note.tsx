"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, CheckCircle2 } from "lucide-react";
import { Quest } from "@/hooks/useCampaignContent";
import { cn } from "@/lib/utils";

interface QuestNoteProps {
  quest: Quest;
  isDm: boolean;
  onEdit?: (quest: Quest) => void;
  onDelete?: (questId: string) => void;
}

export function QuestNote({ quest, isDm, onEdit, onDelete }: QuestNoteProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="relative perspective-1000">
      <div
        className={cn(
          "relative w-full h-full transition-transform duration-500 transform-style-preserve-3d cursor-pointer",
          isFlipped && "rotate-y-180"
        )}
        onClick={handleClick}
      >
        {/* Front of note */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden",
            !isFlipped ? "z-10" : "z-0"
          )}
        >
          <Card
            className={cn(
              "h-full bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100",
              "border-2 border-amber-200 shadow-lg",
              "hover:shadow-xl transition-shadow",
              "transform hover:scale-105 transition-transform"
            )}
            style={{
              backgroundColor: "#fef9e7",
              backgroundImage: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(139, 69, 19, 0.03) 2px,
                  rgba(139, 69, 19, 0.03) 4px
                )
              `,
              boxShadow: `
                0 4px 6px -1px rgba(0, 0, 0, 0.1),
                0 2px 4px -1px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                0 0 0 1px rgba(139, 69, 19, 0.1)
              `,
            }}
          >
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex-1">
                <h3
                  className="text-lg font-bold mb-2 text-amber-900"
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    textShadow: "0 1px 2px rgba(139, 69, 19, 0.2)",
                  }}
                >
                  {quest.title}
                </h3>
                <p
                  className="text-sm text-amber-800 line-clamp-3"
                  style={{
                    fontFamily: "var(--font-kalam), cursive",
                    lineHeight: "1.6",
                  }}
                >
                  {quest.content}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-300/50">
                {quest.verified && (
                  <Badge
                    variant="default"
                    className="bg-green-600 text-white text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {quest.source && (
                  <span
                    className="text-xs text-amber-700 italic"
                    style={{ fontFamily: "var(--font-kalam), cursive" }}
                  >
                    — {quest.source}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Back of note (details) */}
        <div
          className={cn(
            "absolute inset-0 backface-hidden rotate-y-180",
            isFlipped ? "z-10" : "z-0"
          )}
        >
          <Card
            className={cn(
              "h-full bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100",
              "border-2 border-amber-200 shadow-lg"
            )}
            style={{
              backgroundColor: "#fef9e7",
              backgroundImage: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(139, 69, 19, 0.03) 2px,
                  rgba(139, 69, 19, 0.03) 4px
                )
              `,
              boxShadow: `
                0 4px 6px -1px rgba(0, 0, 0, 0.1),
                0 2px 4px -1px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 0 rgba(255, 255, 255, 0.5),
                0 0 0 1px rgba(139, 69, 19, 0.1)
              `,
            }}
          >
            <CardContent className="p-4 h-full flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <h3
                  className="text-lg font-bold text-amber-900 flex-1"
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    textShadow: "0 1px 2px rgba(139, 69, 19, 0.2)",
                  }}
                >
                  {quest.title}
                </h3>
                {isDm && (
                  <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-700 hover:text-amber-900"
                        onClick={() => onEdit(quest)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-600 hover:text-red-800"
                        onClick={() => onDelete(quest.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p
                    className="text-sm text-amber-800 whitespace-pre-wrap"
                    style={{
                      fontFamily: "var(--font-kalam), cursive",
                      lineHeight: "1.8",
                    }}
                  >
                    {quest.content}
                  </p>
                </div>
                {(quest.source || quest.location) && (
                  <div className="pt-2 border-t border-amber-300/50 space-y-1">
                    {quest.source && (
                      <p
                        className="text-xs text-amber-700"
                        style={{ fontFamily: "var(--font-kalam), cursive" }}
                      >
                        <span className="font-semibold">Source:</span> {quest.source}
                      </p>
                    )}
                    {quest.location && (
                      <p
                        className="text-xs text-amber-700"
                        style={{ fontFamily: "var(--font-kalam), cursive" }}
                      >
                        <span className="font-semibold">Location:</span> {quest.location}
                      </p>
                    )}
                  </div>
                )}
                {quest.verified && (
                  <Badge
                    variant="default"
                    className="bg-green-600 text-white text-xs w-fit"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified Quest
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

