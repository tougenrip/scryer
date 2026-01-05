-- Create faction_relationships table for politics web
-- Relationship tracking between factions

CREATE TABLE IF NOT EXISTS faction_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  faction_a_id UUID NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  faction_b_id UUID NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  relationship_type TEXT CHECK (relationship_type IN ('alliance', 'neutral', 'rivalry', 'war', 'vassal', 'trade_partner', 'enemy', 'friendly')),
  strength INTEGER DEFAULT 50 CHECK (strength >= 0 AND strength <= 100),
  public BOOLEAN DEFAULT TRUE,
  secret_notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CHECK (faction_a_id != faction_b_id),
  UNIQUE(campaign_id, faction_a_id, faction_b_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faction_relationships_campaign_id ON faction_relationships(campaign_id);
CREATE INDEX IF NOT EXISTS idx_faction_relationships_faction_a ON faction_relationships(faction_a_id);
CREATE INDEX IF NOT EXISTS idx_faction_relationships_faction_b ON faction_relationships(faction_b_id);
CREATE INDEX IF NOT EXISTS idx_faction_relationships_type ON faction_relationships(relationship_type);

-- Add comments
COMMENT ON TABLE faction_relationships IS 'Relationships and political connections between factions';
COMMENT ON COLUMN faction_relationships.strength IS 'Relationship strength from 0-100';
COMMENT ON COLUMN faction_relationships.public IS 'Whether the relationship is publicly known';
COMMENT ON COLUMN faction_relationships.secret_notes IS 'DM-only notes about the relationship';

-- Enable RLS
ALTER TABLE faction_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view public faction_relationships"
  ON faction_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = faction_relationships.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
    AND (public = TRUE OR EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = faction_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    ))
  );

CREATE POLICY "DMs can create faction_relationships"
  ON faction_relationships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = faction_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update faction_relationships"
  ON faction_relationships
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = faction_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = faction_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete faction_relationships"
  ON faction_relationships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = faction_relationships.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_faction_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_faction_relationships_updated_at
  BEFORE UPDATE ON faction_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_faction_relationships_updated_at();

