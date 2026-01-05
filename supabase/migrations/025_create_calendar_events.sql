-- Create calendar_events table for one-time and repeatable events
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_year INTEGER NOT NULL,
  event_month INTEGER NOT NULL CHECK (event_month >= 1 AND event_month <= 12),
  event_day INTEGER NOT NULL CHECK (event_day >= 1 AND event_day <= 31),
  is_repeatable BOOLEAN DEFAULT FALSE,
  repeat_type TEXT CHECK (repeat_type IN ('daily', 'weekly', 'monthly', 'yearly')),
  repeat_interval INTEGER DEFAULT 1, -- Every N days/weeks/months/years
  repeat_end_year INTEGER, -- Optional end year for repeatable events
  repeat_end_month INTEGER,
  repeat_end_day INTEGER,
  color TEXT DEFAULT '#c9b882', -- Event color for display
  created_by UUID NOT NULL, -- User who created the event
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_campaign_id ON calendar_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_year, event_month, event_day);
CREATE INDEX IF NOT EXISTS idx_calendar_events_repeatable ON calendar_events(is_repeatable);

-- Add comments
COMMENT ON TABLE calendar_events IS 'Calendar events that can be one-time or repeatable';
COMMENT ON COLUMN calendar_events.repeat_type IS 'Type of repetition: daily, weekly, monthly, yearly';
COMMENT ON COLUMN calendar_events.repeat_interval IS 'Repeat every N days/weeks/months/years (e.g., every 2 weeks = 2)';
COMMENT ON COLUMN calendar_events.repeat_end_year IS 'Optional end date for repeatable events (null = repeats forever)';

-- Enable RLS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view calendar_events"
  ON calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = calendar_events.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Campaign members can create calendar_events"
  ON calendar_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = calendar_events.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Campaign members can update calendar_events"
  ON calendar_events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = calendar_events.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = calendar_events.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Campaign members can delete calendar_events"
  ON calendar_events
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = calendar_events.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

