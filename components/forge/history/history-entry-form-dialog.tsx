"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignTimeline, useWorldLocations, useFactions } from "@/hooks/useForgeContent";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";
import { TimelineImageUpload } from "../tracker/timeline-image-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HistoryEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CampaignTimeline | null;
  timeline: CampaignTimeline[];
  campaignId: string;
  initialEntityId?: string;
  initialEntityType?: 'npc' | 'faction' | 'location';
  onSave: (data: {
    title: string;
    description?: string | null;
    session_type?: CampaignTimeline['session_type'];
    planned_date?: string | null;
    actual_date?: string | null;
    order_index: number;
    status?: CampaignTimeline['status'];
    parent_entry_id?: string | null;
    branch_path_index?: number;
    associated_location_ids?: string[];
    associated_quest_ids?: string[];
    associated_npc_ids?: string[];
    associated_faction_ids?: string[];
    notes?: string | null;
    image_url?: string | null;
    hidden_from_players?: boolean;
  }) => void;
  loading?: boolean;
  isDm?: boolean;
}

const sessionTypeOptions = [
  { value: "milestone", label: "Major Discovery" },
  { value: "event", label: "Major Event" },
  { value: "session", label: "Session" },
];

export function HistoryEntryFormDialog({
  open,
  onOpenChange,
  entry,
  timeline,
  campaignId,
  initialEntityId,
  initialEntityType,
  onSave,
  loading = false,
  isDm = false,
}: HistoryEntryFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionType, setSessionType] = useState<CampaignTimeline['session_type']>('milestone');
  const [actualDate, setActualDate] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hiddenFromPlayers, setHiddenFromPlayers] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedNpcIds, setSelectedNpcIds] = useState<string[]>([]);
  const [selectedFactionIds, setSelectedFactionIds] = useState<string[]>([]);

  // Fetch associated entities
  const { locations } = useWorldLocations(campaignId, isDm || false);
  const { npcs } = useCampaignNPCs(campaignId, isDm || false);
  const { factions } = useFactions(campaignId);

  // Get next order_index
  const getNextOrderIndex = () => {
    const maxOrder = timeline.length > 0 
      ? Math.max(...timeline.map(e => e.order_index))
      : 0;
    return maxOrder + 1;
  };

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setDescription(entry.description || "");
      setSessionType(entry.session_type || 'milestone');
      setActualDate(entry.actual_date ? new Date(entry.actual_date).toISOString().split('T')[0] : "");
      setImageUrl(entry.image_url || null);
      setHiddenFromPlayers(entry.hidden_from_players ?? false);
      setSelectedLocationIds(entry.associated_location_ids || []);
      setSelectedNpcIds(entry.associated_npc_ids || []);
      setSelectedFactionIds(entry.associated_faction_ids || []);
    } else {
      setTitle("");
      setDescription("");
      setSessionType('milestone');
      setActualDate("");
      setImageUrl(null);
      setHiddenFromPlayers(false);
      // Pre-select entity if provided (for new entries from entity pages)
      if (initialEntityId && initialEntityType) {
        if (initialEntityType === 'location') {
          setSelectedLocationIds([initialEntityId]);
        } else if (initialEntityType === 'npc') {
          setSelectedNpcIds([initialEntityId]);
        } else if (initialEntityType === 'faction') {
          setSelectedFactionIds([initialEntityId]);
        }
      } else {
        setSelectedLocationIds([]);
        setSelectedNpcIds([]);
        setSelectedFactionIds([]);
      }
    }
  }, [entry, open, initialEntityId, initialEntityType]);

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    const orderIndex = entry ? entry.order_index : getNextOrderIndex();

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      session_type: sessionType || 'milestone',
      planned_date: null,
      actual_date: actualDate ? new Date(actualDate).toISOString() : null,
      order_index: orderIndex,
      status: 'completed', // History entries are completed events
      parent_entry_id: null,
      branch_path_index: 0,
      associated_location_ids: selectedLocationIds,
      associated_quest_ids: [],
      associated_npc_ids: selectedNpcIds,
      associated_faction_ids: selectedFactionIds,
      notes: null,
      image_url: imageUrl || null,
      hidden_from_players: hiddenFromPlayers,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entry ? "Edit History Entry" : "Create History Entry"}
          </DialogTitle>
          <DialogDescription>
            {entry
              ? "Update the history entry details"
              : "Record a new event in your campaign's history"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., First Wayportal Discovered"
              required
            />
          </div>

          {/* Actual Date */}
          <div className="space-y-2">
            <Label htmlFor="actual-date">Date</Label>
            <Input
              id="actual-date"
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              When this event occurred in the campaign
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              rows={4}
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Background Image</Label>
            <TimelineImageUpload
              campaignId={campaignId}
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Optional: Upload an image to display as the background for this history entry
            </p>
          </div>

          {/* Associated Locations */}
          <div className="space-y-2">
            <Label>Associated Locations</Label>
            <ScrollArea className="h-32 border rounded-md p-3">
              {locations && locations.length > 0 ? (
                <div className="space-y-2">
                  {locations.map((location) => {
                    const isSelected = selectedLocationIds.includes(location.id);
                    return (
                      <div key={location.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`location-${location.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedLocationIds([...selectedLocationIds, location.id]);
                            } else {
                              setSelectedLocationIds(selectedLocationIds.filter(id => id !== location.id));
                            }
                          }}
                        />
                        <Label htmlFor={`location-${location.id}`} className="font-normal cursor-pointer">
                          {location.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No locations available</p>
              )}
            </ScrollArea>
          </div>

          {/* Associated NPCs */}
          <div className="space-y-2">
            <Label>Associated NPCs</Label>
            <ScrollArea className="h-32 border rounded-md p-3">
              {npcs && npcs.length > 0 ? (
                <div className="space-y-2">
                  {npcs.map((npc) => {
                    const isSelected = selectedNpcIds.includes(npc.id);
                    return (
                      <div key={npc.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`npc-${npc.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedNpcIds([...selectedNpcIds, npc.id]);
                            } else {
                              setSelectedNpcIds(selectedNpcIds.filter(id => id !== npc.id));
                            }
                          }}
                        />
                        <Label htmlFor={`npc-${npc.id}`} className="font-normal cursor-pointer">
                          {npc.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No NPCs available</p>
              )}
            </ScrollArea>
          </div>

          {/* Associated Factions */}
          <div className="space-y-2">
            <Label>Associated Factions</Label>
            <ScrollArea className="h-32 border rounded-md p-3">
              {factions && factions.length > 0 ? (
                <div className="space-y-2">
                  {factions.map((faction) => {
                    const isSelected = selectedFactionIds.includes(faction.id);
                    return (
                      <div key={faction.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`faction-${faction.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedFactionIds([...selectedFactionIds, faction.id]);
                            } else {
                              setSelectedFactionIds(selectedFactionIds.filter(id => id !== faction.id));
                            }
                          }}
                        />
                        <Label htmlFor={`faction-${faction.id}`} className="font-normal cursor-pointer">
                          {faction.name}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No factions available</p>
              )}
            </ScrollArea>
          </div>

          {/* Hidden from Players */}
          {isDm && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hidden"
                checked={hiddenFromPlayers}
                onCheckedChange={(checked) => setHiddenFromPlayers(checked === true)}
              />
              <Label htmlFor="hidden" className="font-normal cursor-pointer">
                Hide from players
              </Label>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading ? "Saving..." : entry ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

