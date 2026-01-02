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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NPC } from "@/hooks/useCampaignContent";

interface NPCFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
  npc?: NPC | null;
  onCreate: (data: {
    campaign_id: string;
    name: string;
    description?: string | null;
    appearance?: string | null;
    personality?: string | null;
    background?: string | null;
    location?: string | null;
    notes?: string | null;
    created_by: string;
  }) => Promise<{ success: boolean; error?: Error }>;
  onUpdate: (
    npcId: string,
    data: {
      name?: string;
      description?: string | null;
      appearance?: string | null;
      personality?: string | null;
      background?: string | null;
      location?: string | null;
      notes?: string | null;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

export function NPCFormDialog({
  open,
  onOpenChange,
  campaignId,
  userId,
  npc,
  onCreate,
  onUpdate,
}: NPCFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [appearance, setAppearance] = useState("");
  const [personality, setPersonality] = useState("");
  const [background, setBackground] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (npc) {
      setName(npc.name);
      setDescription(npc.description || "");
      setAppearance(npc.appearance || "");
      setPersonality(npc.personality || "");
      setBackground(npc.background || "");
      setLocation(npc.location || "");
      setNotes(npc.notes || "");
    } else {
      setName("");
      setDescription("");
      setAppearance("");
      setPersonality("");
      setBackground("");
      setLocation("");
      setNotes("");
    }
  }, [npc, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        appearance: appearance.trim() || null,
        personality: personality.trim() || null,
        background: background.trim() || null,
        location: location.trim() || null,
        notes: notes.trim() || null,
      };

      let result;
      if (npc) {
        result = await onUpdate(npc.id, data);
      } else {
        result = await onCreate({
          campaign_id: campaignId,
          created_by: userId,
          ...data,
        });
      }

      if (result.success) {
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {npc ? "Edit NPC" : "Create NPC"}
            </DialogTitle>
            <DialogDescription>
              {npc
                ? "Update NPC details below."
                : "Create a new non-player character for your campaign."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NPC name"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where can this NPC be found?"
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="General description of the NPC"
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="appearance">Appearance</Label>
              <Textarea
                id="appearance"
                value={appearance}
                onChange={(e) => setAppearance(e.target.value)}
                placeholder="Physical appearance and notable features"
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="personality">Personality</Label>
              <Textarea
                id="personality"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Personality traits, quirks, and behaviors"
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="background">Background</Label>
              <Textarea
                id="background"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="NPC's history and backstory"
                rows={3}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="DM-only notes and reminders"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Saving..." : npc ? "Save Changes" : "Create NPC"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

