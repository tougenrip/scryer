-- Create proficiencies and training tables for normalized proficiency storage
-- This allows proficiencies (languages, tools, weapons, armor) to be stored and queried efficiently

-- ============================================
-- SRD PROFICIENCIES & TRAINING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS srd_proficiencies_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index TEXT UNIQUE NOT NULL,  -- e.g., "common", "thieves-tools", "martial-weapons", "light-armor"
  name TEXT NOT NULL,           -- e.g., "Common", "Thieves' Tools", "Martial Weapons", "Light Armor"
  type TEXT NOT NULL CHECK (type IN ('language', 'tool', 'weapon', 'armor')),
  description TEXT,             -- Full proficiency description
  category TEXT,                -- e.g., "Artisan's Tools", "Simple Weapons", "Light Armor"
  created_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_srd_proficiencies_training_index ON srd_proficiencies_training(index);
CREATE INDEX IF NOT EXISTS idx_srd_proficiencies_training_type ON srd_proficiencies_training(type);

-- ============================================
-- SRD RACE-PROFICIENCY JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS srd_race_proficiencies_training (
  race_index TEXT NOT NULL REFERENCES srd_races(index) ON DELETE CASCADE,
  proficiency_index TEXT NOT NULL REFERENCES srd_proficiencies_training(index) ON DELETE CASCADE,
  PRIMARY KEY (race_index, proficiency_index)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_srd_race_proficiencies_race_index ON srd_race_proficiencies_training(race_index);
CREATE INDEX IF NOT EXISTS idx_srd_race_proficiencies_proficiency_index ON srd_race_proficiencies_training(proficiency_index);

-- ============================================
-- SRD CLASS-PROFICIENCY JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS srd_class_proficiencies_training (
  class_index TEXT NOT NULL REFERENCES srd_classes(index) ON DELETE CASCADE,
  proficiency_index TEXT NOT NULL REFERENCES srd_proficiencies_training(index) ON DELETE CASCADE,
  PRIMARY KEY (class_index, proficiency_index)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_srd_class_proficiencies_class_index ON srd_class_proficiencies_training(class_index);
CREATE INDEX IF NOT EXISTS idx_srd_class_proficiencies_proficiency_index ON srd_class_proficiencies_training(proficiency_index);

-- ============================================
-- HOMEBREW PROFICIENCIES & TRAINING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS homebrew_proficiencies_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  based_on_srd TEXT REFERENCES srd_proficiencies_training(index), -- nullable, for cloned proficiencies
  index TEXT NOT NULL,  -- unique within campaign
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('language', 'tool', 'weapon', 'armor')),
  description TEXT,
  category TEXT,
  created_by UUID NOT NULL,  -- user who created it
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(campaign_id, index)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_homebrew_proficiencies_training_campaign_id ON homebrew_proficiencies_training(campaign_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_proficiencies_training_index ON homebrew_proficiencies_training(campaign_id, index);
CREATE INDEX IF NOT EXISTS idx_homebrew_proficiencies_training_type ON homebrew_proficiencies_training(type);

-- ============================================
-- HOMEBREW RACE-PROFICIENCY JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS homebrew_race_proficiencies_training (
  race_id UUID NOT NULL REFERENCES homebrew_races(id) ON DELETE CASCADE,
  proficiency_source TEXT NOT NULL CHECK (proficiency_source IN ('srd', 'homebrew')),  -- 'srd' or 'homebrew'
  proficiency_index TEXT NOT NULL,   -- references srd_proficiencies_training.index or homebrew_proficiencies_training.index
  PRIMARY KEY (race_id, proficiency_source, proficiency_index)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_homebrew_race_proficiencies_race_id ON homebrew_race_proficiencies_training(race_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_race_proficiencies_proficiency ON homebrew_race_proficiencies_training(proficiency_source, proficiency_index);

-- ============================================
-- HOMEBREW CLASS-PROFICIENCY JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS homebrew_class_proficiencies_training (
  class_id UUID NOT NULL REFERENCES homebrew_classes(id) ON DELETE CASCADE,
  proficiency_source TEXT NOT NULL CHECK (proficiency_source IN ('srd', 'homebrew')),  -- 'srd' or 'homebrew'
  proficiency_index TEXT NOT NULL,   -- references srd_proficiencies_training.index or homebrew_proficiencies_training.index
  PRIMARY KEY (class_id, proficiency_source, proficiency_index)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_homebrew_class_proficiencies_class_id ON homebrew_class_proficiencies_training(class_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_class_proficiencies_proficiency ON homebrew_class_proficiencies_training(proficiency_source, proficiency_index);

-- ============================================
-- CHARACTER PROFICIENCIES & TRAINING TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS character_proficiencies_training (
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  proficiency_source TEXT NOT NULL CHECK (proficiency_source IN ('srd', 'homebrew')),
  proficiency_index TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('race', 'background', 'class', 'custom')),
  PRIMARY KEY (character_id, proficiency_source, proficiency_index, source_type)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_character_proficiencies_character_id ON character_proficiencies_training(character_id);
CREATE INDEX IF NOT EXISTS idx_character_proficiencies_proficiency ON character_proficiencies_training(proficiency_source, proficiency_index);

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE srd_proficiencies_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd_race_proficiencies_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd_class_proficiencies_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_proficiencies_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_race_proficiencies_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_class_proficiencies_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_proficiencies_training ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR SRD TABLES (Public Read)
-- ============================================

-- SRD proficiencies are read-only and public
CREATE POLICY "Anyone can view SRD proficiencies training"
  ON srd_proficiencies_training
  FOR SELECT
  USING (true);

-- SRD race-proficiency mappings are read-only and public
CREATE POLICY "Anyone can view SRD race-proficiency mappings"
  ON srd_race_proficiencies_training
  FOR SELECT
  USING (true);

-- SRD class-proficiency mappings are read-only and public
CREATE POLICY "Anyone can view SRD class-proficiency mappings"
  ON srd_class_proficiencies_training
  FOR SELECT
  USING (true);

-- ============================================
-- RLS POLICIES FOR HOMEBREW TABLES
-- ============================================

-- Users can view homebrew proficiencies in campaigns they're members of
CREATE POLICY "Users can view homebrew proficiencies in their campaigns"
  ON homebrew_proficiencies_training
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = homebrew_proficiencies_training.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- DMs can create homebrew proficiencies in their campaigns
CREATE POLICY "DMs can create homebrew proficiencies"
  ON homebrew_proficiencies_training
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = homebrew_proficiencies_training.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

-- DMs can update homebrew proficiencies in their campaigns
CREATE POLICY "DMs can update homebrew proficiencies"
  ON homebrew_proficiencies_training
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = homebrew_proficiencies_training.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- DMs can delete homebrew proficiencies in their campaigns
CREATE POLICY "DMs can delete homebrew proficiencies"
  ON homebrew_proficiencies_training
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = homebrew_proficiencies_training.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Users can view homebrew race-proficiency mappings in campaigns they're members of
CREATE POLICY "Users can view homebrew race-proficiency mappings in their campaigns"
  ON homebrew_race_proficiencies_training
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM homebrew_races
      JOIN campaign_members ON campaign_members.campaign_id = homebrew_races.campaign_id
      WHERE homebrew_races.id = homebrew_race_proficiencies_training.race_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- DMs can create homebrew race-proficiency mappings in their campaigns
CREATE POLICY "DMs can create homebrew race-proficiency mappings"
  ON homebrew_race_proficiencies_training
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM homebrew_races
      JOIN campaigns ON campaigns.id = homebrew_races.campaign_id
      WHERE homebrew_races.id = homebrew_race_proficiencies_training.race_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- DMs can delete homebrew race-proficiency mappings in their campaigns
CREATE POLICY "DMs can delete homebrew race-proficiency mappings"
  ON homebrew_race_proficiencies_training
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM homebrew_races
      JOIN campaigns ON campaigns.id = homebrew_races.campaign_id
      WHERE homebrew_races.id = homebrew_race_proficiencies_training.race_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Users can view homebrew class-proficiency mappings in campaigns they're members of
CREATE POLICY "Users can view homebrew class-proficiency mappings in their campaigns"
  ON homebrew_class_proficiencies_training
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM homebrew_classes
      JOIN campaign_members ON campaign_members.campaign_id = homebrew_classes.campaign_id
      WHERE homebrew_classes.id = homebrew_class_proficiencies_training.class_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- DMs can create homebrew class-proficiency mappings in their campaigns
CREATE POLICY "DMs can create homebrew class-proficiency mappings"
  ON homebrew_class_proficiencies_training
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM homebrew_classes
      JOIN campaigns ON campaigns.id = homebrew_classes.campaign_id
      WHERE homebrew_classes.id = homebrew_class_proficiencies_training.class_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- DMs can delete homebrew class-proficiency mappings in their campaigns
CREATE POLICY "DMs can delete homebrew class-proficiency mappings"
  ON homebrew_class_proficiencies_training
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM homebrew_classes
      JOIN campaigns ON campaigns.id = homebrew_classes.campaign_id
      WHERE homebrew_classes.id = homebrew_class_proficiencies_training.class_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES FOR CHARACTER PROFICIENCIES
-- ============================================

-- Users can view proficiencies for characters they own or in campaigns they're members of
CREATE POLICY "Users can view character proficiencies in their campaigns"
  ON character_proficiencies_training
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM characters
      LEFT JOIN campaign_members ON campaign_members.campaign_id = characters.campaign_id
      WHERE characters.id = character_proficiencies_training.character_id
      AND (
        characters.user_id = auth.uid()
        OR campaign_members.user_id = auth.uid()
      )
    )
  );

-- Users can create proficiencies for their own characters
CREATE POLICY "Users can create proficiencies for their characters"
  ON character_proficiencies_training
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM characters
      WHERE characters.id = character_proficiencies_training.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Users can update proficiencies for their own characters
CREATE POLICY "Users can update proficiencies for their characters"
  ON character_proficiencies_training
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM characters
      WHERE characters.id = character_proficiencies_training.character_id
      AND characters.user_id = auth.uid()
    )
  );

-- Users can delete proficiencies for their own characters
CREATE POLICY "Users can delete proficiencies for their characters"
  ON character_proficiencies_training
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM characters
      WHERE characters.id = character_proficiencies_training.character_id
      AND characters.user_id = auth.uid()
    )
  );

