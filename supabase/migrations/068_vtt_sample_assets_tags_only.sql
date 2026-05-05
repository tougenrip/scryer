-- Tags-only taxonomy: no category_id / folder slug in storage. Path is {kind}/uuid-filename.

ALTER TABLE vtt_sample_assets
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vtt_sample_assets'
      AND column_name = 'category_id'
  ) THEN
    UPDATE vtt_sample_assets a
    SET tags = ARRAY[c.slug]
    FROM vtt_sample_categories c
    WHERE c.id = a.category_id
      AND cardinality(a.tags) = 0;
  END IF;
END $$;

UPDATE vtt_sample_assets
SET tags = ARRAY(SELECT slug FROM vtt_sample_categories ORDER BY slug LIMIT 1)
WHERE cardinality(tags) = 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vtt_sample_assets'
      AND column_name = 'category_id'
  ) THEN
    ALTER TABLE vtt_sample_assets DROP CONSTRAINT IF EXISTS vtt_sample_assets_category_id_fkey;
    DROP INDEX IF EXISTS idx_vtt_sample_assets_category_id;
    ALTER TABLE vtt_sample_assets DROP COLUMN category_id;
  END IF;
END $$;

ALTER TABLE vtt_sample_assets
  DROP CONSTRAINT IF EXISTS vtt_sample_assets_tags_nonempty;

ALTER TABLE vtt_sample_assets
  ADD CONSTRAINT vtt_sample_assets_tags_nonempty CHECK (cardinality(tags) >= 1);

CREATE INDEX IF NOT EXISTS idx_vtt_sample_assets_tags ON vtt_sample_assets USING GIN (tags);

COMMENT ON TABLE vtt_sample_categories IS 'Tag slugs for VTT sample assets (taxonomy / filtering only)';
COMMENT ON TABLE vtt_sample_assets IS 'Sample files; storage path {kind}/uuid-filename; tags are category slugs';
COMMENT ON COLUMN vtt_sample_assets.tags IS 'At least one tag slug; filtering only';
