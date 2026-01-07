-- Add is_hidden column to quest_objectives
-- This allows DMs to create objectives that only they can see

ALTER TABLE quest_objectives
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE;

-- Update the RLS policy to filter out hidden objectives for non-DMs
-- DMs can see all objectives, but players can only see non-hidden ones

DROP POLICY IF EXISTS "Campaign members can view quest objectives" ON quest_objectives;

CREATE POLICY "Campaign members can view quest objectives"
  ON quest_objectives
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quest_steps
      JOIN quests ON quests.id = quest_steps.quest_id
      JOIN campaign_members ON campaign_members.campaign_id = quests.campaign_id
      WHERE quest_steps.id = quest_objectives.step_id
      AND campaign_members.user_id = auth.uid()
      AND (
        -- Show if not hidden, OR if user is the DM
        quest_objectives.is_hidden = FALSE
        OR EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = quests.campaign_id
          AND campaigns.dm_user_id = auth.uid()
        )
      )
    )
  );

-- Add comment
COMMENT ON COLUMN quest_objectives.is_hidden IS 'If true, only the DM can see this objective';

