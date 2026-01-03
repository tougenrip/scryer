-- Migration: Migrate existing single-class characters to multiclass structure
-- This migration converts existing characters with single classes to use the new multiclass tables

-- Migrate existing characters to character_classes table
-- Only migrate characters that have a class_source and class_index
INSERT INTO character_classes (
  character_id,
  class_source,
  class_index,
  level,
  subclass_source,
  subclass_index,
  is_primary_class,
  level_acquired_at,
  created_at,
  updated_at
)
SELECT 
  id as character_id,
  class_source,
  class_index,
  level as level,
  COALESCE(subclass_source, 'srd') as subclass_source,
  subclass_index,
  TRUE as is_primary_class, -- All existing classes are primary
  1 as level_acquired_at, -- Assume they started with this class
  COALESCE(created_at, now()) as created_at,
  COALESCE(updated_at, now()) as updated_at
FROM characters
WHERE class_source IS NOT NULL 
  AND class_index IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM character_classes 
    WHERE character_classes.character_id = characters.id
  )
ON CONFLICT (character_id, class_source, class_index) DO NOTHING;

-- Migrate existing class_features from JSONB to character_class_features table
-- Parse the class_features JSONB array and insert into the new table
INSERT INTO character_class_features (
  character_id,
  class_source,
  class_index,
  class_level,
  feature_index,
  feature_name,
  feature_description,
  feature_specific,
  acquired_at_character_level,
  created_at
)
SELECT 
  c.id as character_id,
  c.class_source,
  c.class_index,
  COALESCE((f.feature_data->>'level')::INTEGER, c.level) as class_level,
  f.feature_data->>'feature_index' as feature_index,
  COALESCE(f.feature_data->>'name', 'Unknown Feature') as feature_name,
  f.feature_data->>'description' as feature_description,
  CASE 
    WHEN f.feature_data->'choice' IS NOT NULL THEN 
      jsonb_build_object('choice', f.feature_data->'choice')
    ELSE NULL
  END as feature_specific,
  COALESCE((f.feature_data->>'level')::INTEGER, c.level) as acquired_at_character_level,
  now() as created_at
FROM characters c
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.class_features, '[]'::jsonb)) as f(feature_data)
WHERE c.class_source IS NOT NULL 
  AND c.class_index IS NOT NULL
  AND c.class_features IS NOT NULL
  AND jsonb_array_length(COALESCE(c.class_features, '[]'::jsonb)) > 0
  AND NOT EXISTS (
    SELECT 1 FROM character_class_features ccf
    WHERE ccf.character_id = c.id
      AND ccf.class_source = c.class_source
      AND ccf.class_index = c.class_index
  );

-- Mark characters that now have multiple classes (for future use)
-- For now, all migrated characters will have uses_multiclass = FALSE (single class)
-- This will be updated when they actually add a second class
