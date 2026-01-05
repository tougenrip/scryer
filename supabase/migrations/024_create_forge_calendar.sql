-- Create campaign_calendar table for time tracking
-- Weather, moon phases, days, months, years tracker

CREATE TABLE IF NOT EXISTS campaign_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  current_year INTEGER DEFAULT 1,
  current_month INTEGER DEFAULT 1 CHECK (current_month >= 1 AND current_month <= 12),
  current_day INTEGER DEFAULT 1 CHECK (current_day >= 1 AND current_day <= 31),
  day_of_week INTEGER DEFAULT 1 CHECK (day_of_week >= 1 AND day_of_week <= 7),
  season TEXT CHECK (season IN ('spring', 'summer', 'autumn', 'winter')),
  moon_phase TEXT CHECK (moon_phase IN ('new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous', 'full', 'waning_gibbous', 'last_quarter', 'waning_crescent')),
  moon_phase_day INTEGER CHECK (moon_phase_day >= 1 AND moon_phase_day <= 28),
  weather JSONB DEFAULT '{}'::jsonb,
  custom_month_names TEXT[] DEFAULT '{}',
  custom_weekday_names TEXT[] DEFAULT '{}',
  time_speed_multiplier DECIMAL DEFAULT 1.0,
  updated_at TIMESTAMP DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_campaign_calendar_campaign_id ON campaign_calendar(campaign_id);

-- Add comments
COMMENT ON TABLE campaign_calendar IS 'Time tracking system for campaigns including calendar, weather, and moon phases';
COMMENT ON COLUMN campaign_calendar.weather IS 'JSONB object with weather data per location/region';
COMMENT ON COLUMN campaign_calendar.custom_month_names IS 'Custom month names (e.g., Harvest, Frost)';
COMMENT ON COLUMN campaign_calendar.custom_weekday_names IS 'Custom weekday names (e.g., Moonday, Towerday)';
COMMENT ON COLUMN campaign_calendar.time_speed_multiplier IS 'Multiplier for fast-forwarding time (e.g., 1.0 = normal, 2.0 = double speed)';

-- Enable RLS
ALTER TABLE campaign_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Campaign members can view campaign_calendar"
  ON campaign_calendar
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM campaign_members
      WHERE campaign_members.campaign_id = campaign_calendar.campaign_id
      AND campaign_members.user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can create campaign_calendar"
  ON campaign_calendar
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_calendar.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can update campaign_calendar"
  ON campaign_calendar
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_calendar.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_calendar.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

CREATE POLICY "DMs can delete campaign_calendar"
  ON campaign_calendar
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM campaigns
      WHERE campaigns.id = campaign_calendar.campaign_id
      AND campaigns.dm_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_campaign_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_calendar_updated_at
  BEFORE UPDATE ON campaign_calendar
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_calendar_updated_at();

