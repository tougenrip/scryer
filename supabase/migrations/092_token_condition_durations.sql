-- Optional duration tracking for token conditions. Existing `conditions
-- text[]` stays the source of truth for which conditions are present;
-- `condition_durations` jsonb maps name → rounds remaining for the subset
-- the DM has dialed a duration on. Conditions without an entry here are
-- treated as indefinite.
alter table public.tokens
  add column if not exists condition_durations jsonb not null default '{}'::jsonb;
