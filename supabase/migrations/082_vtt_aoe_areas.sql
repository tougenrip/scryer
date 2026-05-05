-- Persistent AOE areas placed by players or the DM on a VTT map.
-- Ephemeral previews and pings are broadcast-only and not stored here.

create table if not exists public.vtt_aoe_areas (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  shape text not null check (shape in ('circle','cone','line','square','ring')),
  origin_x double precision not null,
  origin_y double precision not null,
  length_ft integer not null check (length_ft >= 5),
  rotation_deg double precision not null default 0,
  color text not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists vtt_aoe_areas_map_id_idx on public.vtt_aoe_areas(map_id);
create index if not exists vtt_aoe_areas_campaign_id_idx on public.vtt_aoe_areas(campaign_id);

alter table public.vtt_aoe_areas enable row level security;

drop policy if exists "Campaign members can view aoe areas" on public.vtt_aoe_areas;
create policy "Campaign members can view aoe areas"
  on public.vtt_aoe_areas
  for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_aoe_areas.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Campaign members can insert aoe areas" on public.vtt_aoe_areas;
create policy "Campaign members can insert aoe areas"
  on public.vtt_aoe_areas
  for insert
  with check (
    auth.uid() = owner_user_id
    and (
      exists (
        select 1 from public.campaigns c
        where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
      )
      or exists (
        select 1 from public.campaign_members cm
        where cm.campaign_id = vtt_aoe_areas.campaign_id and cm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Owner or DM can update aoe areas" on public.vtt_aoe_areas;
create policy "Owner or DM can update aoe areas"
  on public.vtt_aoe_areas
  for update
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "Owner or DM can delete aoe areas" on public.vtt_aoe_areas;
create policy "Owner or DM can delete aoe areas"
  on public.vtt_aoe_areas
  for delete
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.vtt_aoe_areas;
