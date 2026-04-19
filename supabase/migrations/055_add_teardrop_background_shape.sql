-- Allow teardrop (map pin) as location_markers.background_shape

ALTER TABLE location_markers DROP CONSTRAINT IF EXISTS location_markers_background_shape_check;

ALTER TABLE location_markers ADD CONSTRAINT location_markers_background_shape_check
  CHECK (
    background_shape IS NULL
    OR background_shape IN ('circle', 'diamond', 'square', 'triangle', 'bookmark', 'teardrop')
  );

COMMENT ON COLUMN location_markers.background_shape IS 'Optional marker frame: teardrop (map pin), circle, diamond, square, triangle, or bookmark';
