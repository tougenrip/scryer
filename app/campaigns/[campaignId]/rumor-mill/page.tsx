"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign } from "@/hooks/useCampaigns";
import {
  useCampaignRumors,
  useCreateRumor,
  useUpdateRumor,
  useDeleteRumor,
  type Rumor,
} from "@/hooks/useCampaignContent";
import { RumorNote } from "@/components/campaign/rumor-note";
import { RumorFormDialog } from "@/components/campaign/rumor-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, ScrollText } from "lucide-react";
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

export default function RumorMillPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingRumor, setEditingRumor] = useState<Rumor | null>(null);
  const [deletingRumorId, setDeletingRumorId] = useState<string | null>(null);

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { rumors, loading: rumorsLoading, refetch: refetchRumors } = useCampaignRumors(campaignId);
  const { createRumor, loading: creating } = useCreateRumor();
  const { updateRumor, loading: updating } = useUpdateRumor();
  const { deleteRumor, loading: deleting } = useDeleteRumor();

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
    title: string;
    content: string;
    source?: string | null;
    location?: string | null;
    verified?: boolean;
    created_by: string;
  }) => {
    const result = await createRumor(data);
    if (result.success) {
      toast.success("Rumor added successfully");
      setCreateDialogOpen(false);
      refetchRumors();
    } else {
      toast.error(result.error?.message || "Failed to create rumor");
      return result;
    }
    return { success: true };
  };

  const handleUpdate = async (
    rumorId: string,
    data: {
      title?: string;
      content?: string;
      source?: string | null;
      location?: string | null;
      verified?: boolean;
    }
  ) => {
    const result = await updateRumor(rumorId, data);
    if (result.success) {
      toast.success("Rumor updated successfully");
      setEditingRumor(null);
      refetchRumors();
    } else {
      toast.error(result.error?.message || "Failed to update rumor");
      return result;
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingRumorId) return;
    const result = await deleteRumor(deletingRumorId);
    if (result.success) {
      toast.success("Rumor deleted successfully");
      setDeletingRumorId(null);
      refetchRumors();
    } else {
      toast.error(result.error?.message || "Failed to delete rumor");
    }
  };

  if (campaignLoading || rumorsLoading) {
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
          <h1 className="font-serif text-3xl font-bold">Rumor Mill</h1>
          <p className="text-muted-foreground mt-1">
            Gossip, rumors, and side quests circulating in the campaign
          </p>
        </div>
        {isDm && userId && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rumor
          </Button>
        )}
      </div>

      {/* Corkboard/Notice Board */}
      <div
        className="relative p-8 rounded-lg border-4"
        style={{
          background: `
            linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #8B4513 100%),
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(0, 0, 0, 0.1) 10px,
              rgba(0, 0, 0, 0.1) 20px
            )
          `,
          backgroundBlendMode: "multiply",
          borderColor: "#654321",
          boxShadow: `
            inset 0 2px 4px rgba(0, 0, 0, 0.3),
            0 4px 8px rgba(0, 0, 0, 0.2),
            0 0 0 2px rgba(101, 67, 33, 0.5)
          `,
        }}
      >
        {/* Corkboard texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='cork' x='0' y='0' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1' fill='%23000' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23cork)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Rumors Grid */}
        {rumors.length === 0 ? (
          <div className="relative z-10 flex flex-col items-center justify-center py-16">
            <ScrollText className="h-16 w-16 text-amber-200/50 mb-4" />
            <p className="text-amber-100 text-center">
              No rumors yet. {isDm && "Add your first rumor to get started."}
            </p>
          </div>
        ) : (
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {rumors.map((rumor) => (
              <div key={rumor.id} className="h-64">
                <RumorNote
                  rumor={rumor}
                  isDm={isDm}
                  onEdit={isDm ? (r) => setEditingRumor(r) : undefined}
                  onDelete={isDm ? (id) => setDeletingRumorId(id) : undefined}
                />
              </div>
            ))}
          </div>
        )}

        {/* Push pins decoration */}
        <div className="absolute top-4 left-4 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute bottom-4 left-4 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
        <div className="absolute bottom-4 right-4 w-3 h-3 rounded-full bg-red-600 shadow-lg" />
      </div>

      {/* Create/Edit Dialog */}
      {userId && (
        <RumorFormDialog
          open={createDialogOpen || editingRumor !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingRumor(null);
            }
          }}
          campaignId={campaignId}
          userId={userId}
          rumor={editingRumor}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingRumorId !== null}
        onOpenChange={(open) => !open && setDeletingRumorId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rumor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this rumor? This action cannot be undone.
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

