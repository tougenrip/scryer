-- Each folder tag has an asset kind (battlemap, token, prop, sound). Sample rows still store kind for queries;
-- it is derived from the folder category on create/update.

ALTER TABLE vtt_sample_categories
  ADD COLUMN IF NOT EXISTS kind TEXT;

WITH kind_counts AS (
  SELECT category_id, kind, COUNT(*)::bigint AS cnt
  FROM vtt_sample_assets
  GROUP BY category_id, kind
),
ranked AS (
  SELECT category_id, kind,
    ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY cnt DESC) AS rn
  FROM kind_counts
)
UPDATE vtt_sample_categories c
SET kind = r.kind
FROM ranked r
WHERE c.id = r.category_id AND r.rn = 1;

UPDATE vtt_sample_categories
SET kind = 'battlemap'
WHERE kind IS NULL;

ALTER TABLE vtt_sample_categories
  ALTER COLUMN kind SET NOT NULL;

ALTER TABLE vtt_sample_categories
  DROP CONSTRAINT IF EXISTS vtt_sample_categories_kind_check;

ALTER TABLE vtt_sample_categories
  ADD CONSTRAINT vtt_sample_categories_kind_check
  CHECK (kind IN ('battlemap', 'token', 'prop', 'sound'));

COMMENT ON COLUMN vtt_sample_categories.kind IS 'Asset kind for this tag; folder + extra tags with the same kind only';
