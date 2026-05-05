-- Tags are slug-only; asset kind lives on vtt_sample_assets only.

ALTER TABLE vtt_sample_categories
  DROP CONSTRAINT IF EXISTS vtt_sample_categories_kind_check;

ALTER TABLE vtt_sample_categories
  DROP COLUMN IF EXISTS kind;

COMMENT ON TABLE vtt_sample_categories IS
  'Tag slugs for sample filtering. Assets store kind on vtt_sample_assets; canonical slugs battlemap, token, prop, sound map category_id for folder FK.';
