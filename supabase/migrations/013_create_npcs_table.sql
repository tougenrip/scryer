-- Create NPCs table for campaign-specific non-player characters
-- NPCs are campaign-scoped and can be created/managed by DMs

CREATE TABLE IF NOT EXISTS npcs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  appearance TEXT,
  personality TEXT,
  background TEXT,
  location TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(campaign_id, name)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_npcs_campaign_id ON npcs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_npcs_created_by ON npcs(created_by);

-- Add comments
COMMENT ON TABLE npcs IS 'Non-player characters for campaigns';
COMMENT ON COLUMN npcs.campaign_id IS 'Campaign this NPC belongs to';
COMMENT ON COLUMN npcs.created_by IS 'User who created the NPC';

-- Enable RLS
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow campaign members to view NPCs
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
  );

-- Allow DMs to create NPCs
CREATE POLICY "DMs can create NPCs"
  ON npcs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = npcs.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

-- Allow DMs to update NPCs
CREATE POLICY "DMs can update NPCs"
  ON npcs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = npcs.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = npcs.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Allow DMs to delete NPCs
CREATE POLICY "DMs can delete NPCs"
  ON npcs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = npcs.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_npcs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_npcs_updated_at
  BEFORE UPDATE ON npcs
  FOR EACH ROW
  EXECUTE FUNCTION update_npcs_updated_at();

