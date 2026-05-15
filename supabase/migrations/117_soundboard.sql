-- Soundboard: short one-shot SFX clips the DM fires during play
-- (sword clash, applause, ominous chord, dice clatter). Distinct from
-- music — these don't sync state, they just broadcast a "play this"
-- event and every client triggers a local Audio element.
--
-- Two stores:
--   • `soundboard_sounds`        — campaign-authored (DM uploads)
--   • `vtt_sample_assets` kind='soundboard' — admin-seeded samples
--     every campaign can pick from
--
-- Extending the existing sample-asset kind enum keeps the admin tools
-- and storage paths consistent across all sample kinds.

-- 1. Extend the sample-asset kind allowlist with 'soundboard'.
alter table public.vtt_sample_assets
  drop constraint if exists vtt_sample_assets_kind_check;
alter table public.vtt_sample_assets
  add constraint vtt_sample_assets_kind_check
  check (kind in ('battlemap','token','prop','sound','soundboard'));

-- 2. Campaign-specific soundboard library.
create table if not exists public.soundboard_sounds (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null,
  audio_url text not null,
  -- Optional UI accents — emoji shown on the button, hex color tint.
  emoji text,
  color text,
  -- Loose category for grouping in the grid ('combat', 'ambient',
  -- 'humor', 'fx', or any user-typed value).
  category text,
  -- Cached duration (ms) so the grid can show length without probing
  -- the audio. Nullable — UI tolerates missing values.
  duration_ms integer,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists soundboard_sounds_campaign_idx
  on public.soundboard_sounds(campaign_id);

alter table public.soundboard_sounds enable row level security;

-- READ: any campaign member.
drop policy if exists "Soundboard sounds select" on public.soundboard_sounds;
create policy "Soundboard sounds select"
  on public.soundboard_sounds for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = soundboard_sounds.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = soundboard_sounds.campaign_id and cm.user_id = auth.uid()
    )
  );

-- WRITE: DM only.
drop policy if exists "Soundboard sounds insert" on public.soundboard_sounds;
create policy "Soundboard sounds insert"
  on public.soundboard_sounds for insert
  with check (
    auth.uid() = created_by
    and exists (
      select 1 from public.campaigns c
      where c.id = soundboard_sounds.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "Soundboard sounds update" on public.soundboard_sounds;
create policy "Soundboard sounds update"
  on public.soundboard_sounds for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = soundboard_sounds.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "Soundboard sounds delete" on public.soundboard_sounds;
create policy "Soundboard sounds delete"
  on public.soundboard_sounds for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = soundboard_sounds.campaign_id and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.soundboard_sounds;
