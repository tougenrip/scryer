-- Add fantasy / POI marker icon types (magic shop, butcher, school, enemy, loot, quest, side quest)

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'location_markers'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%icon_type%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE location_markers DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE location_markers ADD CONSTRAINT location_markers_icon_type_check
  CHECK (icon_type IS NULL OR icon_type IN (
    'sphere', 'shape_square', 'shape_diamond',
    'axe', 'potion', 'moon_star', 'star', 'sword', 'flag',
    'magic_shop', 'butcher', 'school', 'enemy', 'loot', 'quest', 'side_quest',
    'castle', 'house', 'globe',
    'city', 'village', 'fort', 'tavern', 'shop', 'temple', 'dungeon', 'cave', 'landmark', 'port', 'border'
  ));

COMMENT ON COLUMN location_markers.icon_type IS 'Icon type: shapes (sphere, shape_square, shape_diamond); fantasy (axe, potion, moon_star, star, sword, flag, magic_shop, butcher, school, enemy, loot, quest, side_quest); places (castle, house, globe); legacy location icons (city, village, fort, tavern, shop, temple, dungeon, cave, landmark, port, border)';
