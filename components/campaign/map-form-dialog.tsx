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
import { Map } from "@/hooks/useCampaignContent";

interface MapFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  map?: Map | null;
  onCreate: (data: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    grid_size?: number;
    grid_type?: 'square' | 'hex';
    width?: number | null;
    height?: number | null;
  }) => Promise<{ success: boolean; error?: Error }>;
  onUpdate: (
    mapId: string,
    data: {
      name?: string;
      image_url?: string | null;
      grid_size?: number;
      grid_type?: 'square' | 'hex';
      width?: number | null;
      height?: number | null;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

export function MapFormDialog({
  open,
  onOpenChange,
  campaignId,
  map,
  onCreate,
  onUpdate,
}: MapFormDialogProps) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState(5);
  const [gridType, setGridType] = useState<'square' | 'hex'>('square');
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (map) {
      setName(map.name);
      setImageUrl(map.image_url);
      setGridSize(map.grid_size);
      setGridType(map.grid_type);
      setWidth(map.width?.toString() || "");
      setHeight(map.height?.toString() || "");
    } else {
      setName("");
      setImageUrl(null);
      setGridSize(5);
      setGridType('square');
      setWidth("");
      setHeight("");
    }
  }, [map, open]);

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
        grid_size: gridSize,
        grid_type: gridType,
        width: width ? parseInt(width, 10) : null,
        height: height ? parseInt(height, 10) : null,
      };

      let result;
      if (map) {
        result = await onUpdate(map.id, data);
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
              {map ? "Edit Map" : "Create Map"}
            </DialogTitle>
            <DialogDescription>
              {map
                ? "Update map details below."
                : "Create a new map for your campaign."}
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
                placeholder="Map name"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                type="url"
                value={imageUrl || ""}
                onChange={(e) => setImageUrl(e.target.value || null)}
                placeholder="https://example.com/map.png"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="grid_size">Grid Size (feet)</Label>
                <Input
                  id="grid_size"
                  type="number"
                  min="1"
                  value={gridSize}
                  onChange={(e) => setGridSize(parseInt(e.target.value, 10) || 5)}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="grid_type">Grid Type</Label>
                <Select
                  value={gridType}
                  onValueChange={(value: 'square' | 'hex') => setGridType(value)}
                  disabled={loading}
                >
                  <SelectTrigger id="grid_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="hex">Hex</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="width">Width (grid units)</Label>
                <Input
                  id="width"
                  type="number"
                  min="1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="Optional"
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="height">Height (grid units)</Label>
                <Input
                  id="height"
                  type="number"
                  min="1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Optional"
                  disabled={loading}
                />
              </div>
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
              {loading ? "Saving..." : map ? "Save Changes" : "Create Map"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

