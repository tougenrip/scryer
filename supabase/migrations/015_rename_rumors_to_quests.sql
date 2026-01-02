-- Rename rumors table to quests
-- This migration renames the table and all related objects

ALTER TABLE rumors RENAME TO quests;

-- Rename indexes
ALTER INDEX IF EXISTS idx_rumors_campaign_id RENAME TO idx_quests_campaign_id;
ALTER INDEX IF EXISTS idx_rumors_created_by RENAME TO idx_quests_created_by;

-- Drop old trigger and function
DROP TRIGGER IF EXISTS update_rumors_updated_at ON quests;
DROP FUNCTION IF EXISTS update_rumors_updated_at();

-- Create new function with new name
CREATE OR REPLACE FUNCTION update_quests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger with new name
CREATE TRIGGER update_quests_updated_at
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION update_quests_updated_at();

-- Drop old policies (they will be recreated with new names)
DROP POLICY IF EXISTS "Campaign members can view rumors" ON quests;
DROP POLICY IF EXISTS "DMs can create rumors" ON quests;
DROP POLICY IF EXISTS "DMs can update rumors" ON quests;
DROP POLICY IF EXISTS "DMs can delete rumors" ON quests;

-- Recreate policies with new names
CREATE POLICY "Campaign members can view quests"
  ON quests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaign_members
      WHERE campaign_members.user_id = auth.uid()
      AND campaign_members.campaign_id = quests.campaign_id
    )
  );

CREATE POLICY "DMs can create quests"
  ON quests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = quests.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update quests"
  ON quests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = quests.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = quests.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete quests"
  ON quests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = quests.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Update comments
COMMENT ON TABLE quests IS 'Quests and side quests for campaigns';
COMMENT ON COLUMN quests.campaign_id IS 'Campaign this quest belongs to';
COMMENT ON COLUMN quests.verified IS 'Whether the quest has been verified as true';

