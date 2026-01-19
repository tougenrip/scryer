-- Add scene_id column to entity tables for map scene selection
-- Allows users to associate a scene map with locations, NPCs, factions, and pantheons

-- Add scene_id to world_locations
ALTER TABLE world_locations
  ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;

-- Add scene_id to npcs
ALTER TABLE npcs
  ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;

-- Add scene_id to factions
ALTER TABLE factions
  ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;

-- Add scene_id to pantheon_deities
ALTER TABLE pantheon_deities
  ADD COLUMN IF NOT EXISTS scene_id UUID REFERENCES scenes(id) ON DELETE SET NULL;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_world_locations_scene_id ON world_locations(scene_id);
CREATE INDEX IF NOT EXISTS idx_npcs_scene_id ON npcs(scene_id);
CREATE INDEX IF NOT EXISTS idx_factions_scene_id ON factions(scene_id);
CREATE INDEX IF NOT EXISTS idx_pantheon_deities_scene_id ON pantheon_deities(scene_id);

-- Add comments
COMMENT ON COLUMN world_locations.scene_id IS 'Associated scene map for this location';
COMMENT ON COLUMN npcs.scene_id IS 'Associated scene map for this NPC';
COMMENT ON COLUMN factions.scene_id IS 'Associated scene map for this faction';
COMMENT ON COLUMN pantheon_deities.scene_id IS 'Associated scene map for this deity';

