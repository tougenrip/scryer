-- Create relationship_strength_overrides table for storing custom strength values
-- for automatic relationships that don't have explicit database records
-- (e.g., faction-hq, faction-leader, pantheon-worshipers)

CREATE TABLE IF NOT EXISTS relationship_strength_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  relationship_key TEXT NOT NULL, -- e.g., "faction-hq-{factionId}-{locationId}"
  source_type TEXT NOT NULL CHECK (source_type IN ('faction', 'location', 'pantheon', 'npc')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('faction', 'location', 'pantheon', 'npc')),
  target_id UUID NOT NULL,
  strength INTEGER NOT NULL CHECK (strength >= 0 AND strength <= 100),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(campaign_id, relationship_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_relationship_strength_overrides_campaign_id ON relationship_strength_overrides(campaign_id);
CREATE INDEX IF NOT EXISTS idx_relationship_strength_overrides_relationship_key ON relationship_strength_overrides(relationship_key);
CREATE INDEX IF NOT EXISTS idx_relationship_strength_overrides_source ON relationship_strength_overrides(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_relationship_strength_overrides_target ON relationship_strength_overrides(target_type, target_id);

-- Add comments
COMMENT ON TABLE relationship_strength_overrides IS 'Custom strength overrides for automatic relationships that cross entity types';
COMMENT ON COLUMN relationship_strength_overrides.relationship_key IS 'Unique key identifying the relationship (e.g., faction-hq-{factionId}-{locationId})';
COMMENT ON COLUMN relationship_strength_overrides.strength IS 'Relationship strength from 0-100';

-- Enable RLS
ALTER TABLE relationship_strength_overrides ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view relationship_strength_overrides"
  ON relationship_strength_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = relationship_strength_overrides.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create relationship_strength_overrides"
  ON relationship_strength_overrides
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = relationship_strength_overrides.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update relationship_strength_overrides"
  ON relationship_strength_overrides
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = relationship_strength_overrides.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = relationship_strength_overrides.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete relationship_strength_overrides"
  ON relationship_strength_overrides
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = relationship_strength_overrides.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_relationship_strength_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_relationship_strength_overrides_updated_at
  BEFORE UPDATE ON relationship_strength_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_relationship_strength_overrides_updated_at();

