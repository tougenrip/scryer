"use client";

import { useState } from "react";
import { useCampaignObjectives, useCreateObjective, useUpdateObjective, useDeleteObjective } from "@/hooks/usePartyTools";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ObjectiveTrackerProps {
  campaignId: string;
  isDm: boolean;
  className?: string;
}

export function ObjectiveTracker({ campaignId, isDm, className }: ObjectiveTrackerProps) {
  const { objectives, loading, refetch } = useCampaignObjectives(campaignId);
  const { createObjective, loading: creating } = useCreateObjective();
  const { updateObjective } = useUpdateObjective();
  const { deleteObjective } = useDeleteObjective();
  const [newObjective, setNewObjective] = useState("");

  const handleAdd = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newObjective.trim()) return;

    const result = await createObjective({
      campaign_id: campaignId,
      description: newObjective.trim(),
      order: objectives.length,
    });

    if (result.success) {
      setNewObjective("");
      refetch();
    } else {
      toast.error("Failed to add objective");
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    // Optimistic update could be handled here, but relying on realtime for simplicity
    const result = await updateObjective(id, { completed: !current });
    if (!result.success) {
      toast.error("Failed to update objective");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteObjective(id);
    if (result.success) {
      refetch();
    } else {
      toast.error("Failed to delete objective");
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          Objectives
        </h3>
        <span className="text-xs text-muted-foreground">
          {objectives.filter(o => o.completed).length} / {objectives.length} Completed
        </span>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : objectives.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No active objectives.
            {isDm && " Add one below!"}
          </div>
        ) : (
          <div className="space-y-2">
            {objectives.map((objective) => (
              <div
                key={objective.id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-md transition-colors group",
                  objective.completed ? "bg-muted/30" : "bg-card hover:bg-muted/50"
                )}
              >
                <div className="pt-0.5">
                  <Checkbox
                    id={`obj-${objective.id}`}
                    checked={objective.completed}
                    onCheckedChange={() => handleToggle(objective.id, objective.completed)}
                    disabled={!isDm && !objective.completed} // Only DM can uncheck? Or anyone? Usually DM manages, but players might check off. Let's allow players to toggle.
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={`obj-${objective.id}`}
                    className={cn(
                      "text-sm leading-none cursor-pointer break-words",
                      objective.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {objective.description}
                  </label>
                </div>
                {isDm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-1"
                    onClick={() => handleDelete(objective.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {isDm && (
        <form onSubmit={handleAdd} className="mt-4 flex gap-2">
          <Input
            placeholder="New objective..."
            value={newObjective}
            onChange={(e) => setNewObjective(e.target.value)}
            className="h-9 text-sm"
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={creating || !newObjective.trim()}
            className="h-9 px-3"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </form>
      )}
    </div>
  );
}
