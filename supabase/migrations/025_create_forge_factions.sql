-- Create factions table for political entities
-- Kingdoms, guilds, organizations, tribes, cults, etc.

CREATE TABLE IF NOT EXISTS factions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('kingdom', 'guild', 'organization', 'tribe', 'cult', 'company', 'church', 'family', 'other')),
  description TEXT,
  headquarters_location_id UUID REFERENCES world_locations(id) ON DELETE SET NULL,
  leader_name TEXT,
  alignment TEXT CHECK (alignment IN ('LG', 'NG', 'CG', 'LN', 'N', 'CN', 'LE', 'NE', 'CE')),
  goals TEXT[] DEFAULT '{}',
  resources TEXT[] DEFAULT '{}',
  influence_level TEXT CHECK (influence_level IN ('local', 'regional', 'continental', 'global')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(campaign_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_factions_campaign_id ON factions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_factions_type ON factions(type);
CREATE INDEX IF NOT EXISTS idx_factions_headquarters ON factions(headquarters_location_id);
CREATE INDEX IF NOT EXISTS idx_factions_influence_level ON factions(influence_level);

-- Add comments
COMMENT ON TABLE factions IS 'Political entities, organizations, and groups in the campaign world';
COMMENT ON COLUMN factions.goals IS 'Array of faction goals/objectives';
COMMENT ON COLUMN factions.resources IS 'Array of faction resources/assets';

-- Enable RLS
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view factions"
  ON factions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = factions.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create factions"
  ON factions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = factions.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update factions"
  ON factions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = factions.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = factions.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete factions"
  ON factions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = factions.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_factions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_factions_updated_at
  BEFORE UPDATE ON factions
  FOR EACH ROW
  EXECUTE FUNCTION update_factions_updated_at();

