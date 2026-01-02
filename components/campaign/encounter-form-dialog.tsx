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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Encounter } from "@/hooks/useCampaignContent";
import { useMonsters, type Monster } from "@/hooks/useDndContent";
import {
  calculateEncounterStats,
  type EncounterMonster,
  type Difficulty,
} from "@/lib/utils/encounter-calculator";
import { Plus, Minus, X, Search } from "lucide-react";

interface EncounterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  encounter?: Encounter | null;
  onCreate: (data: {
    campaign_id: string;
    name?: string | null;
  }) => Promise<{ success: boolean; error?: Error }>;
  onUpdate: (
    encounterId: string,
    data: {
      name?: string | null;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

export function EncounterFormDialog({
  open,
  onOpenChange,
  campaignId,
  encounter,
  onCreate,
  onUpdate,
}: EncounterFormDialogProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Monster selection state
  const [selectedMonsters, setSelectedMonsters] = useState<EncounterMonster[]>([]);
  const [monsterSearch, setMonsterSearch] = useState("");
  const [crFilter, setCrFilter] = useState<string>("all");
  const [partySize, setPartySize] = useState(4);
  const [partyLevel, setPartyLevel] = useState(1);
  
  // Fetch monsters
  const { monsters, loading: monstersLoading } = useMonsters(campaignId);

  // Filter monsters based on search and CR
  const filteredMonsters = useMemo(() => {
    return monsters.filter((monster) => {
      const matchesSearch = monster.name.toLowerCase().includes(monsterSearch.toLowerCase());
      let matchesCR = true;
      if (crFilter !== "all") {
        const filterCR = parseFloat(crFilter);
        // Handle decimal comparison for CR values like 0.125, 0.25, etc.
        matchesCR = Math.abs(monster.challenge_rating - filterCR) < 0.0001;
      }
      return matchesSearch && matchesCR;
    });
  }, [monsters, monsterSearch, crFilter]);

  // Get unique CR values for filter
  const crOptions = useMemo(() => {
    const crs = [...new Set(monsters.map((m) => m.challenge_rating))].sort((a, b) => a - b);
    return crs;
  }, [monsters]);

  // Calculate encounter stats
  const encounterStats = useMemo(() => {
    return calculateEncounterStats(selectedMonsters, partySize, partyLevel);
  }, [selectedMonsters, partySize, partyLevel]);

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-600";
      case "Medium":
        return "bg-yellow-600";
      case "Hard":
        return "bg-orange-600";
      case "Deadly":
        return "bg-red-600";
      default:
        return "bg-gray-600";
    }
  };

  // Add monster to encounter
  const handleAddMonster = (monster: Monster) => {
    const existing = selectedMonsters.find(
      (m) => m.monster.index === monster.index && m.monster.source === monster.source
    );
    if (existing) {
      setSelectedMonsters(
        selectedMonsters.map((m) =>
          m.monster.index === monster.index && m.monster.source === monster.source
            ? { ...m, quantity: m.quantity + 1 }
            : m
        )
      );
    } else {
      setSelectedMonsters([...selectedMonsters, { monster, quantity: 1 }]);
    }
  };

  // Update monster quantity
  const handleUpdateQuantity = (monsterIndex: string, monsterSource: string, delta: number) => {
    setSelectedMonsters(
      selectedMonsters
        .map((m) => {
          if (m.monster.index === monsterIndex && m.monster.source === monsterSource) {
            const newQuantity = m.quantity + delta;
            return newQuantity > 0 ? { ...m, quantity: newQuantity } : null;
          }
          return m;
        })
        .filter((m): m is EncounterMonster => m !== null)
    );
  };

  // Remove monster from encounter
  const handleRemoveMonster = (monsterIndex: string, monsterSource: string) => {
    setSelectedMonsters(
      selectedMonsters.filter(
        (m) => !(m.monster.index === monsterIndex && m.monster.source === monsterSource)
      )
    );
  };

  // Load monsters from saved encounter data
  useEffect(() => {
    if (encounter && open) {
      setName(encounter.name || "");
      
      // Load saved monsters if they exist and monsters list is loaded
      if (encounter.monsters && encounter.monsters.length > 0 && !monstersLoading && monsters.length > 0) {
        // Convert saved monster data back to EncounterMonster format
        const loadedMonsters: EncounterMonster[] = [];
        
        for (const savedMonster of encounter.monsters) {
          // Find the monster in the monsters list
          const monster = monsters.find(
            (m) => m.index === savedMonster.monster_index && m.source === savedMonster.monster_source
          );
          
          if (monster) {
            loadedMonsters.push({
              monster,
              quantity: savedMonster.quantity,
            });
          }
        }
        
        setSelectedMonsters(loadedMonsters);
      } else if (encounter && (!encounter.monsters || encounter.monsters.length === 0)) {
        setSelectedMonsters([]);
      }
    } else if (!encounter && open) {
      setName("");
      setSelectedMonsters([]);
      setMonsterSearch("");
      setCrFilter("all");
      setPartySize(4);
      setPartyLevel(1);
    }
  }, [encounter, open, monsters, monstersLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      // Convert selected monsters to database format
      const monstersData = selectedMonsters.map(({ monster, quantity }) => ({
        monster_source: monster.source,
        monster_index: monster.index,
        quantity,
      }));

      const data = {
        name: name.trim() || null,
        monsters: monstersData.length > 0 ? monstersData : null,
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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 pb-4">
            <DialogTitle className="font-serif">
              {encounter ? "Edit Encounter" : "Create Encounter"}
            </DialogTitle>
            <DialogDescription>
              {encounter
                ? "Update encounter details below."
                : "Create a new combat encounter for your campaign."}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
            <div className="grid gap-4 py-4 pr-4">
              {/* Basic Info */}
              <div className="grid gap-4">
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
              </div>

              <Separator />

              {/* Party Info */}
              <div className="grid gap-4">
                <h3 className="font-semibold text-sm">Party Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="party_size">Party Size</Label>
                    <Input
                      id="party_size"
                      type="number"
                      min="1"
                      max="10"
                      value={partySize}
                      onChange={(e) => setPartySize(parseInt(e.target.value) || 1)}
                      disabled={loading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="party_level">Average Party Level</Label>
                    <Input
                      id="party_level"
                      type="number"
                      min="1"
                      max="20"
                      value={partyLevel}
                      onChange={(e) => setPartyLevel(parseInt(e.target.value) || 1)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Monster Selection */}
              <div className="grid gap-4">
                <h3 className="font-semibold text-sm">Add Monsters</h3>
                
                {/* Search and Filter */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="monster_search">Search Monsters</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="monster_search"
                        placeholder="Search by name..."
                        value={monsterSearch}
                        onChange={(e) => setMonsterSearch(e.target.value)}
                        disabled={loading || monstersLoading}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="cr_filter">Challenge Rating</Label>
                    <Select
                      value={crFilter}
                      onValueChange={setCrFilter}
                      disabled={loading || monstersLoading}
                    >
                      <SelectTrigger id="cr_filter" className="w-full">
                        <SelectValue placeholder="All CR" />
                      </SelectTrigger>
                      <SelectContent 
                        sideOffset={4}
                        align="start"
                        className="!bg-background border shadow-md max-h-[200px] z-[100]"
                      >
                        <SelectItem value="all">All CR</SelectItem>
                        {crOptions.map((cr) => (
                          <SelectItem key={cr} value={cr.toString()}>
                            CR {cr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Monster List */}
                <div className="border rounded-md">
                  <ScrollArea className="h-48">
                    <div className="p-2 space-y-1">
                      {monstersLoading ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          Loading monsters...
                        </div>
                      ) : filteredMonsters.length === 0 ? (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No monsters found
                        </div>
                      ) : (
                        filteredMonsters.map((monster) => (
                          <div
                            key={`${monster.source}-${monster.index}`}
                            className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                          >
                            <div className="flex-1">
                              <div className="font-medium text-sm">{monster.name}</div>
                              <div className="text-xs text-muted-foreground">
                                CR {monster.challenge_rating} • {monster.xp} XP
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddMonster(monster)}
                              disabled={loading}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <Separator />

              {/* Selected Monsters */}
              {selectedMonsters.length > 0 && (
                <div className="grid gap-4">
                  <h3 className="font-semibold text-sm">Selected Monsters</h3>
                  <div className="space-y-2 max-h-[200px] sm:max-h-[250px] overflow-y-auto pr-2 border rounded-md p-2">
                    {selectedMonsters.map(({ monster, quantity }) => (
                      <div
                        key={`${monster.source}-${monster.index}`}
                        className="flex items-center justify-between p-2 sm:p-3 border rounded-md flex-shrink-0 bg-muted/30"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="font-medium text-sm truncate">{monster.name}</div>
                          <div className="text-xs text-muted-foreground">
                            CR {monster.challenge_rating} • {monster.xp} XP each
                          </div>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUpdateQuantity(monster.index, monster.source, -1)
                              }
                              disabled={loading}
                              className="h-7 w-7 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 sm:w-8 text-center text-xs sm:text-sm font-medium">
                              {quantity}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleUpdateQuantity(monster.index, monster.source, 1)
                              }
                              disabled={loading}
                              className="h-7 w-7 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMonster(monster.index, monster.source)}
                            disabled={loading}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* XP Calculation */}
              {selectedMonsters.length > 0 && (
                <div className="grid gap-4">
                  <h3 className="font-semibold text-sm">Encounter Statistics</h3>
                  <div className="grid grid-cols-2 gap-4 p-4 border rounded-md bg-muted/50">
                    <div>
                      <div className="text-xs text-muted-foreground">Total XP</div>
                      <div className="text-lg font-semibold">
                        {encounterStats.totalXP.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Monsters</div>
                      <div className="text-lg font-semibold">{encounterStats.monsterCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Adjusted XP</div>
                      <div className="text-lg font-semibold">
                        {encounterStats.adjustedXP.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Difficulty</div>
                      <Badge
                        className={`${getDifficultyColor(encounterStats.difficulty)} text-white`}
                      >
                        {encounterStats.difficulty}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t">
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

