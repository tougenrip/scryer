"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { WorldLocation, useFactions } from "@/hooks/useForgeContent";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";
import { LocationImageUpload } from "./location-image-upload";
import { Search, X } from "lucide-react";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: WorldLocation | null;
  locations: WorldLocation[];
  campaignId: string;
  onSave: (data: {
    parent_location_id?: string | null;
    name: string;
    type: WorldLocation['type'];
    description?: string | null;
    image_url?: string | null;
    marker_color?: string | null;
    status?: string | null;
    metadata?: Record<string, any>;
  }) => void;
  loading?: boolean;
}

// Define valid parent types for each location type
const getValidParentTypes = (childType: WorldLocation['type']): WorldLocation['type'][] => {
  switch (childType) {
    case 'world':
      return []; // World has no parent
    case 'continent':
      return ['world'];
    case 'region':
    case 'kingdom':
    case 'biome':
      return ['world', 'continent'];
    case 'city':
    case 'village':
    case 'settlement':
    case 'island':
      return ['region', 'kingdom', 'continent'];
    case 'dungeon':
    case 'landmark':
    case 'structure':
    case 'lair':
    case 'poi':
      return ['city', 'village', 'settlement', 'region', 'kingdom', 'biome', 'island'];
    case 'archipelago':
      return ['ocean', 'sea', 'continent'];
    default:
      return []; // Allow any parent for unknown types
  }
};

export function LocationFormDialog({
  open,
  onOpenChange,
  location,
  locations,
  campaignId,
  onSave,
  loading = false,
}: LocationFormDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<WorldLocation['type']>("poi");
  const [parentId, setParentId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [markerColor, setMarkerColor] = useState("#c9b882");
  const [status, setStatus] = useState<string>('normal');
  const [isCustomStatus, setIsCustomStatus] = useState(false);
  const [customStatusText, setCustomStatusText] = useState('');
  
  // New fields stored in metadata
  const [rulerOwnerId, setRulerOwnerId] = useState<string | null>(null);
  const [population, setPopulation] = useState("");
  const [demographics, setDemographics] = useState("");
  const [factionIds, setFactionIds] = useState<string[]>([]);
  
  // Search states
  const [npcSearch, setNpcSearch] = useState("");
  const [factionSearch, setFactionSearch] = useState("");

  // Fetch NPCs and Factions
  const { npcs, loading: npcsLoading } = useCampaignNPCs(campaignId);
  const { factions, loading: factionsLoading } = useFactions(campaignId);

  // Filter out current location and its descendants from parent options
  // Also filter by valid parent types
  const validParentTypes = useMemo(() => getValidParentTypes(type), [type]);
  
  const availableParents = useMemo(() => {
    return locations.filter(loc => {
      // Don't allow self as parent
      if (location && loc.id === location.id) return false;
      // Only show valid parent types
      if (validParentTypes.length > 0 && !validParentTypes.includes(loc.type)) return false;
      return true;
    });
  }, [locations, location, validParentTypes]);

  // Initialize form data
  useEffect(() => {
    if (location) {
      setName(location.name);
      setType(location.type);
      setParentId(location.parent_location_id);
      setDescription(location.description || "");
      setImageUrl(location.image_url || null);
      setMarkerColor(location.marker_color || "#c9b882");
      
      // Load status
      const locationStatus = location.status || 'normal';
      const predefinedStatuses = ['normal', 'under_attack', 'celebrating', 'plague', 'trade_route', 'blockaded', 'at_war', 'prosperous', 'declining'];
      setIsCustomStatus(!predefinedStatuses.includes(locationStatus));
      setStatus(locationStatus);
      setCustomStatusText(predefinedStatuses.includes(locationStatus) ? '' : locationStatus);
      
      // Load metadata fields
      const metadata = location.metadata || {};
      setRulerOwnerId(metadata.ruler_owner_id || null);
      setPopulation(metadata.population || "");
      setDemographics(metadata.demographics || "");
      setFactionIds(metadata.faction_ids || []);
    } else {
      setName("");
      setType("poi");
      setParentId(null);
      setDescription("");
      setImageUrl(null);
      setMarkerColor("#c9b882");
      setStatus('normal');
      setIsCustomStatus(false);
      setCustomStatusText('');
      setRulerOwnerId(null);
      setPopulation("");
      setDemographics("");
      setFactionIds([]);
    }
    // Reset searches when dialog opens/closes
    setNpcSearch("");
    setFactionSearch("");
  }, [location, open]);

  // Filter NPCs and Factions based on search
  const filteredNPCs = useMemo(() => {
    if (!npcSearch) return npcs;
    return npcs.filter(npc => 
      npc.name.toLowerCase().includes(npcSearch.toLowerCase())
    );
  }, [npcs, npcSearch]);

  const filteredFactions = useMemo(() => {
    if (!factionSearch) return factions;
    return factions.filter(faction => 
      faction.name.toLowerCase().includes(factionSearch.toLowerCase())
    );
  }, [factions, factionSearch]);

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    // Build metadata object
    const metadata: Record<string, any> = {};
    if (rulerOwnerId) metadata.ruler_owner_id = rulerOwnerId;
    if (population.trim()) metadata.population = population.trim();
    if (demographics.trim()) metadata.demographics = demographics.trim();
    if (factionIds.length > 0) metadata.faction_ids = factionIds;

    // Get final status
    const finalStatus = isCustomStatus ? customStatusText : status;

    onSave({
      parent_location_id: parentId,
      name: name.trim(),
      type,
      description: description.trim() || null,
      image_url: imageUrl || null,
      marker_color: markerColor || null,
      status: finalStatus || null,
      metadata: Object.keys(metadata).length > 0 ? metadata : {},
    });
  };

  const selectedRuler = npcs.find(npc => npc.id === rulerOwnerId);
  const selectedFactions = factions.filter(f => factionIds.includes(f.id));

  const toggleFaction = (factionId: string) => {
    setFactionIds(prev => 
      prev.includes(factionId) 
        ? prev.filter(id => id !== factionId)
        : [...prev, factionId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {location ? "Edit Location" : "Create Location"}
          </DialogTitle>
          <DialogDescription>
            {location
              ? "Update the location details"
              : "Add a new location to your world"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Location name"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">
                  Type <span className="text-destructive">*</span>
                </Label>
                <Select value={type} onValueChange={(v) => {
                  setType(v as WorldLocation['type']);
                  // Reset parent if it's no longer valid
                  if (parentId) {
                    const parent = locations.find(l => l.id === parentId);
                    const newValidTypes = getValidParentTypes(v as WorldLocation['type']);
                    if (parent && !newValidTypes.includes(parent.type)) {
                      setParentId(null);
                    }
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Political/Boundaries</div>
                    <SelectItem value="world">World</SelectItem>
                    <SelectItem value="continent">Continent</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                    <SelectItem value="kingdom">Kingdom</SelectItem>
                    <SelectItem value="city">City</SelectItem>
                    <SelectItem value="village">Village</SelectItem>
                    <SelectItem value="settlement">Settlement</SelectItem>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Adventure Sites</div>
                    <SelectItem value="dungeon">Dungeon</SelectItem>
                    <SelectItem value="landmark">Landmark/Monument</SelectItem>
                    <SelectItem value="structure">Structure/Building</SelectItem>
                    <SelectItem value="lair">Lair</SelectItem>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Geographical</div>
                    <SelectItem value="biome">Biome/Terrain</SelectItem>
                    <SelectItem value="island">Island</SelectItem>
                    <SelectItem value="archipelago">Archipelago</SelectItem>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Legacy</div>
                    <SelectItem value="poi">Point of Interest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent">Parent Location</Label>
                <Select
                  value={parentId || "none"}
                  onValueChange={(v) => setParentId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (Root location)</SelectItem>
                    {availableParents.length === 0 && validParentTypes.length > 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No valid parent locations found. Valid types: {validParentTypes.join(", ")}
                      </div>
                    )}
                    {availableParents.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Location description, history, notable features..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marker-color">Marker Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="marker-color"
                    type="color"
                    value={markerColor}
                    onChange={(e) => setMarkerColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={markerColor}
                    onChange={(e) => setMarkerColor(e.target.value)}
                    placeholder="#c9b882"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <div className="space-y-2">
                  <Select
                    value={isCustomStatus ? 'custom' : (status || 'normal')}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setIsCustomStatus(true);
                      } else {
                        setIsCustomStatus(false);
                        setStatus(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="under_attack">Under Attack</SelectItem>
                      <SelectItem value="celebrating">Celebrating</SelectItem>
                      <SelectItem value="plague">Plague</SelectItem>
                      <SelectItem value="trade_route">Trade Route</SelectItem>
                      <SelectItem value="blockaded">Blockaded</SelectItem>
                      <SelectItem value="at_war">At War</SelectItem>
                      <SelectItem value="prosperous">Prosperous</SelectItem>
                      <SelectItem value="declining">Declining</SelectItem>
                      <SelectItem value="custom">Custom Status...</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomStatus && (
                    <Input
                      id="custom-status"
                      type="text"
                      value={customStatusText}
                      onChange={(e) => setCustomStatusText(e.target.value)}
                      placeholder="Enter custom status"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Lore & Atmosphere */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Lore & Atmosphere</h3>

            <div className="space-y-2">
              <Label htmlFor="ruler-owner">Ruler/Owner (NPC)</Label>
              <div className="space-y-2">
                {npcs.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search NPCs..."
                      value={npcSearch}
                      onChange={(e) => setNpcSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
                <Select
                  value={rulerOwnerId || "none"}
                  onValueChange={(v) => setRulerOwnerId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No ruler/owner">
                      {selectedRuler ? selectedRuler.name : "No ruler/owner"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No ruler/owner</SelectItem>
                    {filteredNPCs.slice(0, 50).map((npc) => (
                      <SelectItem key={npc.id} value={npc.id}>
                        {npc.name}
                      </SelectItem>
                    ))}
                    {filteredNPCs.length === 0 && npcSearch && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No NPCs found matching "{npcSearch}"
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedRuler && (
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded flex items-center justify-between">
                    <span>
                      Ruler: <span className="font-medium">{selectedRuler.name}</span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRulerOwnerId(null)}
                      className="h-6 px-2 text-xs"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="population">Population</Label>
                <Input
                  id="population"
                  value={population}
                  onChange={(e) => setPopulation(e.target.value)}
                  placeholder="e.g., 15,000 or 'Sparse'"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="demographics">Demographics</Label>
                <Input
                  id="demographics"
                  value={demographics}
                  onChange={(e) => setDemographics(e.target.value)}
                  placeholder="e.g., 'Mostly Dwarves, some Human traders'"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Factions</Label>
              <div className="space-y-2">
                {factions.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search factions..."
                      value={factionSearch}
                      onChange={(e) => setFactionSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                )}
                <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md">
                  {selectedFactions.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No factions selected</span>
                  ) : (
                    selectedFactions.map((faction) => (
                      <Badge
                        key={faction.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => toggleFaction(faction.id)}
                      >
                        {faction.name}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))
                  )}
                </div>
                <Select
                  value=""
                  onValueChange={(v) => {
                    if (v && !factionIds.includes(v)) {
                      toggleFaction(v);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Add faction..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredFactions
                      .filter(f => !factionIds.includes(f.id))
                      .slice(0, 50)
                      .map((faction) => (
                        <SelectItem key={faction.id} value={faction.id}>
                          {faction.name}
                          {faction.type && (
                            <span className="text-xs text-muted-foreground ml-2">({faction.type})</span>
                          )}
                        </SelectItem>
                      ))}
                    {filteredFactions.filter(f => !factionIds.includes(f.id)).length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {factionSearch ? `No factions found matching "${factionSearch}"` : "All factions selected"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Location Image */}
          <div className="space-y-2">
            <Label>Location Image</Label>
            <LocationImageUpload
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
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Saving..." : location ? "Update" : "Create"} Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
