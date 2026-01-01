-- Data migration: Populate srd_racial_traits and srd_race_traits from existing JSONB data
-- This extracts unique traits from srd_races.traits JSONB and creates the normalized structure

-- ============================================
-- STEP 1: Extract unique traits and insert into srd_racial_traits
-- ============================================

-- Insert unique traits from all races' traits JSONB
-- Uses DISTINCT ON to handle duplicate traits across races
INSERT INTO srd_racial_traits (index, name, description)
SELECT DISTINCT ON (trait->>'index')
  trait->>'index' as index,
  trait->>'name' as name,
  NULL as description  -- Descriptions will be populated later via D&D MCP or manual entry
FROM srd_races,
  jsonb_array_elements(traits) as trait
WHERE traits IS NOT NULL
  AND jsonb_array_length(traits) > 0
  AND trait->>'index' IS NOT NULL
  AND trait->>'name' IS NOT NULL
ON CONFLICT (index) DO NOTHING;

-- ============================================
-- STEP 2: Populate srd_race_traits junction table
-- ============================================

-- Insert race-trait mappings from JSONB
INSERT INTO srd_race_traits (race_index, trait_index)
SELECT DISTINCT
  r.index as race_index,
  trait->>'index' as trait_index
FROM srd_races r,
  jsonb_array_elements(r.traits) as trait
WHERE r.traits IS NOT NULL
  AND jsonb_array_length(r.traits) > 0
  AND trait->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_racial_traits srt 
    WHERE srt.index = trait->>'index'
  )
ON CONFLICT (race_index, trait_index) DO NOTHING;

