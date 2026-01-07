-- Create floors table for multiple floors per scene
-- Each floor can have its own image and markers

CREATE TABLE IF NOT EXISTS floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  floor_order INTEGER DEFAULT 0, -- Order for display (0 = ground floor, 1 = first floor, etc.)
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(scene_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_floors_scene_id ON floors(scene_id);
CREATE INDEX IF NOT EXISTS idx_floors_floor_order ON floors(scene_id, floor_order);
CREATE INDEX IF NOT EXISTS idx_floors_created_at ON floors(created_at);

-- Add comments
COMMENT ON TABLE floors IS 'Multiple floors per scene, each with its own image and markers';
COMMENT ON COLUMN floors.name IS 'Floor name (unique within scene)';
COMMENT ON COLUMN floors.description IS 'Optional floor description';
COMMENT ON COLUMN floors.image_url IS 'URL to the floor map image (null to use scene image)';
COMMENT ON COLUMN floors.floor_order IS 'Display order (0 = ground floor, 1 = first floor, etc.)';

-- Enable RLS
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view floors"
  ON floors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM scenes
      JOIN campaign_members ON campaign_members.campaign_id = scenes.campaign_id
      WHERE scenes.id = floors.scene_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create floors"
  ON floors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM scenes
      JOIN campaigns ON campaigns.id = scenes.campaign_id
      WHERE scenes.id = floors.scene_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update floors"
  ON floors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM scenes
      JOIN campaigns ON campaigns.id = scenes.campaign_id
      WHERE scenes.id = floors.scene_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM scenes
      JOIN campaigns ON campaigns.id = scenes.campaign_id
      WHERE scenes.id = floors.scene_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete floors"
  ON floors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM scenes
      JOIN campaigns ON campaigns.id = scenes.campaign_id
      WHERE scenes.id = floors.scene_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_floors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_floors_updated_at
  BEFORE UPDATE ON floors
  FOR EACH ROW
  EXECUTE FUNCTION update_floors_updated_at();




