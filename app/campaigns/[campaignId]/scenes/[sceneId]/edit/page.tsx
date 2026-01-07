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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapImageUpload } from "@/components/campaign/map-image-upload";
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
import { X, ArrowLeft, HelpCircle, Info, MapPin, Layers, Plus, Edit, Trash2, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useScene,
  useLocationMarkers,
  useCreateLocationMarker,
  useUpdateLocationMarker,
  useDeleteLocationMarker,
  useWorldLocations,
  useUpdateWorldLocation,
  useFloors,
  useCreateFloor,
  useUpdateFloor,
  useDeleteFloor,
  useScenes,
  useUpdateScene,
  type LocationMarker,
  type Floor,
  type Scene,
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
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [floorDialogOpen, setFloorDialogOpen] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [deleteFloorConfirmOpen, setDeleteFloorConfirmOpen] = useState(false);
  const [floorToDelete, setFloorToDelete] = useState<Floor | null>(null);
  const [scenesLibraryOpen, setScenesLibraryOpen] = useState(false);
  const [sceneEditDialogOpen, setSceneEditDialogOpen] = useState(false);

  const { scene, loading: sceneLoading, refetch: refetchScene } = useScene(sceneId);
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { locations, loading: locationsLoading, refetch: refetchLocations } = useWorldLocations(campaignId);
  const { floors, loading: floorsLoading, refetch: refetchFloors } = useFloors(sceneId);
  const { scenes, loading: scenesLoading } = useScenes(campaignId);
  const { markers, loading: markersLoading, refetch: refetchMarkers } = useLocationMarkers(
    campaignId,
    sceneId,
    undefined,
    selectedFloorId
  );
  const { createFloor, loading: creatingFloor } = useCreateFloor();
  const { updateFloor, loading: updatingFloor } = useUpdateFloor();
  const { deleteFloor, loading: deletingFloor } = useDeleteFloor();
  const { createMarker, loading: creatingMarker } = useCreateLocationMarker();
  const { updateMarker } = useUpdateLocationMarker();
  const { deleteMarker, loading: deletingMarker } = useDeleteLocationMarker();
  const { updateLocation } = useUpdateWorldLocation();
  const { updateScene, loading: updatingScene } = useUpdateScene();

  const loading = sceneLoading || campaignLoading || markersLoading || locationsLoading || floorsLoading || scenesLoading;

  // Always default to "No Floor (Scene)" - don't auto-select first floor
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  useEffect(() => {
    if (!floorsLoading && !hasAutoSelected) {
      // Always set to null (No Floor/Scene) on initial load
      setSelectedFloorId(null);
      setHasAutoSelected(true);
    }
  }, [floorsLoading, hasAutoSelected]);

  // Get selected floor and determine which image to use
  const selectedFloor = floors.find((f) => f.id === selectedFloorId) || null;
  const mapImageUrl = selectedFloor?.image_url || scene?.image_url || null;

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
        floor_id: selectedFloorId,
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

  if (!mapImageUrl) {
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

  const handleSceneSelect = (newSceneId: string) => {
    if (newSceneId !== sceneId) {
      router.push(`/campaigns/${campaignId}/scenes/${newSceneId}/edit`);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Scenes Library Sidebar */}
      <div
        className={`absolute left-0 top-0 bottom-0 z-40 bg-background/95 backdrop-blur-sm border-r border-border transition-transform duration-300 ${
          scenesLibraryOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "280px" }}
      >
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <h2 className="font-serif text-lg font-semibold">Scenes Library</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setScenesLibraryOpen(false)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {scenes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No scenes available
              </div>
            ) : (
              <div className="space-y-1">
                {scenes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSceneSelect(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                      s.id === sceneId
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{s.name}</div>
                    {s.description && (
                      <div className="text-xs opacity-80 mt-1 line-clamp-2">
                        {s.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toggle Button for Scenes Library */}
      {!scenesLibraryOpen && (
        <button
          onClick={() => setScenesLibraryOpen(true)}
          className="absolute left-4 top-20 z-40 bg-background/95 backdrop-blur-sm border border-border rounded-r-md p-2 hover:bg-muted transition-colors"
          title="Open Scenes Library"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Top Bar */}
      <div className={`absolute top-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between transition-all duration-300 ${
        scenesLibraryOpen ? "left-[280px]" : "left-0"
      }`}>
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
          {/* Floor Selector */}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedFloorId || "none"}
              onValueChange={(value) => {
                setSelectedFloorId(value === "none" ? null : value);
                setHasAutoSelected(true); // Mark as manually selected
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select floor" />
              </SelectTrigger>
              <SelectContent side="bottom" align="start">
                <SelectItem value="none">No Floor (Scene)</SelectItem>
                {floors.map((floor) => (
                  <SelectItem key={floor.id} value={floor.id}>
                    {floor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isDm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingFloor(null);
                  setFloorDialogOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Floor
              </Button>
            )}
          </div>
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
      <div className={`flex-1 pt-16 overflow-hidden relative transition-all duration-300 ${
        scenesLibraryOpen ? "ml-[280px]" : "ml-0"
      }`}>
        <div className="h-full w-full">
          <AtlasMap
            imageUrl={mapImageUrl}
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
        <div className={`absolute bottom-4 z-40 transition-all duration-300 ${
          scenesLibraryOpen ? "left-[296px]" : "left-4"
        }`}>
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

      {/* Floor Form Dialog */}
      <Dialog open={floorDialogOpen} onOpenChange={setFloorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFloor ? "Edit Floor" : "Create Floor"}</DialogTitle>
            <DialogDescription>
              {editingFloor
                ? "Update the floor details below."
                : "Add a new floor to this scene. Each floor can have its own map image and markers."}
            </DialogDescription>
          </DialogHeader>
           <FloorForm
             floor={editingFloor}
             sceneId={sceneId}
             campaignId={campaignId}
             floors={floors}
             onCancel={() => {
               setFloorDialogOpen(false);
               setEditingFloor(null);
             }}
             onSave={async (data) => {
              if (editingFloor) {
                const result = await updateFloor(editingFloor.id, data);
                if (result.success) {
                  toast.success("Floor updated");
                  setFloorDialogOpen(false);
                  setEditingFloor(null);
                  refetchFloors();
                } else {
                  toast.error("Failed to update floor");
                }
              } else {
                const result = await createFloor({
                  scene_id: sceneId,
                  ...data,
                });
                if (result.success && result.data) {
                  toast.success("Floor created");
                  setFloorDialogOpen(false);
                  refetchFloors();
                  setSelectedFloorId(result.data.id);
                } else {
                  toast.error("Failed to create floor");
                }
              }
            }}
            loading={creatingFloor || updatingFloor}
          />
        </DialogContent>
      </Dialog>

      {/* Scene Edit Dialog */}
      <Dialog open={sceneEditDialogOpen} onOpenChange={setSceneEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Scene</DialogTitle>
            <DialogDescription>
              Update the scene details, map image, and environmental conditions.
            </DialogDescription>
          </DialogHeader>
          {scene && (
            <SceneEditForm
              scene={scene}
              campaignId={campaignId}
              onCancel={() => {
                setSceneEditDialogOpen(false);
              }}
              onSave={async (data) => {
                const result = await updateScene(sceneId, data);
                if (result.success) {
                  toast.success("Scene updated");
                  setSceneEditDialogOpen(false);
                  refetchScene();
                } else {
                  toast.error("Failed to update scene");
                }
              }}
              loading={updatingScene}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Floor Management - Show floor list in a sheet or dropdown */}
      {isDm && (
        <div className={`absolute top-20 z-50 bg-card border border-border rounded-lg p-2 max-h-64 overflow-y-auto transition-all duration-300 pointer-events-auto shadow-lg ${
          scenesLibraryOpen ? "left-[296px]" : "left-4"
        }`}>
          <div className="text-xs font-semibold mb-2 px-2">Floors</div>
          <div className="space-y-1">
            {/* Initial floor option (Scene level) */}
            <div
              className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-colors ${
                selectedFloorId === null ? "bg-primary/20 border border-primary/40" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedFloorId(null);
                setHasAutoSelected(true); // Mark as manually selected
              }}
            >
              <Layers className={`h-3 w-3 ${selectedFloorId === null ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <span className={`text-sm block ${selectedFloorId === null ? "text-primary font-medium" : ""}`}>No Floor (Scene)</span>
                {scene?.conditions && scene.conditions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {scene.conditions.slice(0, 2).map((condition) => (
                      <Badge key={condition} variant="outline" className="text-xs px-1 py-0">
                        {condition}
                      </Badge>
                    ))}
                    {scene.conditions.length > 2 && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        +{scene.conditions.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSceneEditDialogOpen(true);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {/* Actual floors */}
            {floors.map((floor) => (
              <div
                key={floor.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-colors ${
                  selectedFloorId === floor.id ? "bg-primary/20 border border-primary/40" : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedFloorId(floor.id);
                  setHasAutoSelected(true); // Mark as manually selected
                }}
              >
                <Layers className={`h-3 w-3 ${selectedFloorId === floor.id ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm block ${selectedFloorId === floor.id ? "text-primary font-medium" : ""}`}>{floor.name}</span>
                  {floor.conditions && floor.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {floor.conditions.slice(0, 2).map((condition) => (
                        <Badge key={condition} variant="outline" className="text-xs px-1 py-0">
                          {condition}
                        </Badge>
                      ))}
                      {floor.conditions.length > 2 && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          +{floor.conditions.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingFloor(floor);
                      setFloorDialogOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFloorToDelete(floor);
                      setDeleteFloorConfirmOpen(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Floor Confirmation */}
      <AlertDialog open={deleteFloorConfirmOpen} onOpenChange={setDeleteFloorConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Floor</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{floorToDelete?.name}"? This will also delete all markers on this floor. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (floorToDelete) {
                  const result = await deleteFloor(floorToDelete.id);
                  if (result.success) {
                    toast.success("Floor deleted");
                    if (selectedFloorId === floorToDelete.id) {
                      const remainingFloors = floors.filter((f) => f.id !== floorToDelete.id);
                      setSelectedFloorId(remainingFloors.length > 0 ? remainingFloors[0].id : null);
                    }
                    refetchFloors();
                    refetchMarkers();
                  } else {
                    toast.error("Failed to delete floor");
                  }
                }
                setDeleteFloorConfirmOpen(false);
                setFloorToDelete(null);
              }}
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

// Floor Form Component
function FloorForm({
  floor,
  sceneId,
  campaignId,
  floors,
  onSave,
  onCancel,
  loading,
}: {
  floor: Floor | null;
  sceneId: string;
  campaignId: string;
  floors: Floor[];
  onSave: (data: {
    name: string;
    description?: string | null;
    image_url?: string | null;
    floor_order?: number;
    conditions?: string[] | null;
  }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(floor?.name || "");
  const [description, setDescription] = useState(floor?.description || "");
  const [imageUrl, setImageUrl] = useState(floor?.image_url || null);
  const [conditionsText, setConditionsText] = useState("");

  useEffect(() => {
    if (floor) {
      setName(floor.name);
      setDescription(floor.description || "");
      setImageUrl(floor.image_url);
      setConditionsText(floor.conditions?.join("\n") || "");
    } else {
      setName("");
      setDescription("");
      setImageUrl(null);
      setConditionsText("");
    }
  }, [floor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Floor name is required");
      return;
    }
    // Parse conditions from textarea (split by newline, filter empty lines)
    const conditions = conditionsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      image_url: imageUrl,
      floor_order: floor?.floor_order ?? floors.length,
      conditions: conditions.length > 0 ? conditions : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="floor-name">Floor Name *</Label>
        <Input
          id="floor-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Ground Floor, First Floor, Basement"
          required
        />
      </div>
      <div>
        <Label htmlFor="floor-description">Description</Label>
        <Textarea
          id="floor-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of this floor"
          rows={3}
        />
      </div>
      <div>
        <Label>Map Image (Optional)</Label>
        <MapImageUpload
          imageUrl={imageUrl}
          onImageChange={setImageUrl}
          campaignId={campaignId}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          If empty, the scene's map image will be used for this floor
        </p>
      </div>
      <div>
        <Label htmlFor="floor-conditions">Environmental Conditions (Optional)</Label>
        <Textarea
          id="floor-conditions"
          value={conditionsText}
          onChange={(e) => setConditionsText(e.target.value)}
          placeholder="Enter conditions, one per line:&#10;dim light&#10;cold temperature&#10;damp air&#10;windy"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Add environmental conditions for this floor, one per line (e.g., lighting, temperature, weather)
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : floor ? "Update Floor" : "Create Floor"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// Scene Edit Form Component
function SceneEditForm({
  scene,
  campaignId,
  onSave,
  onCancel,
  loading,
}: {
  scene: Scene;
  campaignId: string;
  onSave: (data: {
    name: string;
    description?: string | null;
    image_url?: string | null;
    conditions?: string[] | null;
  }) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(scene?.name || "");
  const [description, setDescription] = useState(scene?.description || "");
  const [imageUrl, setImageUrl] = useState(scene?.image_url || null);
  const [conditionsText, setConditionsText] = useState("");

  useEffect(() => {
    if (scene) {
      setName(scene.name);
      setDescription(scene.description || "");
      setImageUrl(scene.image_url);
      setConditionsText(scene.conditions?.join("\n") || "");
    } else {
      setName("");
      setDescription("");
      setImageUrl(null);
      setConditionsText("");
    }
  }, [scene]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Scene name is required");
      return;
    }
    // Parse conditions from textarea (split by newline, filter empty lines)
    const conditions = conditionsText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      image_url: imageUrl,
      conditions: conditions.length > 0 ? conditions : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="scene-name">Scene Name *</Label>
        <Input
          id="scene-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter scene name"
          required
        />
      </div>
      <div>
        <Label htmlFor="scene-description">Description</Label>
        <Textarea
          id="scene-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of this scene"
          rows={3}
        />
      </div>
      <div>
        <Label>Map Image (Optional)</Label>
        <MapImageUpload
          imageUrl={imageUrl}
          onImageChange={setImageUrl}
          campaignId={campaignId}
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Upload a map image for this scene
        </p>
      </div>
      <div>
        <Label htmlFor="scene-conditions">Environmental Conditions (Optional)</Label>
        <Textarea
          id="scene-conditions"
          value={conditionsText}
          onChange={(e) => setConditionsText(e.target.value)}
          placeholder="Enter conditions, one per line:&#10;dim light&#10;cold temperature&#10;damp air&#10;windy"
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Add environmental conditions for this scene, one per line (e.g., lighting, temperature, weather)
        </p>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Update Scene"}
        </Button>
      </DialogFooter>
    </form>
  );
}

