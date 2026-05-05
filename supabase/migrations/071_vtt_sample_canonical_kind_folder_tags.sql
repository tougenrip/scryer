-- Canonical folder tags: slug equals asset kind (battlemap, token, prop, sound).
-- Samples use category_id → these rows; storage path is {kind}/uuid-filename.

INSERT INTO vtt_sample_categories (slug, kind)
VALUES
  ('battlemap', 'battlemap'),
  ('token', 'token'),
  ('prop', 'prop'),
  ('sound', 'sound')
ON CONFLICT (slug) DO UPDATE SET kind = EXCLUDED.kind;

COMMENT ON TABLE vtt_sample_categories IS
  'Tag slugs for samples. Slugs battlemap, token, prop, sound are canonical folder kinds; other slugs are extra filters per kind.';
