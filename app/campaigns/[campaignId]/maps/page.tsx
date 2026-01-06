"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign } from "@/hooks/useCampaigns";
import {
  useCampaignMaps,
  useCreateMap,
  useUpdateMap,
  useDeleteMap,
  type Map,
} from "@/hooks/useCampaignContent";
import { MapFormDialog } from "@/components/campaign/map-form-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus, Map as MapIcon, Edit, Trash2, Eye } from "lucide-react";
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
import Link from "next/link";

export default function MapsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  // const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingMap, setEditingMap] = useState<Map | null>(null);
  const [deletingMapId, setDeletingMapId] = useState<string | null>(null);

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { maps, loading: mapsLoading, refetch: refetchMaps } = useCampaignMaps(campaignId);
  const { createMap } = useCreateMap(); // loading: creating unused
  const { updateMap } = useUpdateMap(); // loading: updating unused
  const { deleteMap, loading: deleting } = useDeleteMap();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // setUserId(user.id);
        if (campaign) {
          setIsDm(campaign.dm_user_id === user.id);
        }
      }
    }
    getUser();
  }, [campaign]);

  const handleCreate = async (data: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    grid_size?: number;
    grid_type?: 'square' | 'hex';
    width?: number | null;
    height?: number | null;
  }) => {
    const result = await createMap(data);
    if (result.success) {
      toast.success("Map created successfully");
      setCreateDialogOpen(false);
      refetchMaps();
    } else {
      toast.error(result.error?.message || "Failed to create map");
      return result;
    }
    return { success: true };
  };

  const handleUpdate = async (
    mapId: string,
    data: {
      name?: string;
      image_url?: string | null;
      grid_size?: number;
      grid_type?: 'square' | 'hex';
      width?: number | null;
      height?: number | null;
    }
  ) => {
    const result = await updateMap(mapId, data);
    if (result.success) {
      toast.success("Map updated successfully");
      setEditingMap(null);
      refetchMaps();
    } else {
      toast.error(result.error?.message || "Failed to update map");
      return result;
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingMapId) return;
    const result = await deleteMap(deletingMapId);
    if (result.success) {
      toast.success("Map deleted successfully");
      setDeletingMapId(null);
      refetchMaps();
    } else {
      toast.error(result.error?.message || "Failed to delete map");
    }
  };

  if (campaignLoading || mapsLoading) {
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
          <h1 className="font-serif text-3xl font-bold">Maps</h1>
          <p className="text-muted-foreground mt-1">
            Manage campaign maps and battle grids
          </p>
        </div>
        {isDm && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Map
          </Button>
        )}
      </div>

      {/* Maps Grid */}
      {maps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              No maps yet. {isDm && "Create your first map to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {maps.map((map) => (
            <Card key={map.id} className="overflow-hidden">
              <CardContent className="p-0">
                {map.image_url ? (
                  <div className="relative h-48 bg-muted">
                    <img
                      src={map.image_url}
                      alt={map.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <MapIcon className="h-16 w-16 text-muted-foreground/50" />
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-lg">{map.name}</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Grid: {map.grid_size}ft {map.grid_type}
                    </p>
                    {(map.width || map.height) && (
                      <p>
                        Size: {map.width || "?"} × {map.height || "?"} squares
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/campaigns/${campaignId}/vtt?map=${map.id}`}>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>
                    {isDm && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingMap(map)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingMapId(map.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <MapFormDialog
        open={createDialogOpen || editingMap !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingMap(null);
          }
        }}
        campaignId={campaignId}
        map={editingMap}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingMapId !== null}
        onOpenChange={(open) => !open && setDeletingMapId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Map</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this map? This action cannot be undone.
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

