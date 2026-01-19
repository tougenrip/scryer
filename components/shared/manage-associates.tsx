"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { useCampaignNPCs, useCampaignQuests } from "@/hooks/useCampaignContent";
import { useWorldLocations, useFactions } from "@/hooks/useForgeContent";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Associate {
  id: string;
  type: 'npc' | 'faction' | 'location' | 'quest';
  name: string;
}

interface ManageAssociatesProps {
  campaignId: string;
  entityId: string;
  entityType: 'npc' | 'faction' | 'location' | 'pantheon';
  currentAssociates: Associate[];
  onUpdate: (associates: Associate[]) => void;
  isDm?: boolean;
  editMode?: boolean;
}

export function ManageAssociates({ 
  campaignId, 
  entityId, 
  entityType,
  currentAssociates, 
  onUpdate, 
  isDm = false,
  editMode = false
}: ManageAssociatesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNpcIds, setSelectedNpcIds] = useState<string[]>([]);
  const [selectedFactionIds, setSelectedFactionIds] = useState<string[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedQuestIds, setSelectedQuestIds] = useState<string[]>([]);

  const { npcs } = useCampaignNPCs(campaignId, isDm || false);
  const { locations } = useWorldLocations(campaignId, isDm || false);
  const { factions } = useFactions(campaignId);
  const { quests } = useCampaignQuests(campaignId);

  // Initialize selected IDs from current associates
  useEffect(() => {
    if (currentAssociates) {
      setSelectedNpcIds(currentAssociates.filter(a => a.type === 'npc').map(a => a.id));
      setSelectedFactionIds(currentAssociates.filter(a => a.type === 'faction').map(a => a.id));
      setSelectedLocationIds(currentAssociates.filter(a => a.type === 'location').map(a => a.id));
      setSelectedQuestIds(currentAssociates.filter(a => a.type === 'quest').map(a => a.id));
    }
  }, [currentAssociates, isDialogOpen]);

  const handleSave = async () => {
    const newAssociates: Associate[] = [];

    // Collect selected NPCs
    npcs?.forEach(npc => {
      if (selectedNpcIds.includes(npc.id) && npc.id !== entityId) {
        newAssociates.push({ id: npc.id, type: 'npc', name: npc.name });
      }
    });

    // Collect selected Factions
    factions?.forEach(faction => {
      if (selectedFactionIds.includes(faction.id) && faction.id !== entityId) {
        newAssociates.push({ id: faction.id, type: 'faction', name: faction.name });
      }
    });

    // Collect selected Locations
    locations?.forEach(location => {
      if (selectedLocationIds.includes(location.id) && location.id !== entityId) {
        newAssociates.push({ id: location.id, type: 'location', name: location.name });
      }
    });

    // Collect selected Quests
    quests?.forEach(quest => {
      if (selectedQuestIds.includes(quest.id) && quest.id !== entityId) {
        newAssociates.push({ id: quest.id, type: 'quest', name: quest.title });
      }
    });

    // Update metadata in database
    const supabase = createClient();
    const associatesArray = newAssociates.map(a => ({ type: a.type, id: a.id }));

    // Get current entity metadata
    let tableName = '';
    if (entityType === 'npc') tableName = 'npcs';
    else if (entityType === 'faction') tableName = 'factions';
    else if (entityType === 'location') tableName = 'world_locations';
    else if (entityType === 'pantheon') tableName = 'pantheon_deities';

    if (!tableName) return;

    const { data: entity } = await supabase
      .from(tableName)
      .select('metadata')
      .eq('id', entityId)
      .single();

    const currentMetadata = entity?.metadata || {};
    const updateData = {
      metadata: { ...currentMetadata, associates: associatesArray }
    };

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', entityId);

    if (error) {
      toast.error("Failed to update associates");
      throw error;
    }

    onUpdate(newAssociates);
    setIsDialogOpen(false);
    toast.success("Associates updated");
  };

  const handleRemove = async (associateId: string, associateType: 'npc' | 'faction' | 'location' | 'quest') => {
    const newAssociates = currentAssociates.filter(
      a => !(a.id === associateId && a.type === associateType)
    );

    const supabase = createClient();
    const associatesArray = newAssociates.map(a => ({ type: a.type, id: a.id }));

    let updateData: any = {};
    const supabaseQuery = createClient();
    
    // Get current entity metadata
    let tableName = '';
    if (entityType === 'npc') tableName = 'npcs';
    else if (entityType === 'faction') tableName = 'factions';
    else if (entityType === 'location') tableName = 'world_locations';
    else if (entityType === 'pantheon') tableName = 'pantheon_deities';

    if (tableName) {
      const { data: entity } = await supabaseQuery
        .from(tableName)
        .select('metadata')
        .eq('id', entityId)
        .single();

      updateData.metadata = { ...(entity?.metadata || {}), associates: associatesArray };
      
      const { error } = await supabaseQuery
        .from(tableName)
        .update(updateData)
        .eq('id', entityId);
      
      if (error) {
        toast.error("Failed to remove associate");
        return;
      }
    }

    onUpdate(newAssociates);
    toast.success("Associate removed");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Associated Entities</h2>
        {isDm && editMode && (
          <Button onClick={() => setIsDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Manage Associates
          </Button>
        )}
      </div>

      {currentAssociates.length === 0 ? (
        <p className="text-muted-foreground">No associated entities found.</p>
      ) : (
        <div className="space-y-2">
          {currentAssociates.map((link) => (
            <div
              key={`${link.type}-${link.id}`}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex items-center justify-between group"
            >
              <div 
                className="flex items-center gap-2 cursor-pointer flex-1"
                onClick={() => {
                  // Navigation handled by router in parent
                }}
              >
                <Badge variant="outline">{link.type.toUpperCase()}</Badge>
                <span className="font-medium">{link.name}</span>
              </div>
              {isDm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(link.id, link.type)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Manage Associates Dialog */}
      {isDm && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Associates</DialogTitle>
              <DialogDescription>
                Select entities to associate with this {entityType}. Changes will be saved immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* NPCs */}
              {entityType !== 'npc' && (
                <div className="space-y-2">
                  <Label>NPCs</Label>
                  <ScrollArea className="h-32 border rounded-md p-3">
                    {npcs && npcs.length > 0 ? (
                      <div className="space-y-2">
                        {npcs.map((npc) => {
                          if (npc.id === entityId) return null;
                          const isSelected = selectedNpcIds.includes(npc.id);
                          return (
                            <div key={npc.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`npc-${npc.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedNpcIds([...selectedNpcIds, npc.id]);
                                  } else {
                                    setSelectedNpcIds(selectedNpcIds.filter(id => id !== npc.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`npc-${npc.id}`} className="font-normal cursor-pointer">
                                {npc.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No NPCs available</p>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Factions */}
              {entityType !== 'faction' && (
                <div className="space-y-2">
                  <Label>Factions</Label>
                  <ScrollArea className="h-32 border rounded-md p-3">
                    {factions && factions.length > 0 ? (
                      <div className="space-y-2">
                        {factions.map((faction) => {
                          if (faction.id === entityId) return null;
                          const isSelected = selectedFactionIds.includes(faction.id);
                          return (
                            <div key={faction.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`faction-${faction.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFactionIds([...selectedFactionIds, faction.id]);
                                  } else {
                                    setSelectedFactionIds(selectedFactionIds.filter(id => id !== faction.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`faction-${faction.id}`} className="font-normal cursor-pointer">
                                {faction.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No factions available</p>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Locations */}
              {entityType !== 'location' && (
                <div className="space-y-2">
                  <Label>Locations</Label>
                  <ScrollArea className="h-32 border rounded-md p-3">
                    {locations && locations.length > 0 ? (
                      <div className="space-y-2">
                        {locations.map((location) => {
                          if (location.id === entityId) return null;
                          const isSelected = selectedLocationIds.includes(location.id);
                          return (
                            <div key={location.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`location-${location.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedLocationIds([...selectedLocationIds, location.id]);
                                  } else {
                                    setSelectedLocationIds(selectedLocationIds.filter(id => id !== location.id));
                                  }
                                }}
                              />
                              <Label htmlFor={`location-${location.id}`} className="font-normal cursor-pointer">
                                {location.name}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No locations available</p>
                    )}
                  </ScrollArea>
                </div>
              )}

              {/* Quests */}
              <div className="space-y-2">
                <Label>Quests</Label>
                <ScrollArea className="h-32 border rounded-md p-3">
                  {quests && quests.length > 0 ? (
                    <div className="space-y-2">
                      {quests.map((quest) => {
                        const isSelected = selectedQuestIds.includes(quest.id);
                        return (
                          <div key={quest.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`quest-${quest.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedQuestIds([...selectedQuestIds, quest.id]);
                                } else {
                                  setSelectedQuestIds(selectedQuestIds.filter(id => id !== quest.id));
                                }
                              }}
                            />
                            <Label htmlFor={`quest-${quest.id}`} className="font-normal cursor-pointer">
                              {quest.title}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No quests available</p>
                  )}
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

