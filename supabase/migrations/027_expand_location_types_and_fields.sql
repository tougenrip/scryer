-- Expand location types to include adventure sites and geographical features
-- Add color field for map markers

-- First, drop the old CHECK constraint
ALTER TABLE world_locations DROP CONSTRAINT IF EXISTS world_locations_type_check;

-- Add new CHECK constraint with expanded types
ALTER TABLE world_locations ADD CONSTRAINT world_locations_type_check 
  CHECK (type IN (
    -- Political/Boundaries
    'world', 'continent', 'region', 'kingdom', 'city', 'village', 'settlement',
    -- Adventure/Tactical Sites
    'dungeon', 'landmark', 'structure', 'lair',
    -- Geographical/Natural
    'biome', 'island', 'archipelago',
    -- Legacy
    'poi'
  ));

-- Add color column for map markers (optional, defaults to null)
ALTER TABLE world_locations ADD COLUMN IF NOT EXISTS marker_color TEXT;

-- Update comment to reflect new types
COMMENT ON COLUMN world_locations.type IS 'Location type: Political (world, continent, region, kingdom, city, village, settlement), Adventure (dungeon, landmark, structure, lair), Geographical (biome, island, archipelago), or poi';

COMMENT ON COLUMN world_locations.marker_color IS 'Color for location marker on map (hex code, e.g., #FF0000)';

