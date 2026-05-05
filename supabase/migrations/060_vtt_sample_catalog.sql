-- Catalog for global VTT sample assets (metadata + paths in storage bucket vtt-samples).
-- Public read for app/VTT; writes go through server API using service role.
-- Categories are URL-safe slugs only. Asset labels come from storage paths in the app.

CREATE TABLE IF NOT EXISTS vtt_sample_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vtt_sample_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES vtt_sample_categories(id) ON DELETE RESTRICT,
  kind TEXT NOT NULL CHECK (kind IN ('battlemap', 'token', 'prop', 'sound')),
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  file_mime TEXT,
  grid_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vtt_sample_assets_category_id ON vtt_sample_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_vtt_sample_assets_kind ON vtt_sample_assets(kind);

CREATE OR REPLACE FUNCTION update_vtt_sample_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_vtt_sample_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vtt_sample_categories_updated_at ON vtt_sample_categories;
CREATE TRIGGER trg_vtt_sample_categories_updated_at
  BEFORE UPDATE ON vtt_sample_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_vtt_sample_categories_updated_at();

DROP TRIGGER IF EXISTS trg_vtt_sample_assets_updated_at ON vtt_sample_assets;
CREATE TRIGGER trg_vtt_sample_assets_updated_at
  BEFORE UPDATE ON vtt_sample_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_vtt_sample_assets_updated_at();

ALTER TABLE vtt_sample_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vtt_sample_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vtt_sample_categories_select_public"
  ON vtt_sample_categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "vtt_sample_assets_select_public"
  ON vtt_sample_assets
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON vtt_sample_categories TO anon, authenticated;
GRANT SELECT ON vtt_sample_assets TO anon, authenticated;

COMMENT ON TABLE vtt_sample_categories IS 'Slug-only categories for vtt-samples bucket folders';
COMMENT ON TABLE vtt_sample_assets IS 'Sample file metadata; label from storage_path in clients';
