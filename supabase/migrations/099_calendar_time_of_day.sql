-- Add time-of-day to the existing campaign_calendar so the DM can advance
-- by hours (short rest = 1h, long rest = 8h, etc.) and players see the
-- in-world clock alongside the in-world date.

alter table public.campaign_calendar
  add column if not exists current_hour integer not null default 8
  check (current_hour >= 0 and current_hour < 24);

alter table public.campaign_calendar
  add column if not exists current_minute integer not null default 0
  check (current_minute >= 0 and current_minute < 60);
