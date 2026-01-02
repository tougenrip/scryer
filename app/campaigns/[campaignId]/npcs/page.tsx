"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  const campaignId = params.campaignId as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);
  const [deletingNPCId, setDeletingNPCId] = useState<string | null>(null);

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { npcs, loading: npcsLoading, refetch: refetchNPCs } = useCampaignNPCs(campaignId);
  const { createNPC, loading: creating } = useCreateNPC();
  const { updateNPC, loading: updating } = useUpdateNPC();
  const { deleteNPC, loading: deleting } = useDeleteNPC();

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {npcs.map((npc) => (
            <Card key={npc.id}>
              <CardContent className="p-6 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{npc.name}</h3>
                  {npc.location && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Location: {npc.location}
                    </p>
                  )}
                </div>
                {npc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {npc.description}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  {isDm && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingNPC(npc)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingNPCId(npc.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
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

