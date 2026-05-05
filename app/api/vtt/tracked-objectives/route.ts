import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { createClient } from "@/lib/supabase/server";
import type { VttTrackedObjectiveSource } from "@/hooks/useVttTrackedObjectives";

type Payload = {
  campaignId?: unknown;
  sourceType?: unknown;
  sourceId?: unknown;
  action?: unknown;
};

const SOURCE_TYPES = new Set<VttTrackedObjectiveSource>([
  "party_objective",
  "quest",
  "quest_objective",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Payload | null;
  const campaignId = typeof body?.campaignId === "string" ? body.campaignId : null;
  const sourceType = SOURCE_TYPES.has(body?.sourceType as VttTrackedObjectiveSource)
    ? (body?.sourceType as VttTrackedObjectiveSource)
    : null;
  const sourceId = typeof body?.sourceId === "string" ? body.sourceId : null;
  const action = body?.action === "untrack" ? "untrack" : body?.action === "track" ? "track" : null;

  if (!campaignId || !sourceType || !sourceId || !action) {
    return NextResponse.json({ error: "Missing tracked objective fields" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminSupabaseClient();

    const { data: campaign, error: campaignError } = await admin
      .from("campaigns")
      .select("id, dm_user_id")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign || campaign.dm_user_id !== user.id) {
      return NextResponse.json(
        { error: "Only the campaign DM can update HUD objectives" },
        { status: 403 }
      );
    }

    const validSource = await sourceBelongsToCampaign(admin, campaignId, sourceType, sourceId);
    if (!validSource) {
      return NextResponse.json(
        { error: "Objective does not belong to this campaign" },
        { status: 404 }
      );
    }

    if (action === "track") {
      const { data, error } = await admin
        .from("vtt_tracked_objectives")
        .upsert(
          {
            campaign_id: campaignId,
            source_type: sourceType,
            source_id: sourceId,
            created_by: user.id,
          },
          { onConflict: "campaign_id,source_type,source_id" }
        )
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ tracked: data });
    }

    const { error } = await admin
      .from("vtt_tracked_objectives")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("source_type", sourceType)
      .eq("source_id", sourceId);

    if (error) throw error;
    return NextResponse.json({ tracked: null });
  } catch (e: unknown) {
    const error = e as { message?: string; details?: string; hint?: string; code?: string };
    const migrationHint =
      error.code === "42P01"
        ? "Run Supabase migration 076_vtt_tracked_objectives.sql."
        : error.code === "23514"
          ? "Run Supabase migration 077_vtt_tracked_quest_sources.sql."
          : error.hint;
    return NextResponse.json(
      {
        error: error.message || "Could not update HUD objective",
        details: error.details,
        hint: migrationHint,
        code: error.code,
      },
      { status: 500 }
    );
  }
}

async function sourceBelongsToCampaign(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  campaignId: string,
  sourceType: VttTrackedObjectiveSource,
  sourceId: string
) {
  if (sourceType === "party_objective") {
    const { data, error } = await admin
      .from("objectives")
      .select("id")
      .eq("id", sourceId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  if (sourceType === "quest") {
    const { data, error } = await admin
      .from("quests")
      .select("id")
      .eq("id", sourceId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  const { data: objective, error: objectiveError } = await admin
    .from("quest_objectives")
    .select("id, step_id")
    .eq("id", sourceId)
    .maybeSingle();
  if (objectiveError) throw objectiveError;
  if (!objective?.step_id) return false;

  const { data: step, error: stepError } = await admin
    .from("quest_steps")
    .select("id, quest_id")
    .eq("id", objective.step_id)
    .maybeSingle();
  if (stepError) throw stepError;
  if (!step?.quest_id) return false;

  const { data: quest, error: questError } = await admin
    .from("quests")
    .select("id")
    .eq("id", step.quest_id)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (questError) throw questError;
  return !!quest;
}
