-- Create rumors table for campaign-specific rumors and side quests
-- Rumors are campaign-scoped and can be created/managed by DMs

CREATE TABLE IF NOT EXISTS rumors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT, -- Where the rumor came from (e.g., "Tavern gossip", "Mysterious stranger")
  location TEXT, -- Where this rumor is relevant
  verified BOOLEAN DEFAULT FALSE, -- Whether the rumor has been verified
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_rumors_campaign_id ON rumors(campaign_id);
CREATE INDEX IF NOT EXISTS idx_rumors_created_by ON rumors(created_by);

-- Add comments
COMMENT ON TABLE rumors IS 'Rumors and side quests for campaigns';
COMMENT ON COLUMN rumors.campaign_id IS 'Campaign this rumor belongs to';
COMMENT ON COLUMN rumors.verified IS 'Whether the rumor has been verified as true';

-- Enable RLS
ALTER TABLE rumors ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Allow campaign members to view rumors
CREATE POLICY "Campaign members can view rumors"
  ON rumors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = rumors.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Allow DMs to create rumors
CREATE POLICY "DMs can create rumors"
  ON rumors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = rumors.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

-- Allow DMs to update rumors
CREATE POLICY "DMs can update rumors"
  ON rumors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = rumors.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = rumors.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Allow DMs to delete rumors
CREATE POLICY "DMs can delete rumors"
  ON rumors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = rumors.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_rumors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_rumors_updated_at
  BEFORE UPDATE ON rumors
  FOR EACH ROW
  EXECUTE FUNCTION update_rumors_updated_at();

