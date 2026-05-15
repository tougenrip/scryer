-- Collapse `player_journal_entries` into `vtt_notes`. Notes already
-- carry the visibility ladder we need; this just adds optional in-world
-- date columns so dated entries (= journal entries) can live in the
-- same table.
--
-- Visibility mapping when migrating rows:
--   private -> owner
--   dm      -> dm
--   party   -> shared
--
-- After this migration the Journal panel becomes a filter view on
-- vtt_notes (rows where in_world_year is not null), not a separate
-- table.

-- 1. Add the date columns to vtt_notes.
alter table public.vtt_notes
  add column if not exists in_world_year integer,
  add column if not exists in_world_month integer,
  add column if not exists in_world_day integer;

create index if not exists vtt_notes_in_world_date_idx
  on public.vtt_notes(
    campaign_id, in_world_year, in_world_month, in_world_day
  )
  where in_world_year is not null;

-- 2. Migrate existing journal entries (if the table exists) into notes.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'player_journal_entries'
  ) then
    insert into public.vtt_notes (
      id,
      campaign_id,
      author_user_id,
      visibility,
      title,
      body,
      in_world_year,
      in_world_month,
      in_world_day,
      created_at,
      updated_at
    )
    select
      id,
      campaign_id,
      author_user_id,
      case visibility::text
        when 'private' then 'owner'
        when 'dm' then 'dm'
        when 'party' then 'shared'
        else 'owner'
      end,
      coalesce(title, ''),
      coalesce(body, ''),
      in_world_year,
      in_world_month,
      in_world_day,
      created_at,
      updated_at
    from public.player_journal_entries
    on conflict (id) do nothing;
  end if;
end $$;

-- 3. Drop the journal table + enum (in any order — table first so the
--    enum has no dependents).
drop table if exists public.player_journal_entries;
drop type if exists public.journal_visibility;
