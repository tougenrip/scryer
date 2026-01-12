"use client";

import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, User, Flag, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { NPC } from "@/hooks/useCampaignContent";
import { Faction, WorldLocation, PantheonDeity } from "@/hooks/useForgeContent";

interface RelationshipBoardSidebarProps {
  npcs?: NPC[];
  factions?: Faction[];
  locations?: WorldLocation[];
  pantheons?: PantheonDeity[];
  onDragStart: (entityType: 'npc' | 'faction' | 'location' | 'pantheon', entityId: string, entityName: string) => void;
  className?: string;
}

export function RelationshipBoardSidebar({
  npcs = [],
  factions = [],
  locations = [],
  pantheons = [],
  onDragStart,
  className,
}: RelationshipBoardSidebarProps) {
  const handleDragStart = (
    e: React.DragEvent,
    entityType: 'npc' | 'faction' | 'location' | 'pantheon',
    entityId: string,
    entityName: string
  ) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: entityType,
      id: entityId,
      name: entityName,
    }));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(entityType, entityId, entityName);
  };

  return (
    <div className={cn("w-64 border-r bg-background flex flex-col overflow-hidden", className)}>
      <div className="p-4 border-b flex-shrink-0">
        <h2 className="font-semibold text-lg">Add to Board</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Drag items to add them to the relationship board
        </p>
      </div>
      
      <ScrollArea className="flex-1 min-h-0">
        <Accordion type="multiple" defaultValue={[]} className="w-full">
          {/* NPCs Section */}
          <AccordionItem value="npcs" className="border-b">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>NPCs ({npcs.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-2">
              <div className="space-y-1">
                {npcs.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No NPCs available</p>
                ) : (
                  npcs.map((npc) => (
                    <div
                      key={npc.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'npc', npc.id, npc.name)}
                      className={cn(
                        "cursor-grab active:cursor-grabbing",
                        "px-3 py-2 rounded-md",
                        "bg-muted/50 hover:bg-muted",
                        "border border-transparent hover:border-border",
                        "transition-colors",
                        "select-none"
                      )}
                    >
                      <div className="text-sm font-medium">{npc.name}</div>
                      {npc.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {npc.description}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Factions Section */}
          <AccordionItem value="factions" className="border-b">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                <span>Factions ({factions.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-2">
              <div className="space-y-1">
                {factions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No factions available</p>
                ) : (
                  factions.map((faction) => (
                    <div
                      key={faction.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'faction', faction.id, faction.name)}
                      className={cn(
                        "cursor-grab active:cursor-grabbing",
                        "px-3 py-2 rounded-md",
                        "bg-muted/50 hover:bg-muted",
                        "border border-transparent hover:border-border",
                        "transition-colors",
                        "select-none"
                      )}
                    >
                      <div className="text-sm font-medium">{faction.name}</div>
                      {faction.type && (
                        <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {faction.type}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Locations Section */}
          <AccordionItem value="locations" className="border-b">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Locations ({locations.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-2">
              <div className="space-y-1">
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No locations available</p>
                ) : (
                  locations.map((location) => (
                    <div
                      key={location.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'location', location.id, location.name)}
                      className={cn(
                        "cursor-grab active:cursor-grabbing",
                        "px-3 py-2 rounded-md",
                        "bg-muted/50 hover:bg-muted",
                        "border border-transparent hover:border-border",
                        "transition-colors",
                        "select-none"
                      )}
                    >
                      <div className="text-sm font-medium">{location.name}</div>
                      {location.type && (
                        <div className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {location.type}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Pantheons Section */}
          <AccordionItem value="pantheons" className="border-b">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Pantheons ({pantheons.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-2">
              <div className="space-y-1">
                {pantheons.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No pantheons available</p>
                ) : (
                  pantheons.map((deity) => (
                    <div
                      key={deity.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'pantheon', deity.id, deity.name)}
                      className={cn(
                        "cursor-grab active:cursor-grabbing",
                        "px-3 py-2 rounded-md",
                        "bg-muted/50 hover:bg-muted",
                        "border border-transparent hover:border-border",
                        "transition-colors",
                        "select-none"
                      )}
                    >
                      <div className="text-sm font-medium">{deity.name}</div>
                      {deity.title && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {deity.title}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollArea>
    </div>
  );
}

