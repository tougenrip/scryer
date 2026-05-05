"use client";

import { useState, useEffect, useRef } from "react";
import {
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Users,
  BadgeCheck,
} from "lucide-react";
import { Quest, QuestObjective } from "@/hooks/useCampaignContent";
import { cn } from "@/lib/utils";
import { useUpdateQuestObjective } from "@/hooks/useCampaignContent";
import { toast } from "sonner";

/** Matches forge handoff: Active | Offered | Completed (dimmed when done). */
function questStatusMeta(quest: Quest): { label: string; dim?: boolean } {
  const steps = quest.steps ?? [];
  const objectives = steps.flatMap((s) => s.objectives ?? []);
  if (objectives.length === 0) {
    return { label: "Active" };
  }
  const allPending = objectives.every((o) => o.status === "pending");
  if (allPending) return { label: "Offered" };
  const allSuccess = objectives.every((o) => o.status === "success");
  if (allSuccess) return { label: "Completed", dim: true };
  return { label: "Active" };
}

const QUEST_CATEGORY_LABELS = [
  "Urgent",
  "Mystery",
  "Side",
  "Faction",
  "Story",
] as const;

/** Stable thematic tag until quests gain a `category` column. */
function questCategoryLabel(questId: string): string {
  let h = 0;
  for (let i = 0; i < questId.length; i++) {
    h = (h * 31 + questId.charCodeAt(i)) >>> 0;
  }
  return QUEST_CATEGORY_LABELS[h % QUEST_CATEGORY_LABELS.length];
}

interface QuestNoteProps {
  quest: Quest;
  isDm: boolean;
  onEdit?: (quest: Quest) => void;
  onDelete?: (questId: string) => void;
  onUpdate?: () => void;
}

export function QuestNote({ quest, isDm, onEdit, onDelete }: QuestNoteProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [localQuest, setLocalQuest] = useState<Quest>(quest);
  const { updateObjective } = useUpdateQuestObjective();
  const isUpdatingRef = useRef(false);

  // Update local quest when prop changes, but skip if we just did an optimistic update
  useEffect(() => {
    if (!isUpdatingRef.current) {
      setLocalQuest(quest);
    }
    isUpdatingRef.current = false;
  }, [quest]);

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const handleObjectiveToggle = async (objective: QuestObjective, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDm) return;

    let newStatus: 'pending' | 'success' | 'failure';
    if (objective.status === 'pending') {
      newStatus = 'success';
    } else if (objective.status === 'success') {
      newStatus = 'failure';
    } else {
      newStatus = 'pending';
    }

    // Optimistically update local state
    isUpdatingRef.current = true;
    setLocalQuest(prevQuest => {
      if (!prevQuest.steps) return prevQuest;
      
      return {
        ...prevQuest,
        steps: prevQuest.steps.map(step => ({
          ...step,
          objectives: step.objectives?.map(obj => 
            obj.id === objective.id 
              ? { ...obj, status: newStatus }
              : obj
          )
        }))
      };
    });

    // Update in database
    const result = await updateObjective(objective.id, { status: newStatus });
    if (result.success) {
      toast.success("Objective updated");
      // Don't call onUpdate - we've already updated local state optimistically
      // This prevents unnecessary refetch and card refresh
    } else {
      toast.error("Failed to update objective");
      // Revert optimistic update on error
      isUpdatingRef.current = false;
      setLocalQuest(quest);
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'failure') => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'failure') => {
    switch (status) {
      case 'success':
        return "text-green-600";
      case 'failure':
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const status = questStatusMeta(localQuest);
  const category = questCategoryLabel(localQuest.id);

  return (
    <div
      className="sc-card sc-card-hover relative flex h-full flex-col"
      style={{ padding: 14, cursor: "default" }}
    >
      {isDm && (onEdit || onDelete) && (
        <div
          className="absolute flex gap-1"
          style={{ top: 10, right: 10 }}
        >
          {onEdit && (
            <button
              type="button"
              className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(localQuest);
              }}
              aria-label="Edit quest"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon"
              style={{ color: "var(--destructive)" }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(localQuest.id);
              }}
              aria-label="Delete quest"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 8,
          flexWrap: "wrap",
          paddingRight: isDm ? 72 : 0,
        }}
      >
        <span className="sc-badge sc-badge-primary" style={{ fontSize: 10 }}>
          {category}
        </span>
        <span
          className="sc-badge"
          style={{
            fontSize: 10,
            opacity: status.dim ? 0.5 : 1,
          }}
        >
          {status.label}
        </span>
        {localQuest.verified && (
          <span
            className="inline-flex shrink-0 items-center"
            title="Verified"
            style={{ color: "var(--primary)", opacity: 0.88 }}
          >
            <BadgeCheck className="h-3.5 w-3.5" aria-label="Verified quest" />
          </span>
        )}
      </div>

      <div className="min-w-0 pr-1" style={{ marginBottom: 10 }}>
        <div
          className="font-serif leading-snug"
          style={{
            fontSize: 17,
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            lineHeight: 1.25,
          }}
        >
          {localQuest.title}
        </div>
        <p
          className="line-clamp-3"
          style={{
            fontSize: 12,
            lineHeight: 1.55,
            color: "var(--muted-foreground)",
            margin: 0,
          }}
        >
          {localQuest.content}
        </p>
      </div>

      {(localQuest.source || localQuest.location) && (
        <div
          style={{
            fontSize: 11,
            color: "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 10,
          }}
        >
          <Users size={11} className="shrink-0 opacity-80" />
          <span>
            Given by {localQuest.source?.trim() || "—"}
            {localQuest.location ? ` · ${localQuest.location}` : ""}
          </span>
        </div>
      )}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto",
          (localQuest.steps?.length ?? 0) > 0 && "border-t border-border pt-3",
        )}
      >
        {/* Steps and Objectives */}
        {localQuest.steps && localQuest.steps.length > 0 ? (
          <div className="space-y-3">
            <div className="sc-label">Quest steps</div>
            {localQuest.steps.map((step) => {
              const isExpanded = expandedSteps.has(step.id);
              const completedObjectives = step.objectives?.filter(o => o.status !== 'pending').length || 0;
              const totalObjectives = step.objectives?.length || 0;
              
              return (
                <div
                  key={step.id}
                  className="sc-card"
                  style={{ padding: 12 }}
                >
                  <div
                    className="flex cursor-pointer items-center gap-2"
                    onClick={() => toggleStepExpansion(step.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-sm font-semibold">
                      {step.name ? step.name : `Step ${step.step_order}`}
                    </span>
                    {totalObjectives > 0 && (
                      <span className="sc-badge" style={{ fontSize: 10 }}>
                        {completedObjectives}/{totalObjectives}
                      </span>
                    )}
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-3 space-y-3 pl-6">
                      {step.description && (
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      )}
                      
                      {step.objectives && step.objectives.length > 0 ? (
                        <div className="space-y-2">
                          <div className="sc-label">Objectives</div>
                          {step.objectives.map((objective) => (
                            <button
                              key={objective.id}
                              type="button"
                              className={cn(
                                "sc-card w-full space-y-1 text-left",
                                isDm && "cursor-pointer transition-colors hover:border-primary/35",
                                !isDm && "cursor-default"
                              )}
                              style={{ padding: 8 }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isDm) {
                                  handleObjectiveToggle(objective, e);
                                }
                              }}
                              disabled={!isDm}
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0">
                                  {getStatusIcon(objective.status)}
                                </div>
                                {objective.is_hidden && isDm && (
                                  <span className="inline-flex shrink-0" title="Hidden objective (DM only)">
                                    <EyeOff className="h-3 w-3 text-amber-600" />
                                  </span>
                                )}
                                {objective.name && (
                                  <span className={cn("text-sm font-semibold", getStatusColor(objective.status))}>
                                    {objective.name}
                                  </span>
                                )}
                              </div>
                              {objective.goal && (
                                <p className={cn("text-xs ml-7", getStatusColor(objective.status))}>
                                  {objective.goal}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No objectives</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p
            className="py-3 text-center text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No steps added yet
          </p>
        )}
      </div>
    </div>
  );
}
