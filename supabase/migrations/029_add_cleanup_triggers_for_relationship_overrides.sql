-- Add cleanup triggers to delete relationship_strength_overrides
-- when referenced entities (locations, factions, npcs, pantheons) are deleted
-- Since we have polymorphic relationships, we can't use foreign key constraints
-- Instead, we use triggers to clean up orphaned records

-- Function to clean up overrides when a location is deleted
CREATE OR REPLACE FUNCTION cleanup_location_relationship_overrides()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM relationship_strength_overrides
  WHERE (source_type = 'location' AND source_id = OLD.id)
     OR (target_type = 'location' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up overrides when a faction is deleted
CREATE OR REPLACE FUNCTION cleanup_faction_relationship_overrides()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM relationship_strength_overrides
  WHERE (source_type = 'faction' AND source_id = OLD.id)
     OR (target_type = 'faction' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up overrides when an NPC is deleted
CREATE OR REPLACE FUNCTION cleanup_npc_relationship_overrides()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM relationship_strength_overrides
  WHERE (source_type = 'npc' AND source_id = OLD.id)
     OR (target_type = 'npc' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up overrides when a pantheon deity is deleted
CREATE OR REPLACE FUNCTION cleanup_pantheon_relationship_overrides()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM relationship_strength_overrides
  WHERE (source_type = 'pantheon' AND source_id = OLD.id)
     OR (target_type = 'pantheon' AND target_id = OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_cleanup_location_overrides ON world_locations;
CREATE TRIGGER trigger_cleanup_location_overrides
  AFTER DELETE ON world_locations
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_location_relationship_overrides();

DROP TRIGGER IF EXISTS trigger_cleanup_faction_overrides ON factions;
CREATE TRIGGER trigger_cleanup_faction_overrides
  AFTER DELETE ON factions
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_faction_relationship_overrides();

DROP TRIGGER IF EXISTS trigger_cleanup_npc_overrides ON npcs;
CREATE TRIGGER trigger_cleanup_npc_overrides
  AFTER DELETE ON npcs
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_npc_relationship_overrides();

DROP TRIGGER IF EXISTS trigger_cleanup_pantheon_overrides ON pantheon_deities;
CREATE TRIGGER trigger_cleanup_pantheon_overrides
  AFTER DELETE ON pantheon_deities
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_pantheon_relationship_overrides();

-- Add comment
COMMENT ON FUNCTION cleanup_location_relationship_overrides() IS 'Cleans up relationship_strength_overrides when a location is deleted';
COMMENT ON FUNCTION cleanup_faction_relationship_overrides() IS 'Cleans up relationship_strength_overrides when a faction is deleted';
COMMENT ON FUNCTION cleanup_npc_relationship_overrides() IS 'Cleans up relationship_strength_overrides when an NPC is deleted';
COMMENT ON FUNCTION cleanup_pantheon_relationship_overrides() IS 'Cleans up relationship_strength_overrides when a pantheon deity is deleted';

