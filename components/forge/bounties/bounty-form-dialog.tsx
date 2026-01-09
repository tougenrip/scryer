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
import { Checkbox } from "@/components/ui/checkbox";
import { Bounty } from "@/hooks/useCampaignContent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";

interface BountyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
  isDm?: boolean;
  bounty?: Bounty | null;
  onCreate: (data: {
    campaign_id: string;
    title: string;
    target_name: string;
    target_type?: 'npc' | 'monster' | 'other';
    target_npc_id?: string | null;
    description?: string | null;
    reward?: string | null;
    status?: 'available' | 'claimed' | 'completed';
    location?: string | null;
    posted_by?: string | null;
    hidden_from_players?: boolean;
    dm_notes?: string | null;
    created_by: string;
  }) => Promise<{ success: boolean; error?: Error }>;
  onUpdate: (
    bountyId: string,
    data: {
      title?: string;
      target_name?: string;
      target_type?: 'npc' | 'monster' | 'other';
      target_npc_id?: string | null;
      description?: string | null;
      reward?: string | null;
      status?: 'available' | 'claimed' | 'completed';
      location?: string | null;
      posted_by?: string | null;
      hidden_from_players?: boolean;
      dm_notes?: string | null;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

export function BountyFormDialog({
  open,
  onOpenChange,
  campaignId,
  userId,
  isDm = false,
  bounty,
  onCreate,
  onUpdate,
}: BountyFormDialogProps) {
  const { npcs } = useCampaignNPCs(campaignId, isDm);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    target_name: "",
    target_type: "npc" as 'npc' | 'monster' | 'other',
    target_npc_id: "",
    description: "",
    reward: "",
    status: "available" as 'available' | 'claimed' | 'completed',
    location: "",
    posted_by: "",
    hidden_from_players: true,
    dm_notes: "",
  });

  useEffect(() => {
    if (bounty) {
      setFormData({
        title: bounty.title || "",
        target_name: bounty.target_name || "",
        target_type: bounty.target_type || "npc",
        target_npc_id: bounty.target_npc_id || "",
        description: bounty.description || "",
        reward: bounty.reward || "",
        status: bounty.status || "available",
        location: bounty.location || "",
        posted_by: bounty.posted_by || "",
        hidden_from_players: bounty.hidden_from_players ?? true,
        dm_notes: bounty.dm_notes || "",
      });
    } else {
      setFormData({
        title: "",
        target_name: "",
        target_type: "npc",
        target_npc_id: "",
        description: "",
        reward: "",
        status: "available",
        location: "",
        posted_by: "",
        hidden_from_players: true,
        dm_notes: "",
      });
    }
  }, [bounty, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        campaign_id: campaignId,
        title: formData.title,
        target_name: formData.target_name,
        target_type: formData.target_type,
        target_npc_id: formData.target_npc_id || null,
        description: formData.description || null,
        reward: formData.reward || null,
        status: formData.status,
        location: formData.location || null,
        posted_by: formData.posted_by || null,
        hidden_from_players: formData.hidden_from_players,
        dm_notes: formData.dm_notes || null,
        created_by: userId,
      };

      if (bounty) {
        await onUpdate(bounty.id, data);
      } else {
        await onCreate(data);
      }
    } catch (error) {
      console.error("Error saving bounty:", error);
    } finally {
      setLoading(false);
    }
  };

  // When target_type is 'npc' and target_npc_id is set, auto-fill target_name
  useEffect(() => {
    if (formData.target_type === 'npc' && formData.target_npc_id) {
      const selectedNPC = npcs.find(npc => npc.id === formData.target_npc_id);
      if (selectedNPC) {
        setFormData(prev => ({
          ...prev,
          target_name: selectedNPC.name,
        }));
      }
    }
  }, [formData.target_npc_id, formData.target_type, npcs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bounty ? "Edit Bounty" : "Create Bounty"}</DialogTitle>
          <DialogDescription>
            {bounty
              ? "Update the bounty details below."
              : "Create a new bounty for NPCs, monsters, or other targets."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Bounty Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Wanted: The Bandit King"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_type">Target Type *</Label>
              <Select
                value={formData.target_type}
                onValueChange={(value: 'npc' | 'monster' | 'other') => {
                  setFormData({ ...formData, target_type: value, target_npc_id: "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="npc">NPC</SelectItem>
                  <SelectItem value="monster">Monster</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'available' | 'claimed' | 'completed') => {
                  setFormData({ ...formData, status: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.target_type === 'npc' && npcs.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="target_npc_id">Link to NPC (Optional)</Label>
              <Select
                value={formData.target_npc_id || "none"}
                onValueChange={(value) => {
                  setFormData({ ...formData, target_npc_id: value === "none" ? "" : value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an NPC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {npcs.map((npc) => (
                    <SelectItem key={npc.id} value={npc.id}>
                      {npc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="target_name">Target Name *</Label>
            <Input
              id="target_name"
              value={formData.target_name}
              onChange={(e) => setFormData({ ...formData, target_name: e.target.value })}
              placeholder="Name of the target"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Why is this target wanted? What did they do?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reward">Reward</Label>
            <Input
              id="reward"
              value={formData.reward}
              onChange={(e) => setFormData({ ...formData, reward: e.target.value })}
              placeholder="e.g., 500 gold pieces, or Rare Magic Item"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Where is this bounty posted?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="posted_by">Posted By</Label>
              <Input
                id="posted_by"
                value={formData.posted_by}
                onChange={(e) => setFormData({ ...formData, posted_by: e.target.value })}
                placeholder="e.g., City Guard, Merchant's Guild"
              />
            </div>
          </div>

          {isDm && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hidden_from_players"
                  checked={formData.hidden_from_players}
                  onCheckedChange={(checked) => {
                    setFormData({ ...formData, hidden_from_players: checked as boolean });
                  }}
                />
                <Label htmlFor="hidden_from_players" className="text-sm font-normal cursor-pointer">
                  Hidden from players
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dm_notes">DM Notes</Label>
                <Textarea
                  id="dm_notes"
                  value={formData.dm_notes}
                  onChange={(e) => setFormData({ ...formData, dm_notes: e.target.value })}
                  placeholder="Private notes only visible to the DM"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : bounty ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

