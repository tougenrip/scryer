-- Create pantheon_deities table for religion/god system

CREATE TABLE IF NOT EXISTS pantheon_deities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  domain TEXT[] DEFAULT '{}',
  alignment TEXT CHECK (alignment IN ('LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE')),
  symbol TEXT,
  description TEXT,
  worshipers_location_ids UUID[] DEFAULT '{}',
  holy_days TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(campaign_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pantheon_deities_campaign_id ON pantheon_deities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_pantheon_deities_alignment ON pantheon_deities(alignment);

-- Add comments
COMMENT ON TABLE pantheon_deities IS 'Gods, deities, and religions for campaign pantheon';
COMMENT ON COLUMN pantheon_deities.domain IS 'Array of domains (e.g., war, chaos, strength)';
COMMENT ON COLUMN pantheon_deities.worshipers_location_ids IS 'Array of location IDs where this deity is worshiped';

-- Enable RLS
ALTER TABLE pantheon_deities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view pantheon_deities"
  ON pantheon_deities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = pantheon_deities.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create pantheon_deities"
  ON pantheon_deities
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = pantheon_deities.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update pantheon_deities"
  ON pantheon_deities
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = pantheon_deities.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = pantheon_deities.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete pantheon_deities"
  ON pantheon_deities
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = pantheon_deities.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_pantheon_deities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pantheon_deities_updated_at
  BEFORE UPDATE ON pantheon_deities
  FOR EACH ROW
  EXECUTE FUNCTION update_pantheon_deities_updated_at();

