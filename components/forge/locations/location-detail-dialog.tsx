"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, Trash2, MapPin, Globe, Mountain, Flag, Building2, Home, Store, Landmark, Castle, TreePine, Waves, Map as MapIcon } from "lucide-react";
import { WorldLocation } from "@/hooks/useForgeContent";

interface LocationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: WorldLocation | null;
  locations: WorldLocation[];
  campaignId: string;
  isDm: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const typeIcons: Partial<Record<WorldLocation['type'], React.ComponentType<{ className?: string }>>> = {
  world: Globe,
  continent: Mountain,
  region: Flag,
  kingdom: Flag,
  city: Building2,
  village: Home,
  settlement: Home,
  poi: Store,
  dungeon: Castle,
  landmark: Landmark,
  structure: Building2,
  lair: Castle,
  biome: TreePine,
  island: Waves,
  archipelago: MapIcon,
};

const typeLabels: Partial<Record<WorldLocation['type'], string>> = {
  world: "World",
  continent: "Continent",
  region: "Region",
  kingdom: "Kingdom",
  city: "City",
  village: "Village",
  settlement: "Settlement",
  poi: "Point of Interest",
  dungeon: "Dungeon",
  landmark: "Landmark",
  structure: "Structure",
  lair: "Lair",
  biome: "Biome",
  island: "Island",
  archipelago: "Archipelago",
};

const getTypeLabel = (type: WorldLocation['type']): string => {
  return typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

export function LocationDetailDialog({
  open,
  onOpenChange,
  location,
  locations,
  isDm,
  onEdit,
  onDelete,
}: LocationDetailDialogProps) {
  if (!location) return null;

  const parentLocation = location.parent_location_id
    ? locations.find(l => l.id === location.parent_location_id)
    : null;

  const childLocations = locations.filter(l => l.parent_location_id === location.id);
  const Icon = typeIcons[location.type] || MapPin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-muted-foreground" />
              <div>
                <DialogTitle className="text-2xl">{location.name}</DialogTitle>
                <DialogDescription className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    {getTypeLabel(location.type)}
                  </Badge>
                  {location.status && location.status !== 'normal' && (
                    <Badge variant="outline" className="capitalize">
                      {location.status.replace('_', ' ')}
                    </Badge>
                  )}
                </DialogDescription>
              </div>
            </div>
            {isDm && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Parent Location */}
          {parentLocation && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Parent Location
              </h3>
              <p className="text-sm">{parentLocation.name}</p>
            </div>
          )}

          {/* Status */}
          {location.status && location.status !== 'normal' && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Status
              </h3>
              <Badge variant="outline" className="capitalize">
                {location.status.replace('_', ' ')}
              </Badge>
            </div>
          )}

          {/* Description */}
          {location.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </h3>
              <p className="text-sm whitespace-pre-wrap">{location.description}</p>
            </div>
          )}

          {/* Child Locations */}
          {childLocations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Sub-locations ({childLocations.length})
              </h3>
              <div className="space-y-2">
                {childLocations.map((child) => {
                  const IconComponent = typeIcons[child.type];
                  return (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                      {IconComponent && (
                      <div className="h-4 w-4 text-muted-foreground shrink-0">
                          <IconComponent className="h-4 w-4" />
                      </div>
                    )}
                    <span className="text-sm font-medium">{child.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">
                      {getTypeLabel(child.type)}
                    </Badge>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location Image */}
          {location.image_url && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Image
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                <img
                  src={location.image_url}
                  alt={location.name}
                  className="w-full h-64 object-contain bg-muted"
                />
              </div>
            </div>
          )}

          {/* Location Information */}
          {location.metadata && Object.keys(location.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Location Information
                </h3>
                <div className="space-y-3">
                  {location.metadata.ruler_owner_id && (
                    <div>
                      <span className="text-sm text-muted-foreground">Ruler/Owner:</span>
                      <span className="ml-2 text-sm font-medium">
                        {/* Would need to fetch NPC name here */}
                        ID: {location.metadata.ruler_owner_id.slice(0, 8)}...
                      </span>
                    </div>
                  )}
                  {location.metadata.population && (
                    <div>
                      <span className="text-sm text-muted-foreground">Population:</span>
                      <span className="ml-2 text-sm font-medium">{location.metadata.population}</span>
                    </div>
                  )}
                  {location.metadata.demographics && (
                    <div>
                      <span className="text-sm text-muted-foreground">Demographics:</span>
                      <span className="ml-2 text-sm font-medium">{location.metadata.demographics}</span>
                    </div>
                  )}
                  {location.metadata.faction_ids && location.metadata.faction_ids.length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground">Factions:</span>
                      <span className="ml-2 text-sm font-medium">
                        {location.metadata.faction_ids.length} faction(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

