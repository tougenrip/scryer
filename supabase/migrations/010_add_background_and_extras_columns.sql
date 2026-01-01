-- Migration: Add background_details and extras JSONB columns to characters table
-- These columns store denormalized background and custom content data

-- Add background details JSONB column
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS background_details JSONB DEFAULT '{}'::jsonb;

-- Add extras JSONB column for custom content
ALTER TABLE characters
ADD COLUMN IF NOT EXISTS extras JSONB DEFAULT '{}'::jsonb;

-- Add comments
COMMENT ON COLUMN characters.background_details IS 'Background details: {"personality_traits": [], "ideals": [], "bonds": [], "flaws": [], "appearance": "", "characteristics": {}}';
COMMENT ON COLUMN characters.extras IS 'Custom extras: {"custom_actions": [], "custom_features": [], "notes": {}}';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_characters_background_details_gin ON characters USING GIN (background_details);
CREATE INDEX IF NOT EXISTS idx_characters_extras_gin ON characters USING GIN (extras);

