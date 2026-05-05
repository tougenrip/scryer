"use client";

import { useState, useMemo } from "react";
import { Scene } from "@/hooks/useForgeContent";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Map, Edit2, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SceneListProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string | null) => void;
  onCreateScene: () => void;
  onEditScene: (scene: Scene) => void;
  onDeleteScene: (scene: Scene) => void;
  loading?: boolean;
  isDm: boolean;
  campaignId: string;
}

export function SceneList({
  scenes,
  selectedSceneId,
  onSelectScene,
  onCreateScene,
  onEditScene,
  onDeleteScene,
  loading = false,
  isDm,
  campaignId,
}: SceneListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter scenes based on search query
  const filteredScenes = useMemo(() => {
    if (!searchQuery.trim()) {
      return scenes;
    }
    
    const query = searchQuery.toLowerCase();
    return scenes.filter((scene) => {
      const nameMatch = scene.name.toLowerCase().includes(query);
      const descriptionMatch = scene.description?.toLowerCase().includes(query);
      return nameMatch || descriptionMatch;
    });
  }, [scenes, searchQuery]);
  
  const handleOpenEditor = (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/campaigns/${campaignId}/scenes/${sceneId}/edit`);
  };
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (scenes.length === 0) {
    return (
      <div className="sc-card" style={{ padding: 24 }}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Map className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-2">No scenes yet</p>
          {isDm && (
            <button type="button" className="sc-btn sc-btn-primary sc-btn-sm mt-2" onClick={onCreateScene}>
              <Plus size={12} />
              Scene
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isDm && (
        <button type="button" className="sc-btn sc-btn-primary sc-btn-sm w-full justify-center" onClick={onCreateScene}>
          <Plus size={12} />
          Scene
        </button>
      )}

      <div style={{ position: "relative" }}>
        <Search
          size={12}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          className="sc-input"
          placeholder="Search scenes…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: 30, fontSize: 12 }}
        />
      </div>

      <div className="flex flex-col gap-2">
        {filteredScenes.length === 0 ? (
          <div className="sc-card p-6 text-center text-sm text-muted-foreground">
            No scenes match &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredScenes.map((scene, index) => {
            const isSelected = selectedSceneId === scene.id;
            const statusLabel = scene.image_url ? "Ready" : "Draft";
            return (
              <div
                key={scene.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "sc-card sc-card-hover flex cursor-pointer flex-col gap-3 p-3.5 transition-colors sm:grid sm:grid-cols-[52px_1fr_auto] sm:items-center sm:gap-4",
                )}
                style={
                  isSelected
                    ? {
                        borderColor: "var(--primary)",
                        background: "color-mix(in srgb, var(--primary) 8%, var(--card))",
                      }
                    : undefined
                }
                onClick={() => onSelectScene(scene.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectScene(scene.id);
                  }
                }}
              >
                <div className="text-center sm:w-[52px]">
                  <div className="sc-label mb-0.5">#</div>
                  <div className="font-serif text-lg leading-none text-foreground">{index + 1}</div>
                </div>
                <div className="min-w-0 border-border sm:border-l sm:pl-4">
                  <div className="font-serif text-[15px] leading-snug">{scene.name}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {scene.description?.trim() || (scene.image_url ? "Map ready." : "Add a map image in the editor.")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={cn("sc-badge text-[10px]", scene.image_url ? "sc-badge-primary" : "")}
                  >
                    {statusLabel}
                  </span>
                  <button
                    type="button"
                    className="sc-btn sc-btn-sm"
                    onClick={(e) => handleOpenEditor(scene.id, e)}
                  >
                    Open
                  </button>
                  {isDm && (
                    <>
                      <button
                        type="button"
                        className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon"
                        title="Edit details"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditScene(scene);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon text-destructive"
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteScene(scene);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

