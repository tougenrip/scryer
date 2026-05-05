"use client";

import { useEffect } from "react";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { useCampaignQuests } from "@/hooks/useCampaignContent";
import { useCampaignObjectives } from "@/hooks/usePartyTools";
import { useVttTrackedObjectives } from "@/hooks/useVttTrackedObjectives";
import { createClient } from "@/lib/supabase/client";
import { VTT_OBJECTIVES_CHANGED_EVENT } from "@/lib/vtt/objective-events";
import { cn } from "@/lib/utils";

type HudObjective = {
  id: string;
  text: string;
  status: "pending" | "success" | "failure";
};

type HudQuest = {
  id: string;
  title: string;
  objectives: HudObjective[];
};

function StatusIcon({ status }: { status: HudObjective["status"] }) {
  if (status === "success") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" strokeWidth={2.4} />;
  }
  if (status === "failure") {
    return <XCircle className="h-4 w-4 shrink-0 text-red-300" strokeWidth={2.4} />;
  }
  return <Circle className="h-4 w-4 shrink-0 text-zinc-100/85" strokeWidth={2.2} />;
}

export function VttQuestHud({
  campaignId,
  className,
}: {
  campaignId: string;
  isDm: boolean;
  className?: string;
}) {
  const { quests, loading: questsLoading, refetch: refetchQuests } = useCampaignQuests(campaignId);
  const { objectives, loading: objectivesLoading } = useCampaignObjectives(campaignId);
  const { tracked, loading: trackedLoading } = useVttTrackedObjectives(campaignId);

  useEffect(() => {
    if (!campaignId) return;
    const handleLocalObjectiveChange = (event: Event) => {
      const detail = (event as CustomEvent<{ campaignId?: string }>).detail;
      if (detail?.campaignId === campaignId) {
        void refetchQuests();
      }
    };
    window.addEventListener(VTT_OBJECTIVES_CHANGED_EVENT, handleLocalObjectiveChange);

    const supabase = createClient();
    const channel = supabase
      .channel(`vtt-quest-hud-progress:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quest_objectives",
        },
        () => {
          void refetchQuests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quest_steps",
        },
        () => {
          void refetchQuests();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quests",
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          void refetchQuests();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener(VTT_OBJECTIVES_CHANGED_EVENT, handleLocalObjectiveChange);
      void supabase.removeChannel(channel);
    };
  }, [campaignId, refetchQuests]);

  const items = tracked
    .map((trackedObjective): HudQuest | null => {
      if (trackedObjective.source_type === "party_objective") {
        const objective = objectives.find((item) => item.id === trackedObjective.source_id);
        if (!objective || objective.completed) return null;
        return {
          id: trackedObjective.id,
          title: "Objectives",
          objectives: [
            {
              id: objective.id,
              text: objective.description,
              status: "pending",
            },
          ],
        };
      }

      if (trackedObjective.source_type === "quest") {
        const quest = quests.find((item) => item.id === trackedObjective.source_id);
        if (!quest) return null;
        const visibleObjectives = (quest.steps ?? [])
          .flatMap((step) => step.objectives ?? [])
          .map((objective) => ({
            id: objective.id,
            text: objective.name?.trim() || objective.goal,
            status: objective.status,
          }));
        if (visibleObjectives.length === 0) return null;
        return {
          id: trackedObjective.id,
          title: quest.title,
          objectives: visibleObjectives,
        };
      }

      for (const quest of quests) {
        for (const step of quest.steps ?? []) {
          const objective = (step.objectives ?? []).find(
            (item) => item.id === trackedObjective.source_id
          );
          if (!objective) continue;
          if (objective.status === "success" || objective.status === "failure") return null;
          return {
            id: trackedObjective.id,
            title: quest.title,
            objectives: [
              {
                id: objective.id,
                text: objective.name?.trim() || objective.goal,
                status: objective.status,
              },
            ],
          };
        }
      }
      return null;
    })
    .filter((item): item is HudQuest => item !== null)
    .slice(0, 4);

  if ((questsLoading || objectivesLoading || trackedLoading) && items.length === 0) return null;
  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-16 top-4 z-[25] w-[min(340px,calc(100vw-5rem))]",
        "select-none text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.9)]",
        className
      )}
    >
      <div className="space-y-2">
          {items.map((quest) => (
            <div
              key={quest.id}
              className="relative overflow-hidden rounded-md border border-zinc-100/10 bg-gradient-to-r from-black/78 via-neutral-950/68 to-black/30 shadow-[0_14px_30px_rgba(0,0,0,0.42)] backdrop-blur-[2px]"
            >
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-amber-300/10 to-transparent" />
              <div className="relative border-l-2 border-amber-300/70 px-3 py-2">
                <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3">
                  <div className="min-w-0 truncate text-[14px] font-semibold leading-tight text-zinc-50">
                    {quest.title}
                  </div>
                  <div className="shrink-0 rounded-sm border border-zinc-100/10 bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-zinc-100">
                    {quest.objectives.filter((objective) => objective.status === "success").length}
                    /{quest.objectives.length}
                  </div>
                </div>
                <div className="space-y-1">
                  {quest.objectives.slice(0, 4).map((objective) => (
                    <div key={objective.id} className="flex min-w-0 items-center gap-2">
                      <StatusIcon status={objective.status} />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-100/95",
                          objective.status === "success" && "text-zinc-300/70 line-through",
                          objective.status === "failure" && "text-red-200"
                        )}
                      >
                        {objective.text}
                      </span>
                    </div>
                  ))}
                  {quest.objectives.length > 4 && (
                    <div className="pl-6 text-[11px] font-medium text-zinc-300/70">
                      +{quest.objectives.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
