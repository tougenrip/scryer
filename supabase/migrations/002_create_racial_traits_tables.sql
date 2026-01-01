-- Create racial traits tables for normalized trait storage
-- This allows traits to have full descriptions and better querying capabilities

-- ============================================
-- SRD RACIAL TRAITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS srd_racial_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index TEXT UNIQUE NOT NULL,  -- e.g., "darkvision", "fey-ancestry"
  name TEXT NOT NULL,           -- e.g., "Darkvision", "Fey Ancestry"
  description TEXT,             -- Full trait description
  created_at TIMESTAMP DEFAULT now()
);

-- Create index on index column for faster lookups
CREATE INDEX IF NOT EXISTS idx_srd_racial_traits_index ON srd_racial_traits(index);

-- ============================================
-- SRD RACE-TRAIT JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS srd_race_traits (
  race_index TEXT NOT NULL REFERENCES srd_races(index) ON DELETE CASCADE,
  trait_index TEXT NOT NULL REFERENCES srd_racial_traits(index) ON DELETE CASCADE,
  PRIMARY KEY (race_index, trait_index)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_srd_race_traits_race_index ON srd_race_traits(race_index);
CREATE INDEX IF NOT EXISTS idx_srd_race_traits_trait_index ON srd_race_traits(trait_index);

-- ============================================
-- HOMEBREW RACIAL TRAITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS homebrew_racial_traits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  based_on_srd TEXT REFERENCES srd_racial_traits(index), -- nullable, for cloned traits
  index TEXT NOT NULL,  -- unique within campaign
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,  -- user who created it
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(campaign_id, index)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_homebrew_racial_traits_campaign_id ON homebrew_racial_traits(campaign_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_racial_traits_index ON homebrew_racial_traits(campaign_id, index);

-- ============================================
-- HOMEBREW RACE-TRAIT JUNCTION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS homebrew_race_traits (
  race_id UUID NOT NULL REFERENCES homebrew_races(id) ON DELETE CASCADE,
  trait_source TEXT NOT NULL CHECK (trait_source IN ('srd', 'homebrew')),  -- 'srd' or 'homebrew'
  trait_index TEXT NOT NULL,   -- references srd_racial_traits.index or homebrew_racial_traits.index
  PRIMARY KEY (race_id, trait_source, trait_index)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_homebrew_race_traits_race_id ON homebrew_race_traits(race_id);
CREATE INDEX IF NOT EXISTS idx_homebrew_race_traits_trait ON homebrew_race_traits(trait_source, trait_index);

-- ============================================
-- ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE srd_racial_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd_race_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_racial_traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_race_traits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR SRD TABLES (Public Read)
-- ============================================

-- SRD racial traits are read-only and public
CREATE POLICY "Anyone can view SRD racial traits"
  ON srd_racial_traits
  FOR SELECT
  USING (true);

-- SRD race-trait mappings are read-only and public
CREATE POLICY "Anyone can view SRD race-trait mappings"
  ON srd_race_traits
  FOR SELECT
  USING (true);

-- ============================================
-- RLS POLICIES FOR HOMEBREW TABLES
-- ============================================

-- Users can view homebrew racial traits in campaigns they're members of
CREATE POLICY "Users can view homebrew racial traits in their campaigns"
  ON homebrew_racial_traits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = homebrew_racial_traits.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- DMs can create homebrew racial traits in their campaigns
CREATE POLICY "DMs can create homebrew racial traits"
  ON homebrew_racial_traits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = homebrew_racial_traits.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

-- DMs can update homebrew racial traits in their campaigns
CREATE POLICY "DMs can update homebrew racial traits"
  ON homebrew_racial_traits
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = homebrew_racial_traits.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- DMs can delete homebrew racial traits in their campaigns
CREATE POLICY "DMs can delete homebrew racial traits"
  ON homebrew_racial_traits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = homebrew_racial_traits.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Users can view homebrew race-trait mappings in campaigns they're members of
CREATE POLICY "Users can view homebrew race-trait mappings in their campaigns"
  ON homebrew_race_traits
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM homebrew_races
      JOIN campaign_members ON campaign_members.campaign_id = homebrew_races.campaign_id
      WHERE homebrew_races.id = homebrew_race_traits.race_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- DMs can create homebrew race-trait mappings in their campaigns
CREATE POLICY "DMs can create homebrew race-trait mappings"
  ON homebrew_race_traits
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM homebrew_races
      JOIN campaigns ON campaigns.id = homebrew_races.campaign_id
      WHERE homebrew_races.id = homebrew_race_traits.race_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- DMs can delete homebrew race-trait mappings in their campaigns
CREATE POLICY "DMs can delete homebrew race-trait mappings"
  ON homebrew_race_traits
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM homebrew_races
      JOIN campaigns ON campaigns.id = homebrew_races.campaign_id
      WHERE homebrew_races.id = homebrew_race_traits.race_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

