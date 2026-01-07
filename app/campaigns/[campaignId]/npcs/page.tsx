"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign } from "@/hooks/useCampaigns";
import {
  useCampaignNPCs,
  useCreateNPC,
  useUpdateNPC,
  useDeleteNPC,
  type NPC,
} from "@/hooks/useCampaignContent";
import { useClasses, useRaces } from "@/hooks/useDndContent";
import { NPCFormDialog } from "@/components/campaign/npc-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, User, Edit, Trash2 } from "lucide-react";
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

export default function NPCsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;

  useEffect(() => {
    router.replace(`/campaigns/${campaignId}/forge?tab=npcs`);
  }, [campaignId, router]);

  return null;
  const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);
  const [deletingNPCId, setDeletingNPCId] = useState<string | null>(null);

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { npcs, loading: npcsLoading, refetch: refetchNPCs } = useCampaignNPCs(campaignId);
  const { classes } = useClasses(campaignId, null);
  const { races } = useRaces(campaignId, null);
  const { createNPC } = useCreateNPC(); // loading: creating unused
  const { updateNPC } = useUpdateNPC(); // loading: updating unused
  const { deleteNPC, loading: deleting } = useDeleteNPC();

  // Helper function to get class name from NPC
  const getNPCClassName = (npc: NPC): string | null => {
    if (npc.custom_class) return npc.custom_class;
    if (npc.class_source && npc.class_index) {
      const classData = classes.find(
        (c) => c.source === npc.class_source && c.index === npc.class_index
      );
      return classData?.name || null;
    }
    return null;
  };

  // Helper function to get species name from NPC
  const getNPCSpeciesName = (npc: NPC): string | null => {
    if (npc.custom_species) return npc.custom_species;
    if (npc.species_source && npc.species_index) {
      const raceData = races.find(
        (r) => r.source === npc.species_source && r.index === npc.species_index
      );
      return raceData?.name || null;
    }
    return null;
  };

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
    name: string;
    description?: string | null;
    appearance?: string | null;
    personality?: string | null;
    background?: string | null;
    location?: string | null;
    notes?: string | null;
    image_url?: string | null;
    created_by: string;
  }) => {
    const result = await createNPC(data);
    if (result.success) {
      toast.success("NPC created successfully");
      setCreateDialogOpen(false);
      refetchNPCs();
    } else {
      toast.error(result.error?.message || "Failed to create NPC");
      return result;
    }
    return { success: true };
  };

  const handleUpdate = async (
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
    }
  ) => {
    const result = await updateNPC(npcId, data);
    if (result.success) {
      toast.success("NPC updated successfully");
      setEditingNPC(null);
      refetchNPCs();
    } else {
      toast.error(result.error?.message || "Failed to update NPC");
      return result;
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingNPCId) return;
    const result = await deleteNPC(deletingNPCId);
    if (result.success) {
      toast.success("NPC deleted successfully");
      setDeletingNPCId(null);
      refetchNPCs();
    } else {
      toast.error(result.error?.message || "Failed to delete NPC");
    }
  };

  if (campaignLoading || npcsLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="h-48">
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
          <h1 className="font-serif text-3xl font-bold">NPCs</h1>
          <p className="text-muted-foreground mt-1">
            Manage non-player characters for your campaign
          </p>
        </div>
        {isDm && userId && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create NPC
          </Button>
        )}
      </div>

      {/* NPCs Grid */}
      {npcs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No NPCs yet. {isDm && "Create your first NPC to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {npcs.map((npc) => (
            <Card key={npc.id} className="overflow-hidden flex flex-col h-full">
              <CardContent className="p-0 flex flex-col h-full">
                {/* Image */}
                <div className="w-full aspect-square bg-muted overflow-hidden flex-shrink-0">
                  {npc.image_url ? (
                    <img
                      src={npc.image_url}
                      alt={npc.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                </div>
                {/* Content */}
                <div className="p-3 flex flex-col flex-1 min-h-0">
                  <div className="space-y-2 flex-1">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{npc.name}</h3>
                    </div>
                    {npc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {npc.description}
                      </p>
                    )}
                    {getNPCClassName(npc) && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Class:</span> {getNPCClassName(npc)}
                      </p>
                    )}
                    {getNPCSpeciesName(npc) && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Species:</span> {getNPCSpeciesName(npc)}
                      </p>
                    )}
                  </div>
                  {isDm && (
                    <div className="flex items-center gap-1.5 pt-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingNPC(npc)}
                        className="flex-1 h-7 text-xs px-2"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingNPCId(npc.id)}
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      {userId && (
        <NPCFormDialog
          open={createDialogOpen || editingNPC !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingNPC(null);
            }
          }}
          campaignId={campaignId}
          userId={userId}
          npc={editingNPC}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingNPCId !== null}
        onOpenChange={(open) => !open && setDeletingNPCId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete NPC</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this NPC? This action cannot be undone.
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

