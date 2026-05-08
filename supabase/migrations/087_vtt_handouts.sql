-- Handouts (pins or scenes) sent by the DM to all players in the campaign.
-- Snapshot model: snapshot freezes content at send time, so later edits to
-- the source pin/scene don't change handouts that already shipped.

create table if not exists public.vtt_handouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  sent_by uuid not null references auth.users(id),
  kind text not null check (kind in ('pin','scene')),
  -- Soft refs so deleting the source doesn't cascade-delete history.
  pin_id uuid references public.location_markers(id) on delete set null,
  scene_id uuid references public.scenes(id) on delete set null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists vtt_handouts_campaign_created_idx
  on public.vtt_handouts(campaign_id, created_at desc);

alter table public.vtt_handouts enable row level security;

drop policy if exists "Campaign members can view handouts" on public.vtt_handouts;
create policy "Campaign members can view handouts"
  on public.vtt_handouts for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_handouts.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_handouts.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "DM can insert handouts" on public.vtt_handouts;
create policy "DM can insert handouts"
  on public.vtt_handouts for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_handouts.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "DM can delete handouts" on public.vtt_handouts;
create policy "DM can delete handouts"
  on public.vtt_handouts for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_handouts.campaign_id and c.dm_user_id = auth.uid()
    )
  );

-- Per-player read/dismiss state.
create table if not exists public.vtt_handout_reads (
  handout_id uuid not null references public.vtt_handouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz,
  dismissed_at timestamptz,
  primary key (handout_id, user_id)
);

create index if not exists vtt_handout_reads_user_idx
  on public.vtt_handout_reads(user_id);

alter table public.vtt_handout_reads enable row level security;

-- DM can read all reads for their campaigns; players can read only their own.
drop policy if exists "DM or owner can view reads" on public.vtt_handout_reads;
create policy "DM or owner can view reads"
  on public.vtt_handout_reads for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.vtt_handouts h
      join public.campaigns c on c.id = h.campaign_id
      where h.id = vtt_handout_reads.handout_id
        and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "User can insert own reads" on public.vtt_handout_reads;
create policy "User can insert own reads"
  on public.vtt_handout_reads for insert
  with check (user_id = auth.uid());

drop policy if exists "User can update own reads" on public.vtt_handout_reads;
create policy "User can update own reads"
  on public.vtt_handout_reads for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Realtime publication.
alter publication supabase_realtime add table public.vtt_handouts;
alter publication supabase_realtime add table public.vtt_handout_reads;
