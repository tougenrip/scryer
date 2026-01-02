"use client";

import { Character, Race, DndClass } from "@/hooks/useDndContent";
import { formatCharacterStats } from "@/lib/utils/character-display";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, Edit, X, Plus } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CharacterCardProps {
  character: Character;
  campaignId: string;
  currentUserId: string;
  races: Race[];
  classes: DndClass[];
  playerEmail?: string | null;
  isUnassigned?: boolean;
  onAssign?: (characterId: string) => Promise<void>;
  onUnassign?: (characterId: string) => Promise<void>;
}

export function CharacterCard({
  character,
  campaignId,
  currentUserId,
  races,
  classes,
  playerEmail,
  isUnassigned = false,
  onAssign,
  onUnassign,
}: CharacterCardProps) {
  const isOwner = character.user_id === currentUserId;
  const statsLine = formatCharacterStats(character, races, classes);
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleUnassign = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUnassign) {
      await onUnassign(character.id);
    }
  };

  const handleAssign = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAssign) {
      await onAssign(character.id);
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Top Section - Dark Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 relative">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16 rounded-lg border-2 border-white/20 flex-shrink-0">
            <AvatarImage src={character.image_url || undefined} alt={character.name} />
            <AvatarFallback className="bg-primary/20 text-white font-bold rounded-lg">
              {getInitials(character.name)}
            </AvatarFallback>
          </Avatar>

          {/* Text Details */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-lg mb-1 truncate">
              {character.name}
            </h3>
            <p className="text-sm text-slate-300 mb-1">
              {statsLine}
            </p>
            <p className="text-xs text-slate-400">
              {isUnassigned ? "Unassigned" : playerEmail ? `Player: ${playerEmail}` : `Player: ${character.user_id.slice(0, 8)}...`}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Section - White Footer */}
      <div className="bg-white p-4 border-t border-border/50 rounded-b-lg">
        <div className="flex items-center justify-between gap-2">
          {isUnassigned ? (
            <Button
              onClick={handleAssign}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              ADD TO CAMPAIGN
            </Button>
          ) : isOwner ? (
            <>
              <Link href={`/campaigns/${campaignId}/characters/${character.id}`}>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  <Eye className="h-4 w-4 mr-1" />
                  VIEW
                </Button>
              </Link>
              <Link href={`/character-creator?characterId=${character.id}&campaignId=${campaignId}`}>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  <Edit className="h-4 w-4 mr-1" />
                  EDIT
                </Button>
              </Link>
              <Button
                onClick={handleUnassign}
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive/80 ml-auto"
              >
                <X className="h-4 w-4 mr-1" />
                UNASSIGN
              </Button>
            </>
          ) : (
            <Link href={`/campaigns/${campaignId}/characters/${character.id}`} className="ml-auto">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                <Eye className="h-4 w-4 mr-1" />
                VIEW
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

