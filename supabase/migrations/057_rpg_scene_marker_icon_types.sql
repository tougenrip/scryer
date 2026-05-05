-- RPG / scene vocabulary for map pins (design-system dnd-icons-backed types)

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
    'camp', 'portal', 'dragon', 'lair', 'arcane', 'hazard', 'trap', 'rest', 'shrine',
    'city', 'village', 'fort', 'tavern', 'shop', 'temple', 'dungeon', 'cave', 'landmark', 'port', 'border'
  ));

COMMENT ON COLUMN location_markers.icon_type IS 'Pin glyph: shapes; fantasy SVG set; RPG scene (camp, portal, dragon, lair, arcane, hazard, trap, rest, shrine); places (dnd-icons legacy row); or null.';
