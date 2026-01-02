-- Create dice_rolls table for tracking dice rolls in campaigns
CREATE TABLE IF NOT EXISTS dice_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  expression TEXT NOT NULL,
  result INTEGER NOT NULL,
  breakdown JSONB, -- { rolls: [4, 5, 6], modifier: 3, total: 18 }
  label TEXT,
  advantage BOOLEAN DEFAULT FALSE,
  disadvantage BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for campaign queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_dice_rolls_campaign ON dice_rolls(campaign_id, created_at DESC);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_dice_rolls_user ON dice_rolls(user_id, created_at DESC);

-- Index for character queries
CREATE INDEX IF NOT EXISTS idx_dice_rolls_character ON dice_rolls(character_id, created_at DESC) WHERE character_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE dice_rolls ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view rolls in their campaigns
CREATE POLICY "Users can view rolls in their campaigns"
  ON dice_rolls FOR SELECT
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create rolls in their campaigns
CREATE POLICY "Users can create rolls in their campaigns"
  ON dice_rolls FOR INSERT
  WITH CHECK (
    campaign_id IN (
      SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can delete their own rolls (optional, for cleanup)
CREATE POLICY "Users can delete their own rolls"
  ON dice_rolls FOR DELETE
  USING (user_id = auth.uid());
