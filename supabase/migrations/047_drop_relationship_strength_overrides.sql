-- Drop relationship_strength_overrides table and related triggers
-- This table was used by the old relationship graph system which has been replaced
-- by the relationship board system that uses JSON storage in campaigns.relationship_board_data

-- Drop triggers first (from migration 029)
DROP TRIGGER IF EXISTS trigger_cleanup_location_overrides ON world_locations;
DROP TRIGGER IF EXISTS trigger_cleanup_faction_overrides ON factions;
DROP TRIGGER IF EXISTS trigger_cleanup_npc_overrides ON npcs;
DROP TRIGGER IF EXISTS trigger_cleanup_pantheon_overrides ON pantheon_deities;

-- Drop trigger functions
DROP FUNCTION IF EXISTS cleanup_location_relationship_overrides() CASCADE;
DROP FUNCTION IF EXISTS cleanup_faction_relationship_overrides() CASCADE;
DROP FUNCTION IF EXISTS cleanup_npc_relationship_overrides() CASCADE;
DROP FUNCTION IF EXISTS cleanup_pantheon_relationship_overrides() CASCADE;

-- Drop the updated_at trigger and function
DROP TRIGGER IF EXISTS update_relationship_strength_overrides_updated_at ON relationship_strength_overrides;
DROP FUNCTION IF EXISTS update_relationship_strength_overrides_updated_at() CASCADE;

-- Drop RLS policies (they will be automatically dropped with the table, but being explicit)
DROP POLICY IF EXISTS "Campaign members can view relationship_strength_overrides" ON relationship_strength_overrides;
DROP POLICY IF EXISTS "DMs can create relationship_strength_overrides" ON relationship_strength_overrides;
DROP POLICY IF EXISTS "DMs can update relationship_strength_overrides" ON relationship_strength_overrides;
DROP POLICY IF EXISTS "DMs can delete relationship_strength_overrides" ON relationship_strength_overrides;

-- Drop the table (this will also drop indexes)
DROP TABLE IF EXISTS relationship_strength_overrides CASCADE;

