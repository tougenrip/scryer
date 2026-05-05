-- Restore folder category for storage paths: {slug}/{kind}/uuid-filename.
-- Backfill category_id from first tag slug when possible.

ALTER TABLE vtt_sample_assets
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES vtt_sample_categories(id) ON DELETE RESTRICT;

UPDATE vtt_sample_assets a
SET category_id = c.id
FROM vtt_sample_categories c
WHERE a.category_id IS NULL
  AND a.tags IS NOT NULL
  AND cardinality(a.tags) >= 1
  AND c.slug = a.tags[1];

UPDATE vtt_sample_assets
SET category_id = (SELECT id FROM vtt_sample_categories ORDER BY slug LIMIT 1)
WHERE category_id IS NULL;

ALTER TABLE vtt_sample_assets ALTER COLUMN category_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vtt_sample_assets_category_id ON vtt_sample_assets(category_id);

COMMENT ON COLUMN vtt_sample_assets.category_id IS 'Primary folder slug (storage prefix); tags[] may list this slug plus extras for filtering';
