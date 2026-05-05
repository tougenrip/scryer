"use client";

import { useCampaignObjectives, useUpdateObjective, useDeleteObjective } from "@/hooks/usePartyTools";
import {
  useCampaignQuests,
  useUpdateQuestObjective,
  type Quest,
  type QuestObjective,
} from "@/hooks/useCampaignContent";
import { useVttTrackedObjectives } from "@/hooks/useVttTrackedObjectives";
import type { VttTrackedObjectiveSource } from "@/hooks/useVttTrackedObjectives";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Trash2, CheckCircle2, Circle, XCircle, ScrollText, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { notifyVttObjectivesChanged } from "@/lib/vtt/objective-events";

interface ObjectiveTrackerProps {
  campaignId: string;
  isDm: boolean;
  className?: string;
}

export function ObjectiveTracker({ campaignId, isDm, className }: ObjectiveTrackerProps) {
  const { objectives, loading, refetch } = useCampaignObjectives(campaignId);
  const { quests, loading: questsLoading, refetch: refetchQuests } = useCampaignQuests(campaignId);
  const { updateObjective } = useUpdateObjective();
  const { updateObjective: updateQuestObjective } = useUpdateQuestObjective();
  const { deleteObjective } = useDeleteObjective();
  const { isTracked, toggle: toggleTracked } = useVttTrackedObjectives(campaignId);
  const visibleQuests = quests
    .map((quest) => filterQuestForVtt(quest, isDm))
    .filter((quest): quest is Quest => quest !== null);
  const completedQuestObjectives = visibleQuests
    .flatMap((quest) => quest.steps ?? [])
    .flatMap((step) => step.objectives ?? [])
    .filter((objective) => objective.status === "success").length;
  const totalQuestObjectives = visibleQuests
    .flatMap((quest) => quest.steps ?? [])
    .flatMap((step) => step.objectives ?? []).length;

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

  const handleQuestObjectiveToggle = async (objective: QuestObjective) => {
    if (!isDm) return;
    const nextStatus =
      objective.status === "pending"
        ? "success"
        : objective.status === "success"
          ? "failure"
          : "pending";
    const result = await updateQuestObjective(objective.id, { status: nextStatus });
    if (result.success) {
      void refetchQuests();
      notifyVttObjectivesChanged(campaignId);
    } else {
      toast.error("Failed to update quest objective");
    }
  };

  const handleTrackedToggle = async (
    sourceType: VttTrackedObjectiveSource,
    sourceId: string
  ) => {
    if (!isDm) return;
    const result = await toggleTracked(sourceType, sourceId);
    if (!result.success) {
      const error = result.error as { error?: string; details?: string; code?: string } | undefined;
      toast.error(error?.error || "Failed to update HUD objective");
      console.error("Failed to update HUD objective:", error);
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
          {objectives.filter(o => o.completed).length + completedQuestObjectives} /{" "}
          {objectives.length + totalQuestObjectives} Completed
        </span>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        {loading || questsLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : objectives.length === 0 && visibleQuests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No active objectives.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleQuests.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ScrollText className="h-3.5 w-3.5" />
                  Forge Quests
                </div>
                <div className="space-y-2">
                  {visibleQuests.map((quest) => (
                    <QuestObjectiveGroup
                      key={quest.id}
                      quest={quest}
                      isDm={isDm}
                      onToggle={handleQuestObjectiveToggle}
                      isQuestTracked={isTracked("quest", quest.id)}
                      onQuestTrackedToggle={() => handleTrackedToggle("quest", quest.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {objectives.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Party Objectives
                </div>
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
                        disabled={!isDm && !objective.completed}
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
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant={isTracked("party_objective", objective.id) ? "secondary" : "ghost"}
                          size="sm"
                          className="h-6 px-1.5 text-[10px]"
                          onClick={() => handleTrackedToggle("party_objective", objective.id)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          {isTracked("party_objective", objective.id) ? "On HUD" : "Set HUD"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDelete(objective.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </section>
            )}
          </div>
        )}
      </ScrollArea>

    </div>
  );
}

function filterQuestForVtt(quest: Quest, isDm: boolean): Quest | null {
  const steps = (quest.steps ?? [])
    .map((step) => {
      const objectives = (step.objectives ?? []).filter((objective) => isDm || !objective.is_hidden);
      return { ...step, objectives };
    })
    .filter((step) => (step.objectives ?? []).length > 0);

  if (steps.length === 0) return null;
  return { ...quest, steps };
}

function QuestObjectiveGroup({
  quest,
  isDm,
  onToggle,
  isQuestTracked,
  onQuestTrackedToggle,
}: {
  quest: Quest;
  isDm: boolean;
  onToggle: (objective: QuestObjective) => void;
  isQuestTracked: boolean;
  onQuestTrackedToggle: () => void;
}) {
  const objectives = (quest.steps ?? []).flatMap((step) => step.objectives ?? []);
  const completed = objectives.filter((objective) => objective.status === "success").length;

  return (
    <div className="rounded-md border border-border bg-card/80 p-2.5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{quest.title}</p>
          {quest.location && (
            <p className="truncate text-[10px] text-muted-foreground">{quest.location}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isDm && (
            <Button
              type="button"
              variant={isQuestTracked ? "secondary" : "outline"}
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={onQuestTrackedToggle}
            >
              <Eye className="mr-1 h-3 w-3" />
              {isQuestTracked ? "On HUD" : "Set HUD"}
            </Button>
          )}
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {completed}/{objectives.length}
          </span>
        </div>
      </div>
      <div className="space-y-1.5">
        {objectives.map((objective) => (
          <div
            key={objective.id}
            className={cn(
              "flex w-full items-start gap-2 rounded-sm px-1.5 py-1 text-left text-xs transition-colors",
              isDm && "hover:bg-muted",
              objective.status === "success" && "text-muted-foreground line-through",
              objective.status === "failure" && "text-destructive"
            )}
          >
            <button
              type="button"
              disabled={!isDm}
              onClick={() => onToggle(objective)}
              className={cn(
                "flex min-w-0 flex-1 items-start gap-2 text-left",
                !isDm && "cursor-default"
              )}
            >
              {objective.status === "success" ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
              ) : objective.status === "failure" ? (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 break-words">
                {objective.name?.trim() || objective.goal}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
