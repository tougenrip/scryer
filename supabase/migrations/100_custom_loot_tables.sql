-- Custom DM-authored loot tables. Each row in a table is one possible
-- result with a relative weight. Rolling picks one row weighted by its
-- weight value. A row can grant a magic item, a piece of equipment, a
-- coin amount, or all three at once.

create table if not exists public.custom_loot_tables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  description text,
  /** How many separate rolls to make on this table when "rolling once".
   *  Defaults to 1. Useful for "roll 3 items from this table" presets. */
  rolls_per_use integer not null default 1 check (rolls_per_use > 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists custom_loot_tables_campaign_idx
  on public.custom_loot_tables(campaign_id);

create table if not exists public.custom_loot_table_entries (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.custom_loot_tables(id) on delete cascade,
  weight integer not null default 1 check (weight > 0),
  label text,
  -- An entry can grant any combination of these:
  item_source text check (item_source in ('srd','homebrew')),
  item_kind text check (item_kind in ('equipment','magic')),
  item_index text,
  item_name text,
  item_rarity text,
  cp integer not null default 0 check (cp >= 0),
  sp integer not null default 0 check (sp >= 0),
  ep integer not null default 0 check (ep >= 0),
  gp integer not null default 0 check (gp >= 0),
  pp integer not null default 0 check (pp >= 0),
  created_at timestamptz not null default now()
);
create index if not exists custom_loot_entries_table_idx
  on public.custom_loot_table_entries(table_id);

alter table public.custom_loot_tables enable row level security;
alter table public.custom_loot_table_entries enable row level security;

drop policy if exists "Custom loot tables select" on public.custom_loot_tables;
create policy "Custom loot tables select"
  on public.custom_loot_tables for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = custom_loot_tables.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = custom_loot_tables.campaign_id and cm.user_id = auth.uid()
    )
  );

-- DM-only writes.
drop policy if exists "Custom loot tables write" on public.custom_loot_tables;
create policy "Custom loot tables write"
  on public.custom_loot_tables for all
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = custom_loot_tables.campaign_id and c.dm_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = custom_loot_tables.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "Custom loot entries select" on public.custom_loot_table_entries;
create policy "Custom loot entries select"
  on public.custom_loot_table_entries for select
  using (
    exists (
      select 1 from public.custom_loot_tables t
      join public.campaigns c on c.id = t.campaign_id
      where t.id = custom_loot_table_entries.table_id
        and (
          c.dm_user_id = auth.uid()
          or exists (
            select 1 from public.campaign_members cm
            where cm.campaign_id = c.id and cm.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Custom loot entries write" on public.custom_loot_table_entries;
create policy "Custom loot entries write"
  on public.custom_loot_table_entries for all
  using (
    exists (
      select 1 from public.custom_loot_tables t
      join public.campaigns c on c.id = t.campaign_id
      where t.id = custom_loot_table_entries.table_id
        and c.dm_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.custom_loot_tables t
      join public.campaigns c on c.id = t.campaign_id
      where t.id = custom_loot_table_entries.table_id
        and c.dm_user_id = auth.uid()
    )
  );
