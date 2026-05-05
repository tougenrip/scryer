-- Persistent freehand drawings on a VTT map.
-- Ephemeral live strokes are broadcast-only and not stored here.

create table if not exists public.vtt_drawings (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  points jsonb not null,
  color text not null,
  stroke_width double precision not null default 4,
  created_at timestamptz not null default now()
);

create index if not exists vtt_drawings_map_id_idx on public.vtt_drawings(map_id);
create index if not exists vtt_drawings_campaign_id_idx on public.vtt_drawings(campaign_id);

alter table public.vtt_drawings enable row level security;

drop policy if exists "Campaign members can view drawings" on public.vtt_drawings;
create policy "Campaign members can view drawings"
  on public.vtt_drawings
  for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_drawings.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_drawings.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Campaign members can insert drawings" on public.vtt_drawings;
create policy "Campaign members can insert drawings"
  on public.vtt_drawings
  for insert
  with check (
    auth.uid() = owner_user_id
    and (
      exists (
        select 1 from public.campaigns c
        where c.id = vtt_drawings.campaign_id and c.dm_user_id = auth.uid()
      )
      or exists (
        select 1 from public.campaign_members cm
        where cm.campaign_id = vtt_drawings.campaign_id and cm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Owner or DM can update drawings" on public.vtt_drawings;
create policy "Owner or DM can update drawings"
  on public.vtt_drawings
  for update
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = vtt_drawings.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "Owner or DM can delete drawings" on public.vtt_drawings;
create policy "Owner or DM can delete drawings"
  on public.vtt_drawings
  for delete
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = vtt_drawings.campaign_id and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.vtt_drawings;
