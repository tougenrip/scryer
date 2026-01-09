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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Faction, useWorldLocations } from "@/hooks/useForgeContent";
import { useCampaignNPCs } from "@/hooks/useCampaignContent";
import { FactionImageUpload } from "./faction-image-upload";
import { Search, X, Plus } from "lucide-react";
import { NameGeneratorButton } from "@/components/shared/name-generator-button";

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
      headquarters_location_id: headquartersLocationId,
      leader_npc_id: leaderNpcId,
      leader_name: leaderName.trim() || null,
      influence_level: influenceLevel,
      goals,
      resources,
    });
  };

  const selectedLeader = npcs.find(npc => npc.id === leaderNpcId);
  const selectedHeadquarters = locations.find(loc => loc.id === headquartersLocationId);

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
                <Textarea
                  id="public-agenda"
                  value={publicAgenda}
                  onChange={(e) => setPublicAgenda(e.target.value)}
                  placeholder="What the faction says they want"
                  rows={3}
                />
              </div>

              {isDm && (
                <div className="space-y-2">
                  <Label htmlFor="secret-agenda">
                    Secret Agenda <span className="text-xs text-muted-foreground">(GM Only)</span>
                  </Label>
                  <Textarea
                    id="secret-agenda"
                    value={secretAgenda}
                    onChange={(e) => setSecretAgenda(e.target.value)}
                    placeholder="What the faction actually wants"
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="General description of the faction"
                  rows={4}
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

                <div className="space-y-2">
                  <Label htmlFor="influence">Scope/Reach</Label>
                  <Select
                    value={influenceLevel || "none"}
                    onValueChange={(v) => setInfluenceLevel(v === "none" ? null : v as Faction['influence_level'])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No scope set</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="continental">Continental</SelectItem>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="multiverse">Multiverse</SelectItem>
                    </SelectContent>
                  </Select>
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

