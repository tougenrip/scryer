"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MapPin,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Building2,
  Globe,
  Mountain,
  Flag,
  Home,
  Store,
  DoorOpen,
  Landmark,
  Castle,
  TreePine,
  // Island,
  Waves,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { AIGenerationDialog } from "@/components/ai/ai-generation-dialog";
import { useOllamaSafe } from "@/contexts/ollama-context";
import {
  useWorldLocations,
  useCreateWorldLocation,
  useUpdateWorldLocation,
  useDeleteWorldLocation,
  type WorldLocation,
} from "@/hooks/useForgeContent";
import { parseLocationContent, ParsedLocationData } from "@/lib/utils/ai-content-parser";
import { toast } from "sonner";
import { LocationFormDialog } from "./location-form-dialog";
import { LocationDetailDialog } from "./location-detail-dialog";
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

interface LocationsTabProps {
  campaignId: string;
  isDm: boolean;
}

type LocationType = WorldLocation['type'];

const typeIcons: Partial<Record<LocationType, any>> = {
  world: Globe,
  continent: Mountain,
  region: Flag,
  kingdom: Flag,
  city: Building2,
  village: Home,
  settlement: Home,
  poi: Store,
  dungeon: DoorOpen,
  landmark: Landmark,
  structure: Building2,
  lair: Castle,
  biome: TreePine,
  island: Waves, // Island icon not available in this version
  archipelago: Waves,
};

const typeLabels: Partial<Record<LocationType, string>> = {
  world: "World",
  continent: "Continent",
  region: "Region",
  kingdom: "Kingdom",
  city: "City",
  village: "Village",
  settlement: "Settlement",
  poi: "Point of Interest",
  dungeon: "Dungeon",
  landmark: "Landmark",
  structure: "Structure",
  lair: "Lair",
  biome: "Biome",
  island: "Island",
  archipelago: "Archipelago",
};

// Helper function to get label with fallback
const getTypeLabel = (type: LocationType): string => {
  return typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

export function LocationsTab({ campaignId, isDm }: LocationsTabProps) {
  const { locations, loading, refetch } = useWorldLocations(campaignId, isDm);
  const { createLocation, loading: creating } = useCreateWorldLocation();
  const { updateLocation, loading: updating } = useUpdateWorldLocation();
  const { deleteLocation, loading: deleting } = useDeleteWorldLocation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<LocationType | "all">("all");
  const [selectedLocation, setSelectedLocation] = useState<WorldLocation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorldLocation | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [locationToDelete, setLocationToDelete] = useState<WorldLocation | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<ParsedLocationData | null>(null);

  const ollama = useOllamaSafe();
  const canUseAI = ollama?.settings.enabled && ollama?.isConnected;

  // Build hierarchical structure
  const locationTree = useMemo(() => {
    type LocationNode = WorldLocation & { children: LocationNode[] };
    const locationMap = new Map<string, LocationNode>();
    
    // Initialize all locations
    locations.forEach(loc => {
      locationMap.set(loc.id, { ...loc, children: [] });
    });

    // Build parent-child relationships
    const roots: LocationNode[] = [];
    locations.forEach(loc => {
      const node = locationMap.get(loc.id)!;
      if (loc.parent_location_id) {
        const parent = locationMap.get(loc.parent_location_id);
        if (parent) {
          parent.children.push(node);
        } else {
          roots.push(node); // Orphan node
        }
      } else {
        roots.push(node); // Root node
      }
    });

    return roots;
  }, [locations]);

  // Filter locations
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => {
      const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (loc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesType = typeFilter === "all" || loc.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [locations, searchQuery, typeFilter]);

  const handleCreate = () => {
    setEditingLocation(null);
    setAiGeneratedData(null);
    setIsFormOpen(true);
  };

  const handleEdit = (location: WorldLocation) => {
    setEditingLocation(location);
    setAiGeneratedData(null);
    setIsFormOpen(true);
  };

  const handleDelete = (location: WorldLocation) => {
    setLocationToDelete(location);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!locationToDelete) return;

    const result = await deleteLocation(locationToDelete.id);
    if (result.success) {
      toast.success("Location deleted");
      refetch();
      setIsDeleteDialogOpen(false);
      setLocationToDelete(null);
    } else {
      toast.error(result.error?.message || "Failed to delete location");
    }
  };

  const handleSave = async (data: {
    parent_location_id?: string | null;
    name: string;
    type: LocationType;
    description?: string | null;
    image_url?: string | null;
    marker_color?: string | null;
    status?: string | null;
    metadata?: any;
    hidden_from_players?: boolean;
    dm_notes?: string | null;
  }) => {
    if (editingLocation) {
      const result = await updateLocation(editingLocation.id, data);
      if (result.success) {
        toast.success("Location updated");
        setIsFormOpen(false);
        setEditingLocation(null);
        refetch();
      } else {
        toast.error(result.error?.message || "Failed to update location");
      }
    } else {
      const result = await createLocation({
        campaign_id: campaignId,
        ...data,
      });
      if (result.success) {
        toast.success("Location created");
        setIsFormOpen(false);
        refetch();
      } else {
        toast.error(result.error?.message || "Failed to create location");
      }
    }
  };

  const toggleNode = (locationId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(locationId)) {
      newExpanded.delete(locationId);
    } else {
      newExpanded.add(locationId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderLocationNode = (
    node: WorldLocation & { children: any[] },
    level: number = 0
  ) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const Icon = typeIcons[node.type] || MapPin;
    const indent = level * 24;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 p-3 hover:bg-muted/50 rounded-lg transition-colors group"
          style={{ paddingLeft: `${12 + indent}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="shrink-0 w-5 h-5 flex items-center justify-center hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          
          <button
            onClick={() => {
              setSelectedLocation(node);
              setIsDetailOpen(true);
            }}
            className="flex-1 text-left min-w-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium truncate">{node.name}</span>
              {isDm && node.hidden_from_players && (
                <EyeOff className="h-3 w-3 text-yellow-400 shrink-0" />
              )}
              <Badge variant="secondary" className="text-xs shrink-0">
                {getTypeLabel(node.type)}
              </Badge>
              {node.status && node.status !== 'normal' && (
                <Badge variant="outline" className="text-xs shrink-0 capitalize">
                  {node.status.replace('_', ' ')}
                </Badge>
              )}
            </div>
            {node.description && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {node.description}
              </p>
            )}
          </button>

          {isDm && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(node);
                }}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node);
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(child => renderLocationNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "16px 20px" }}>
        <div style={{ marginBottom: 14 }}>
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="sc-card" style={{ padding: 14 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                padding: "10px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <Skeleton className="h-5 w-40 mb-1" />
              <Skeleton className="h-3 w-72" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px" }}>
      {/* Header */}
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
            World Atlas
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {locations.length} location{locations.length === 1 ? "" : "s"} —
            realms, cities, and points of interest
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
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus size={12} />
              New location
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div
          className="sc-input"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            flex: 1,
            minWidth: 200,
          }}
        >
          <Search size={13} style={{ color: "var(--muted-foreground)" }} />
          <input
            type="text"
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: 12.5,
              flex: 1,
              color: "var(--foreground)",
            }}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as LocationType | "all")}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Political/Boundaries</div>
            <SelectItem value="world">{getTypeLabel("world")}</SelectItem>
            <SelectItem value="continent">{getTypeLabel("continent")}</SelectItem>
            <SelectItem value="region">{getTypeLabel("region")}</SelectItem>
            <SelectItem value="kingdom">{getTypeLabel("kingdom")}</SelectItem>
            <SelectItem value="city">{getTypeLabel("city")}</SelectItem>
            <SelectItem value="village">{getTypeLabel("village")}</SelectItem>
            <SelectItem value="settlement">{getTypeLabel("settlement")}</SelectItem>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Adventure Sites</div>
            <SelectItem value="dungeon">{getTypeLabel("dungeon")}</SelectItem>
            <SelectItem value="landmark">{getTypeLabel("landmark")}</SelectItem>
            <SelectItem value="structure">{getTypeLabel("structure")}</SelectItem>
            <SelectItem value="lair">{getTypeLabel("lair")}</SelectItem>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Geographical</div>
            <SelectItem value="biome">{getTypeLabel("biome")}</SelectItem>
            <SelectItem value="island">{getTypeLabel("island")}</SelectItem>
            <SelectItem value="archipelago">{getTypeLabel("archipelago")}</SelectItem>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Legacy</div>
            <SelectItem value="poi">{getTypeLabel("poi")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Location List */}
      {locations.length === 0 ? (
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
            <MapPin size={48} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div style={{ marginBottom: 4 }}>No locations yet.</div>
            {isDm && (
              <div style={{ fontSize: 12 }}>
                Create your first location to start building your world.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="sc-card" style={{ padding: 0, overflow: "hidden" }}>
            {searchQuery || typeFilter !== "all" ? (
              // Flat list for filtered view
              <div className="divide-y">
                {filteredLocations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No locations match your filters
                  </div>
                ) : (
                  filteredLocations.map((location) => {
                    const Icon = typeIcons[location.type] || MapPin;
                    return (
                      <div
                        key={location.id}
                        className="flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors group"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <button
                          onClick={() => {
                            setSelectedLocation(location);
                            setIsDetailOpen(true);
                          }}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium truncate">{location.name}</span>
                            {isDm && location.hidden_from_players && (
                              <EyeOff className="h-3 w-3 text-yellow-400 shrink-0" />
                            )}
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {getTypeLabel(location.type)}
                            </Badge>
                            {location.status && location.status !== 'normal' && (
                              <Badge variant="outline" className="text-xs shrink-0 capitalize">
                                {location.status.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          {location.description && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {location.description}
                            </p>
                          )}
                        </button>
                        {isDm && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(location);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(location);
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Tree view for unfiltered
              <div className="divide-y">
                {locationTree.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No locations found
                  </div>
                ) : (
                  locationTree
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(root => renderLocationNode(root))
                )}
              </div>
            )}
        </div>
      )}

      {/* Dialogs */}
      <LocationFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        location={editingLocation}
        initialData={aiGeneratedData}
        locations={locations}
        campaignId={campaignId}
        isDm={isDm}
        onSave={handleSave}
        loading={creating || updating}
      />

      <LocationDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        location={selectedLocation}
        locations={locations}
        campaignId={campaignId}
        isDm={isDm}
        onEdit={() => {
          if (selectedLocation) {
            setEditingLocation(selectedLocation);
            setIsDetailOpen(false);
            setIsFormOpen(true);
          }
        }}
        onDelete={() => {
          if (selectedLocation) {
            handleDelete(selectedLocation);
            setIsDetailOpen(false);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setLocationToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{locationToDelete?.name}&quot;? This will also delete all child locations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
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
        generatorType="location"
        title="Generate Location with AI"
        description="Create a detailed location with atmosphere, features, and secrets"
        onGenerated={(content) => {
          const parsedData = parseLocationContent(content);
          setAiGeneratedData(parsedData);
          setAiDialogOpen(false);
          setTimeout(() => {
            setIsFormOpen(true);
          }, 50);
        }}
      />
    </div>
  );
}
