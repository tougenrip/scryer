"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Trash2 } from "lucide-react";
import {
  useLocationMarkers,
  useWorldLocations,
  useCreateLocationMarker,
  useUpdateLocationMarker,
  useDeleteLocationMarker,
  useCreateWorldLocation,
  useUpdateWorldLocation,
  type LocationMarker,
  type WorldLocation,
} from "@/hooks/useForgeContent";
import { MapImageUpload } from "@/components/campaign/map-image-upload";
import { AtlasMap } from "./atlas-map";
import { MarkerFormDialog } from "./marker-form-dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface AtlasTabProps {
  campaignId: string;
  isDm: boolean;
}

export function AtlasTab({ campaignId, isDm }: AtlasTabProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [worldLocation, setWorldLocation] = useState<WorldLocation | null>(null);
  const [markerDialogOpen, setMarkerDialogOpen] = useState(false);
  const [editingMarker, setEditingMarker] = useState<LocationMarker | null>(null);
  const [clickedPosition, setClickedPosition] = useState<{ x: number; y: number } | null>(null);

  const { locations, loading: locationsLoading, refetch: refetchLocations } = useWorldLocations(campaignId);
  const { markers, loading: markersLoading, refetch: refetchMarkers } = useLocationMarkers(campaignId, null);
  const { createMarker, loading: creatingMarker } = useCreateLocationMarker();
  const { updateMarker } = useUpdateLocationMarker();
  const { deleteMarker, loading: deletingMarker } = useDeleteLocationMarker();
  const { createLocation, loading: creatingLocation } = useCreateWorldLocation();
  const { updateLocation, loading: updatingLocation } = useUpdateWorldLocation();

  const loading = locationsLoading || markersLoading;

  // Find world-level location for the atlas map
  useEffect(() => {
    if (loading || locationsLoading) return;

    const world = locations.find(loc => loc.type === 'world');
    if (world) {
      // Only update if it's a different location
      setWorldLocation((prev) => {
        if (prev?.id !== world.id) {
          return world;
        }
        return prev;
      });
    }
  }, [locations, loading, locationsLoading]);

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

  const handleImageUpload = async (imageUrl: string | null) => {
    // Ensure we have a world location
    let locationToUpdate = worldLocation;
    
    if (!locationToUpdate) {
      // Try to find it in the current locations
      const world = locations.find(loc => loc.type === 'world');
      if (world) {
        locationToUpdate = world;
        setWorldLocation(world);
      } else {
        // Create world location if it doesn't exist
        const createResult = await createLocation({
          campaign_id: campaignId,
          parent_location_id: null,
          name: 'World',
          type: 'world',
          map_level: 0,
        });
        
        if (createResult.success && createResult.data) {
          locationToUpdate = createResult.data;
          setWorldLocation(createResult.data);
          refetchLocations();
        } else {
          // Log full error for debugging
          console.error("Error creating world location - Full result:", createResult);
          console.error("Error object:", createResult.error);
          
          // Extract error message from various possible formats
          let errorMessage = "Failed to create world location";
          const error = createResult.error;
          if (error) {
            if (typeof error === 'string') {
              errorMessage = error;
            } else if (error.message) {
              errorMessage = error.message;
            } else if (error.code) {
              errorMessage = `Database error (${error.code}): ${error.message || error.details || 'Unknown error'}`;
            } else if (error.details) {
              errorMessage = error.details;
            } else if (error.hint) {
              errorMessage = error.hint;
            } else {
              // Try to stringify, but handle circular references
              try {
                errorMessage = JSON.stringify(error);
              } catch {
                errorMessage = String(error);
              }
            }
          }
          
          toast.error(`Failed to create world location: ${errorMessage}`);
          return;
        }
      }
    }

    if (!locationToUpdate) {
      toast.error("World location not found");
      return;
    }

    const result = await updateLocation(locationToUpdate.id, {
      image_url: imageUrl,
    });

    if (result.success) {
      toast.success("Atlas map updated");
      // Update local state
      setWorldLocation({ ...locationToUpdate, image_url: imageUrl });
      refetchLocations();
    } else {
      toast.error("Failed to update atlas map");
    }
  };

  const handleMarkerAdd = (x: number, y: number) => {
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  const atlasImageUrl = worldLocation?.image_url || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">World Atlas</h2>
          <p className="text-muted-foreground text-sm">
            Upload your world map and place markers for cities, landmarks, and points of interest
          </p>
        </div>
        {isDm && atlasImageUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleImageUpload(null)}
            className="text-destructive hover:text-destructive w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Map
          </Button>
        )}
      </div>

      {/* Map Display with Integrated Upload */}
      <Card>
        <CardContent className="p-6">
          {!atlasImageUrl ? (
            <div className="space-y-4">
              {isDm ? (
                <MapImageUpload
                  imageUrl={atlasImageUrl}
                  onImageChange={handleImageUpload}
                  campaignId={campaignId}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-muted rounded-lg">
                  <Map className="h-24 w-24 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center mb-2">
                    No atlas map available
                  </p>
                </div>
              )}
            </div>
          ) : (
            <AtlasMap
              imageUrl={atlasImageUrl}
              markers={markers}
              onMarkerClick={handleMarkerClick}
              onMarkerAdd={isDm ? handleMarkerAdd : undefined}
              onMarkerDelete={isDm ? handleMarkerDelete : undefined}
              isDm={isDm}
              editingMarkerId={editingMarker?.id || null}
            />
          )}
        </CardContent>
      </Card>

      {/* Marker Form Sheet */}
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
