-- Create world_locations table for hierarchical location system
-- Supports: World -> Continent -> Region/Kingdom -> City/Settlement -> Point of Interest

CREATE TABLE IF NOT EXISTS world_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  parent_location_id UUID REFERENCES world_locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('world', 'continent', 'region', 'kingdom', 'city', 'village', 'settlement', 'poi')),
  description TEXT,
  image_url TEXT,
  x_coordinate DECIMAL,
  y_coordinate DECIMAL,
  map_level INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(campaign_id, parent_location_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_world_locations_campaign_id ON world_locations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_world_locations_parent_id ON world_locations(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_world_locations_type ON world_locations(type);
CREATE INDEX IF NOT EXISTS idx_world_locations_map_level ON world_locations(map_level);

-- Add comments
COMMENT ON TABLE world_locations IS 'Hierarchical location system for campaign worlds';
COMMENT ON COLUMN world_locations.parent_location_id IS 'Parent location in hierarchy (null for world level)';
COMMENT ON COLUMN world_locations.type IS 'Location type: world, continent, region, kingdom, city, village, settlement, poi';
COMMENT ON COLUMN world_locations.map_level IS 'Map zoom level: 0=world, 1=continent, 2=region, etc.';
COMMENT ON COLUMN world_locations.metadata IS 'Flexible JSONB field for location-specific data';

-- Enable RLS
ALTER TABLE world_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
  );

CREATE POLICY "DMs can create world_locations"
  ON world_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = world_locations.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update world_locations"
  ON world_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = world_locations.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = world_locations.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete world_locations"
  ON world_locations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = world_locations.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_world_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_world_locations_updated_at
  BEFORE UPDATE ON world_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_world_locations_updated_at();

