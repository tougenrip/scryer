-- If 061 failed with: null value in column "name" of relation "vtt_sample_categories",
-- your DB still has the legacy NOT NULL `name` column. Run this migration (or this SQL
-- in the dashboard), then apply 061 again or insert slugs manually.
-- Safe to run multiple times (IF EXISTS / idempotent drops).

DROP INDEX IF EXISTS idx_vtt_sample_categories_sort;

ALTER TABLE vtt_sample_categories DROP COLUMN IF EXISTS description;
ALTER TABLE vtt_sample_categories DROP COLUMN IF EXISTS name;
ALTER TABLE vtt_sample_categories DROP COLUMN IF EXISTS sort_order;

ALTER TABLE vtt_sample_assets DROP COLUMN IF EXISTS description;
ALTER TABLE vtt_sample_assets DROP COLUMN IF EXISTS name;
ALTER TABLE vtt_sample_assets DROP COLUMN IF EXISTS sort_order;
