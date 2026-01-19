-- Add metadata JSONB field to npcs and factions for tags and associates
-- Add tags and associates arrays to metadata

-- Add metadata to npcs
ALTER TABLE npcs
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL;

-- Add metadata to factions  
ALTER TABLE factions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL;

-- Add comments
COMMENT ON COLUMN npcs.metadata IS 'Flexible JSONB field for tags, associates, and other NPC-specific data';
COMMENT ON COLUMN factions.metadata IS 'Flexible JSONB field for tags, associates, and other faction-specific data';

-- Create indexes for metadata tags (for search functionality)
CREATE INDEX IF NOT EXISTS idx_npcs_metadata_tags ON npcs USING GIN ((metadata->'tags'));
CREATE INDEX IF NOT EXISTS idx_factions_metadata_tags ON factions USING GIN ((metadata->'tags'));
CREATE INDEX IF NOT EXISTS idx_world_locations_metadata_tags ON world_locations USING GIN ((metadata->'tags'));

-- Create indexes for metadata associates (for association queries)
CREATE INDEX IF NOT EXISTS idx_npcs_metadata_associates ON npcs USING GIN ((metadata->'associates'));
CREATE INDEX IF NOT EXISTS idx_factions_metadata_associates ON factions USING GIN ((metadata->'associates'));
CREATE INDEX IF NOT EXISTS idx_world_locations_metadata_associates ON world_locations USING GIN ((metadata->'associates'));

