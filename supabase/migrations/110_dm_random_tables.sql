-- DM-authored random tables. Each table is a weighted list of text
-- entries the DM can roll on during a session. Examples: NPC names,
-- shop stock, weather flips, plot hooks, dungeon dressing.
--
-- Entries store a free-form `value` (the text shown when rolled) plus
-- a jsonb `metadata` field for structured payloads (price, rarity,
-- linked monster index, etc) — kept open so future generators can
-- attach structured data without schema churn.
--
-- A `category` column keeps the sidebar organised (NPC / Shop /
-- Weather / Plot / Other) without forcing a strict enum — the DM
-- picks from suggestions or types their own.

create table if not exists public.dm_random_tables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  description text,
  -- Loose label for sidebar grouping ('npc', 'shop', 'weather', etc).
  category text,
  -- How many entries to draw when "rolling once". Defaults to 1.
  rolls_per_use integer not null default 1 check (rolls_per_use > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dm_random_tables_campaign_idx
  on public.dm_random_tables(campaign_id);

create table if not exists public.dm_random_table_entries (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.dm_random_tables(id) on delete cascade,
  weight integer not null default 1 check (weight > 0),
  value text not null,
  -- Open-ended jsonb so a "shop stock" entry can carry { price: 25, rarity: 'rare' }
  -- without a schema migration per kind of table.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dm_random_table_entries_table_idx
  on public.dm_random_table_entries(table_id);

-- updated_at touch trigger on tables
create or replace function public.touch_dm_random_tables_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_dm_random_tables_updated_at on public.dm_random_tables;
create trigger trg_dm_random_tables_updated_at
  before update on public.dm_random_tables
  for each row execute function public.touch_dm_random_tables_updated_at();

alter table public.dm_random_tables enable row level security;
alter table public.dm_random_table_entries enable row level security;

-- READ: any campaign member can read DM tables (so a player can roll
-- on a public NPC-name table during downtime if the DM lets them).
drop policy if exists "DM tables select" on public.dm_random_tables;
create policy "DM tables select"
  on public.dm_random_tables for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = dm_random_tables.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = dm_random_tables.campaign_id and cm.user_id = auth.uid()
    )
  );

-- WRITE: DM only.
drop policy if exists "DM tables insert" on public.dm_random_tables;
create policy "DM tables insert"
  on public.dm_random_tables for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.campaigns c
      where c.id = dm_random_tables.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "DM tables update" on public.dm_random_tables;
create policy "DM tables update"
  on public.dm_random_tables for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = dm_random_tables.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "DM tables delete" on public.dm_random_tables;
create policy "DM tables delete"
  on public.dm_random_tables for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = dm_random_tables.campaign_id and c.dm_user_id = auth.uid()
    )
  );

-- Entries inherit access via their parent table.
drop policy if exists "DM table entries select" on public.dm_random_table_entries;
create policy "DM table entries select"
  on public.dm_random_table_entries for select
  using (
    exists (
      select 1
      from public.dm_random_tables t
      join public.campaigns c on c.id = t.campaign_id
      where t.id = dm_random_table_entries.table_id
        and (
          c.dm_user_id = auth.uid()
          or exists (
            select 1 from public.campaign_members cm
            where cm.campaign_id = c.id and cm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "DM table entries write" on public.dm_random_table_entries;
create policy "DM table entries write"
  on public.dm_random_table_entries for all
  using (
    exists (
      select 1
      from public.dm_random_tables t
      join public.campaigns c on c.id = t.campaign_id
      where t.id = dm_random_table_entries.table_id
        and c.dm_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.dm_random_tables t
      join public.campaigns c on c.id = t.campaign_id
      where t.id = dm_random_table_entries.table_id
        and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.dm_random_tables;
alter publication supabase_realtime add table public.dm_random_table_entries;
