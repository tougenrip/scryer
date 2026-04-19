"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCampaignEncounters,
  useCreateEncounter,
  useUpdateEncounter,
  useDeleteEncounter,
  type Encounter,
} from "@/hooks/useCampaignContent";
import { useMonsters } from "@/hooks/useDndContent";
import { EncounterFormDialog } from "@/components/campaign/encounter-form-dialog";
import {
  calculateEncounterStats,
  type EncounterMonster,
  type Difficulty,
} from "@/lib/utils/encounter-calculator";
import { toast } from "sonner";
import { Plus, Swords, Edit, Trash2, Sparkles } from "lucide-react";
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

interface EncountersTabProps {
  campaignId: string;
  isDm: boolean;
}

export function EncountersTab({ campaignId, isDm }: EncountersTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(null);
  const [deletingEncounterId, setDeletingEncounterId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);

  const ollama = useOllamaSafe();
  const canUseAI = ollama?.settings.enabled && ollama?.isConnected;

  const { encounters, loading, refetch } = useCampaignEncounters(campaignId);
  const { monsters } = useMonsters(campaignId);
  const { createEncounter } = useCreateEncounter();
  const { updateEncounter } = useUpdateEncounter();
  const { deleteEncounter, deleting } = useDeleteEncounter();

  // Default party stats for difficulty calculation
  const defaultPartySize = 4;
  const defaultPartyLevel = 5;

  const getDifficultyColor = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case "Easy":
        return "#4ade80";
      case "Medium":
        return "#facc15";
      case "Hard":
        return "#fb923c";
      case "Deadly":
        return "#f87171";
      default:
        return "var(--muted-foreground)";
    }
  };

  const handleCreate = async (data: {
    campaign_id: string;
    name?: string | null;
    monsters?: Array<{
      monster_source: 'srd' | 'homebrew';
      monster_index: string;
      quantity: number;
    }> | null;
  }) => {
    const result = await createEncounter(data);
    if (result.success) {
      toast.success("Encounter created successfully");
      setCreateDialogOpen(false);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to create encounter");
    }
    return { success: true };
  };

  const handleUpdate = async (
    encounterId: string,
    data: {
      name?: string | null;
      monsters?: Array<{
        monster_source: 'srd' | 'homebrew';
        monster_index: string;
        quantity: number;
      }> | null;
    }
  ) => {
    const result = await updateEncounter(encounterId, data);
    if (result.success) {
      toast.success("Encounter updated successfully");
      setEditingEncounter(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to update encounter");
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingEncounterId) return;
    const result = await deleteEncounter(deletingEncounterId);
    if (result.success) {
      toast.success("Encounter deleted successfully");
      setDeletingEncounterId(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to delete encounter");
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
              <Skeleton className="h-6 w-40 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
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
            Encounter Builder
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {encounters.length} encounter{encounters.length === 1 ? "" : "s"} —
            balanced combat set pieces
          </div>
        </div>
        {isDm && (
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
              New encounter
            </button>
          </div>
        )}
      </div>

      {encounters.length === 0 ? (
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
            <Swords size={48} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div>
              No encounters yet.
              {isDm && " Create your first encounter to get started."}
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
          {encounters.map((encounter) => {
            const encounterMonsters: EncounterMonster[] =
              encounter.monsters && encounter.monsters.length > 0
                ? encounter.monsters
                    .map((savedMonster) => {
                      const monster = monsters.find(
                        (m) =>
                          m.index === savedMonster.monster_index &&
                          m.source === savedMonster.monster_source,
                      );
                      return monster
                        ? { monster, quantity: savedMonster.quantity }
                        : null;
                    })
                    .filter((m): m is EncounterMonster => m !== null)
                : [];

            const encounterStats =
              encounterMonsters.length > 0
                ? calculateEncounterStats(
                    encounterMonsters,
                    defaultPartySize,
                    defaultPartyLevel,
                  )
                : null;

            const totalMonsters = encounterMonsters.reduce(
              (sum, m) => sum + m.quantity,
              0,
            );

            const diffColor = encounterStats
              ? getDifficultyColor(encounterStats.difficulty)
              : "var(--muted-foreground)";

            return (
              <div
                key={encounter.id}
                className="sc-card sc-card-hover"
                style={{ padding: 14, position: "relative", overflow: "hidden" }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: diffColor,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div
                    className="font-serif truncate"
                    style={{ fontSize: 16, flex: 1, minWidth: 0 }}
                  >
                    {encounter.name || "Unnamed Encounter"}
                  </div>
                  {encounterStats && (
                    <span
                      className="sc-badge"
                      style={{
                        background: `color-mix(in srgb, ${diffColor} 18%, transparent)`,
                        color: diffColor,
                        borderColor: "transparent",
                        fontSize: 10,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {encounterStats.difficulty}
                    </span>
                  )}
                </div>

                {encounterMonsters.length > 0 ? (
                  <div
                    style={{
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <div className="sc-label" style={{ marginBottom: 6 }}>
                      Creatures · {totalMonsters}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        maxHeight: 120,
                        overflowY: "auto",
                      }}
                    >
                      {encounterMonsters.map(({ monster, quantity }, idx) => (
                        <div
                          key={`${monster.source}-${monster.index}-${idx}`}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                          }}
                        >
                          <span
                            className="truncate"
                            style={{ flex: 1, minWidth: 0 }}
                          >
                            {quantity > 1 && (
                              <span style={{ fontWeight: 600, marginRight: 4 }}>
                                {quantity}×
                              </span>
                            )}
                            {monster.name}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              color: "var(--muted-foreground)",
                              marginLeft: 8,
                              whiteSpace: "nowrap",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            CR {monster.challenge_rating}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted-foreground)",
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                      fontStyle: "italic",
                    }}
                  >
                    No monsters added
                  </div>
                )}

                {encounterStats && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                      fontSize: 11,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "var(--muted-foreground)",
                          marginBottom: 2,
                        }}
                      >
                        Total XP
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {encounterStats.totalXP.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          color: "var(--muted-foreground)",
                          marginBottom: 2,
                        }}
                      >
                        Adjusted XP
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {encounterStats.adjustedXP.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {isDm && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <button
                      type="button"
                      className="sc-btn sc-btn-sm sc-btn-ghost"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => setEditingEncounter(encounter)}
                    >
                      <Edit size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="sc-btn sc-btn-sm sc-btn-ghost"
                      style={{ color: "var(--destructive)" }}
                      onClick={() => setDeletingEncounterId(encounter.id)}
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

      <EncounterFormDialog
        open={createDialogOpen || editingEncounter !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingEncounter(null);
          }
        }}
        campaignId={campaignId}
        encounter={editingEncounter}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <AlertDialog
        open={deletingEncounterId !== null}
        onOpenChange={(open) => !open && setDeletingEncounterId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Encounter</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this encounter? This action cannot be undone.
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
        generatorType="encounter"
        title="Generate Encounter with AI"
        description="Create a balanced combat encounter with monsters, terrain, and tactics"
        onGenerated={(content) => {
          setAiDialogOpen(false);
          setCreateDialogOpen(true);
        }}
      />
    </div>
  );
}

