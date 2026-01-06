"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft, HelpCircle, Info, MapPin } from "lucide-react";
import {
  useScene,
  useLocationMarkers,
  useCreateLocationMarker,
  useUpdateLocationMarker,
  useDeleteLocationMarker,
  useWorldLocations,
  useUpdateWorldLocation,
  type LocationMarker,
} from "@/hooks/useForgeContent";
import { AtlasMap } from "@/components/forge/atlas/atlas-map";
import { MarkerFormDialog } from "@/components/forge/atlas/marker-form-dialog";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/useCampaigns";
import { createClient } from "@/lib/supabase/client";

export default function SceneEditorPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const sceneId = params.sceneId as string;
  const [isDm, setIsDm] = useState(false);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [editingMarker, setEditingMarker] = useState<LocationMarker | null>(null);
  const [clickedPosition, setClickedPosition] = useState<{ x: number; y: number } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const { scene, loading: sceneLoading, refetch: refetchScene } = useScene(sceneId);
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { locations, loading: locationsLoading, refetch: refetchLocations } = useWorldLocations(campaignId);
  const { markers, loading: markersLoading, refetch: refetchMarkers } = useLocationMarkers(
    campaignId,
    sceneId,
    undefined
  );
  const { createMarker, loading: creatingMarker } = useCreateLocationMarker();
  const { updateMarker } = useUpdateLocationMarker();
  const { deleteMarker, loading: deletingMarker } = useDeleteLocationMarker();
  const { updateLocation } = useUpdateWorldLocation();

  const loading = sceneLoading || campaignLoading || markersLoading || locationsLoading;

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && campaign) {
        setIsDm(campaign.dm_user_id === user.id);
      }
    }
    getUser();
  }, [campaign]);

  const handleMarkerAdd = (x: number, y: number) => {
    if (!isDm) {
      toast.error("Only DMs can add markers");
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
    icon_type?: LocationMarker['icon_type'];
    status_icon?: LocationMarker['status_icon'];
    name: string;
    description?: string | null;
    color?: string;
    size?: LocationMarker['size'];
  }) => {
    const finalStatus = data.status_icon || null;

    if (editingMarker) {
      // Update existing marker
      const result = await updateMarker(editingMarker.id, {
        location_id: data.location_id !== undefined ? data.location_id : null,
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
        scene_id: sceneId,
        x: Math.round(clickedPosition.x),
        y: Math.round(clickedPosition.y),
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

  const handleBack = () => {
    router.push(`/campaigns/${campaignId}/forge?tab=scenes`);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Skeleton className="h-96 w-full max-w-4xl" />
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">Scene not found</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scenes
          </Button>
        </div>
      </div>
    );
  }

  if (!scene.image_url) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-lg">This scene has no map image</p>
          <p className="text-muted-foreground text-sm">Please add a map image in the scene settings</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scenes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="default"
            size="default"
            onClick={handleBack}
            className="gap-2 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Scenes
          </Button>
          <div>
            <h1 className="font-serif text-xl font-semibold">{scene.name}</h1>
            {scene.description && (
              <p className="text-sm text-muted-foreground">{scene.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDm && (
            <Sheet open={showInstructions} onOpenChange={setShowInstructions}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Instructions
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Scene Editor Instructions</SheetTitle>
                  <SheetDescription>
                    Learn how to use the scene editor to place and manage markers on your map.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Navigation
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground">• Pan:</span>
                        <span>Click and drag anywhere on the map to move around</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground">• Zoom:</span>
                        <span>Hold <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl</kbd> and scroll with your mouse wheel, or use the zoom buttons in the top-right corner</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground">• Reset:</span>
                        <span>Click the reset button to return to the default view</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Markers
                    </h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground">• Add Marker:</span>
                        <span>Click anywhere on the map to place a new marker. Fill in the details in the dialog that appears.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground">• Edit Marker:</span>
                        <span>Click on an existing marker to edit its properties, link it to a location, or change its appearance.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-medium text-foreground">• Delete Marker:</span>
                        <span>Click a marker and use the delete button in the edit dialog.</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Tips</h3>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">Tip</Badge>
                        <span>Zoom in for precise marker placement, especially for detailed maps</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">Tip</Badge>
                        <span>Link markers to locations to sync status updates automatically</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="mt-0.5">Tip</Badge>
                        <span>Use different marker colors and sizes to organize your map visually</span>
                      </li>
                    </ul>
                  </div>

                  {!isDm && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Only the Dungeon Master can add, edit, or delete markers. You can view and explore the map.
                      </p>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
            title="Close editor"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fullscreen Map */}
      <div className="flex-1 pt-16 overflow-hidden relative">
        <div className="h-full w-full">
          <AtlasMap
            imageUrl={scene.image_url}
            markers={markers}
            onMarkerClick={handleMarkerClick}
            onMarkerAdd={isDm ? handleMarkerAdd : undefined}
            onMarkerDelete={isDm ? handleMarkerDelete : undefined}
            isDm={isDm}
            editingMarkerId={editingMarker?.id || null}
            fullscreen={true}
          />
        </div>

        {/* Floating Back Button - Always visible */}
        <div className="absolute bottom-4 left-4 z-40">
          <Button
            onClick={handleBack}
            size="lg"
            className="gap-2 shadow-lg"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Scenes
          </Button>
        </div>
      </div>

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
    </div>
  );
}

