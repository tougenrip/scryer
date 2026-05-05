CREATE TABLE IF NOT EXISTS public.vtt_tracked_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('party_objective', 'quest', 'quest_objective')),
  source_id UUID NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_vtt_tracked_objectives_campaign
  ON public.vtt_tracked_objectives(campaign_id);

ALTER TABLE public.vtt_tracked_objectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaign members can view tracked VTT objectives"
  ON public.vtt_tracked_objectives;
CREATE POLICY "Campaign members can view tracked VTT objectives"
  ON public.vtt_tracked_objectives
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_members
      WHERE campaign_members.campaign_id = vtt_tracked_objectives.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.campaigns
      WHERE campaigns.id = vtt_tracked_objectives.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "DMs can manage tracked VTT objectives"
  ON public.vtt_tracked_objectives;
CREATE POLICY "DMs can manage tracked VTT objectives"
  ON public.vtt_tracked_objectives
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaigns
      WHERE campaigns.id = vtt_tracked_objectives.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.campaigns
      WHERE campaigns.id = vtt_tracked_objectives.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.vtt_tracked_objectives;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
