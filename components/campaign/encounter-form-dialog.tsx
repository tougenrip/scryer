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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Encounter, Map } from "@/hooks/useCampaignContent";

interface EncounterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  maps: Map[];
  encounter?: Encounter | null;
  onCreate: (data: {
    campaign_id: string;
    name?: string | null;
    map_id?: string | null;
    active?: boolean;
  }) => Promise<{ success: boolean; error?: Error }>;
  onUpdate: (
    encounterId: string,
    data: {
      name?: string | null;
      map_id?: string | null;
      active?: boolean;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

export function EncounterFormDialog({
  open,
  onOpenChange,
  campaignId,
  maps,
  encounter,
  onCreate,
  onUpdate,
}: EncounterFormDialogProps) {
  const [name, setName] = useState("");
  const [mapId, setMapId] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (encounter) {
      setName(encounter.name || "");
      setMapId(encounter.map_id);
      setActive(encounter.active);
    } else {
      setName("");
      setMapId(null);
      setActive(false);
    }
  }, [encounter, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      const data = {
        name: name.trim() || null,
        map_id: mapId || null,
        active: active,
      };

      let result;
      if (encounter) {
        result = await onUpdate(encounter.id, data);
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
              {encounter ? "Edit Encounter" : "Create Encounter"}
            </DialogTitle>
            <DialogDescription>
              {encounter
                ? "Update encounter details below."
                : "Create a new combat encounter for your campaign."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Encounter name (optional)"
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="map_id">Map</Label>
              <Select
                value={mapId || "none"}
                onValueChange={(value) => setMapId(value === "none" ? null : value)}
                disabled={loading}
              >
                <SelectTrigger id="map_id">
                  <SelectValue placeholder="Select a map (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {maps.map((map) => (
                    <SelectItem key={map.id} value={map.id}>
                      {map.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="active"
                checked={active}
                onCheckedChange={(checked) => setActive(checked === true)}
                disabled={loading}
              />
              <Label
                htmlFor="active"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Active encounter
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
            <Button type="submit" disabled={loading}>
              {loading
                ? "Saving..."
                : encounter
                ? "Save Changes"
                : "Create Encounter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

