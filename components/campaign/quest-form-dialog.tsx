"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Quest, QuestStep, QuestObjective } from "@/hooks/useCampaignContent";
import { Plus, Trash2, GripVertical, CheckCircle2, XCircle, Circle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface QuestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  userId: string;
  isDm?: boolean;
  quest?: Quest | null;
  onCreate: (data: {
    campaign_id: string;
    title: string;
    content: string;
    source?: string | null;
    location?: string | null;
    verified?: boolean;
    created_by: string;
    steps?: Array<{
      step_order: number;
      name?: string | null;
      description?: string | null;
      objectives?: Array<{
        objective_order: number;
        name?: string | null;
        goal: string;
        status?: 'pending' | 'success' | 'failure';
        is_hidden?: boolean;
      }>;
    }>;
  }) => Promise<{ success: boolean; error?: Error }>;
  onUpdate: (
    questId: string,
    data: {
      title?: string;
      content?: string;
      source?: string | null;
      location?: string | null;
      verified?: boolean;
      steps?: Array<{
        id?: string;
        step_order: number;
        name?: string | null;
        description?: string | null;
        objectives?: Array<{
          id?: string;
          objective_order: number;
          name?: string | null;
          goal: string;
          status?: 'pending' | 'success' | 'failure';
          is_hidden?: boolean;
        }>;
      }>;
    }
  ) => Promise<{ success: boolean; error?: Error }>;
}

interface StepData {
  id?: string;
  step_order: number;
  name: string;
  description: string;
  objectives: ObjectiveData[];
}

interface ObjectiveData {
  id?: string;
  objective_order: number;
  name: string;
  goal: string;
  status: 'pending' | 'success' | 'failure';
}

export function QuestFormDialog({
  open,
  onOpenChange,
  campaignId,
  userId,
  isDm = false,
  quest,
  onCreate,
  onUpdate,
}: QuestFormDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [location, setLocation] = useState("");
  const [verified, setVerified] = useState(false);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (quest) {
      setTitle(quest.title);
      setContent(quest.content);
      setSource(quest.source || "");
      setLocation(quest.location || "");
      setVerified(quest.verified);
      
      // Load steps and objectives
      if (quest.steps && quest.steps.length > 0) {
        const loadedSteps = quest.steps.map(step => ({
          id: step.id,
          step_order: step.step_order,
          name: step.name || "",
          description: step.description || "",
          objectives: (step.objectives || []).map(obj => ({
            id: obj.id,
            objective_order: obj.objective_order,
            name: obj.name || "",
            goal: obj.goal,
            status: obj.status,
            is_hidden: obj.is_hidden || false,
          })),
        }));
        setSteps(loadedSteps);
      } else {
        setSteps([]);
      }
    } else {
      setTitle("");
      setContent("");
      setSource("");
      setLocation("");
      setVerified(false);
      setSteps([]);
    }
  }, [quest, open]);

  const addStep = () => {
    const newStepOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1;
    setSteps([
      ...steps,
      {
        step_order: newStepOrder,
        name: "",
        description: "",
        objectives: [],
      },
    ]);
  };

  const removeStep = (stepIndex: number) => {
    const newSteps = steps.filter((_, idx) => idx !== stepIndex);
    // Reorder remaining steps
    const reorderedSteps = newSteps.map((step, idx) => ({
      ...step,
      step_order: idx + 1,
    }));
    setSteps(reorderedSteps);
  };

  const updateStepName = (stepIndex: number, name: string) => {
    const newSteps = [...steps];
    newSteps[stepIndex].name = name;
    setSteps(newSteps);
  };

  const updateStepDescription = (stepIndex: number, description: string) => {
    const newSteps = [...steps];
    newSteps[stepIndex].description = description;
    setSteps(newSteps);
  };

  const addObjective = (stepIndex: number) => {
    const newSteps = [...steps];
    const step = newSteps[stepIndex];
    const newObjectiveOrder = step.objectives.length > 0
      ? Math.max(...step.objectives.map(o => o.objective_order)) + 1
      : 1;
    
    step.objectives.push({
      objective_order: newObjectiveOrder,
      name: "",
      goal: "",
      status: 'pending',
      is_hidden: false,
    });
    setSteps(newSteps);
  };

  const removeObjective = (stepIndex: number, objectiveIndex: number) => {
    const newSteps = [...steps];
    const step = newSteps[stepIndex];
    step.objectives = step.objectives.filter((_, idx) => idx !== objectiveIndex);
    // Reorder remaining objectives
    step.objectives = step.objectives.map((obj, idx) => ({
      ...obj,
      objective_order: idx + 1,
    }));
    setSteps(newSteps);
  };

  const updateObjectiveName = (stepIndex: number, objectiveIndex: number, name: string) => {
    const newSteps = [...steps];
    newSteps[stepIndex].objectives[objectiveIndex].name = name;
    setSteps(newSteps);
  };

  const updateObjectiveGoal = (stepIndex: number, objectiveIndex: number, goal: string) => {
    const newSteps = [...steps];
    newSteps[stepIndex].objectives[objectiveIndex].goal = goal;
    setSteps(newSteps);
  };

  const toggleObjectiveStatus = (stepIndex: number, objectiveIndex: number) => {
    const newSteps = [...steps];
    const objective = newSteps[stepIndex].objectives[objectiveIndex];
    
    // Cycle through: pending -> success -> failure -> pending
    if (objective.status === 'pending') {
      objective.status = 'success';
    } else if (objective.status === 'success') {
      objective.status = 'failure';
    } else {
      objective.status = 'pending';
    }
    
    setSteps(newSteps);
  };

  const toggleObjectiveHidden = (stepIndex: number, objectiveIndex: number) => {
    const newSteps = [...steps];
    const objective = newSteps[stepIndex].objectives[objectiveIndex];
    objective.is_hidden = !objective.is_hidden;
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      return;
    }

    setLoading(true);
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        source: source.trim() || null,
        location: location.trim() || null,
        verified: verified,
      };

      let result;
      if (quest) {
        // Prepare steps data for update
        const stepsData = steps
          .filter(step => step.name.trim() || step.description.trim() || step.objectives.length > 0)
          .map(step => ({
            id: step.id,
            step_order: step.step_order,
            name: step.name.trim() || null,
            description: step.description.trim() || null,
            objectives: step.objectives
              .filter(obj => obj.name.trim() || obj.goal.trim())
              .map(obj => ({
                id: obj.id,
                objective_order: obj.objective_order,
                name: obj.name.trim() || null,
                goal: obj.goal.trim(),
                status: obj.status,
                is_hidden: obj.is_hidden || false,
              })),
          }));

        result = await onUpdate(quest.id, {
          ...data,
          steps: stepsData.length > 0 ? stepsData : [],
        });
      } else {
        // Prepare steps data for creation
        const stepsData = steps
          .filter(step => step.name.trim() || step.description.trim() || step.objectives.length > 0)
          .map(step => ({
            step_order: step.step_order,
            name: step.name.trim() || null,
            description: step.description.trim() || null,
            objectives: step.objectives
              .filter(obj => obj.name.trim() || obj.goal.trim())
              .map(obj => ({
                objective_order: obj.objective_order,
                name: obj.name.trim() || null,
                goal: obj.goal.trim(),
                status: obj.status,
                is_hidden: obj.is_hidden || false,
              })),
          }));

        result = await onCreate({
          campaign_id: campaignId,
          created_by: userId,
          ...data,
          steps: stepsData.length > 0 ? stepsData : undefined,
        });
      }

      if (result.success) {
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {quest ? "Edit Quest" : "Create Quest"}
            </DialogTitle>
            <DialogDescription>
              {quest
                ? "Update quest details below."
                : "Add a new quest or side quest to the quest board."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quest title"
                required
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">
                Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="The full quest or side quest details..."
                rows={4}
                required
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Tavern gossip"
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Waterdeep"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="verified"
                checked={verified}
                onCheckedChange={(checked) => setVerified(checked === true)}
                disabled={loading}
              />
              <Label
                htmlFor="verified"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Verified (this quest has been confirmed as true)
              </Label>
            </div>

            {/* Steps Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Quest Steps</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStep}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No steps yet. Add your first step to organize quest objectives.
                </p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {steps.map((step, stepIndex) => (
                    <AccordionItem key={stepIndex} value={`step-${stepIndex}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2 flex-1">
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            Step {step.step_order}
                            {step.name.trim() && (
                              <span className="text-muted-foreground font-normal ml-2">
                                - {step.name.trim()}
                              </span>
                            )}
                            {!step.name.trim() && step.description.trim() && (
                              <span className="text-muted-foreground font-normal ml-2">
                                - {step.description.trim().substring(0, 40)}
                                {step.description.trim().length > 40 ? "..." : ""}
                              </span>
                            )}
                          </span>
                          {step.objectives.length > 0 && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {step.objectives.filter(o => o.status !== 'pending').length} / {step.objectives.length} complete
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pl-6">
                          <div className="grid gap-2">
                            <Label htmlFor={`step-${stepIndex}-name`}>
                              Step Name
                            </Label>
                            <Input
                              id={`step-${stepIndex}-name`}
                              value={step.name}
                              onChange={(e) => updateStepName(stepIndex, e.target.value)}
                              placeholder="e.g., Investigate the Tavern"
                              disabled={loading}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor={`step-${stepIndex}-description`}>
                              Step Description
                            </Label>
                            <Textarea
                              id={`step-${stepIndex}-description`}
                              value={step.description}
                              onChange={(e) => updateStepDescription(stepIndex, e.target.value)}
                              placeholder="Describe what happens in this step..."
                              rows={3}
                              disabled={loading}
                            />
                          </div>

                          <div className="space-y-2">
                              <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold">Objectives</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addObjective(stepIndex)}
                                disabled={loading}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add Objective
                              </Button>
                            </div>

                            {step.objectives.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No objectives yet. Add objectives to track quest goals.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {step.objectives.map((objective, objIndex) => (
                                  <div
                                    key={objIndex}
                                    className="space-y-2 p-2 rounded-md border bg-card"
                                  >
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleObjectiveStatus(stepIndex, objIndex)}
                                        disabled={loading}
                                        className={cn(
                                          "flex-shrink-0",
                                          "hover:opacity-80 transition-opacity",
                                          loading && "cursor-not-allowed opacity-50"
                                        )}
                                      >
                                        {objective.status === 'success' && (
                                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        )}
                                        {objective.status === 'failure' && (
                                          <XCircle className="h-5 w-5 text-red-600" />
                                        )}
                                        {objective.status === 'pending' && (
                                          <Circle className="h-5 w-5 text-muted-foreground" />
                                        )}
                                      </button>
                                      <Input
                                        value={objective.name}
                                        onChange={(e) => updateObjectiveName(stepIndex, objIndex, e.target.value)}
                                        placeholder="Objective name..."
                                        disabled={loading}
                                        className="flex-1"
                                      />
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeObjective(stepIndex, objIndex)}
                                        disabled={loading}
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <Input
                                      value={objective.goal}
                                      onChange={(e) => updateObjectiveGoal(stepIndex, objIndex, e.target.value)}
                                      placeholder="Objective goal/description..."
                                      disabled={loading}
                                      className="w-full"
                                    />
                                    {isDm && (
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          id={`hidden-${stepIndex}-${objIndex}`}
                                          checked={objective.is_hidden || false}
                                          onCheckedChange={() => toggleObjectiveHidden(stepIndex, objIndex)}
                                          disabled={loading}
                                        />
                                        <Label
                                          htmlFor={`hidden-${stepIndex}-${objIndex}`}
                                          className="text-xs text-muted-foreground cursor-pointer"
                                        >
                                          Hidden (DM only)
                                        </Label>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeStep(stepIndex)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove Step
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim() || !content.trim()}>
              {loading ? "Saving..." : quest ? "Save Changes" : "Create Quest"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
