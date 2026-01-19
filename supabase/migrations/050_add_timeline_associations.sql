-- Add associated_npc_ids and associated_faction_ids to campaign_timeline table
-- Allow timeline entries to be associated with NPCs and factions

ALTER TABLE campaign_timeline
ADD COLUMN IF NOT EXISTS associated_npc_ids UUID[] DEFAULT '{}' NOT NULL;

ALTER TABLE campaign_timeline
ADD COLUMN IF NOT EXISTS associated_faction_ids UUID[] DEFAULT '{}' NOT NULL;

-- Add comments
COMMENT ON COLUMN campaign_timeline.associated_npc_ids IS 'Array of NPC IDs involved in this timeline entry';
COMMENT ON COLUMN campaign_timeline.associated_faction_ids IS 'Array of faction IDs involved in this timeline entry';

