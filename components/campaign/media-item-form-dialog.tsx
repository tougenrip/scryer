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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MediaItem } from "@/hooks/useCampaignContent";
import { MediaUpload } from "./media-upload";

interface MediaItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  item?: MediaItem | null;
  defaultType?: 'map' | 'token' | 'prop' | 'sound';
  pendingImageUrl?: string | null; // Pre-filled image URL from drag-and-drop
  pendingAudioUrl?: string | null; // Pre-filled audio URL from drag-and-drop
  onCreate: (data: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    audio_url?: string | null;
    type?: 'map' | 'token' | 'prop' | 'sound' | null;
  }) => Promise<{ success: boolean; error?: Error }>;
  onUpdate: (
    itemId: string,
    data: {
      name?: string;
      image_url?: string | null;
      audio_url?: string | null;
      type?: 'map' | 'token' | 'prop' | 'sound' | null;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

export function MediaItemFormDialog({
  open,
  onOpenChange,
  campaignId,
  item,
  defaultType,
  pendingImageUrl,
  pendingAudioUrl,
  onCreate,
  onUpdate,
}: MediaItemFormDialogProps) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [type, setType] = useState<'map' | 'token' | 'prop' | 'sound' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setImageUrl(item.image_url);
      setAudioUrl(item.audio_url);
      setType(item.type);
    } else {
      setName("");
      // Use pending URLs if available (from drag-and-drop), otherwise null
      setImageUrl(pendingImageUrl || null);
      setAudioUrl(pendingAudioUrl || null);
      // Default to null (None) unless defaultType is explicitly provided
      setType(defaultType || null);
    }
  }, [item, defaultType, pendingImageUrl, pendingAudioUrl, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        image_url: imageUrl || null,
        audio_url: audioUrl || null,
        type: type,
      };

      let result;
      if (item) {
        result = await onUpdate(item.id, data);
      } else {
        result = await onCreate({
          campaign_id: campaignId,
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {item ? "Edit Media Item" : "Create Media Item"}
            </DialogTitle>
            <DialogDescription>
              {item
                ? "Update media item details below."
                : "Upload an image or audio file and set the item type."}
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
                placeholder="Item name"
                required
                disabled={loading}
              />
            </div>

            {!item && (
              <div className="grid gap-2">
                <Label htmlFor="type">Type (Optional)</Label>
                <Select
                  value={type || "none"}
                  onValueChange={(value: string) => setType(value === "none" ? null : value as 'map' | 'token' | 'prop')}
                  disabled={loading}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="No type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="map">Map</SelectItem>
                    <SelectItem value="token">Token</SelectItem>
                    <SelectItem value="prop">Prop</SelectItem>
                    <SelectItem value="sound">Sound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>
                Media {!item && <span className="text-destructive">*</span>}
              </Label>
              <MediaUpload
                imageUrl={imageUrl}
                audioUrl={audioUrl}
                onImageChange={setImageUrl}
                onAudioChange={setAudioUrl}
                campaignId={campaignId}
                mediaType={type === 'sound' ? 'audio' : type === 'map' || type === 'token' || type === 'prop' ? 'image' : 'both'}
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
            <Button 
              type="submit" 
              disabled={loading || !name.trim() || (!item && !imageUrl && !audioUrl)}
            >
              {loading ? "Saving..." : item ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

