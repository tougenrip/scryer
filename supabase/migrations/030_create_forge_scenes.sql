-- Create scenes table for multiple scene maps per campaign
-- Each scene can have its own map image and markers

CREATE TABLE IF NOT EXISTS scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(campaign_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scenes_campaign_id ON scenes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scenes_created_at ON scenes(created_at);

-- Add comments
COMMENT ON TABLE scenes IS 'Multiple scene maps per campaign, each with its own image and markers';
COMMENT ON COLUMN scenes.name IS 'Scene name (unique within campaign)';
COMMENT ON COLUMN scenes.description IS 'Optional scene description';
COMMENT ON COLUMN scenes.image_url IS 'URL to the scene map image';

-- Enable RLS
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view scenes"
  ON scenes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = scenes.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create scenes"
  ON scenes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = scenes.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update scenes"
  ON scenes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = scenes.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = scenes.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete scenes"
  ON scenes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = scenes.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_scenes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scenes_updated_at
  BEFORE UPDATE ON scenes
  FOR EACH ROW
  EXECUTE FUNCTION update_scenes_updated_at();

