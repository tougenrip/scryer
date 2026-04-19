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
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignTimeline, useWorldLocations, useFactions } from "@/hooks/useForgeContent";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";
import { TimelineImageUpload } from "./timeline-image-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimelineEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: CampaignTimeline | null;
  timeline: CampaignTimeline[];
  campaignId: string;
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
  isSideQuest?: boolean; // Flag to indicate if this is a side quest
  isDm?: boolean; // Whether the current user is the DM
}

const sessionTypeOptions = [
  { value: "prologue", label: "Prologue" },
  { value: "session", label: "Session" },
  { value: "milestone", label: "Milestone" },
  { value: "downtime", label: "Downtime" },
  { value: "event", label: "Event" },
];

const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "skipped", label: "Skipped" },
];

export function TimelineEntryFormDialog({
  open,
  onOpenChange,
  entry,
  timeline,
  campaignId,
  onSave,
  loading = false,
  isSideQuest = false,
  isDm = false,
}: TimelineEntryFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionType, setSessionType] = useState<CampaignTimeline['session_type']>(null);
  const [status, setStatus] = useState<CampaignTimeline['status']>('planned');
  const [plannedDate, setPlannedDate] = useState("");
  const [actualDate, setActualDate] = useState("");
  const [notes, setNotes] = useState("");
  const [parentEntryId, setParentEntryId] = useState<string | null>(null);
  const [branchPathIndex, setBranchPathIndex] = useState(0);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hiddenFromPlayers, setHiddenFromPlayers] = useState(true);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedNpcIds, setSelectedNpcIds] = useState<string[]>([]);
  const [selectedFactionIds, setSelectedFactionIds] = useState<string[]>([]);

  // Fetch associated entities
  const { locations } = useWorldLocations(campaignId, isDm || false);
  const { npcs } = useCampaignNPCs(campaignId, isDm || false);
  const { factions } = useFactions(campaignId);

  // Get next order_index (either max + 1 or based on parent)
  const getNextOrderIndex = () => {
    if (parentEntryId) {
      // If branching from a parent, use parent's order_index + 1
      const parent = timeline.find(e => e.id === parentEntryId);
      if (parent) {
        // Count existing branches from this parent
        const existingBranches = timeline.filter(e => e.parent_entry_id === parentEntryId);
        return parent.order_index + 1;
      }
    }
    // Otherwise, use max order_index + 1
    const maxOrder = timeline.length > 0 
      ? Math.max(...timeline.map(e => e.order_index))
      : 0;
    return maxOrder + 1;
  };

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setDescription(entry.description || "");
      setSessionType(entry.session_type);
      setStatus(entry.status);
      setPlannedDate(entry.planned_date ? new Date(entry.planned_date).toISOString().split('T')[0] : "");
      setActualDate(entry.actual_date ? new Date(entry.actual_date).toISOString().split('T')[0] : "");
      setNotes(entry.notes || "");
      setParentEntryId(entry.parent_entry_id);
      setBranchPathIndex(entry.branch_path_index ?? 0);
      setImageUrl(entry.image_url || null);
      setHiddenFromPlayers(entry.hidden_from_players ?? false);
      setSelectedLocationIds(entry.associated_location_ids || []);
      setSelectedNpcIds(entry.associated_npc_ids || []);
      setSelectedFactionIds(entry.associated_faction_ids || []);
    } else {
      setTitle("");
      setDescription("");
      setSessionType(null);
      setStatus('planned');
      setPlannedDate("");
      setActualDate("");
      setNotes("");
      setParentEntryId(null);
      setBranchPathIndex(0);
      setImageUrl(null);
      setHiddenFromPlayers(true);
      setSelectedLocationIds([]);
      setSelectedNpcIds([]);
      setSelectedFactionIds([]);
    }
  }, [entry, open]);

  // When parent changes, calculate branch_path_index
  useEffect(() => {
    if (parentEntryId && !entry) {
      const existingBranches = timeline.filter(
        e => e.parent_entry_id === parentEntryId
      );
      setBranchPathIndex(existingBranches.length);
    }
  }, [parentEntryId, timeline, entry]);

  const handleSubmit = () => {
    if (!title.trim()) {
      return;
    }

    const orderIndex = entry ? entry.order_index : getNextOrderIndex();

    // For side quests, preserve the existing parent_entry_id
    const finalParentEntryId = isSideQuest && entry 
      ? entry.parent_entry_id 
      : (parentEntryId || null);

    onSave({
      title: title.trim(),
      description: description.trim() || null,
      session_type: sessionType || null,
      planned_date: plannedDate ? new Date(plannedDate).toISOString() : null,
      actual_date: actualDate ? new Date(actualDate).toISOString() : null,
      order_index: orderIndex,
      status: status,
      parent_entry_id: finalParentEntryId,
      branch_path_index: finalParentEntryId ? branchPathIndex : 0,
      associated_location_ids: selectedLocationIds,
      associated_quest_ids: [],
      associated_npc_ids: selectedNpcIds,
      associated_faction_ids: selectedFactionIds,
      notes: notes.trim() || null,
      image_url: imageUrl || null,
      hidden_from_players: hiddenFromPlayers,
    });
  };

  // Get available parent entries (excluding self and descendants)
  const getAvailableParents = () => {
    if (entry) {
      // Exclude the entry itself and any entries that come after it (descendants)
      return timeline.filter(e => 
        e.id !== entry.id && 
        e.order_index < entry.order_index
      );
    }
    return timeline;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {entry ? "Edit Timeline Entry" : "Create Timeline Entry"}
          </DialogTitle>
          <DialogDescription>
            {entry
              ? "Update the timeline entry details"
              : "Add a new entry to the campaign timeline"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prologue: The Beginning"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-type">Session Type</Label>
              <Select
                value={sessionType || "none"}
                onValueChange={(v) => setSessionType(v === "none" ? null : v as CampaignTimeline['session_type'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No type</SelectItem>
                  {sessionTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as CampaignTimeline['status'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Only show Branch From for main timeline entries, not side quests */}
          {!isSideQuest && (
            <div className="space-y-2">
              <Label htmlFor="parent-entry">Branch From (Optional)</Label>
              <Select
                value={parentEntryId || "none"}
                onValueChange={(v) => setParentEntryId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent entry for branching" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Main Timeline</SelectItem>
                  {getAvailableParents().map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {parentEntryId && (
                <p className="text-xs text-muted-foreground">
                  This entry will branch from the selected parent, creating an alternative timeline path.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planned-date">Planned Date</Label>
              <Input
                id="planned-date"
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual-date">Actual Date</Label>
              <Input
                id="actual-date"
                type="date"
                value={actualDate}
                onChange={(e) => setActualDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <RichTextEditor
              id="description"
              value={description}
              onChange={setDescription}
              placeholder="Session details, quest information, or event description..."
              campaignId={campaignId}
              minHeight="160px"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">DM Notes</Label>
            <RichTextEditor
              id="notes"
              value={notes}
              onChange={setNotes}
              placeholder="Private notes for the DM..."
              campaignId={campaignId}
              minHeight="100px"
            />
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

          {isDm && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="hidden-from-players"
                checked={hiddenFromPlayers}
                onCheckedChange={(checked) => setHiddenFromPlayers(checked === true)}
              />
              <Label
                htmlFor="hidden-from-players"
                className="text-sm font-normal cursor-pointer"
              >
                Hide from players
              </Label>
              <p className="text-xs text-muted-foreground ml-2">
                Only you will be able to see this timeline entry
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Background Image</Label>
            <TimelineImageUpload
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              campaignId={campaignId}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !title.trim()}>
            {loading ? "Saving..." : entry ? "Update" : "Create"} Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

