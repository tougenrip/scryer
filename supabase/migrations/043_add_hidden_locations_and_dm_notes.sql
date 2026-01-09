-- Add hidden_from_players and dm_notes fields to world_locations table
-- Allows DM to hide locations from players and store DM-only notes

ALTER TABLE world_locations
ADD COLUMN IF NOT EXISTS hidden_from_players BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE world_locations
ADD COLUMN IF NOT EXISTS dm_notes TEXT;

-- Add comments
COMMENT ON COLUMN world_locations.hidden_from_players IS 'If true, this location is hidden from players and only visible to the DM';
COMMENT ON COLUMN world_locations.dm_notes IS 'DM-only notes that are not visible to players';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_world_locations_hidden ON world_locations(campaign_id, hidden_from_players);

-- Update RLS policy to filter hidden locations for non-DM users
-- Note: dm_notes filtering will be handled in the application layer since RLS can't filter columns
DROP POLICY IF EXISTS "Campaign members can view world_locations" ON world_locations;

CREATE POLICY "Campaign members can view world_locations"
  ON world_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = world_locations.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
    AND (
      -- DM can see all locations
      EXISTS (
        SELECT 1
        FROM campaigns
        WHERE campaigns.id = world_locations.campaign_id
        AND campaigns.dm_user_id = auth.uid()
      )
      OR
      -- Players can only see non-hidden locations
      hidden_from_players = FALSE
    )
  );

