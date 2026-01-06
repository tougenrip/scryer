-- Update location_markers icon_type CHECK constraint to include all new icon types
-- This adds support for fantasy icons, location icons, and basic shapes

-- Drop the old CHECK constraint (PostgreSQL auto-generates constraint names)
-- We need to find and drop the constraint dynamically
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for icon_type
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'location_markers'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%icon_type%';
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE location_markers DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

-- Add new CHECK constraint with all icon types
ALTER TABLE location_markers ADD CONSTRAINT location_markers_icon_type_check 
  CHECK (icon_type IS NULL OR icon_type IN (
    -- Basic Shapes
    'sphere', 'shape_square', 'shape_diamond',
    -- Fantasy Icons
    'axe', 'potion', 'moon_star', 'star', 'sword', 'flag',
    -- Location Icons
    'castle', 'house', 'globe',
    -- Legacy icons (keeping for backward compatibility)
    'city', 'village', 'fort', 'tavern', 'shop', 'temple', 'dungeon', 'cave', 'landmark', 'port', 'border'
  ));

-- Update comment to reflect new icon types
COMMENT ON COLUMN location_markers.icon_type IS 'Icon type: Basic shapes (sphere, shape_square, shape_diamond), Fantasy icons (axe, potion, moon_star, star, sword, flag), Location icons (castle, house, globe), or Legacy icons (city, village, fort, tavern, shop, temple, dungeon, cave, landmark, port, border)';

