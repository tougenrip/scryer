-- Allow 'npc' as a fourth handout kind alongside pin / scene / bounty.
-- Like bounty, NPCs reference their source row by id inside the snapshot
-- only — no dedicated soft FK column is needed since we already snapshot
-- everything we want to render.

alter table public.vtt_handouts
  drop constraint if exists vtt_handouts_kind_check;

alter table public.vtt_handouts
  add constraint vtt_handouts_kind_check
  check (kind in ('pin', 'scene', 'bounty', 'npc'));
