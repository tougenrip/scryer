-- Create bounty_board table for campaign-specific bounties
-- Bounties are separate from quests and focus on targets (NPCs or monsters) with rewards

CREATE TABLE IF NOT EXISTS bounty_board (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_name TEXT NOT NULL, -- Name of the NPC or monster being hunted
  target_type TEXT DEFAULT 'npc' CHECK (target_type IN ('npc', 'monster', 'other')),
  target_npc_id UUID REFERENCES npcs(id) ON DELETE SET NULL, -- Link to NPC if applicable
  description TEXT, -- Description of the bounty and why the target is wanted
  reward TEXT, -- Reward description (gold, items, etc.)
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'completed')),
  location TEXT, -- Where the bounty is posted or relevant
  posted_by TEXT, -- Who posted the bounty (e.g., "City Guard", "Merchant's Guild")
  hidden_from_players BOOLEAN DEFAULT TRUE, -- If true, only DM can see this bounty
  dm_notes TEXT, -- DM-only notes
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bounty_board_campaign_id ON bounty_board(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bounty_board_status ON bounty_board(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_bounty_board_target_npc_id ON bounty_board(target_npc_id);
CREATE INDEX IF NOT EXISTS idx_bounty_board_created_by ON bounty_board(created_by);

-- Add comments
COMMENT ON TABLE bounty_board IS 'Bounty board for tracking bounties on NPCs, monsters, or other targets';
COMMENT ON COLUMN bounty_board.target_type IS 'Type of target: npc, monster, or other';
COMMENT ON COLUMN bounty_board.status IS 'Status: available (open), claimed (party took it), completed (finished)';
COMMENT ON COLUMN bounty_board.hidden_from_players IS 'If true, only the DM can see this bounty';

-- Enable RLS
ALTER TABLE bounty_board ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Campaign members can view non-hidden bounties, DMs can see all
CREATE POLICY "Campaign members can view bounties"
  ON bounty_board
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = bounty_board.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
    AND (
      bounty_board.hidden_from_players = FALSE
      OR EXISTS (
        SELECT 1
        FROM campaigns
        WHERE campaigns.id = bounty_board.campaign_id
        AND campaigns.dm_user_id = auth.uid()
      )
    )
  );

-- DMs can create bounties
CREATE POLICY "DMs can create bounties"
  ON bounty_board
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = bounty_board.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
    AND auth.uid() = created_by
  );

-- DMs can update bounties
CREATE POLICY "DMs can update bounties"
  ON bounty_board
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = bounty_board.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = bounty_board.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- DMs can delete bounties
CREATE POLICY "DMs can delete bounties"
  ON bounty_board
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = bounty_board.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bounty_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bounty_board_updated_at
  BEFORE UPDATE ON bounty_board
  FOR EACH ROW
  EXECUTE FUNCTION update_bounty_board_updated_at();

