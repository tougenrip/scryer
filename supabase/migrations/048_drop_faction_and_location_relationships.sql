-- Drop faction_relationships and location_relationships tables
-- These tables are not used - the relationship board now uses JSON storage
-- in campaigns.relationship_board_data instead

-- ============================================
-- Drop faction_relationships table
-- ============================================

-- Drop RLS policies
DROP POLICY IF EXISTS "Campaign members can view public faction_relationships" ON faction_relationships;
DROP POLICY IF EXISTS "DMs can create faction_relationships" ON faction_relationships;
DROP POLICY IF EXISTS "DMs can update faction_relationships" ON faction_relationships;
DROP POLICY IF EXISTS "DMs can delete faction_relationships" ON faction_relationships;

-- Drop the updated_at trigger and function
DROP TRIGGER IF EXISTS update_faction_relationships_updated_at ON faction_relationships;
DROP FUNCTION IF EXISTS update_faction_relationships_updated_at() CASCADE;

-- Drop the table (this will also drop indexes and foreign key constraints)
DROP TABLE IF EXISTS faction_relationships CASCADE;

-- ============================================
-- Drop location_relationships table
-- ============================================

-- Drop RLS policies
DROP POLICY IF EXISTS "Campaign members can view location_relationships" ON location_relationships;
DROP POLICY IF EXISTS "DMs can create location_relationships" ON location_relationships;
DROP POLICY IF EXISTS "DMs can update location_relationships" ON location_relationships;
DROP POLICY IF EXISTS "DMs can delete location_relationships" ON location_relationships;

-- Drop the table (this will also drop indexes and foreign key constraints)
DROP TABLE IF EXISTS location_relationships CASCADE;

