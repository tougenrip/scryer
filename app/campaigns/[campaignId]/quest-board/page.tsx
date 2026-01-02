"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign } from "@/hooks/useCampaigns";
import {
  useCampaignQuests,
  useCreateQuest,
  useUpdateQuest,
  useDeleteQuest,
  type Quest,
} from "@/hooks/useCampaignContent";
import { QuestNote } from "@/components/campaign/quest-note";
import { QuestFormDialog } from "@/components/campaign/quest-form-dialog";
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

export default function QuestBoardPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [deletingQuestId, setDeletingQuestId] = useState<string | null>(null);

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { quests, loading: questsLoading, refetch: refetchQuests } = useCampaignQuests(campaignId);
  const { createQuest } = useCreateQuest();
  const { updateQuest } = useUpdateQuest();
  const { deleteQuest, loading: deleting } = useDeleteQuest();

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
    const result = await createQuest(data);
    if (result.success) {
      toast.success("Quest added successfully");
      setCreateDialogOpen(false);
      refetchQuests();
    } else {
      toast.error(result.error?.message || "Failed to create quest");
      return result;
    }
    return { success: true };
  };

  const handleUpdate = async (
    questId: string,
    data: {
      title?: string;
      content?: string;
      source?: string | null;
      location?: string | null;
      verified?: boolean;
    }
  ) => {
    const result = await updateQuest(questId, data);
    if (result.success) {
      toast.success("Quest updated successfully");
      setEditingQuest(null);
      refetchQuests();
    } else {
      toast.error(result.error?.message || "Failed to update quest");
      return result;
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingQuestId) return;
    const result = await deleteQuest(deletingQuestId);
    if (result.success) {
      toast.success("Quest deleted successfully");
      setDeletingQuestId(null);
      refetchQuests();
    } else {
      toast.error(result.error?.message || "Failed to delete quest");
    }
  };

  if (campaignLoading || questsLoading) {
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
          <h1 className="font-serif text-3xl font-bold">Quest Board</h1>
          <p className="text-muted-foreground mt-1">
            Quests and side quests available in the campaign
          </p>
        </div>
        {isDm && userId && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Quest
          </Button>
        )}
      </div>

      {/* Quest Board Grid */}
      {quests.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-12">
                <ScrollText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  No quests yet. {isDm && "Add your first quest to get started."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {quests.map((quest) => (
              <div key={quest.id} className="h-64">
                <QuestNote
                  quest={quest}
                  isDm={isDm}
                  onEdit={isDm ? (q) => setEditingQuest(q) : undefined}
                  onDelete={isDm ? (id) => setDeletingQuestId(id) : undefined}
                />
              </div>
            ))}
          </div>
        )}

      {/* Create/Edit Dialog */}
      {userId && (
        <QuestFormDialog
          open={createDialogOpen || editingQuest !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingQuest(null);
            }
          }}
          campaignId={campaignId}
          userId={userId}
          quest={editingQuest}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingQuestId !== null}
        onOpenChange={(open) => !open && setDeletingQuestId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quest</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quest? This action cannot be undone.
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

