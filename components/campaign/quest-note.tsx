"use client";

import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, CheckCircle2, XCircle, Circle, ChevronDown, ChevronRight, EyeOff } from "lucide-react";
import { Quest, QuestStep, QuestObjective } from "@/hooks/useCampaignContent";
import { cn } from "@/lib/utils";
import { useUpdateQuestObjective } from "@/hooks/useCampaignContent";
import { toast } from "sonner";

interface QuestNoteProps {
  quest: Quest;
  isDm: boolean;
  onEdit?: (quest: Quest) => void;
  onDelete?: (questId: string) => void;
  onUpdate?: () => void;
}

export function QuestNote({ quest, isDm, onEdit, onDelete, onUpdate }: QuestNoteProps) {
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="font-serif mb-2">{localQuest.title}</CardTitle>
            <CardDescription className="line-clamp-2">
              {localQuest.content}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {localQuest.verified && (
              <Badge variant="default" className="bg-green-600 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {isDm && (
              <div className="flex gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(localQuest);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(localQuest.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        {(localQuest.source || localQuest.location) && (
          <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
            {localQuest.source && (
              <span>Source: {localQuest.source}</span>
            )}
            {localQuest.location && (
              <span>Location: {localQuest.location}</span>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto">
        {/* Steps and Objectives */}
        {localQuest.steps && localQuest.steps.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Quest Steps</h4>
            {localQuest.steps.map((step) => {
              const isExpanded = expandedSteps.has(step.id);
              const completedObjectives = step.objectives?.filter(o => o.status !== 'pending').length || 0;
              const totalObjectives = step.objectives?.length || 0;
              
              return (
                <div
                  key={step.id}
                  className="border rounded-lg p-3 bg-muted/30"
                >
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleStepExpansion(step.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold flex-1">
                      {step.name ? step.name : `Step ${step.step_order}`}
                    </span>
                    {totalObjectives > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {completedObjectives}/{totalObjectives}
                      </Badge>
                    )}
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-3 pl-6 space-y-3">
                      {step.description && (
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                      )}
                      
                      {step.objectives && step.objectives.length > 0 ? (
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold text-muted-foreground uppercase">Objectives</h5>
                          {step.objectives.map((objective) => (
                            <button
                              key={objective.id}
                              type="button"
                              className={cn(
                                "w-full text-left space-y-1 p-2 rounded-md border bg-background",
                                isDm && "cursor-pointer hover:bg-muted/50 transition-colors",
                                !isDm && "cursor-default"
                              )}
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
                                  <EyeOff className="h-3 w-3 text-amber-600 flex-shrink-0" title="Hidden objective (DM only)" />
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
          <p className="text-sm text-muted-foreground text-center py-4">
            No steps added yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
