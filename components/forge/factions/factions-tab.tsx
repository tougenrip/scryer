"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Users,
  Edit,
  Trash2,
  Search,
  Sparkles,
  Shield,
} from "lucide-react";
import { AIGenerationDialog } from "@/components/ai/ai-generation-dialog";
import { useOllamaSafe } from "@/contexts/ollama-context";
import {
  useFactions,
  useCreateFaction,
  useUpdateFaction,
  useDeleteFaction,
  type Faction,
} from "@/hooks/useForgeContent";
import { toast } from "sonner";
import { FactionFormDialog } from "./faction-form-dialog";
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

const INFLUENCE_PCT: Record<string, number> = {
  local: 20,
  regional: 45,
  continental: 68,
  global: 88,
  multiverse: 100,
};

const TYPE_COLOR: Record<string, string> = {
  kingdom: "#5b9bd5",
  political: "#5b9bd5",
  military: "#c87b5a",
  military_unit: "#c87b5a",
  guild: "#d6a85a",
  company: "#d6a85a",
  church: "#b583e0",
  religious: "#b583e0",
  arcane: "#b583e0",
  criminal: "var(--destructive)",
  cult: "var(--destructive)",
  tribe: "#7ec27e",
  family: "#7ec27e",
  organization: "#7ab0d6",
  secret_society: "#9d79c9",
  academy: "#6bc4b2",
  other: "var(--primary)",
};

const factionColor = (type: Faction["type"]) =>
  (type && TYPE_COLOR[type]) || "var(--primary)";

interface FactionsTabProps {
  campaignId: string;
  isDm: boolean;
}

export function FactionsTab({ campaignId, isDm }: FactionsTabProps) {
  const { factions, loading, refetch } = useFactions(campaignId);
  const { createFaction, loading: creating } = useCreateFaction();
  const { updateFaction, loading: updating } = useUpdateFaction();
  const { deleteFaction, loading: deleting } = useDeleteFaction();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingFaction, setEditingFaction] = useState<Faction | null>(null);
  const [deletingFactionId, setDeletingFactionId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const ollama = useOllamaSafe();
  const canUseAI = ollama?.settings.enabled && ollama?.isConnected;

  const handleCreate = async (data: {
    name: string;
    type: Faction['type'];
    description?: string | null;
    headquarters_location_id?: string | null;
    leader_name?: string | null;
    leader_npc_id?: string | null;
    alignment?: Faction['alignment'] | null;
    goals?: string[];
    resources?: string[];
    influence_level?: Faction['influence_level'] | null;
    emblem_sigil_url?: string | null;
    motto_creed?: string | null;
    public_agenda?: string | null;
    secret_agenda?: string | null;
  }) => {
    const result = await createFaction({
      campaign_id: campaignId,
      ...data,
    });
    if (result.success) {
      toast.success("Faction created successfully");
      setCreateDialogOpen(false);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to create faction");
    }
  };

  const handleUpdate = async (data: {
    name: string;
    type: Faction['type'];
    description?: string | null;
    headquarters_location_id?: string | null;
    leader_name?: string | null;
    leader_npc_id?: string | null;
    alignment?: Faction['alignment'] | null;
    goals?: string[];
    resources?: string[];
    influence_level?: Faction['influence_level'] | null;
    emblem_sigil_url?: string | null;
    motto_creed?: string | null;
    public_agenda?: string | null;
    secret_agenda?: string | null;
  }) => {
    if (!editingFaction) return;
    const result = await updateFaction(editingFaction.id, data);
    if (result.success) {
      toast.success("Faction updated successfully");
      setEditingFaction(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to update faction");
    }
  };

  const handleDelete = async () => {
    if (!deletingFactionId) return;
    const result = await deleteFaction(deletingFactionId);
    if (result.success) {
      toast.success("Faction deleted successfully");
      setDeletingFactionId(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to delete faction");
    }
  };

  const filteredFactions = factions.filter(faction =>
    faction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (faction.type?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    (faction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    (faction.motto_creed?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    (faction.leader_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    (faction.alignment?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    faction.goals.some(goal => goal.toLowerCase().includes(searchQuery.toLowerCase())) ||
    faction.resources.some(resource => resource.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 12,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="sc-card" style={{ padding: 16 }}>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-16 w-full" />
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
            Factions
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {filteredFactions.length} of {factions.length} organization
            {factions.length === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
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
              placeholder="Search factions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, width: 220, fontSize: 12 }}
            />
          </div>
          {isDm && canUseAI && (
            <button
              type="button"
              className="sc-btn sc-btn-sm"
              onClick={() => setAiDialogOpen(true)}
            >
              <Sparkles size={12} />
              AI
            </button>
          )}
          {isDm && (
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus size={12} />
              Faction
            </button>
          )}
        </div>
      </div>

      {factions.length === 0 ? (
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
            <Users size={48} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div>
              No factions yet.
              {isDm && " Add your first faction to get started."}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 12,
          }}
        >
          {filteredFactions.map((faction) => {
            const color = factionColor(faction.type);
            const influencePct = faction.influence_level
              ? INFLUENCE_PCT[faction.influence_level] || 40
              : 30;
            const typeLabel = faction.type
              ? faction.type.replace(/_/g, " ")
              : "Unaffiliated";
            return (
              <div
                key={faction.id}
                className="sc-card sc-card-hover"
                style={{
                  padding: 16,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: color,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 8,
                    gap: 10,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 3,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 5,
                          background: `color-mix(in srgb, ${color} 25%, var(--muted))`,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {faction.emblem_sigil_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={faction.emblem_sigil_url}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <Shield size={13} style={{ color }} />
                        )}
                      </div>
                      <span
                        className="font-serif truncate"
                        style={{ fontSize: 15 }}
                      >
                        {faction.name}
                      </span>
                    </div>
                    <div
                      className="truncate"
                      style={{
                        fontSize: 11,
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {faction.leader_name && `Led by ${faction.leader_name}`}
                      {faction.leader_name && faction.alignment && " · "}
                      {faction.alignment}
                    </div>
                  </div>
                  <span
                    className="sc-badge"
                    style={{
                      background: `color-mix(in srgb, ${color} 18%, transparent)`,
                      color,
                      borderColor: "transparent",
                      fontSize: 9,
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {typeLabel}
                  </span>
                </div>
                {(faction.description || faction.motto_creed) && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      lineHeight: 1.55,
                      marginBottom: 12,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 2,
                      overflow: "hidden",
                      fontStyle: faction.description ? "normal" : "italic",
                    }}
                  >
                    {faction.description ||
                      (faction.motto_creed ? `“${faction.motto_creed}”` : "")}
                  </div>
                )}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: "var(--muted-foreground)",
                      marginBottom: 4,
                      textTransform: "capitalize",
                    }}
                  >
                    <span>Influence</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {faction.influence_level || "—"}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "var(--muted)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${influencePct}%`,
                        height: "100%",
                        background: color,
                      }}
                    />
                  </div>
                </div>
                {isDm && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <button
                      type="button"
                      className="sc-btn sc-btn-sm sc-btn-ghost"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setEditingFaction(faction)}
                    >
                      <Edit size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="sc-btn sc-btn-sm sc-btn-ghost"
                      style={{ color: "var(--destructive)" }}
                      onClick={() => setDeletingFactionId(faction.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <FactionFormDialog
        open={createDialogOpen || editingFaction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingFaction(null);
          }
        }}
        faction={editingFaction}
        campaignId={campaignId}
        onSave={editingFaction ? handleUpdate : handleCreate}
        loading={creating || updating}
        isDm={isDm}
      />

      <AlertDialog open={deletingFactionId !== null} onOpenChange={(open) => !open && setDeletingFactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this faction? This action cannot be undone.
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
        generatorType="faction"
        title="Generate Faction with AI"
        description="Create a faction with structure, goals, and political influence"
        onGenerated={(content) => {
          setAiDialogOpen(false);
          setCreateDialogOpen(true);
        }}
      />
    </div>
  );
}

