-- Ensure public.factions.influence_level exists and allows all app tier values.
-- Safe to run on older DBs that created factions without this column or with a narrower CHECK.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'factions'
      AND column_name = 'influence_level'
  ) THEN
    ALTER TABLE public.factions ADD COLUMN influence_level TEXT;
  END IF;
END $$;

ALTER TABLE public.factions DROP CONSTRAINT IF EXISTS factions_influence_level_check;

ALTER TABLE public.factions
  ADD CONSTRAINT factions_influence_level_check
  CHECK (
    influence_level IS NULL
    OR influence_level IN (
      'local',
      'regional',
      'continental',
      'global',
      'multiverse'
    )
  );

CREATE INDEX IF NOT EXISTS idx_factions_influence_level ON public.factions (influence_level);

COMMENT ON COLUMN public.factions.influence_level IS
  'Political reach: local → multiverse; drives forge influence bar width.';
