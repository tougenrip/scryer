"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign } from "@/hooks/useCampaigns";
import {
  useCampaignEncounters,
  useCreateEncounter,
  useUpdateEncounter,
  useDeleteEncounter,
  type Encounter,
} from "@/hooks/useCampaignContent";
import { useMonsters } from "@/hooks/useDndContent";
import { EncounterFormDialog } from "@/components/campaign/encounter-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Swords, Edit, Trash2, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function EncountersPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(null);
  const [deletingEncounterId, setDeletingEncounterId] = useState<string | null>(null);

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { encounters, loading: encountersLoading, refetch: refetchEncounters } = useCampaignEncounters(campaignId);
  const { monsters } = useMonsters(campaignId);
  const { createEncounter, loading: creating } = useCreateEncounter();
  const { updateEncounter, loading: updating } = useUpdateEncounter();
  const { deleteEncounter, loading: deleting } = useDeleteEncounter();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        if (campaign) {
          setIsDm(campaign.dm_user_id === user.id);
        }
      }
    }
    getUser();
  }, [campaign]);

  const handleCreate = async (data: {
    campaign_id: string;
    name?: string | null;
    monsters?: Array<{
      monster_source: 'srd' | 'homebrew';
      monster_index: string;
      quantity: number;
    }> | null;
  }) => {
    const result = await createEncounter(data);
    if (result.success) {
      toast.success("Encounter created successfully");
      setCreateDialogOpen(false);
      refetchEncounters();
    } else {
      toast.error(result.error?.message || "Failed to create encounter");
      return result;
    }
    return { success: true };
  };

  const handleUpdate = async (
    encounterId: string,
    data: {
      name?: string | null;
      monsters?: Array<{
        monster_source: 'srd' | 'homebrew';
        monster_index: string;
        quantity: number;
      }> | null;
    }
  ) => {
    const result = await updateEncounter(encounterId, data);
    if (result.success) {
      toast.success("Encounter updated successfully");
      setEditingEncounter(null);
      refetchEncounters();
    } else {
      toast.error(result.error?.message || "Failed to update encounter");
      return result;
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingEncounterId) return;
    const result = await deleteEncounter(deletingEncounterId);
    if (result.success) {
      toast.success("Encounter deleted successfully");
      setDeletingEncounterId(null);
      refetchEncounters();
    } else {
      toast.error(result.error?.message || "Failed to delete encounter");
    }
  };


  if (campaignLoading || encountersLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-64">
              <CardContent className="p-0">
                <Skeleton className="h-full w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Campaign not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Encounters</h1>
          <p className="text-muted-foreground mt-1">
            Manage combat encounters for your campaign
          </p>
        </div>
        {isDm && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Encounter
          </Button>
        )}
      </div>

      {/* Encounters Grid */}
      {encounters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Swords className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No encounters yet. {isDm && "Create your first encounter to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {encounters.map((encounter) => {
            const createdDate = encounter.created_at 
              ? format(new Date(encounter.created_at), "MMM d, yyyy")
              : null;
            
            // Resolve monster names from saved monster data
            const encounterMonsters = encounter.monsters?.map((savedMonster) => {
              const monster = monsters.find(
                (m) => m.index === savedMonster.monster_index && m.source === savedMonster.monster_source
              );
              return monster ? { name: monster.name, quantity: savedMonster.quantity, cr: monster.challenge_rating } : null;
            }).filter((m): m is { name: string; quantity: number; cr: number } => m !== null) || [];
            
            const totalMonsters = encounterMonsters.reduce((sum, m) => sum + m.quantity, 0);
            
            return (
              <Card key={encounter.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {encounter.name || "Unnamed Encounter"}
                      </h3>
                      {encounter.active && (
                        <Badge variant="default" className="bg-green-600 mt-2">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Encounter Details */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {encounter.active && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Round {encounter.round_number}</span>
                      </div>
                    )}
                    {createdDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Created {createdDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Monsters List */}
                  {encounterMonsters.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Creatures ({totalMonsters})
                      </div>
                      <div className="space-y-1 max-h-[120px] overflow-y-auto">
                        {encounterMonsters.map((monster, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1 min-w-0">
                              {monster.quantity > 1 && (
                                <span className="font-medium mr-1">{monster.quantity}x</span>
                              )}
                              {monster.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              CR {monster.cr}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {isDm && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingEncounter(encounter)}
                          className="flex-1"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingEncounterId(encounter.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <EncounterFormDialog
        open={createDialogOpen || editingEncounter !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingEncounter(null);
          }
        }}
        campaignId={campaignId}
        encounter={editingEncounter}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingEncounterId !== null}
        onOpenChange={(open) => !open && setDeletingEncounterId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Encounter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this encounter? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

