-- Create campaign_timeline table for session/quest planning
-- Chronological order of planned sessions and quests

CREATE TABLE IF NOT EXISTS campaign_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  session_type TEXT CHECK (session_type IN ('prologue', 'session', 'milestone', 'downtime', 'event')),
  planned_date TIMESTAMP,
  actual_date TIMESTAMP,
  order_index INTEGER NOT NULL,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped')),
  associated_location_ids UUID[] DEFAULT '{}',
  associated_quest_ids UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_campaign_timeline_campaign_id ON campaign_timeline(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_timeline_order_index ON campaign_timeline(campaign_id, order_index);
CREATE INDEX IF NOT EXISTS idx_campaign_timeline_status ON campaign_timeline(status);
CREATE INDEX IF NOT EXISTS idx_campaign_timeline_session_type ON campaign_timeline(session_type);

-- Add comments
COMMENT ON TABLE campaign_timeline IS 'Chronological planning and tracking of campaign sessions and quests';
COMMENT ON COLUMN campaign_timeline.order_index IS 'Chronological order for sorting timeline entries';
COMMENT ON COLUMN campaign_timeline.associated_location_ids IS 'Array of location IDs involved in this session/quest';
COMMENT ON COLUMN campaign_timeline.associated_quest_ids IS 'Array of quest IDs from quests table';

-- Enable RLS
ALTER TABLE campaign_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view campaign_timeline"
  ON campaign_timeline
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_timeline.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create campaign_timeline"
  ON campaign_timeline
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_timeline.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update campaign_timeline"
  ON campaign_timeline
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_timeline.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_timeline.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete campaign_timeline"
  ON campaign_timeline
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_timeline.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_campaign_timeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_timeline_updated_at
  BEFORE UPDATE ON campaign_timeline
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_timeline_updated_at();

