"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCampaignBounties,
  useCreateBounty,
  useUpdateBounty,
  useDeleteBounty,
  type Bounty,
} from "@/hooks/useCampaignContent";
import { BountyCard } from "@/components/forge/bounties/bounty-card";
import { BountyFormDialog } from "@/components/forge/bounties/bounty-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";
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

interface BountiesTabProps {
  campaignId: string;
  isDm: boolean;
}

export function BountiesTab({ campaignId, isDm }: BountiesTabProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBounty, setEditingBounty] = useState<Bounty | null>(null);
  const [deletingBountyId, setDeletingBountyId] = useState<string | null>(null);

  const { bounties, loading, refetch } = useCampaignBounties(campaignId, isDm);
  const { createBounty } = useCreateBounty();
  const { updateBounty } = useUpdateBounty();
  const { deleteBounty, loading: deleting } = useDeleteBounty();

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
    title: string;
    target_name: string;
    target_type?: 'npc' | 'monster' | 'other';
    target_npc_id?: string | null;
    description?: string | null;
    reward?: string | null;
    status?: 'available' | 'claimed' | 'completed';
    location?: string | null;
    posted_by?: string | null;
    hidden_from_players?: boolean;
    dm_notes?: string | null;
    created_by: string;
  }) => {
    const result = await createBounty(data);
    if (result.success) {
      toast.success("Bounty added successfully");
      setCreateDialogOpen(false);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to create bounty");
    }
    return { success: true };
  };

  const handleUpdate = async (
    bountyId: string,
    data: {
      title?: string;
      target_name?: string;
      target_type?: 'npc' | 'monster' | 'other';
      target_npc_id?: string | null;
      description?: string | null;
      reward?: string | null;
      status?: 'available' | 'claimed' | 'completed';
      location?: string | null;
      posted_by?: string | null;
      hidden_from_players?: boolean;
      dm_notes?: string | null;
    }
  ) => {
    const result = await updateBounty(bountyId, data);
    if (result.success) {
      toast.success("Bounty updated successfully");
      setEditingBounty(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to update bounty");
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingBountyId) return;
    const result = await deleteBounty(deletingBountyId);
    if (result.success) {
      toast.success("Bounty deleted successfully");
      setDeletingBountyId(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to delete bounty");
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

  // Filter bounties by status for display
  const availableBounties = bounties.filter(b => b.status === 'available');
  const claimedBounties = bounties.filter(b => b.status === 'claimed');
  const completedBounties = bounties.filter(b => b.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Bounty Board</h2>
          <p className="text-muted-foreground text-sm">
            Track bounties on NPCs, monsters, and other targets
          </p>
        </div>
        {isDm && userId && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bounty
          </Button>
        )}
      </div>

      {bounties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No bounties yet. {isDm && "Add your first bounty to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Available Bounties */}
          {availableBounties.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Available</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {availableBounties.map((bounty) => (
                  <BountyCard
                    key={bounty.id}
                    bounty={bounty}
                    isDm={isDm}
                    onEdit={isDm ? (b) => setEditingBounty(b) : undefined}
                    onDelete={isDm ? (id) => setDeletingBountyId(id) : undefined}
                    onStatusChange={isDm ? (id, status) => handleUpdate(id, { status }) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Claimed Bounties */}
          {claimedBounties.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Claimed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {claimedBounties.map((bounty) => (
                  <BountyCard
                    key={bounty.id}
                    bounty={bounty}
                    isDm={isDm}
                    onEdit={isDm ? (b) => setEditingBounty(b) : undefined}
                    onDelete={isDm ? (id) => setDeletingBountyId(id) : undefined}
                    onStatusChange={isDm ? (id, status) => handleUpdate(id, { status }) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Bounties */}
          {completedBounties.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Completed</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {completedBounties.map((bounty) => (
                  <BountyCard
                    key={bounty.id}
                    bounty={bounty}
                    isDm={isDm}
                    onEdit={isDm ? (b) => setEditingBounty(b) : undefined}
                    onDelete={isDm ? (id) => setDeletingBountyId(id) : undefined}
                    onStatusChange={isDm ? (id, status) => handleUpdate(id, { status }) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {userId && (
        <BountyFormDialog
          isDm={isDm}
          open={createDialogOpen || editingBounty !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingBounty(null);
            }
          }}
          campaignId={campaignId}
          userId={userId}
          bounty={editingBounty}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      <AlertDialog
        open={deletingBountyId !== null}
        onOpenChange={(open) => !open && setDeletingBountyId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bounty</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bounty? This action cannot be undone.
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

