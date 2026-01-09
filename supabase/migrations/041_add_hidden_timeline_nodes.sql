-- Add hidden_from_players field to campaign_timeline table
-- Allows DM to hide timeline entries from players

ALTER TABLE campaign_timeline
ADD COLUMN IF NOT EXISTS hidden_from_players BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment
COMMENT ON COLUMN campaign_timeline.hidden_from_players IS 'If true, this timeline entry is hidden from players and only visible to the DM';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_campaign_timeline_hidden ON campaign_timeline(campaign_id, hidden_from_players);

-- Update RLS policy to filter hidden entries for non-DM users
-- Note: The existing SELECT policy allows all campaign members to view timeline entries
-- We need to modify it to exclude hidden entries for non-DM users

DROP POLICY IF EXISTS "Campaign members can view campaign_timeline" ON campaign_timeline;

CREATE POLICY "Campaign members can view campaign_timeline"
  ON campaign_timeline
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_timeline.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
    AND (
      -- DM can see all entries
      EXISTS (
        SELECT 1
        FROM campaigns
        WHERE campaigns.id = campaign_timeline.campaign_id
        AND campaigns.dm_user_id = auth.uid()
      )
      OR
      -- Players can only see non-hidden entries
      hidden_from_players = FALSE
    )
  );

