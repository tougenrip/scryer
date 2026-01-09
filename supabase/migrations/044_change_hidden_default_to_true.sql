-- Change default value of hidden_from_players from FALSE to TRUE
-- This makes new entries hidden by default, requiring DM to explicitly make them visible

-- Update campaign_timeline
ALTER TABLE campaign_timeline
ALTER COLUMN hidden_from_players SET DEFAULT TRUE;

-- Update npcs
ALTER TABLE npcs
ALTER COLUMN hidden_from_players SET DEFAULT TRUE;

-- Update world_locations
ALTER TABLE world_locations
ALTER COLUMN hidden_from_players SET DEFAULT TRUE;

