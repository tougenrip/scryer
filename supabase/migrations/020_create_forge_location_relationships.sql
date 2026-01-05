-- Create location_relationships table for tracking relationships between locations
-- Tracks affection scores, control status, and relationships between cities/villages

CREATE TABLE IF NOT EXISTS location_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  location_a_id UUID NOT NULL REFERENCES world_locations(id) ON DELETE CASCADE,
  location_b_id UUID NOT NULL REFERENCES world_locations(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('alliance', 'rivalry', 'trading_partner', 'vassal', 'neutral', 'war', 'trade_route')),
  affection_score INTEGER DEFAULT 0 CHECK (affection_score >= -100 AND affection_score <= 100),
  control_status TEXT CHECK (control_status IN ('independent', 'controlled_by', 'occupied', 'vassal', 'allied')),
  controlling_location_id UUID REFERENCES world_locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  CHECK (location_a_id != location_b_id),
  UNIQUE(campaign_id, location_a_id, location_b_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_location_relationships_campaign_id ON location_relationships(campaign_id);
CREATE INDEX IF NOT EXISTS idx_location_relationships_location_a ON location_relationships(location_a_id);
CREATE INDEX IF NOT EXISTS idx_location_relationships_location_b ON location_relationships(location_b_id);
CREATE INDEX IF NOT EXISTS idx_location_relationships_type ON location_relationships(relationship_type);

-- Add comments
COMMENT ON TABLE location_relationships IS 'Relationships and interactions between locations';
COMMENT ON COLUMN location_relationships.affection_score IS 'Relationship score from -100 (enemy) to 100 (ally)';
COMMENT ON COLUMN location_relationships.controlling_location_id IS 'Location that controls location_a (if control_status is controlled_by)';

-- Enable RLS
ALTER TABLE location_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view location_relationships"
  ON location_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = location_relationships.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create location_relationships"
  ON location_relationships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = location_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update location_relationships"
  ON location_relationships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = location_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = location_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete location_relationships"
  ON location_relationships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = location_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

