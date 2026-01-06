"use client";

import { useState, useMemo } from "react";
import { Scene } from "@/hooks/useForgeContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Plus, Map, Image as ImageIcon, Edit2, Trash2, Maximize2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SceneListProps {
  scenes: Scene[];
  selectedSceneId: string | null;
  onSelectScene: (sceneId: string | null) => void;
  onCreateScene: () => void;
  onEditScene: (scene: Scene) => void;
  onDeleteScene: (sceneId: string) => void;
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
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Map className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-2">No scenes yet</p>
            {isDm && (
              <Button onClick={onCreateScene} size="sm" className="mt-2">
                <Plus className="h-4 w-4 mr-2" />
                Create First Scene
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {isDm && (
        <Button
          onClick={onCreateScene}
          className="w-full"
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Scene
        </Button>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search scenes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {filteredScenes.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground text-sm">
                  No scenes found matching "{searchQuery}"
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredScenes.map((scene) => {
          const isSelected = selectedSceneId === scene.id;
          return (
            <Card
              key={scene.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                isSelected && "border-primary bg-primary/5"
              )}
              onClick={() => onSelectScene(scene.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Thumbnail or icon */}
                  <div className="shrink-0">
                    {scene.image_url ? (
                      <img
                        src={scene.image_url}
                        alt={scene.name}
                        className="w-16 h-16 rounded object-cover border border-border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-muted border border-border flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Scene info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{scene.name}</h3>
                    {scene.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {scene.description}
                      </p>
                    )}
                    {!scene.image_url && (
                      <p className="text-xs text-muted-foreground mt-1">
                        No map image
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {isDm && (
                    <div className="shrink-0 flex gap-1" onClick={(e) => e.stopPropagation()}>
                      {scene.image_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => handleOpenEditor(scene.id, e)}
                          title="Open in fullscreen editor"
                        >
                          <Maximize2 className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => onEditScene(scene)}
                        title="Edit scene"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => onDeleteScene(scene.id)}
                        title="Delete scene"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
          })
        )}
      </div>
    </div>
  );
}

