-- Default battlemap-style category slugs for VTT samples (idempotent).
--
-- Older 060 defined `name` NOT NULL on categories; slug-only seeds only insert `slug`.
-- Align tables first so this migration succeeds even when 062/063 have not run yet.

DROP INDEX IF EXISTS idx_vtt_sample_categories_sort;

ALTER TABLE vtt_sample_categories DROP COLUMN IF EXISTS description;
ALTER TABLE vtt_sample_categories DROP COLUMN IF EXISTS name;
ALTER TABLE vtt_sample_categories DROP COLUMN IF EXISTS sort_order;

ALTER TABLE vtt_sample_assets DROP COLUMN IF EXISTS description;
ALTER TABLE vtt_sample_assets DROP COLUMN IF EXISTS name;
ALTER TABLE vtt_sample_assets DROP COLUMN IF EXISTS sort_order;

INSERT INTO vtt_sample_categories (slug)
VALUES
  ('abyss'),
  ('alley'),
  ('arctic'),
  ('arena'),
  ('astral'),
  ('battlefield'),
  ('bridge'),
  ('camp'),
  ('canyon'),
  ('castle'),
  ('cave'),
  ('cellar'),
  ('chapel'),
  ('city'),
  ('coast'),
  ('coastal'),
  ('courtyard'),
  ('crypt'),
  ('desert'),
  ('docks'),
  ('dungeon'),
  ('factory'),
  ('farm'),
  ('forest'),
  ('general'),
  ('grassland'),
  ('graveyard'),
  ('hamlet'),
  ('heaven'),
  ('hell'),
  ('hill'),
  ('indoor'),
  ('island'),
  ('jungle'),
  ('keep'),
  ('lake'),
  ('library'),
  ('mansion'),
  ('market'),
  ('marsh'),
  ('meadow'),
  ('mine'),
  ('modern'),
  ('mountain'),
  ('night'),
  ('oasis'),
  ('outdoor'),
  ('plains'),
  ('plaza'),
  ('river'),
  ('road'),
  ('rooftop'),
  ('ruins'),
  ('savanna'),
  ('sci-fi'),
  ('sewer'),
  ('ship'),
  ('snow'),
  ('swamp'),
  ('tavern'),
  ('temple'),
  ('tower'),
  ('town'),
  ('travel'),
  ('tropical'),
  ('tundra'),
  ('underdark'),
  ('underwater'),
  ('unknown'),
  ('urban'),
  ('valley'),
  ('village'),
  ('volcano'),
  ('warehouse'),
  ('wilderness'),
  ('winter'),
  ('workshop')
ON CONFLICT (slug) DO NOTHING;
