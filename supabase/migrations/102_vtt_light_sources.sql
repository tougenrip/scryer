-- Standalone light sources placed on a VTT map (torches, lanterns,
-- magical lights, etc). Token-attached lights live on tokens.light_radius_ft;
-- this table is for lights that exist independently of any token.
--
-- Lights are scene dressing — DM-only to create/edit/delete. All campaign
-- members can read so players see the light render in scene_dark mode.

create table if not exists public.vtt_light_sources (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  x double precision not null,
  y double precision not null,
  radius_ft integer not null check (radius_ft >= 1 and radius_ft <= 500),
  -- Hex color string, e.g. '#FFC080' for warm torch.
  color text not null default '#FFC080',
  -- 0..1 brightness multiplier on the gradient.
  intensity double precision not null default 1.0 check (intensity >= 0 and intensity <= 2),
  name text,
  created_at timestamptz not null default now()
);

create index if not exists vtt_light_sources_map_id_idx on public.vtt_light_sources(map_id);
create index if not exists vtt_light_sources_campaign_id_idx on public.vtt_light_sources(campaign_id);

alter table public.vtt_light_sources enable row level security;

drop policy if exists "Campaign members can view light sources" on public.vtt_light_sources;
create policy "Campaign members can view light sources"
  on public.vtt_light_sources
  for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_light_sources.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_light_sources.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "DM can insert light sources" on public.vtt_light_sources;
create policy "DM can insert light sources"
  on public.vtt_light_sources
  for insert
  with check (
    auth.uid() = owner_user_id
    and exists (
      select 1 from public.campaigns c
      where c.id = vtt_light_sources.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "DM can update light sources" on public.vtt_light_sources;
create policy "DM can update light sources"
  on public.vtt_light_sources
  for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_light_sources.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "DM can delete light sources" on public.vtt_light_sources;
create policy "DM can delete light sources"
  on public.vtt_light_sources
  for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_light_sources.campaign_id and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.vtt_light_sources;
