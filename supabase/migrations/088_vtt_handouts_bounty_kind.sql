-- Allow 'bounty' as a third handout kind alongside 'pin' and 'scene'.
-- Bounties don't get their own soft FK column (the snapshot carries
-- everything we need to render the handout); the bounty_board row is
-- referenced by id inside the snapshot JSONB only.

alter table public.vtt_handouts
  drop constraint if exists vtt_handouts_kind_check;

alter table public.vtt_handouts
  add constraint vtt_handouts_kind_check
  check (kind in ('pin', 'scene', 'bounty'));
