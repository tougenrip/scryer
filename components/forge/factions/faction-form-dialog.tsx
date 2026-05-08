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
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Faction, useWorldLocations } from "@/hooks/useForgeContent";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";
import { FactionImageUpload } from "./faction-image-upload";
import { X, Plus } from "lucide-react";
import { NameGeneratorButton } from "@/components/shared/name-generator-button";
import { Slider } from "@/components/ui/slider";
import {
  FACTION_INFLUENCE_ORDER,
  FACTION_INFLUENCE_PCT,
  factionInfluenceFromSliderIndex,
  factionInfluenceSliderIndex,
} from "@/lib/faction-influence";

interface FactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faction: Faction | null;
  campaignId: string;
  onSave: (data: {
    name: string;
    type: Faction['type'];
    description?: string | null;
    headquarters_location_id?: string | null;
    leader_name?: string | null;
    leader_npc_id?: string | null;
    alignment?: Faction['alignment'] | null;
    goals?: string[];
    resources?: string[];
    influence_level?: Faction['influence_level'] | null;
    emblem_sigil_url?: string | null;
    motto_creed?: string | null;
    public_agenda?: string | null;
    secret_agenda?: string | null;
    hidden_from_players?: boolean;
    dm_notes?: string | null;
  }) => void;
  loading?: boolean;
  isDm?: boolean;
}

const ALIGNMENT_OPTIONS = [
  { value: 'LG', label: 'Lawful Good' },
  { value: 'NG', label: 'Neutral Good' },
  { value: 'CG', label: 'Chaotic Good' },
  { value: 'LN', label: 'Lawful Neutral' },
  { value: 'N', label: 'Neutral' },
  { value: 'CN', label: 'Chaotic Neutral' },
  { value: 'LE', label: 'Lawful Evil' },
  { value: 'NE', label: 'Neutral Evil' },
  { value: 'CE', label: 'Chaotic Evil' },
];

export function FactionFormDialog({
  open,
  onOpenChange,
  faction,
  campaignId,
  onSave,
  loading = false,
  isDm = true,
}: FactionFormDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Faction['type']>(null);
  const [description, setDescription] = useState("");
  const [alignment, setAlignment] = useState<Faction['alignment']>(null);
  const [emblemSigilUrl, setEmblemSigilUrl] = useState<string | null>(null);
  const [mottoCreed, setMottoCreed] = useState("");
  const [publicAgenda, setPublicAgenda] = useState("");
  const [secretAgenda, setSecretAgenda] = useState("");
  const [hiddenFromPlayers, setHiddenFromPlayers] = useState(false);
  const [dmNotes, setDmNotes] = useState("");
  
  const [headquartersLocationId, setHeadquartersLocationId] = useState<string | null>(null);
  const [leaderNpcId, setLeaderNpcId] = useState<string | null>(null);
  const [leaderName, setLeaderName] = useState("");
  const [influenceLevel, setInfluenceLevel] = useState<Faction['influence_level']>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [resources, setResources] = useState<string[]>([]);
  
  const [newGoal, setNewGoal] = useState("");
  const [newResource, setNewResource] = useState("");
  
  const [npcSearch, setNpcSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const { locations } = useWorldLocations(campaignId);
  const { npcs } = useCampaignNPCs(campaignId);

  useEffect(() => {
    if (faction) {
      setName(faction.name || "");
      setType(faction.type || null);
      setDescription(faction.description || "");
      setAlignment(faction.alignment || null);
      setEmblemSigilUrl(faction.emblem_sigil_url || null);
      setMottoCreed(faction.motto_creed || "");
      setPublicAgenda(faction.public_agenda || "");
      setSecretAgenda(faction.secret_agenda || "");
      setHiddenFromPlayers(faction.hidden_from_players ?? false);
      setDmNotes(faction.dm_notes || "");
      setHeadquartersLocationId(faction.headquarters_location_id || null);
      setLeaderNpcId(faction.leader_npc_id || null);
      setLeaderName(faction.leader_name || "");
      setInfluenceLevel(faction.influence_level || null);
      setGoals(faction.goals || []);
      setResources(faction.resources || []);
    } else {
      // Reset form
      setName("");
      setType(null);
      setDescription("");
      setAlignment(null);
      setEmblemSigilUrl(null);
      setMottoCreed("");
      setPublicAgenda("");
      setSecretAgenda("");
      setHiddenFromPlayers(false);
      setDmNotes("");
      setHeadquartersLocationId(null);
      setLeaderNpcId(null);
      setLeaderName("");
      setInfluenceLevel(null);
      setGoals([]);
      setResources([]);
    }
    setNewGoal("");
    setNewResource("");
    setNpcSearch("");
    setLocationSearch("");
  }, [faction, open]);

  const filteredNPCs = useMemo(() => {
    if (!npcSearch) return npcs;
    return npcs.filter(npc => 
      npc.name.toLowerCase().includes(npcSearch.toLowerCase())
    );
  }, [npcs, npcSearch]);

  const filteredLocations = useMemo(() => {
    if (!locationSearch) return locations;
    return locations.filter(location => 
      location.name.toLowerCase().includes(locationSearch.toLowerCase())
    );
  }, [locations, locationSearch]);

  const influenceHint = useMemo(() => {
    const idx = factionInfluenceSliderIndex(influenceLevel);
    if (idx === 0) return "Not set";
    const tier = FACTION_INFLUENCE_ORDER[idx - 1]!;
    const pct = FACTION_INFLUENCE_PCT[tier];
    return `${tier.charAt(0).toUpperCase()}${tier.slice(1)} · ~${pct}%`;
  }, [influenceLevel]);

  const handleAddGoal = () => {
    if (newGoal.trim() && !goals.includes(newGoal.trim())) {
      setGoals([...goals, newGoal.trim()]);
      setNewGoal("");
    }
  };

  const handleRemoveGoal = (goal: string) => {
    setGoals(goals.filter(g => g !== goal));
  };

  const handleAddResource = () => {
    if (newResource.trim() && !resources.includes(newResource.trim())) {
      setResources([...resources, newResource.trim()]);
      setNewResource("");
    }
  };

  const handleRemoveResource = (resource: string) => {
    setResources(resources.filter(r => r !== resource));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }

    onSave({
      name: name.trim(),
      type,
      description: description.trim() || null,
      alignment,
      emblem_sigil_url: emblemSigilUrl,
      motto_creed: mottoCreed.trim() || null,
      public_agenda: publicAgenda.trim() || null,
      secret_agenda: secretAgenda.trim() || null,
      hidden_from_players: hiddenFromPlayers,
      dm_notes: dmNotes.trim() || null,
      headquarters_location_id: headquartersLocationId,
      leader_npc_id: leaderNpcId,
      leader_name: leaderName.trim() || null,
      influence_level: influenceLevel,
      goals,
      resources,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {faction ? "Edit Faction" : "Create Faction"}
          </DialogTitle>
          <DialogDescription>
            {faction
              ? "Update the faction's information"
              : "Add a new faction to your campaign"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="identity" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="identity">Identity & Overview</TabsTrigger>
            <TabsTrigger value="structure">Structure & Power</TabsTrigger>
          </TabsList>

          <TabsContent value="identity" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., The Zhentarim"
                    required
                    className="flex-1"
                  />
                  <NameGeneratorButton
                    category="faction"
                    onGenerate={(generatedName) => setName(generatedName)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type/Category</Label>
                  <Select
                    value={type || "none"}
                    onValueChange={(v) => setType(v === "none" ? null : v as Faction['type'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No type</SelectItem>
                      <SelectItem value="guild">Guild</SelectItem>
                      <SelectItem value="secret_society">Secret Society</SelectItem>
                      <SelectItem value="academy">Academy</SelectItem>
                      <SelectItem value="religious">Religious Order</SelectItem>
                      <SelectItem value="cult">Cult</SelectItem>
                      <SelectItem value="criminal">Criminal Organization</SelectItem>
                      <SelectItem value="arcane">Arcane Organization</SelectItem>
                      <SelectItem value="political">Political Entity</SelectItem>
                      <SelectItem value="military">Military Unit</SelectItem>
                      <SelectItem value="military_unit">Military Unit (Legacy)</SelectItem>
                      <SelectItem value="kingdom">Kingdom</SelectItem>
                      <SelectItem value="organization">Organization</SelectItem>
                      <SelectItem value="tribe">Tribe</SelectItem>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="church">Church</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alignment">Alignment</Label>
                  <Select
                    value={alignment || "none"}
                    onValueChange={(v) => setAlignment(v === "none" ? null : v as Faction['alignment'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select alignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No alignment</SelectItem>
                      {ALIGNMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Emblem/Sigil</Label>
                <FactionImageUpload
                  imageUrl={emblemSigilUrl}
                  onImageChange={setEmblemSigilUrl}
                  campaignId={campaignId}
                  disabled={loading}
                  label="Emblem/Sigil"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motto">Motto/Creed</Label>
                <Input
                  id="motto"
                  value={mottoCreed}
                  onChange={(e) => setMottoCreed(e.target.value)}
                  placeholder="Short flavor text or motto"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="public-agenda">Public Agenda</Label>
                <RichTextEditor
                  id="public-agenda"
                  value={publicAgenda}
                  onChange={setPublicAgenda}
                  placeholder="What the faction says they want"
                  campaignId={campaignId}
                  disabled={loading}
                  minHeight="100px"
                />
              </div>

              {isDm && (
                <div className="space-y-2">
                  <Label htmlFor="secret-agenda">
                    Secret Agenda <span className="text-xs text-muted-foreground">(GM Only)</span>
                  </Label>
                  <RichTextEditor
                    id="secret-agenda"
                    value={secretAgenda}
                    onChange={setSecretAgenda}
                    placeholder="What the faction actually wants"
                    campaignId={campaignId}
                    disabled={loading}
                    minHeight="100px"
                  />
                </div>
              )}

              {isDm && (
                <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <Label htmlFor="hidden-from-players" className="text-amber-400">
                        Hide from players
                      </Label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        When on, this faction is invisible to players
                        anywhere it appears.
                      </p>
                    </div>
                    <input
                      id="hidden-from-players"
                      type="checkbox"
                      checked={hiddenFromPlayers}
                      onChange={(e) => setHiddenFromPlayers(e.target.checked)}
                      disabled={loading}
                      className="h-4 w-4 accent-amber-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dm-notes" className="text-amber-400">
                      DM Notes <span className="text-xs text-muted-foreground">(never sent to players)</span>
                    </Label>
                    <RichTextEditor
                      id="dm-notes"
                      value={dmNotes}
                      onChange={setDmNotes}
                      placeholder="Plot threads, twists, anything you want to remember…"
                      campaignId={campaignId}
                      disabled={loading}
                      minHeight="100px"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  id="description"
                  value={description}
                  onChange={setDescription}
                  placeholder="General description of the faction"
                  campaignId={campaignId}
                  disabled={loading}
                  minHeight="120px"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="structure" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headquarters">Headquarters</Label>
                  <Select
                    value={headquartersLocationId || "none"}
                    onValueChange={(v) => setHeadquartersLocationId(v === "none" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No headquarters" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No headquarters</SelectItem>
                      {filteredLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} ({loc.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Label htmlFor="influence-slider">Influence & reach</Label>
                    <span
                      className="text-xs text-muted-foreground tabular-nums"
                      id="influence-slider-hint"
                    >
                      {influenceHint}
                    </span>
                  </div>
                  <Slider
                    id="influence-slider"
                    min={0}
                    max={5}
                    step={1}
                    value={[factionInfluenceSliderIndex(influenceLevel)]}
                    onValueChange={([v]) =>
                      setInfluenceLevel(factionInfluenceFromSliderIndex(v))
                    }
                    disabled={loading}
                    aria-labelledby="influence-slider-hint"
                  />
                  <div
                    className="flex justify-between text-[10px] text-muted-foreground"
                    aria-hidden
                  >
                    <span>Unset</span>
                    <span>Multiverse</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Drag to set how far this faction&apos;s power reaches. Leftmost
                    clears reach (same as no scope).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leader">Leader</Label>
                <Select
                  value={leaderNpcId || "none"}
                  onValueChange={(v) => setLeaderNpcId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No leader assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No leader assigned</SelectItem>
                    {filteredNPCs.map((npc) => (
                      <SelectItem key={npc.id} value={npc.id}>
                        {npc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Or enter leader name manually below
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leader-name">Leader Name (Manual Entry)</Label>
                <Input
                  id="leader-name"
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="Enter leader name if not linked to NPC"
                  disabled={!!leaderNpcId}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Goals</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {goals.map((goal) => (
                    <Badge key={goal} variant="secondary" className="text-sm">
                      {goal}
                      <button
                        type="button"
                        onClick={() => handleRemoveGoal(goal)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddGoal();
                      }
                    }}
                    placeholder="Add a goal"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddGoal}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Resources</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {resources.map((resource) => (
                    <Badge key={resource} variant="secondary" className="text-sm">
                      {resource}
                      <button
                        type="button"
                        onClick={() => handleRemoveResource(resource)}
                        className="ml-2 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newResource}
                    onChange={(e) => setNewResource(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddResource();
                      }
                    }}
                    placeholder="Add a resource (e.g., Information Network, Trade Routes)"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddResource}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? "Saving..." : faction ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

