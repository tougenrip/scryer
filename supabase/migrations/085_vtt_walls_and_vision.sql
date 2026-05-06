-- Walls + per-player visibility memory + per-scene/per-token vision config.

create table if not exists public.vtt_walls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  points jsonb not null,
  is_door boolean not null default false,
  is_open boolean not null default false,
  created_at timestamptz not null default now(),
  check (jsonb_array_length(points) >= 2),
  check (not is_door or jsonb_array_length(points) = 2)
);
create index if not exists vtt_walls_map_id_idx on public.vtt_walls(map_id);
create index if not exists vtt_walls_campaign_id_idx on public.vtt_walls(campaign_id);

alter table public.vtt_walls enable row level security;

drop policy if exists "Campaign members can view walls" on public.vtt_walls;
create policy "Campaign members can view walls"
  on public.vtt_walls for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_walls.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "DM can insert walls" on public.vtt_walls;
create policy "DM can insert walls"
  on public.vtt_walls for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "DM can update walls" on public.vtt_walls;
create policy "DM can update walls"
  on public.vtt_walls for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "Campaign members can toggle doors" on public.vtt_walls;
create policy "Campaign members can toggle doors"
  on public.vtt_walls for update
  using (
    is_door = true
    and exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_walls.campaign_id and cm.user_id = auth.uid()
    )
  )
  with check (
    is_door = true
    and exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_walls.campaign_id and cm.user_id = auth.uid()
    )
  );

create or replace function public.guard_wall_player_update()
returns trigger language plpgsql as $$
declare
  is_dm boolean;
begin
  select exists (
    select 1 from public.campaigns c
    where c.id = new.campaign_id and c.dm_user_id = auth.uid()
  ) into is_dm;
  if is_dm then
    return new;
  end if;
  if (old.points is distinct from new.points)
     or (old.is_door is distinct from new.is_door)
     or (old.campaign_id is distinct from new.campaign_id)
     or (old.map_id is distinct from new.map_id) then
    raise exception 'Only the DM can edit walls; players can only toggle doors';
  end if;
  return new;
end$$;

drop trigger if exists trg_guard_wall_player_update on public.vtt_walls;
create trigger trg_guard_wall_player_update
  before update on public.vtt_walls
  for each row execute function public.guard_wall_player_update();

drop policy if exists "DM can delete walls" on public.vtt_walls;
create policy "DM can delete walls"
  on public.vtt_walls for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.vtt_walls;

create table if not exists public.vtt_player_visibility (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seen_polygon jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, map_id, user_id)
);
create index if not exists vtt_player_visibility_map_idx on public.vtt_player_visibility(map_id);

alter table public.vtt_player_visibility enable row level security;

drop policy if exists "Own visibility row" on public.vtt_player_visibility;
create policy "Own visibility row"
  on public.vtt_player_visibility for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table public.media_items
  add column if not exists vision_enabled boolean not null default false;
alter table public.media_items
  add column if not exists scene_dark boolean not null default false;

-- light_radius_ft: how much light this token emits in feet. Capped at 500 ft
-- because that's the longest light-emitting effect in 5e RAW (Daylight).
alter table public.tokens
  add column if not exists light_radius_ft integer not null default 0
  check (light_radius_ft >= 0 and light_radius_ft <= 500);
