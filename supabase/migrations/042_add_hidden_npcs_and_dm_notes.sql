-- Add hidden_from_players field to npcs table
-- Allows DM to hide NPCs from players
-- Also update RLS to hide notes field from non-DM users

ALTER TABLE npcs
ADD COLUMN IF NOT EXISTS hidden_from_players BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment
COMMENT ON COLUMN npcs.hidden_from_players IS 'If true, this NPC is hidden from players and only visible to the DM';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_npcs_hidden ON npcs(campaign_id, hidden_from_players);

-- Update RLS policy to filter hidden NPCs for non-DM users
-- Also need to handle notes field separately (notes should be hidden from non-DMs even for visible NPCs)
DROP POLICY IF EXISTS "Campaign members can view NPCs" ON npcs;

-- Note: We can't directly filter columns in RLS, so we'll need to handle notes filtering in the application layer
-- But we can filter hidden NPCs at the database level
CREATE POLICY "Campaign members can view NPCs"
  ON npcs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = npcs.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
    AND (
      -- DM can see all NPCs
      EXISTS (
        SELECT 1
        FROM campaigns
        WHERE campaigns.id = npcs.campaign_id
        AND campaigns.dm_user_id = auth.uid()
      )
      OR
      -- Players can only see non-hidden NPCs
      hidden_from_players = FALSE
    )
  );

