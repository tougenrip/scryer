"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  getPartyLevelThreshold,
  type EncounterMonster,
} from "@/lib/utils/encounter-calculator";
import type { Monster } from "@/hooks/useDndContent";
import { toast } from "sonner";
import { Plus, Swords, Edit, Trash2, Sparkles, Play } from "lucide-react";
import { ForgeTabHeader } from "@/components/forge/forge-tab-header";
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

function buildEncounterMonsters(
  encounter: Encounter,
  monsters: Monster[],
): EncounterMonster[] {
  if (!encounter.monsters?.length) return [];
  return encounter.monsters
    .map((savedMonster) => {
      const monster = monsters.find(
        (m) =>
          m.index === savedMonster.monster_index &&
          m.source === savedMonster.monster_source,
      );
      return monster ? { monster, quantity: savedMonster.quantity } : null;
    })
    .filter((m): m is EncounterMonster => m !== null);
}

export function EncountersTab({ campaignId, isDm }: EncountersTabProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingEncounter, setEditingEncounter] = useState<Encounter | null>(null);
  const [deletingEncounterId, setDeletingEncounterId] = useState<string | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [selectedEncounterId, setSelectedEncounterId] = useState<string | null>(null);

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

  useEffect(() => {
    if (encounters.length === 0) {
      setSelectedEncounterId(null);
      return;
    }
    setSelectedEncounterId((prev) => {
      if (prev && encounters.some((e) => e.id === prev)) return prev;
      return encounters[0].id;
    });
  }, [encounters]);

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
      <div className="forge-tab-root">
        <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
            ))}
          </div>
          <div className="sc-card p-4">
            <Skeleton className="h-8 w-2/3 mb-4" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const selectedEncounter =
    encounters.find((e) => e.id === selectedEncounterId) ?? encounters[0] ?? null;
  const selectedMonsters = selectedEncounter
    ? buildEncounterMonsters(selectedEncounter, monsters)
    : [];
  const selectedStats =
    selectedMonsters.length > 0
      ? calculateEncounterStats(selectedMonsters, defaultPartySize, defaultPartyLevel)
      : null;
  const tierCap =
    getPartyLevelThreshold(defaultPartyLevel) * defaultPartySize * 4;

  return (
    <div className="forge-tab-root sc-fade-in">
      <ForgeTabHeader
        title="Encounters"
        subtitle={`${encounters.length} prepared · Party: ${defaultPartySize} × level ${defaultPartyLevel}`}
        actions={
          isDm ? (
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
                Build encounter
              </button>
            </>
          ) : null
        }
      />

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
            gridTemplateColumns: "minmax(280px, 320px) 1fr",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {encounters.map((encounter) => {
              const em = buildEncounterMonsters(encounter, monsters);
              const st =
                em.length > 0
                  ? calculateEncounterStats(em, defaultPartySize, defaultPartyLevel)
                  : null;
              const sel = encounter.id === selectedEncounter?.id;
              return (
                <button
                  key={encounter.id}
                  type="button"
                  onClick={() => setSelectedEncounterId(encounter.id)}
                  className="sc-card sc-card-hover"
                  style={{
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                    border: sel ? "1px solid var(--primary)" : "1px solid var(--border)",
                    background: sel
                      ? "color-mix(in srgb, var(--primary) 8%, var(--card))"
                      : "var(--card)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                      gap: 8,
                    }}
                  >
                    <span className="font-serif truncate" style={{ fontSize: 14 }}>
                      {encounter.name || "Unnamed Encounter"}
                    </span>
                    {st && (
                      <span
                        className="sc-badge"
                        style={{
                          background:
                            st.difficulty === "Deadly"
                              ? "color-mix(in srgb, var(--destructive) 16%, transparent)"
                              : st.difficulty === "Hard"
                                ? "color-mix(in srgb, #d6a85a 18%, transparent)"
                                : "var(--muted)",
                          color:
                            st.difficulty === "Deadly"
                              ? "var(--destructive)"
                              : st.difficulty === "Hard"
                                ? "#d6a85a"
                                : "var(--muted-foreground)",
                          fontSize: 9,
                          borderColor: "transparent",
                          flexShrink: 0,
                        }}
                      >
                        {st.difficulty}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      marginBottom: 4,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {st
                      ? `${st.totalXP.toLocaleString()} XP · ${em.reduce((s, x) => s + x.quantity, 0)} creatures`
                      : "No creatures"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted-foreground)",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {em.map(({ monster, quantity }) => `${quantity}× ${monster.name}`).join(", ") ||
                      "—"}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedEncounter && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              <div className="sc-card" style={{ padding: 16 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                    gap: 14,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="font-serif" style={{ fontSize: 20, marginBottom: 2 }}>
                      {selectedEncounter.name || "Unnamed Encounter"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted-foreground)",
                        lineHeight: 1.55,
                        maxWidth: 520,
                      }}
                    >
                      {selectedMonsters.length > 0
                        ? `${selectedMonsters.map(({ monster, quantity }) => `${quantity}× ${monster.name}`).join(", ")}.`
                        : "Add creatures in the encounter editor."}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                    {isDm && (
                      <>
                        <button
                          type="button"
                          className="sc-btn sc-btn-sm"
                          onClick={() => setEditingEncounter(selectedEncounter)}
                        >
                          <Edit size={12} />
                          Edit
                        </button>
                        <Link
                          href={`/campaigns/${campaignId}/vtt`}
                          className="sc-btn sc-btn-primary sc-btn-sm"
                          style={{ textDecoration: "none" }}
                        >
                          <Play size={12} />
                          Run in VTT
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {selectedStats && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    {(
                      [
                        ["Difficulty", selectedStats.difficulty],
                        ["Encounter XP", selectedStats.totalXP.toLocaleString()],
                        ["Adjusted XP", selectedStats.adjustedXP.toLocaleString()],
                        ["Deadly cap (ref.)", tierCap.toLocaleString()],
                      ] as const
                    ).map(([label, v]) => (
                      <div
                        key={label}
                        style={{
                          padding: "10px 12px",
                          background: "var(--muted)",
                          borderRadius: 6,
                        }}
                      >
                        <div className="sc-label" style={{ marginBottom: 2 }}>
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontVariantNumeric: "tabular-nums",
                            fontFamily: "var(--font-serif)",
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="sc-label" style={{ marginBottom: 8 }}>
                  Creatures
                </div>
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  {selectedMonsters.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 12, color: "var(--muted-foreground)" }}>
                      No creatures in this encounter.
                    </div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr
                          style={{
                            background: "var(--muted)",
                            color: "var(--muted-foreground)",
                            textAlign: "left",
                          }}
                        >
                          {(["Count", "Name", "CR", "HP", "AC", "XP"] as const).map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "8px 10px",
                                fontWeight: 600,
                                fontSize: 11,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedMonsters.map(({ monster, quantity }, i) => (
                          <tr
                            key={`${monster.id}-${i}`}
                            style={{
                              borderTop: i === 0 ? "none" : "1px solid var(--border)",
                            }}
                          >
                            <td
                              style={{
                                padding: "8px 10px",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {quantity}×
                            </td>
                            <td style={{ padding: "8px 10px" }}>{monster.name}</td>
                            <td
                              style={{
                                padding: "8px 10px",
                                fontVariantNumeric: "tabular-nums",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {monster.challenge_rating}
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {monster.hit_points}
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {monster.armor_class}
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                fontVariantNumeric: "tabular-nums",
                                color: "var(--muted-foreground)",
                              }}
                            >
                              {monster.xp.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {isDm && (
                <div
                  className="sc-card"
                  style={{
                    padding: 14,
                    borderColor: "color-mix(in srgb, var(--primary) 30%, var(--border))",
                  }}
                >
                  <div className="sc-label" style={{ marginBottom: 8 }}>
                    DM notes
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.6, color: "var(--muted-foreground)" }}>
                    Tune creatures in the editor. Use Run in VTT when you are ready to play it at
                    the table.
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      className="sc-btn sc-btn-sm sc-btn-ghost"
                      style={{ color: "var(--destructive)" }}
                      onClick={() => setDeletingEncounterId(selectedEncounter.id)}
                    >
                      <Trash2 size={12} />
                      Delete encounter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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

