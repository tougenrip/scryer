-- Add DM notes columns to campaigns table
-- Public notes are visible to all campaign members
-- Private notes are only visible to the DM

ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS public_notes TEXT,
ADD COLUMN IF NOT EXISTS private_notes TEXT;

COMMENT ON COLUMN campaigns.public_notes IS 'Public DM notes visible to all campaign members';
COMMENT ON COLUMN campaigns.private_notes IS 'Private DM notes only visible to the campaign DM';

