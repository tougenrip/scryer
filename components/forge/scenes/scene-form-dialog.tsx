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
import { Scene } from "@/hooks/useForgeContent";
import { MapImageUpload } from "@/components/campaign/map-image-upload";

interface SceneFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scene: Scene | null;
  campaignId: string;
  onSave: (data: {
    name: string;
    description?: string | null;
    image_url?: string | null;
  }) => void;
  loading?: boolean;
}

export function SceneFormDialog({
  open,
  onOpenChange,
  scene,
  campaignId,
  onSave,
  loading = false,
}: SceneFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (scene) {
      setName(scene.name);
      setDescription(scene.description || "");
      setImageUrl(scene.image_url);
    } else {
      setName("");
      setDescription("");
      setImageUrl(null);
    }
  }, [scene, open]);

  const handleSave = () => {
    if (!name.trim()) {
      return; // Name is required
    }

    onSave({
      name: name.trim(),
      description: description.trim() || null,
      image_url: imageUrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{scene ? "Edit Scene" : "Create Scene"}</DialogTitle>
          <DialogDescription>
            {scene
              ? "Update the scene details and map image"
              : "Create a new scene with a name, optional description, and map image"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Scene Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scene name"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scene description or notes"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>Map Image (Optional)</Label>
            <MapImageUpload
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              campaignId={campaignId}
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || loading}>
            {loading ? "Saving..." : scene ? "Update" : "Create"} Scene
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

