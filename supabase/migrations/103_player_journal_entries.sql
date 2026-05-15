-- Per-player journal entries for a campaign. Each entry is a dated
-- piece of writing authored by one user. Visibility is a three-tier
-- ladder: 'private' (author only), 'dm' (author + DM), 'party' (all
-- members). Default is private — encourages real journaling.
--
-- Entries are stamped with the IN-WORLD date at the time of writing
-- so the journal reads chronologically by campaign time, not real time.

create type public.journal_visibility as enum ('private', 'dm', 'party');

create table if not exists public.player_journal_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  body text not null default '',
  -- In-world date at the moment of writing. We snapshot from the
  -- campaign_calendar instead of foreign-keying so an entry stays
  -- pinned to its date even if the calendar is later edited.
  in_world_year integer not null,
  in_world_month integer not null,
  in_world_day integer not null,
  visibility public.journal_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists player_journal_entries_campaign_id_idx
  on public.player_journal_entries(campaign_id);
create index if not exists player_journal_entries_author_idx
  on public.player_journal_entries(campaign_id, author_user_id);
create index if not exists player_journal_entries_date_idx
  on public.player_journal_entries(
    campaign_id, in_world_year, in_world_month, in_world_day
  );

-- updated_at auto-bump trigger
create or replace function public.touch_player_journal_entries_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_player_journal_entries_touch_updated_at
  on public.player_journal_entries;
create trigger trg_player_journal_entries_touch_updated_at
  before update on public.player_journal_entries
  for each row execute function public.touch_player_journal_entries_updated_at();

alter table public.player_journal_entries enable row level security;

-- READ: author can always read own entries; DM can read 'dm' or 'party';
-- party members can read 'party'.
drop policy if exists "Read player journal entries" on public.player_journal_entries;
create policy "Read player journal entries"
  on public.player_journal_entries
  for select
  using (
    auth.uid() = author_user_id
    or (
      visibility in ('dm', 'party')
      and exists (
        select 1 from public.campaigns c
        where c.id = player_journal_entries.campaign_id
          and c.dm_user_id = auth.uid()
      )
    )
    or (
      visibility = 'party'
      and exists (
        select 1 from public.campaign_members cm
        where cm.campaign_id = player_journal_entries.campaign_id
          and cm.user_id = auth.uid()
      )
    )
  );

-- INSERT: author writes own entries, must be a member of the campaign.
drop policy if exists "Author can insert journal entries" on public.player_journal_entries;
create policy "Author can insert journal entries"
  on public.player_journal_entries
  for insert
  with check (
    auth.uid() = author_user_id
    and (
      exists (
        select 1 from public.campaigns c
        where c.id = player_journal_entries.campaign_id
          and c.dm_user_id = auth.uid()
      )
      or exists (
        select 1 from public.campaign_members cm
        where cm.campaign_id = player_journal_entries.campaign_id
          and cm.user_id = auth.uid()
      )
    )
  );

-- UPDATE: author only.
drop policy if exists "Author can update own journal entries" on public.player_journal_entries;
create policy "Author can update own journal entries"
  on public.player_journal_entries
  for update
  using (auth.uid() = author_user_id);

-- DELETE: author only.
drop policy if exists "Author can delete own journal entries" on public.player_journal_entries;
create policy "Author can delete own journal entries"
  on public.player_journal_entries
  for delete
  using (auth.uid() = author_user_id);

alter publication supabase_realtime add table public.player_journal_entries;
