"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, ScrollText, Sparkles } from "lucide-react";
import { AIGenerationDialog } from "@/components/ai/ai-generation-dialog";
import { useOllamaSafe } from "@/contexts/ollama-context";
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

interface QuestBoardTabProps {
  campaignId: string;
  isDm: boolean;
}

export function QuestBoardTab({ campaignId, isDm }: QuestBoardTabProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [deletingQuestId, setDeletingQuestId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const ollama = useOllamaSafe();
  const canUseAI = ollama?.settings.enabled && ollama?.isConnected;

  const { quests, loading, refetch } = useCampaignQuests(campaignId);
  const { createQuest } = useCreateQuest();
  const { updateQuest } = useUpdateQuest();
  const { deleteQuest, deleting } = useDeleteQuest();

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
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to create quest");
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
      steps?: Array<{
        id?: string;
        step_order: number;
        description?: string | null;
        objectives?: Array<{
          id?: string;
          objective_order: number;
          goal: string;
          status?: 'pending' | 'success' | 'failure';
        }>;
      }>;
    }
  ) => {
    const result = await updateQuest(questId, data);
    if (result.success) {
      toast.success("Quest updated successfully");
      setEditingQuest(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to update quest");
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingQuestId) return;
    const result = await deleteQuest(deletingQuestId);
    if (result.success) {
      toast.success("Quest deleted successfully");
      setDeletingQuestId(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to delete quest");
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="sc-card" style={{ padding: 14 }}>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div className="font-serif" style={{ fontSize: 20 }}>
            Quest Board
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {quests.length} quest{quests.length === 1 ? "" : "s"} — hooks, side
            quests, and long-term arcs
          </div>
        </div>
        {isDm && userId && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {canUseAI && (
              <button
                type="button"
                className="sc-btn sc-btn-sm"
                onClick={() => setAiDialogOpen(true)}
              >
                <Sparkles size={12} />
                AI
              </button>
            )}
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus size={12} />
              New quest
            </button>
          </div>
        )}
      </div>

      {quests.length === 0 ? (
        <div className="sc-card" style={{ padding: 40 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              color: "var(--muted-foreground)",
            }}
          >
            <ScrollText size={48} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div>
              No quests yet.
              {isDm && " Add your first quest to get started."}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12,
          }}
        >
          {quests.map((quest) => (
            <QuestNote
              key={quest.id}
              quest={quest}
              isDm={isDm}
              onEdit={isDm ? (q) => setEditingQuest(q) : undefined}
              onDelete={isDm ? (id) => setDeletingQuestId(id) : undefined}
              onUpdate={refetch}
            />
          ))}
        </div>
      )}

      {userId && (
        <QuestFormDialog
          isDm={isDm}
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

      {/* AI Generation Dialog */}
      <AIGenerationDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        generatorType="quest"
        title="Generate Quest with AI"
        description="Create a quest with hooks, objectives, complications, and rewards"
        onGenerated={(content) => {
          setAiDialogOpen(false);
          setCreateDialogOpen(true);
        }}
      />
    </div>
  );
}

