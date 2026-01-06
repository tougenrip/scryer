"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Map, Maximize2 } from "lucide-react";
import {
  useScenes,
  useLocationMarkers,
  useCreateLocationMarker,
  useUpdateLocationMarker,
  useDeleteLocationMarker,
  useCreateScene,
  useUpdateScene,
  useDeleteScene,
  useWorldLocations,
  useUpdateWorldLocation,
  type LocationMarker,
  type Scene,
} from "@/hooks/useForgeContent";
import { AtlasMap } from "@/components/forge/atlas/atlas-map";
import { MarkerFormDialog } from "@/components/forge/atlas/marker-form-dialog";
import { SceneList } from "./scene-list";
import { SceneFormDialog } from "./scene-form-dialog";
import { toast } from "sonner";
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

interface ScenesTabProps {
  campaignId: string;
  isDm: boolean;
}

export function ScenesTab({ campaignId, isDm }: ScenesTabProps) {
  const router = useRouter();
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [sceneFormOpen, setSceneFormOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<Scene | null>(null);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [editingMarker, setEditingMarker] = useState<LocationMarker | null>(null);
  const [clickedPosition, setClickedPosition] = useState<{ x: number; y: number } | null>(null);

  const { scenes, loading: scenesLoading, refetch: refetchScenes } = useScenes(campaignId);
  const { locations, loading: locationsLoading, refetch: refetchLocations } = useWorldLocations(campaignId);
  const { markers, loading: markersLoading, refetch: refetchMarkers } = useLocationMarkers(
    campaignId,
    selectedSceneId,
    undefined
  );
  const { createMarker, loading: creatingMarker } = useCreateLocationMarker();
  const { updateMarker } = useUpdateLocationMarker();
  const { deleteMarker, loading: deletingMarker } = useDeleteLocationMarker();
  const { createScene, loading: creatingScene } = useCreateScene();
  const { updateScene, loading: updatingScene } = useUpdateScene();
  const { deleteScene, loading: deletingScene } = useDeleteScene();
  const { updateLocation } = useUpdateWorldLocation();

  const loading = scenesLoading || markersLoading || locationsLoading;

  // Auto-select first scene when scenes load
  useEffect(() => {
    if (!scenesLoading && scenes.length > 0 && !selectedSceneId) {
      setSelectedSceneId(scenes[0].id);
    }
  }, [scenes, scenesLoading, selectedSceneId]);

  // Get selected scene
  const selectedScene = scenes.find((s) => s.id === selectedSceneId) || null;

  const handleCreateScene = () => {
    setEditingScene(null);
    setSceneFormOpen(true);
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setSceneFormOpen(true);
  };

  const handleDeleteScene = (scene: Scene) => {
    setSceneToDelete(scene);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteScene = async () => {
    if (!sceneToDelete) return;

    const result = await deleteScene(sceneToDelete.id);
    if (result.success) {
      toast.success("Scene deleted");
      // If deleted scene was selected, select another or clear selection
      if (selectedSceneId === sceneToDelete.id) {
        const remainingScenes = scenes.filter((s) => s.id !== sceneToDelete.id);
        setSelectedSceneId(remainingScenes.length > 0 ? remainingScenes[0].id : null);
      }
      refetchScenes();
      refetchMarkers();
    } else {
      toast.error("Failed to delete scene");
    }
    setDeleteConfirmOpen(false);
    setSceneToDelete(null);
  };

  const handleSceneSave = async (data: {
    name: string;
    description?: string | null;
    image_url?: string | null;
  }) => {
    if (editingScene) {
      // Update existing scene
      const result = await updateScene(editingScene.id, {
        name: data.name,
        description: data.description,
        image_url: data.image_url,
      });

      if (result.success) {
        toast.success("Scene updated");
        setSceneFormOpen(false);
        setEditingScene(null);
        refetchScenes();
      } else {
        toast.error("Failed to update scene");
      }
    } else {
      // Create new scene
      const result = await createScene({
        campaign_id: campaignId,
        name: data.name,
        description: data.description,
        image_url: data.image_url,
      });

      if (result.success && result.data) {
        toast.success("Scene created");
        setSceneFormOpen(false);
        refetchScenes();
        // Select the newly created scene
        setSelectedSceneId(result.data.id);
      } else {
        toast.error("Failed to create scene");
      }
    }
  };

  const handleMarkerAdd = (x: number, y: number) => {
    if (!selectedSceneId) {
      toast.error("Please select a scene first");
      return;
    }
    setClickedPosition({ x, y });
    setEditingMarker(null);
    setMarkerDialogOpen(true);
  };

  const handleMarkerClick = (marker: LocationMarker) => {
    setEditingMarker(marker);
    setClickedPosition(null);
    setMarkerDialogOpen(true);
  };

  const handleMarkerSave = async (data: {
    location_id?: string | null;
    background_shape?: LocationMarker['background_shape'];
    icon_type?: LocationMarker['icon_type'];
    status_icon?: LocationMarker['status_icon'];
    name: string;
    description?: string | null;
    color?: string;
    size?: LocationMarker['size'];
  }) => {
    if (!selectedSceneId) {
      toast.error("Please select a scene first");
      return;
    }

    const finalStatus = data.status_icon || null;

    if (editingMarker) {
      // Update existing marker
      const result = await updateMarker(editingMarker.id, {
        location_id: data.location_id !== undefined ? data.location_id : null,
        background_shape: data.background_shape !== undefined ? data.background_shape : null,
        icon_type: data.icon_type,
        status_icon: finalStatus,
        name: data.name,
        description: data.description,
        color: data.color,
        size: data.size,
      });

      if (result.success) {
        // If marker is linked to a location, sync status to location
        const linkedLocationId = data.location_id || editingMarker.location_id;
        if (linkedLocationId) {
          await updateLocation(linkedLocationId, {
            status: finalStatus,
          });
        } else if (editingMarker.location_id) {
          // If location link was removed, clear location status
          await updateLocation(editingMarker.location_id, {
            status: null,
          });
        }

        toast.success("Marker updated");
        setMarkerDialogOpen(false);
        setEditingMarker(null);
        setClickedPosition(null);
        refetchMarkers();
        refetchLocations();
      } else {
        toast.error("Failed to update marker");
      }
    } else if (clickedPosition) {
      // Create new marker - round coordinates to integers (0-100 scale)
      const result = await createMarker({
        campaign_id: campaignId,
        location_id: data.location_id || null,
        map_id: null,
        scene_id: selectedSceneId,
        x: Math.round(clickedPosition.x),
        y: Math.round(clickedPosition.y),
        background_shape: data.background_shape || null,
        icon_type: data.icon_type || 'landmark',
        status_icon: finalStatus,
        name: data.name,
        description: data.description || null,
        color: data.color || '#c9b882',
        size: data.size || 'medium',
        visible: true,
      });

      if (result.success) {
        // If marker is linked to a location, sync status to location
        if (data.location_id) {
          await updateLocation(data.location_id, {
            status: finalStatus,
          });
          refetchLocations();
        }

        toast.success("Marker created");
        setMarkerDialogOpen(false);
        setClickedPosition(null);
        refetchMarkers();
      } else {
        toast.error("Failed to create marker");
      }
    }
  };

  const handleMarkerDelete = async (markerId: string) => {
    const result = await deleteMarker(markerId);
    if (result.success) {
      toast.success("Marker deleted");
      refetchMarkers();
    } else {
      toast.error("Failed to delete marker");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  const sceneImageUrl = selectedScene?.image_url || null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-semibold">Scenes</h2>
        <p className="text-muted-foreground text-sm">
          Create and manage multiple scene maps with markers for cities, landmarks, and points of interest
        </p>
      </div>

      {/* Main Content: Scene List + Map View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Scene List Sidebar */}
        <div className="lg:col-span-1">
          <SceneList
            scenes={scenes}
            selectedSceneId={selectedSceneId}
            onSelectScene={setSelectedSceneId}
            onCreateScene={handleCreateScene}
            onEditScene={handleEditScene}
            onDeleteScene={handleDeleteScene}
            loading={scenesLoading}
            isDm={isDm}
            campaignId={campaignId}
          />
        </div>

        {/* Map View */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {!selectedScene ? (
                <div className="flex flex-col items-center justify-center py-24 bg-muted rounded-lg">
                  <Map className="h-24 w-24 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center mb-2">
                    {scenes.length === 0
                      ? "No scenes available. Create your first scene to get started."
                      : "Select a scene to view its map"}
                  </p>
                </div>
              ) : !sceneImageUrl ? (
                <div className="flex flex-col items-center justify-center py-24 bg-muted rounded-lg">
                  <Map className="h-24 w-24 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center mb-2">
                    {selectedScene.name} has no map image
                  </p>
                  {isDm && (
                    <p className="text-muted-foreground text-sm text-center">
                      Edit the scene to upload a map image
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute top-2 right-2 z-30">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => router.push(`/campaigns/${campaignId}/scenes/${selectedSceneId}/edit`)}
                      className="gap-2"
                    >
                      <Maximize2 className="h-4 w-4" />
                      Fullscreen Editor
                    </Button>
                  </div>
                  <AtlasMap
                    imageUrl={sceneImageUrl}
                    markers={markers}
                    onMarkerClick={handleMarkerClick}
                    onMarkerAdd={isDm ? handleMarkerAdd : undefined}
                    onMarkerDelete={isDm ? handleMarkerDelete : undefined}
                    isDm={isDm}
                    editingMarkerId={editingMarker?.id || null}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Scene Form Dialog */}
      <SceneFormDialog
        open={sceneFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setSceneFormOpen(false);
            setEditingScene(null);
          }
        }}
        scene={editingScene}
        campaignId={campaignId}
        onSave={handleSceneSave}
        loading={creatingScene || updatingScene}
      />

      {/* Marker Form Dialog */}
      <MarkerFormDialog
        open={markerDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setMarkerDialogOpen(false);
            setEditingMarker(null);
            setClickedPosition(null);
          }
        }}
        marker={editingMarker}
        clickedPosition={clickedPosition}
        locations={locations}
        onSave={handleMarkerSave}
        onDelete={isDm ? handleMarkerDelete : undefined}
        isDm={isDm}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scene</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{sceneToDelete?.name}"? This will also delete all markers on this scene. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteScene}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

