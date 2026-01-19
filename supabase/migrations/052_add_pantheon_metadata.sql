-- Add metadata JSONB field to pantheon_deities for tags and associates

-- Add metadata to pantheon_deities
ALTER TABLE pantheon_deities
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb NOT NULL;

-- Add comments
COMMENT ON COLUMN pantheon_deities.metadata IS 'Flexible JSONB field for tags, associates, and other deity-specific data';

-- Create indexes for metadata tags and associates
CREATE INDEX IF NOT EXISTS idx_pantheon_deities_metadata_tags ON pantheon_deities USING GIN ((metadata->'tags'));
CREATE INDEX IF NOT EXISTS idx_pantheon_deities_metadata_associates ON pantheon_deities USING GIN ((metadata->'associates'));

