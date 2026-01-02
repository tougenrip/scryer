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
import { Quest } from "@/hooks/useCampaignContent";

interface QuestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
  quest?: Quest | null;
  onCreate: (data: {
    campaign_id: string;
    title: string;
    content: string;
    source?: string | null;
    location?: string | null;
    verified?: boolean;
    created_by: string;
  }) => Promise<{ success: boolean; error?: Error }>;
  onUpdate: (
    questId: string,
    data: {
      title?: string;
      content?: string;
      source?: string | null;
      location?: string | null;
      verified?: boolean;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

export function QuestFormDialog({
  open,
  onOpenChange,
  campaignId,
  userId,
  quest,
  onCreate,
  onUpdate,
}: QuestFormDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [location, setLocation] = useState("");
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (quest) {
      setTitle(quest.title);
      setContent(quest.content);
      setSource(quest.source || "");
      setLocation(quest.location || "");
      setVerified(quest.verified);
    } else {
      setTitle("");
      setContent("");
      setSource("");
      setLocation("");
      setVerified(false);
    }
  }, [quest, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        source: source.trim() || null,
        location: location.trim() || null,
        verified: verified,
      };

      let result;
      if (quest) {
        result = await onUpdate(quest.id, data);
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
              {quest ? "Edit Quest" : "Create Quest"}
            </DialogTitle>
            <DialogDescription>
              {quest
                ? "Update quest details below."
                : "Add a new quest or side quest to the quest board."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quest title"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="The full quest or side quest details..."
                rows={6}
                required
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Tavern gossip"
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Waterdeep"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={verified}
                onCheckedChange={(checked) => setVerified(checked === true)}
                disabled={loading}
              />
              <Label
                htmlFor="verified"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Verified (this quest has been confirmed as true)
              </Label>
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
            <Button type="submit" disabled={loading || !title.trim() || !content.trim()}>
              {loading ? "Saving..." : quest ? "Save Changes" : "Create Quest"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

