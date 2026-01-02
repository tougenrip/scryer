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
  useCampaignMediaItems,
  type Encounter,
} from "@/hooks/useCampaignContent";
import { EncounterFormDialog } from "@/components/campaign/encounter-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Swords, Edit, Trash2, Play } from "lucide-react";
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
  const { items: maps, loading: mapsLoading } = useCampaignMediaItems(campaignId, 'map');
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
    map_id?: string | null;
    active?: boolean;
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
      map_id?: string | null;
      active?: boolean;
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

  const handleStartEncounter = async (encounter: Encounter) => {
    const result = await updateEncounter(encounter.id, { active: true });
    if (result.success) {
      toast.success("Encounter started");
      refetchEncounters();
    } else {
      toast.error(result.error?.message || "Failed to start encounter");
    }
  };

  if (campaignLoading || encountersLoading || mapsLoading) {
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

  const getMapName = (mapId: string | null) => {
    if (!mapId) return null;
    return maps.find((m) => m.id === mapId)?.name || null;
  };

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
            const mapName = getMapName(encounter.map_id);
            return (
              <Card key={encounter.id}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {encounter.name || "Unnamed Encounter"}
                      </h3>
                      {mapName && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Map: {mapName}
                        </p>
                      )}
                    </div>
                    {encounter.active && (
                      <Badge variant="default" className="bg-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                  {encounter.active && (
                    <div className="text-sm text-muted-foreground">
                      Round {encounter.round_number}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    {isDm && (
                      <>
                        {!encounter.active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStartEncounter(encounter)}
                            className="flex-1"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingEncounter(encounter)}
                        >
                          <Edit className="h-4 w-4" />
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
        maps={maps}
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

