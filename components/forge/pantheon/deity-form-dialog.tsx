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
import { Badge } from "@/components/ui/badge";
import { X, MapPin, Search } from "lucide-react";
import { PantheonDeity, useWorldLocations } from "@/hooks/useForgeContent";
import { DeityImageUpload } from "./deity-image-upload";

interface DeityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deity: PantheonDeity | null;
  campaignId: string;
  onSave: (data: {
    name: string;
    title?: string | null;
    domain?: string[];
    alignment?: PantheonDeity['alignment'];
    symbol?: string | null;
    image_url?: string | null;
    description?: string | null;
    worshipers_location_ids?: string[];
    holy_days?: string[];
  }) => void;
  loading?: boolean;
  alignmentOptions: Array<{ value: string; label: string }>;
  domainOptions: string[];
}

export function DeityFormDialog({
  open,
  onOpenChange,
  deity,
  campaignId,
  onSave,
  loading = false,
  alignmentOptions,
  domainOptions,
}: DeityFormDialogProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [symbol, setSymbol] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [alignment, setAlignment] = useState<PantheonDeity['alignment']>(null);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [holyDays, setHolyDays] = useState<string[]>([]);
  const [newHolyDay, setNewHolyDay] = useState("");
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [locationSearch, setLocationSearch] = useState("");

  const { locations } = useWorldLocations(campaignId);

  useEffect(() => {
    if (deity) {
      setName(deity.name);
      setTitle(deity.title || "");
      setDescription(deity.description || "");
      setSymbol(deity.symbol || null);
      setImageUrl(deity.image_url || null);
      setAlignment(deity.alignment);
      setSelectedDomains(deity.domain || []);
      setHolyDays(deity.holy_days || []);
      setSelectedLocationIds(deity.worshipers_location_ids || []);
    } else {
      setName("");
      setTitle("");
      setDescription("");
      setSymbol(null);
      setImageUrl(null);
      setAlignment(null);
      setSelectedDomains([]);
      setHolyDays([]);
      setSelectedLocationIds([]);
    }
    setLocationSearch("");
  }, [deity, open]);

  const addDomain = () => {
    if (newDomain.trim() && !selectedDomains.includes(newDomain.trim())) {
      setSelectedDomains([...selectedDomains, newDomain.trim()]);
      setNewDomain("");
    }
  };

  const removeDomain = (domain: string) => {
    setSelectedDomains(selectedDomains.filter(d => d !== domain));
  };

  const addHolyDay = () => {
    if (newHolyDay.trim() && !holyDays.includes(newHolyDay.trim())) {
      setHolyDays([...holyDays, newHolyDay.trim()]);
      setNewHolyDay("");
    }
  };

  const removeHolyDay = (day: string) => {
    setHolyDays(holyDays.filter(d => d !== day));
  };

  const addLocation = (locationId: string) => {
    if (!selectedLocationIds.includes(locationId)) {
      setSelectedLocationIds([...selectedLocationIds, locationId]);
    }
    setLocationSearch("");
  };

  const removeLocation = (locationId: string) => {
    setSelectedLocationIds(selectedLocationIds.filter(id => id !== locationId));
  };

  const filteredLocations = locations.filter(loc =>
    loc.name.toLowerCase().includes(locationSearch.toLowerCase()) &&
    !selectedLocationIds.includes(loc.id)
  );

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      title: title.trim() || null,
      description: description.trim() || null,
      symbol: symbol || null,
      image_url: imageUrl || null,
      alignment: alignment || null,
      domain: selectedDomains,
      holy_days: holyDays,
      worshipers_location_ids: selectedLocationIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {deity ? "Edit Deity" : "Create Deity"}
          </DialogTitle>
          <DialogDescription>
            {deity
              ? "Update the deity's information"
              : "Add a new deity to your pantheon"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deity name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., God of War, Goddess of Wisdom"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alignment">Alignment</Label>
              <Select
                value={alignment || "none"}
                onValueChange={(v) => setAlignment(v === "none" ? null : v as PantheonDeity['alignment'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select alignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No alignment</SelectItem>
                  {alignmentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol Image</Label>
              <DeityImageUpload
                imageUrl={symbol}
                onImageChange={setSymbol}
                campaignId={campaignId}
                disabled={loading}
                label="Symbol"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deity Image</Label>
            <DeityImageUpload
              imageUrl={imageUrl}
              onImageChange={setImageUrl}
              campaignId={campaignId}
              disabled={loading}
              label="Deity Portrait"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="domains">Domains</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedDomains.map((domain) => (
                <Badge key={domain} variant="secondary" className="text-sm">
                  {domain}
                  <button
                    type="button"
                    onClick={() => removeDomain(domain)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select
                value={newDomain || "select"}
                onValueChange={(v) => {
                  if (v !== "select" && !selectedDomains.includes(v)) {
                    setSelectedDomains([...selectedDomains, v]);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add domain from list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="select">Select from list...</SelectItem>
                  {domainOptions
                    .filter(d => !selectedDomains.includes(d))
                    .map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type custom domain"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDomain();
                  }
                }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addDomain}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deity description, lore, worship practices..."
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="holy-days">Holy Days</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {holyDays.map((day) => (
                <Badge key={day} variant="secondary" className="text-sm">
                  {day}
                  <button
                    type="button"
                    onClick={() => removeHolyDay(day)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., Winter Solstice, Festival of Light"
                value={newHolyDay}
                onChange={(e) => setNewHolyDay(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addHolyDay();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addHolyDay}>
                Add
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="worship-locations">
              <MapPin className="h-4 w-4 inline mr-1" />
              Worship Locations
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedLocationIds.map((locationId) => {
                const location = locations.find(l => l.id === locationId);
                return location ? (
                  <Badge key={locationId} variant="secondary" className="text-sm">
                    {location.name}
                    <button
                      type="button"
                      onClick={() => removeLocation(locationId)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search locations to add..."
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredLocations.length > 0) {
                    e.preventDefault();
                    addLocation(filteredLocations[0].id);
                  }
                }}
              />
              {locationSearch && filteredLocations.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredLocations.slice(0, 10).map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => addLocation(location.id)}
                      className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground text-sm"
                    >
                      {location.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Saving..." : deity ? "Update" : "Create"} Deity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

