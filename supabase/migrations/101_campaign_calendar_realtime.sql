-- Make campaign_calendar updates broadcast over Supabase realtime so the
-- VTT time HUD + day-cycle emblem on every client see "End Day" / hour
-- advance / etc. without a refresh. Idempotent: skip if already added.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaign_calendar'
  ) then
    execute 'alter publication supabase_realtime add table public.campaign_calendar';
  end if;
end $$;
