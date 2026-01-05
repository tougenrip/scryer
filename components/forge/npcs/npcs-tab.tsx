"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

interface NPCsTabProps {
  campaignId: string;
  isDm: boolean;
}

export function NPCsTab({ campaignId, isDm }: NPCsTabProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);
  const [deletingNPCId, setDeletingNPCId] = useState<string | null>(null);

  const { npcs, loading, refetch } = useCampaignNPCs(campaignId);
  const { createNPC } = useCreateNPC();
  const { updateNPC } = useUpdateNPC();
  const { deleteNPC, deleting } = useDeleteNPC();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, []);

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
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to create NPC");
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
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to update NPC");
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingNPCId) return;
    const result = await deleteNPC(deletingNPCId);
    if (result.success) {
      toast.success("NPC deleted successfully");
      setDeletingNPCId(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to delete NPC");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-64">
            <CardContent className="p-0">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">NPCs</h2>
          <p className="text-muted-foreground text-sm">
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
            <Card key={npc.id} className="overflow-hidden flex flex-col h-full">
              <CardContent className="p-0 flex flex-col h-full">
                <div className="w-full aspect-square bg-muted overflow-hidden flex-shrink-0">
                  {npc.image_url ? (
                    <img
                      src={npc.image_url}
                      alt={npc.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <User className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1 min-h-0">
                  <div className="space-y-3 flex-1">
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
                  </div>
                  {isDm && (
                    <div className="flex items-center gap-2 pt-4 mt-auto">
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

