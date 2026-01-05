"use client";

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
import { Edit, Trash2, Star, Calendar, MapPin } from "lucide-react";
import { PantheonDeity, useWorldLocations } from "@/hooks/useForgeContent";

interface DeityDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deity: PantheonDeity | null;
  campaignId: string;
  isDm: boolean;
  alignmentOptions: Array<{ value: string; label: string }>;
  onEdit: () => void;
  onDelete: () => void;
}

export function DeityDetailDialog({
  open,
  onOpenChange,
  deity,
  campaignId,
  isDm,
  alignmentOptions,
  onEdit,
  onDelete,
}: DeityDetailDialogProps) {
  const { locations } = useWorldLocations(campaignId);
  
  if (!deity) return null;

  const alignmentLabel = alignmentOptions.find(opt => opt.value === deity.alignment)?.label || deity.alignment;
  
  // Get location names from IDs
  const worshipLocations = deity.worshipers_location_ids
    ? locations.filter(loc => deity.worshipers_location_ids.includes(loc.id))
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
              <div>
                <DialogTitle className="text-2xl">{deity.name}</DialogTitle>
                {deity.title && (
                  <DialogDescription className="mt-1 italic">
                    {deity.title}
                  </DialogDescription>
                )}
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
          {/* Deity Image */}
          {deity.image_url && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Portrait
              </h3>
              <div className="rounded-lg overflow-hidden border border-border bg-muted">
                <img
                  src={deity.image_url}
                  alt={`${deity.name} portrait`}
                  className="w-full h-64 object-contain"
                />
              </div>
            </div>
          )}

          {/* Alignment & Symbol */}
          {(deity.alignment || deity.symbol) && (
            <div className="grid grid-cols-2 gap-4">
              {deity.alignment && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Alignment
                  </h3>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {alignmentLabel}
                  </Badge>
                </div>
              )}
              {deity.symbol && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">
                    Symbol
                  </h3>
                  <div className="rounded-lg overflow-hidden border border-border bg-muted">
                    <img
                      src={deity.symbol}
                      alt={`${deity.name} symbol`}
                      className="w-full h-32 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Domains */}
          {deity.domain && deity.domain.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Domains
              </h3>
              <div className="flex flex-wrap gap-2">
                {deity.domain.map((domain, idx) => (
                  <Badge key={idx} variant="secondary">
                    {domain}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {deity.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Description
              </h3>
              <p className="text-sm whitespace-pre-wrap">{deity.description}</p>
            </div>
          )}

          {/* Holy Days */}
          {deity.holy_days && deity.holy_days.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Holy Days
              </h3>
              <ul className="space-y-1">
                {deity.holy_days.map((day, idx) => (
                  <li key={idx} className="text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    {day}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Worship Locations */}
          {worshipLocations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Worship Locations ({worshipLocations.length})
              </h3>
              <div className="space-y-2">
                {worshipLocations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{location.name}</p>
                      {location.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {location.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

