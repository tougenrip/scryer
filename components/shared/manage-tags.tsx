"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { normalizeMetadataTags } from "@/lib/utils/metadata-tags";

interface ManageTagsProps {
  campaignId: string;
  entityId: string;
  entityType: 'npc' | 'faction' | 'location' | 'pantheon';
  currentTags: string[];
  onUpdate: (tags: string[]) => void;
  isDm?: boolean;
}

export function ManageTags({ 
  campaignId, 
  entityId, 
  entityType,
  currentTags, 
  onUpdate, 
  isDm = false 
}: ManageTagsProps) {
  const [newTag, setNewTag] = useState("");
  const [tags, setTags] = useState<string[]>(() => normalizeMetadataTags(currentTags));

  useEffect(() => {
    setTags(normalizeMetadataTags(currentTags));
  }, [currentTags]);

  const handleAddTag = async () => {
    const raw = newTag.trim();
    if (!raw) return;

    const parts = raw.includes(",") || raw.includes("\n")
      ? raw
          .split(/[,\n]+/)
          .map((p) => p.trim())
          .filter(Boolean)
      : [raw];

    const dedupAdd = parts.filter((p) => !tags.includes(p));
    if (dedupAdd.length === 0) {
      toast.error(parts.length > 1 ? "Those tags are already added" : "Tag already exists");
      return;
    }

    const newTags = [...tags, ...dedupAdd];
    setTags(newTags);
    setNewTag("");

    await saveTagsToDatabase(newTags);
    onUpdate(newTags);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);

    // Save to database
    await saveTagsToDatabase(newTags);
    onUpdate(newTags);
    toast.success("Tag removed");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleAddTag();
    }
  };

  const saveTagsToDatabase = async (tagsToSave: string[]) => {
    const supabase = createClient();
    
    let tableName = '';
    if (entityType === 'npc') tableName = 'npcs';
    else if (entityType === 'faction') tableName = 'factions';
    else if (entityType === 'location') tableName = 'world_locations';
    else if (entityType === 'pantheon') tableName = 'pantheon_deities';

    if (!tableName) return;

    // Get current metadata
    const { data: entity } = await supabase
      .from(tableName)
      .select('metadata')
      .eq('id', entityId)
      .single();

    const currentMetadata = entity?.metadata || {};
    const updateData = {
      metadata: { ...currentMetadata, tags: tagsToSave }
    };

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', entityId);

    if (error) {
      toast.error("Failed to save tags");
      console.error("Error saving tags:", error);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide">TAGS</h3>
      
      {/* Add Tag Input */}
      {isDm && (
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tag(s) — comma-separated ok, then Enter"
            className="flex-1"
          />
          <Button onClick={() => void handleAddTag()} size="sm" disabled={!newTag.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tags Display */}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags</p>
        ) : (
          tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="flex items-center gap-1">
              {tag}
              {isDm && (
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => handleRemoveTag(tag)}
                />
              )}
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

