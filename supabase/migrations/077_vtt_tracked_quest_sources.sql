ALTER TABLE public.vtt_tracked_objectives
  DROP CONSTRAINT IF EXISTS vtt_tracked_objectives_source_type_check;

ALTER TABLE public.vtt_tracked_objectives
  ADD CONSTRAINT vtt_tracked_objectives_source_type_check
  CHECK (source_type IN ('party_objective', 'quest', 'quest_objective'));
