"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCampaignNPCs,
  useCreateNPC,
  useUpdateNPC,
  useDeleteNPC,
  type NPC,
} from "@/hooks/useCampaignContent";
import { useClasses, useRaces } from "@/hooks/useDndContent";
import { NPCFormDialog } from "@/components/campaign/npc-form-dialog";
import { NPCDetailsDialog } from "@/components/forge/npcs/npc-details-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, User, Edit, Trash2, EyeOff, Sparkles, Search } from "lucide-react";
import { AIGenerationDialog } from "@/components/ai/ai-generation-dialog";
import { useOllamaSafe } from "@/contexts/ollama-context";
import { parseNPCContent, type ParsedNPCData } from "@/lib/utils/ai-content-parser";
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
  const [viewingNPC, setViewingNPC] = useState<NPC | null>(null);
  const [deletingNPCId, setDeletingNPCId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<ParsedNPCData | null>(null);
  const [q, setQ] = useState("");

  const ollama = useOllamaSafe();
  const canUseAI = ollama?.settings.enabled && ollama?.isConnected;

  const { npcs, loading, refetch } = useCampaignNPCs(campaignId, isDm);
  const { classes } = useClasses(campaignId, null);
  const { races } = useRaces(campaignId, null);
  const { createNPC } = useCreateNPC();
  const { updateNPC } = useUpdateNPC();
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
    hidden_from_players?: boolean;
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
      hidden_from_players?: boolean;
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
      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="sc-card" style={{ padding: 0, overflow: "hidden" }}>
              <Skeleton className="h-32 w-full" />
              <div style={{ padding: 10 }}>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const filteredNpcs = q
    ? npcs.filter((n) => {
        const blob = `${n.name} ${n.description || ""} ${n.location || ""}`.toLowerCase();
        return blob.includes(q.toLowerCase());
      })
    : npcs;

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
            NPC Roster
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {npcs.length} character{npcs.length === 1 ? "" : "s"} — the living
            cast of your world
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
              New NPC
            </button>
          </div>
        )}
      </div>

      {npcs.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <div
            className="sc-input"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 10px",
              flex: 1,
              maxWidth: 360,
            }}
          >
            <Search size={13} style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder="Search NPCs..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 12.5,
                flex: 1,
                color: "var(--foreground)",
              }}
            />
          </div>
        </div>
      )}

      {npcs.length === 0 ? (
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
            <User size={48} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div>
              No NPCs yet.
              {isDm && " Create your first NPC to get started."}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 10,
          }}
        >
          {filteredNpcs.map((npc) => {
            const className = getNPCClassName(npc);
            const speciesName = getNPCSpeciesName(npc);
            return (
              <div
                key={npc.id}
                className="sc-card sc-card-hover"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                }}
                onClick={() => setViewingNPC(npc)}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    background: "var(--muted)",
                    overflow: "hidden",
                    flexShrink: 0,
                    position: "relative",
                  }}
                >
                  {npc.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={npc.image_url}
                      alt={npc.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background:
                          "linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, var(--card)), var(--card))",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <User
                        size={36}
                        style={{
                          color:
                            "color-mix(in srgb, var(--primary) 55%, transparent)",
                        }}
                      />
                    </div>
                  )}
                  {isDm && npc.hidden_from_players && (
                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
                        background: "rgba(0,0,0,0.6)",
                        borderRadius: 4,
                        padding: 4,
                      }}
                      title="Hidden from players"
                    >
                      <EyeOff size={12} style={{ color: "#facc15" }} />
                    </div>
                  )}
                </div>
                <div
                  style={{
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                    gap: 6,
                  }}
                >
                  <div
                    className="font-serif truncate"
                    style={{ fontSize: 14 }}
                    title={npc.name}
                  >
                    {npc.name}
                  </div>
                  {(className || speciesName) && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        flexWrap: "wrap",
                      }}
                    >
                      {speciesName && (
                        <span className="sc-badge" style={{ fontSize: 9 }}>
                          {speciesName}
                        </span>
                      )}
                      {className && (
                        <span className="sc-badge" style={{ fontSize: 9 }}>
                          {className}
                        </span>
                      )}
                    </div>
                  )}
                  {npc.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                        lineHeight: 1.45,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                      }}
                    >
                      {npc.description}
                    </div>
                  )}
                  {isDm && (
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        marginTop: "auto",
                        paddingTop: 6,
                      }}
                    >
                      <button
                        type="button"
                        className="sc-btn sc-btn-sm sc-btn-ghost"
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNPC(npc);
                        }}
                      >
                        <Edit size={11} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="sc-btn sc-btn-sm sc-btn-ghost"
                        style={{ color: "var(--destructive)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingNPCId(npc.id);
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {userId && (
        <NPCFormDialog
          open={createDialogOpen || editingNPC !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCreateDialogOpen(false);
              setEditingNPC(null);
              setAiGeneratedData(null);
            }
          }}
          campaignId={campaignId}
          userId={userId}
          npc={editingNPC}
          isDm={isDm}
          initialData={aiGeneratedData}
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

      <NPCDetailsDialog
        npc={viewingNPC}
        open={viewingNPC !== null}
        onOpenChange={(open) => !open && setViewingNPC(null)}
        classNameLabel={viewingNPC ? getNPCClassName(viewingNPC) || undefined : undefined}
        speciesLabel={viewingNPC ? getNPCSpeciesName(viewingNPC) || undefined : undefined}
      />

      {/* AI Generation Dialog */}
      <AIGenerationDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        generatorType="npc"
        title="Generate NPC with AI"
        description="Create a detailed NPC with personality, backstory, and plot hooks"
        campaignId={campaignId}
        onGenerated={(content) => {
          console.log('[NPCsTab] Received AI content, length:', content.length);
          // Parse the AI-generated content and pre-fill the form
          const parsedData = parseNPCContent(content);
          console.log('[NPCsTab] Parsed NPC data:', parsedData);
          
          setAiGeneratedData(parsedData);
          setAiDialogOpen(false);
          
          // Small timeout to ensure state updates propagate before opening the dialog
          setTimeout(() => {
            setCreateDialogOpen(true);
          }, 50);
        }}
      />
    </div>
  );
}

