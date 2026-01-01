-- Add JSONB columns to characters table for denormalized data storage
-- This provides faster queries and simpler data access alongside junction tables

ALTER TABLE characters
ADD COLUMN IF NOT EXISTS spells JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS class_features JSONB DEFAULT '[]'::jsonb;

-- Add comments to document the structure
COMMENT ON COLUMN characters.spells IS 'Array of spell references: [{"source": "srd"|"homebrew", "index": "spell-index", "prepared": boolean, "always_prepared": boolean}]';
COMMENT ON COLUMN characters.inventory IS 'Array of inventory items: [{"source": "srd"|"homebrew", "index": "item-index", "quantity": number, "equipped": boolean, "attuned": boolean, "notes": string|null}]';
COMMENT ON COLUMN characters.class_features IS 'Array of class features gained: [{"level": number, "name": string, "description": string}]';

-- Create indexes for JSONB queries (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS idx_characters_spells_gin ON characters USING GIN (spells);
CREATE INDEX IF NOT EXISTS idx_characters_inventory_gin ON characters USING GIN (inventory);
CREATE INDEX IF NOT EXISTS idx_characters_class_features_gin ON characters USING GIN (class_features);

