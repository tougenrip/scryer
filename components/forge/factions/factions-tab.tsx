"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Plus, Users, Edit, Trash2, Search } from "lucide-react";
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden flex flex-col h-full">
            <CardContent className="p-0 flex flex-col h-full">
              <Skeleton className="w-full aspect-square" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Factions & Politics</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage political entities and their relationships
          </p>
        </div>
        {isDm && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Faction
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search factions by name, type, leader, alignment, goals, or resources..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {factions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No factions yet. {isDm && "Add your first faction to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filteredFactions.map((faction) => (
            <Card key={faction.id} className="overflow-hidden flex flex-col h-full">
              <CardContent className="p-0 flex flex-col h-full">
                <div className="w-full aspect-square bg-muted overflow-hidden flex-shrink-0">
                  {faction.emblem_sigil_url ? (
                    <img
                      src={faction.emblem_sigil_url}
                      alt={faction.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Users className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                </div>
                <div className="p-3 flex flex-col flex-1 min-h-0">
                  <div className="space-y-1.5 flex-1">
                    <h3 className="font-semibold text-sm leading-tight">{faction.name}</h3>
                    {faction.type && (
                      <p className="text-xs text-muted-foreground capitalize">
                        {faction.type.replace(/_/g, ' ')}
                      </p>
                    )}
                    {faction.influence_level && (
                      <p className="text-xs text-muted-foreground capitalize">
                        <span className="font-medium">Scope:</span> {faction.influence_level}
                      </p>
                    )}
                    {faction.alignment && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Alignment:</span> {faction.alignment}
                      </p>
                    )}
                    {faction.motto_creed && (
                      <p className="text-xs italic text-muted-foreground line-clamp-2">
                        "{faction.motto_creed}"
                      </p>
                    )}
                  </div>
                  {isDm && (
                    <div className="flex items-center gap-1.5 pt-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingFaction(faction)}
                        className="flex-1 h-7 text-xs px-2"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingFactionId(faction.id)}
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  );
}

