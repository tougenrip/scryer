"use client";

import { useEffect, useState } from "react";
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
import { Plus, Target, Sparkles } from "lucide-react";
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

interface BountiesTabProps {
  campaignId: string;
  isDm: boolean;
}

export function BountiesTab({ campaignId, isDm }: BountiesTabProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBounty, setEditingBounty] = useState<Bounty | null>(null);
  const [deletingBountyId, setDeletingBountyId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const ollama = useOllamaSafe();
  const canUseAI = ollama?.settings.enabled && ollama?.isConnected;

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
      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="sc-card" style={{ padding: 14 }}>
              <Skeleton className="h-48 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const availableBounties = bounties.filter((b) => b.status === "available");
  const claimedBounties = bounties.filter((b) => b.status === "claimed");
  const completedBounties = bounties.filter((b) => b.status === "completed");

  const renderSection = (title: string, list: typeof bounties, accent: string) => (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: accent,
          }}
        />
        <div className="sc-label">{title}</div>
        <div
          style={{
            fontSize: 11,
            color: "var(--muted-foreground)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {list.length}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {list.map((bounty) => (
          <BountyCard
            key={bounty.id}
            bounty={bounty}
            isDm={isDm}
            onEdit={isDm ? (b) => setEditingBounty(b) : undefined}
            onDelete={isDm ? (id) => setDeletingBountyId(id) : undefined}
            onStatusChange={
              isDm
                ? (id, status) => handleUpdate(id, { status })
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );

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
            The Bounty Board
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {bounties.length} posting{bounties.length === 1 ? "" : "s"} — track
            targets, rewards, and claims
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
              Post bounty
            </button>
          </div>
        )}
      </div>

      {bounties.length === 0 ? (
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
            <Target size={48} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div>
              No bounties yet.
              {isDm && " Add your first bounty to get started."}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {availableBounties.length > 0 &&
            renderSection("Available", availableBounties, "#d6a85a")}
          {claimedBounties.length > 0 &&
            renderSection("Claimed", claimedBounties, "var(--primary)")}
          {completedBounties.length > 0 &&
            renderSection("Completed", completedBounties, "var(--muted-foreground)")}
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

      {/* AI Generation Dialog */}
      <AIGenerationDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        generatorType="bounty"
        title="Generate Bounty with AI"
        description="Create a bounty posting with target, reward, and complications"
        onGenerated={(content) => {
          setAiDialogOpen(false);
          setCreateDialogOpen(true);
        }}
      />
    </div>
  );
}

