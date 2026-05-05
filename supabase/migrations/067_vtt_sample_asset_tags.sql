-- Multiple taxonomy tags per sample asset (category slugs). Superseded by 068 for schema;
-- kept for DBs that ran 067 before 068 (adds tags[], backfills from category_id).

ALTER TABLE vtt_sample_assets
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

UPDATE vtt_sample_assets a
SET tags = ARRAY[c.slug]
FROM vtt_sample_categories c
WHERE c.id = a.category_id
  AND cardinality(a.tags) = 0;

COMMENT ON COLUMN vtt_sample_assets.tags IS 'Category slugs for this asset (includes primary folder slug; extras for cross-listing)';
