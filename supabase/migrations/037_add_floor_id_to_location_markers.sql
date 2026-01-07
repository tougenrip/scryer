-- Add floor_id column to location_markers table
-- Markers can reference a specific floor within a scene

ALTER TABLE location_markers
  ADD COLUMN IF NOT EXISTS floor_id UUID REFERENCES floors(id) ON DELETE CASCADE;

-- Create index for floor_id
CREATE INDEX IF NOT EXISTS idx_location_markers_floor_id ON location_markers(floor_id);

-- Update comment
COMMENT ON COLUMN location_markers.floor_id IS 'References a specific floor within a scene (null for markers not on a specific floor)';
