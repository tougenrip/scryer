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
import { Plus, User, Edit, Trash2, Sparkles, Search, Lock, MoreHorizontal } from "lucide-react";
import { ForgeTabHeader } from "@/components/forge/forge-tab-header";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <div className="forge-tab-root">
        <div className="sc-card overflow-hidden">
          <Skeleton className="h-10 w-full rounded-none" />
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-none border-t border-border" />
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

  const initials = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="forge-tab-root sc-fade-in">
      <ForgeTabHeader
        title="NPCs"
        subtitle={`${filteredNpcs.length} of ${npcs.length} shown`}
        actions={
          isDm && userId ? (
            <>
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
                NPC
              </button>
            </>
          ) : null
        }
      />

      {npcs.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320 }}>
            <Search
              size={12}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-foreground)",
              }}
            />
            <input
              className="sc-input"
              placeholder="Search NPCs…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 12 }}
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
        <div className="sc-card overflow-hidden">
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--muted)", color: "var(--muted-foreground)", textAlign: "left" }}>
                  {(["Name", "Class", "Species", "Location", "Hook"] as const).map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        fontWeight: 600,
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                  {isDm && (
                    <th style={{ padding: "10px 14px", width: 48, textAlign: "right" }} aria-label="Actions" />
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredNpcs.map((npc, i) => {
                  const className = getNPCClassName(npc);
                  const speciesName = getNPCSpeciesName(npc);
                  const hook = npc.description?.trim() || npc.notes?.trim() || "—";
                  return (
                    <tr
                      key={npc.id}
                      className="sc-card-hover cursor-pointer"
                      style={{
                        borderTop: i === 0 ? "none" : "1px solid var(--border)",
                      }}
                      onClick={() => setViewingNPC(npc)}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background:
                                "color-mix(in srgb, var(--primary) 24%, var(--muted))",
                              color: "var(--primary-foreground, #fff)",
                              display: "grid",
                              placeItems: "center",
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "var(--font-serif)",
                              overflow: "hidden",
                              flexShrink: 0,
                            }}
                          >
                            {npc.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={npc.image_url}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : (
                              initials(npc.name)
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                            <span style={{ fontWeight: 500 }}>{npc.name}</span>
                            {isDm && npc.hidden_from_players && (
                              <span style={{ fontSize: 10, color: "var(--destructive)" }}>
                                <Lock size={9} className="inline mr-0.5" />
                                DM-only
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        {className ? (
                          <span className="sc-badge sc-badge-primary" style={{ fontSize: 10 }}>
                            {className}
                          </span>
                        ) : (
                          <span style={{ color: "var(--muted-foreground)" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--muted-foreground)" }}>
                        {speciesName || "—"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--muted-foreground)" }}>
                        {npc.location?.trim() || "—"}
                      </td>
                      <td
                        style={{
                          padding: "12px 14px",
                          color: "var(--muted-foreground)",
                          maxWidth: 280,
                        }}
                        className="truncate"
                        title={hook}
                      >
                        {hook}
                      </td>
                      {isDm && (
                        <td
                          style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "middle" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon"
                                aria-label="NPC actions"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[10rem]">
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNPC(npc);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingNPCId(npc.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

