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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NPC } from "@/hooks/useCampaignContent";
import { useClasses, useRaces } from "@/hooks/useDndContent";
import { MapImageUpload } from "./map-image-upload";
import { Checkbox } from "@/components/ui/checkbox";
import { NameGeneratorButton } from "@/components/shared/name-generator-button";

interface NPCFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
  npc?: NPC | null;
  isDm?: boolean;
  onCreate: (data: {
    campaign_id: string;
    name: string;
    description?: string | null;
    appearance?: string | null;
    personality?: string | null;
    background?: string | null;
    location?: string | null;
    notes?: string | null;
    image_url?: string | null;
    class_source?: string | null;
    class_index?: string | null;
    species_source?: string | null;
    species_index?: string | null;
    custom_class?: string | null;
    custom_species?: string | null;
    hidden_from_players?: boolean;
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
      image_url?: string | null;
      class_source?: string | null;
      class_index?: string | null;
      species_source?: string | null;
      species_index?: string | null;
      custom_class?: string | null;
      custom_species?: string | null;
      hidden_from_players?: boolean;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

export function NPCFormDialog({
  open,
  onOpenChange,
  campaignId,
  userId,
  npc,
  isDm = false,
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hiddenFromPlayers, setHiddenFromPlayers] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Class fields
  const [classSource, setClassSource] = useState<string | null>(null);
  const [classIndex, setClassIndex] = useState<string | null>(null);
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [customClass, setCustomClass] = useState("");
  
  // Species fields
  const [speciesSource, setSpeciesSource] = useState<string | null>(null);
  const [speciesIndex, setSpeciesIndex] = useState<string | null>(null);
  const [isCustomSpecies, setIsCustomSpecies] = useState(false);
  const [customSpecies, setCustomSpecies] = useState("");
  
  // Fetch classes and races
  const { classes, loading: classesLoading } = useClasses(campaignId, null);
  const { races, loading: racesLoading } = useRaces(campaignId, null);

  useEffect(() => {
    if (npc) {
      setName(npc.name);
      setDescription(npc.description || "");
      setAppearance(npc.appearance || "");
      setPersonality(npc.personality || "");
      setBackground(npc.background || "");
      setLocation(npc.location || "");
      setNotes(npc.notes || "");
      setImageUrl(npc.image_url || null);
      setHiddenFromPlayers(npc.hidden_from_players ?? false);
      
      // Initialize class fields
      if (npc.custom_class) {
        setIsCustomClass(true);
        setCustomClass(npc.custom_class);
        setClassSource(null);
        setClassIndex(null);
      } else {
        setIsCustomClass(false);
        setCustomClass("");
        setClassSource(npc.class_source || null);
        setClassIndex(npc.class_index || null);
      }
      
      // Initialize species fields
      if (npc.custom_species) {
        setIsCustomSpecies(true);
        setCustomSpecies(npc.custom_species);
        setSpeciesSource(null);
        setSpeciesIndex(null);
      } else {
        setIsCustomSpecies(false);
        setCustomSpecies("");
        setSpeciesSource(npc.species_source || null);
        setSpeciesIndex(npc.species_index || null);
      }
    } else {
      setName("");
      setDescription("");
      setAppearance("");
      setPersonality("");
      setBackground("");
      setLocation("");
      setNotes("");
      setImageUrl(null);
      setHiddenFromPlayers(false);
      setClassSource(null);
      setClassIndex(null);
      setIsCustomClass(false);
      setCustomClass("");
      setSpeciesSource(null);
      setSpeciesIndex(null);
      setIsCustomSpecies(false);
      setCustomSpecies("");
      setHiddenFromPlayers(true);
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
        image_url: imageUrl || null,
        class_source: isCustomClass ? null : classSource || null,
        class_index: isCustomClass ? null : classIndex || null,
        custom_class: isCustomClass ? customClass.trim() || null : null,
        species_source: isCustomSpecies ? null : speciesSource || null,
        species_index: isCustomSpecies ? null : speciesIndex || null,
        custom_species: isCustomSpecies ? customSpecies.trim() || null : null,
        hidden_from_players: hiddenFromPlayers,
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
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="NPC name"
                  required
                  disabled={loading}
                  className="flex-1"
                />
                <NameGeneratorButton
                  category="npc"
                  onGenerate={(generatedName) => setName(generatedName)}
                  race={
                    isCustomSpecies
                      ? customSpecies
                      : speciesIndex
                        ? races.find((r) => r.index === speciesIndex)?.name
                        : undefined
                  }
                  disabled={loading}
                />
              </div>
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
            
            {/* Class Dropdown */}
            <div className="grid gap-2">
              <Label htmlFor="class">Class</Label>
              <div className="space-y-2">
                <Select
                  value={isCustomClass ? 'custom' : (classSource && classIndex ? `${classSource}:${classIndex}` : 'none')}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setIsCustomClass(true);
                      setClassSource(null);
                      setClassIndex(null);
                    } else if (value === 'none') {
                      setIsCustomClass(false);
                      setClassSource(null);
                      setClassIndex(null);
                    } else {
                      setIsCustomClass(false);
                      const [source, index] = value.split(':');
                      setClassSource(source);
                      setClassIndex(index);
                      setCustomClass("");
                    }
                  }}
                  disabled={loading || classesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {classes.length > 0 && (
                      <>
                        <SelectItem value="custom">Custom Class...</SelectItem>
                        {classes.map((cls) => (
                          <SelectItem
                            key={`${cls.source}-${cls.index}`}
                            value={`${cls.source}:${cls.index}`}
                          >
                            {cls.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {isCustomClass && (
                  <Input
                    id="custom-class"
                    type="text"
                    value={customClass}
                    onChange={(e) => setCustomClass(e.target.value)}
                    placeholder="Enter custom class"
                    disabled={loading}
                  />
                )}
              </div>
            </div>
            
            {/* Species Dropdown */}
            <div className="grid gap-2">
              <Label htmlFor="species">Species</Label>
              <div className="space-y-2">
                <Select
                  value={isCustomSpecies ? 'custom' : (speciesSource && speciesIndex ? `${speciesSource}:${speciesIndex}` : 'none')}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      setIsCustomSpecies(true);
                      setSpeciesSource(null);
                      setSpeciesIndex(null);
                    } else if (value === 'none') {
                      setIsCustomSpecies(false);
                      setSpeciesSource(null);
                      setSpeciesIndex(null);
                    } else {
                      setIsCustomSpecies(false);
                      const [source, index] = value.split(':');
                      setSpeciesSource(source);
                      setSpeciesIndex(index);
                      setCustomSpecies("");
                    }
                  }}
                  disabled={loading || racesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {races.length > 0 && (
                      <>
                        <SelectItem value="custom">Custom Species...</SelectItem>
                        {races.map((race) => (
                          <SelectItem
                            key={`${race.source}-${race.index}`}
                            value={`${race.source}:${race.index}`}
                          >
                            {race.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {isCustomSpecies && (
                  <Input
                    id="custom-species"
                    type="text"
                    value={customSpecies}
                    onChange={(e) => setCustomSpecies(e.target.value)}
                    placeholder="Enter custom species"
                    disabled={loading}
                  />
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Image</Label>
              <MapImageUpload
                imageUrl={imageUrl}
                onImageChange={setImageUrl}
                campaignId={campaignId}
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
            {isDm && (
              <div className="grid gap-2">
                <Label htmlFor="notes">DM Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private notes for the DM..."
                  rows={3}
                  disabled={loading}
                />
              </div>
            )}
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
                  Only you will be able to see this NPC
                </p>
              </div>
            )}
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

