-- Add relationship_board_data JSONB column to campaigns table
-- Stores nodes and connections for the relationship board
-- This replaces the automatic relationship generation system

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS relationship_board_data JSONB DEFAULT '{"nodes": [], "connections": []}'::jsonb;

-- Add comment
COMMENT ON COLUMN campaigns.relationship_board_data IS 'Stores relationship board nodes and connections as JSON: {"nodes": [{"id": "uuid", "entityType": "npc|faction|location|pantheon", "entityId": "uuid", "position": {"x": number, "y": number}}], "connections": [{"id": "uuid", "sourceId": "node-id", "targetId": "node-id", "strength": 0-5, "type": "relationship-type"}]}';

