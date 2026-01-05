-- Create location_markers table for visual markers on maps
-- Icons and status indicators for locations on maps

CREATE TABLE IF NOT EXISTS location_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  location_id UUID REFERENCES world_locations(id) ON DELETE CASCADE,
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  icon_type TEXT CHECK (icon_type IN ('city', 'village', 'fort', 'tavern', 'shop', 'temple', 'dungeon', 'cave', 'landmark', 'port', 'border')),
  status_icon TEXT CHECK (status_icon IN ('normal', 'under_attack', 'celebrating', 'plague', 'trade_route', 'blockaded', 'at_war', 'prosperous', 'declining')),
  color TEXT DEFAULT '#c9b882',
  size TEXT DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),
  visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_location_markers_campaign_id ON location_markers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_location_markers_location_id ON location_markers(location_id);
CREATE INDEX IF NOT EXISTS idx_location_markers_map_id ON location_markers(map_id);
CREATE INDEX IF NOT EXISTS idx_location_markers_status ON location_markers(status_icon);

-- Add comments
COMMENT ON TABLE location_markers IS 'Visual markers and icons for locations on maps';
COMMENT ON COLUMN location_markers.map_id IS 'Null for world map, specific map_id for battle maps';
COMMENT ON COLUMN location_markers.status_icon IS 'Current status/event indicator for the location';

-- Enable RLS
ALTER TABLE location_markers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view location_markers"
  ON location_markers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = location_markers.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create location_markers"
  ON location_markers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = location_markers.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update location_markers"
  ON location_markers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = location_markers.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = location_markers.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete location_markers"
  ON location_markers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = location_markers.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

