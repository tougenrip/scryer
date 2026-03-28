-- Add background_shape column to location_markers table
-- This allows markers to have optional background shapes (circle, diamond, square, triangle, bookmark)

ALTER TABLE location_markers 
ADD COLUMN IF NOT EXISTS background_shape TEXT;

-- Drop the existing constraint if it exists (in case it was created incorrectly)
ALTER TABLE location_markers DROP CONSTRAINT IF EXISTS location_markers_background_shape_check;

-- Add the constraint with all values including 'bookmark'
ALTER TABLE location_markers 
ADD CONSTRAINT location_markers_background_shape_check 
CHECK (background_shape IS NULL OR background_shape IN ('circle', 'diamond', 'square', 'triangle', 'bookmark'));

-- Add comment
COMMENT ON COLUMN location_markers.background_shape IS 'Optional background shape for the marker icon: circle, diamond, square, triangle, or bookmark';
