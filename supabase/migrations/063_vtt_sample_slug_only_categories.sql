-- Categories: slug only (storage folder). Assets: no separate title/sort (use file path in UI).

DROP INDEX IF EXISTS idx_vtt_sample_categories_sort;

ALTER TABLE vtt_sample_categories DROP COLUMN IF EXISTS name;
ALTER TABLE vtt_sample_categories DROP COLUMN IF EXISTS sort_order;

ALTER TABLE vtt_sample_assets DROP COLUMN IF EXISTS name;
ALTER TABLE vtt_sample_assets DROP COLUMN IF EXISTS sort_order;
