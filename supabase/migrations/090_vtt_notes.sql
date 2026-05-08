-- Per-campaign notes with three visibility modes:
--   'dm'     — DM scratchpad, only the DM ever reads/writes
--   'owner'  — private to the user who created it
--   'shared' — visible to every campaign member; only the author can edit

create table if not exists public.vtt_notes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  author_user_id uuid not null references auth.users(id),
  visibility text not null check (visibility in ('dm','owner','shared')),
  title text not null default '',
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vtt_notes_campaign_idx
  on public.vtt_notes(campaign_id, updated_at desc);
create index if not exists vtt_notes_author_idx
  on public.vtt_notes(author_user_id);

alter table public.vtt_notes enable row level security;

drop policy if exists "Notes select policy" on public.vtt_notes;
create policy "Notes select policy"
  on public.vtt_notes for select
  using (
    -- DM sees DM notes + every shared note + their own owner notes
    (
      visibility = 'dm'
      and exists (
        select 1 from public.campaigns c
        where c.id = vtt_notes.campaign_id and c.dm_user_id = auth.uid()
      )
    )
    or (
      visibility = 'shared'
      and (
        exists (
          select 1 from public.campaigns c
          where c.id = vtt_notes.campaign_id and c.dm_user_id = auth.uid()
        )
        or exists (
          select 1 from public.campaign_members cm
          where cm.campaign_id = vtt_notes.campaign_id and cm.user_id = auth.uid()
        )
      )
    )
    or (
      visibility = 'owner' and author_user_id = auth.uid()
    )
  );

drop policy if exists "Notes insert policy" on public.vtt_notes;
create policy "Notes insert policy"
  on public.vtt_notes for insert
  with check (
    author_user_id = auth.uid()
    and (
      -- Anyone in the campaign can write owner/shared notes
      (
        visibility in ('owner','shared')
        and (
          exists (
            select 1 from public.campaigns c
            where c.id = vtt_notes.campaign_id and c.dm_user_id = auth.uid()
          )
          or exists (
            select 1 from public.campaign_members cm
            where cm.campaign_id = vtt_notes.campaign_id and cm.user_id = auth.uid()
          )
        )
      )
      -- Only the DM can write DM-visibility notes
      or (
        visibility = 'dm'
        and exists (
          select 1 from public.campaigns c
          where c.id = vtt_notes.campaign_id and c.dm_user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "Notes update policy" on public.vtt_notes;
create policy "Notes update policy"
  on public.vtt_notes for update
  using (author_user_id = auth.uid())
  with check (author_user_id = auth.uid());

drop policy if exists "Notes delete policy" on public.vtt_notes;
create policy "Notes delete policy"
  on public.vtt_notes for delete
  using (author_user_id = auth.uid());

alter publication supabase_realtime add table public.vtt_notes;
