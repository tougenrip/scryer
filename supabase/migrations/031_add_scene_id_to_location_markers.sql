-- Add scene_id column to location_markers table
-- Markers can reference either scene_id (for scenes) or map_id (for battle maps)

ALTER TABLE location_markers
  ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id) ON DELETE CASCADE;

-- Set existing markers to have scene_id = NULL (backward compatibility)
UPDATE location_markers
SET scene_id = NULL
WHERE scene_id IS NULL;

-- Create index for scene_id
CREATE INDEX IF NOT EXISTS idx_location_markers_scene_id ON location_markers(scene_id);

-- Update comment
COMMENT ON COLUMN location_markers.scene_id IS 'References a scene map (null for battle maps or legacy markers)';
COMMENT ON COLUMN location_markers.map_id IS 'References a battle map (null for scene maps or legacy markers)';

