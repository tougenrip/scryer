"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Swords, Edit, Trash2 } from "lucide-react";
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

  const { encounters, loading, refetch } = useCampaignEncounters(campaignId);
  const { monsters } = useMonsters(campaignId);
  const { createEncounter } = useCreateEncounter();
  const { updateEncounter } = useUpdateEncounter();
  const { deleteEncounter, deleting } = useDeleteEncounter();

  // Default party stats for difficulty calculation
  const defaultPartySize = 4;
  const defaultPartyLevel = 5;

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-600";
      case "Medium":
        return "bg-yellow-600";
      case "Hard":
        return "bg-orange-600";
      case "Deadly":
        return "bg-red-600";
      default:
        return "bg-gray-600";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Encounters</h2>
          <p className="text-muted-foreground text-sm">
            Manage combat encounters for your campaign
          </p>
        </div>
        {isDm && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Encounter
          </Button>
        )}
      </div>

      {encounters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Swords className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No encounters yet. {isDm && "Create your first encounter to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {encounters.map((encounter) => {
            // Resolve monster names from saved monster data
            const encounterMonsters: EncounterMonster[] =
              encounter.monsters && encounter.monsters.length > 0
                ? encounter.monsters
                    .map((savedMonster) => {
                      const monster = monsters.find(
                        (m) =>
                          m.index === savedMonster.monster_index &&
                          m.source === savedMonster.monster_source
                      );
                      return monster
                        ? { monster, quantity: savedMonster.quantity }
                        : null;
                    })
                    .filter((m): m is EncounterMonster => m !== null)
                : [];

            // Calculate encounter stats
            const encounterStats =
              encounterMonsters.length > 0
                ? calculateEncounterStats(
                    encounterMonsters,
                    defaultPartySize,
                    defaultPartyLevel
                  )
                : null;

            const totalMonsters = encounterMonsters.reduce(
              (sum, m) => sum + m.quantity,
              0
            );

            return (
              <Card key={encounter.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {encounter.name || "Unnamed Encounter"}
                      </h3>
                    </div>
                    {encounterStats && (
                      <Badge
                        className={`${getDifficultyColor(
                          encounterStats.difficulty
                        )} text-white ml-2 flex-shrink-0`}
                      >
                        {encounterStats.difficulty}
                      </Badge>
                    )}
                  </div>

                  {/* Monsters List */}
                  {encounterMonsters.length > 0 ? (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Creatures ({totalMonsters})
                      </div>
                      <div className="space-y-1 max-h-[120px] overflow-y-auto">
                        {encounterMonsters.map(({ monster, quantity }, idx) => (
                          <div
                            key={`${monster.source}-${monster.index}-${idx}`}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="truncate flex-1 min-w-0">
                              {quantity > 1 && (
                                <span className="font-medium mr-1">{quantity}x</span>
                              )}
                              {monster.name}
                            </span>
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                              CR {monster.challenge_rating}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground pt-2 border-t">
                      No monsters added
                    </div>
                  )}

                  {/* Encounter Stats */}
                  {encounterStats && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                      <div>
                        <div className="text-muted-foreground">Total XP</div>
                        <div className="font-semibold">
                          {encounterStats.totalXP.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Adjusted XP</div>
                        <div className="font-semibold">
                          {encounterStats.adjustedXP.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {isDm && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEncounter(encounter)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingEncounterId(encounter.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
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
    </div>
  );
}

