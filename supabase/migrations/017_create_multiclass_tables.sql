-- Migration: Create multiclass support tables
-- This migration creates tables to support characters with multiple classes

-- Create character_classes table to track multiple classes per character
CREATE TABLE IF NOT EXISTS character_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  class_source TEXT NOT NULL DEFAULT 'srd', -- 'srd' or 'homebrew'
  class_index TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 20),
  subclass_source TEXT DEFAULT 'srd',
  subclass_index TEXT,
  is_primary_class BOOLEAN DEFAULT FALSE, -- First class selected (for saving throws, starting equipment)
  level_acquired_at INTEGER, -- Character level when this class was added
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(character_id, class_source, class_index)
);

-- Create index for faster character class lookups
CREATE INDEX IF NOT EXISTS idx_character_classes_character_id ON character_classes(character_id);

-- Create character_class_features table to track features acquired per class level
CREATE TABLE IF NOT EXISTS character_class_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  class_source TEXT NOT NULL,
  class_index TEXT NOT NULL,
  class_level INTEGER NOT NULL, -- Level in this specific class
  feature_index TEXT,
  feature_name TEXT NOT NULL,
  feature_description TEXT,
  feature_specific JSONB, -- Store choices made for this feature
  acquired_at_character_level INTEGER, -- Total character level when acquired
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT fk_class_features_class FOREIGN KEY (character_id, class_source, class_index) 
    REFERENCES character_classes(character_id, class_source, class_index) 
    ON DELETE CASCADE
);

-- Create index for faster feature lookups
CREATE INDEX IF NOT EXISTS idx_class_features_character_class ON character_class_features(character_id, class_source, class_index);
CREATE INDEX IF NOT EXISTS idx_class_features_class_level ON character_class_features(character_id, class_source, class_index, class_level);

-- Make existing class fields nullable (keep for backward compatibility)
-- Note: These columns will remain for single-class characters until migration
ALTER TABLE characters 
  ALTER COLUMN class_source DROP NOT NULL,
  ALTER COLUMN class_index DROP NOT NULL;

-- Add helper column to track if character uses multiclass
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS uses_multiclass BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON TABLE character_classes IS 'Tracks multiple classes for characters that multiclass';
COMMENT ON TABLE character_class_features IS 'Tracks features acquired at specific class levels for multiclass characters';
COMMENT ON COLUMN character_classes.is_primary_class IS 'First class determines saving throw proficiencies and starting equipment';
COMMENT ON COLUMN character_classes.level_acquired_at IS 'Character level when this class was first added (for tracking multiclass entry)';
