-- Data migration: Populate srd_proficiencies_training and junction tables from existing JSONB data
-- This extracts proficiencies (languages from races, tools/weapons/armor from classes) and creates the normalized structure

-- ============================================
-- STEP 1: Extract languages from srd_races.languages JSONB
-- ============================================

-- Insert unique languages from all races' languages JSONB
-- Handles both direct language objects and "from" choice objects
INSERT INTO srd_proficiencies_training (index, name, type, description, category)
SELECT DISTINCT ON (lang_index)
  lang_index as index,
  lang_name as name,
  'language'::text as type,
  NULL as description,  -- Descriptions can be populated later
  NULL as category
FROM (
  -- Direct language references: [{"index": "common", "name": "Common"}, ...]
  SELECT DISTINCT
    lang->>'index' as lang_index,
    lang->>'name' as lang_name
  FROM srd_races r,
    jsonb_array_elements(r.languages) as lang
  WHERE r.languages IS NOT NULL
    AND jsonb_typeof(r.languages) = 'array'
    AND lang->>'index' IS NOT NULL
    AND lang->>'name' IS NOT NULL
  
  UNION
  
  -- Language choices: [{"from": {"options": [{"item": {"index": "dwarvish", "name": "Dwarvish"}}]}}]
  SELECT DISTINCT
    option->'item'->>'index' as lang_index,
    option->'item'->>'name' as lang_name
  FROM srd_races r,
    jsonb_array_elements(r.languages) as lang,
    jsonb_array_elements(lang->'from'->'options') as option
  WHERE r.languages IS NOT NULL
    AND jsonb_typeof(r.languages) = 'array'
    AND lang->'from' IS NOT NULL
    AND lang->'from'->'options' IS NOT NULL
    AND option->'item'->>'index' IS NOT NULL
    AND option->'item'->>'name' IS NOT NULL
) as all_languages
WHERE lang_index IS NOT NULL
  AND lang_name IS NOT NULL
ON CONFLICT (index) DO NOTHING;

-- ============================================
-- STEP 2: Populate srd_race_proficiencies_training junction table for languages
-- ============================================

-- Insert race-language mappings from JSONB (direct references)
INSERT INTO srd_race_proficiencies_training (race_index, proficiency_index)
SELECT DISTINCT
  r.index as race_index,
  lang->>'index' as proficiency_index
FROM srd_races r,
  jsonb_array_elements(r.languages) as lang
WHERE r.languages IS NOT NULL
  AND jsonb_typeof(r.languages) = 'array'
  AND lang->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_proficiencies_training spt 
    WHERE spt.index = lang->>'index'
    AND spt.type = 'language'
  )
ON CONFLICT (race_index, proficiency_index) DO NOTHING;

-- Insert race-language mappings from JSONB (choice objects)
INSERT INTO srd_race_proficiencies_training (race_index, proficiency_index)
SELECT DISTINCT
  r.index as race_index,
  option->'item'->>'index' as proficiency_index
FROM srd_races r,
  jsonb_array_elements(r.languages) as lang,
  jsonb_array_elements(lang->'from'->'options') as option
WHERE r.languages IS NOT NULL
  AND jsonb_typeof(r.languages) = 'array'
  AND lang->'from' IS NOT NULL
  AND lang->'from'->'options' IS NOT NULL
  AND option->'item'->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_proficiencies_training spt 
    WHERE spt.index = option->'item'->>'index'
    AND spt.type = 'language'
  )
ON CONFLICT (race_index, proficiency_index) DO NOTHING;

-- ============================================
-- STEP 3: Extract tool proficiencies from srd_classes.proficiencies JSONB
-- ============================================

-- Insert unique tool proficiencies from all classes' proficiencies JSONB
INSERT INTO srd_proficiencies_training (index, name, type, description, category)
SELECT DISTINCT ON (tool_index)
  tool_index as index,
  tool_name as name,
  'tool'::text as type,
  NULL as description,
  COALESCE(tool_category, 'Tools') as category
FROM (
  -- Direct tool references
  SELECT DISTINCT
    prof->>'index' as tool_index,
    prof->>'name' as tool_name,
    prof->>'category' as tool_category
  FROM srd_classes c,
    jsonb_array_elements(c.proficiencies) as prof
  WHERE c.proficiencies IS NOT NULL
    AND jsonb_typeof(c.proficiencies) = 'array'
    AND prof->>'type' = 'TOOLS'
    AND prof->>'index' IS NOT NULL
    AND prof->>'name' IS NOT NULL
  
  UNION
  
  -- Tool choices from proficiency_choices
  SELECT DISTINCT
    choice->'item'->>'index' as tool_index,
    choice->'item'->>'name' as tool_name,
    choice->'item'->>'category' as tool_category
  FROM srd_classes c,
    jsonb_array_elements(c.proficiency_choices) as choice_group,
    jsonb_array_elements(choice_group->'from'->'options') as choice
  WHERE c.proficiency_choices IS NOT NULL
    AND jsonb_typeof(c.proficiency_choices) = 'array'
    AND choice_group->'from'->>'option_set_type' = 'options_array'
    AND choice->'item'->>'type' = 'TOOLS'
    AND choice->'item'->>'index' IS NOT NULL
    AND choice->'item'->>'name' IS NOT NULL
) as all_tools
WHERE tool_index IS NOT NULL
  AND tool_name IS NOT NULL
ON CONFLICT (index) DO NOTHING;

-- ============================================
-- STEP 4: Extract weapon proficiencies from srd_classes.proficiencies JSONB
-- ============================================

-- Insert unique weapon proficiencies
INSERT INTO srd_proficiencies_training (index, name, type, description, category)
SELECT DISTINCT ON (weapon_index)
  weapon_index as index,
  weapon_name as name,
  'weapon'::text as type,
  NULL as description,
  COALESCE(weapon_category, 'Weapons') as category
FROM (
  -- Direct weapon references
  SELECT DISTINCT
    prof->>'index' as weapon_index,
    prof->>'name' as weapon_name,
    prof->>'category' as weapon_category
  FROM srd_classes c,
    jsonb_array_elements(c.proficiencies) as prof
  WHERE c.proficiencies IS NOT NULL
    AND jsonb_typeof(c.proficiencies) = 'array'
    AND prof->>'type' IN ('WEAPONS', 'WEAPON')
    AND prof->>'index' IS NOT NULL
    AND prof->>'name' IS NOT NULL
  
  UNION
  
  -- Weapon choices from proficiency_choices
  SELECT DISTINCT
    choice->'item'->>'index' as weapon_index,
    choice->'item'->>'name' as weapon_name,
    choice->'item'->>'category' as weapon_category
  FROM srd_classes c,
    jsonb_array_elements(c.proficiency_choices) as choice_group,
    jsonb_array_elements(choice_group->'from'->'options') as choice
  WHERE c.proficiency_choices IS NOT NULL
    AND jsonb_typeof(c.proficiency_choices) = 'array'
    AND choice_group->'from'->>'option_set_type' = 'options_array'
    AND choice->'item'->>'type' IN ('WEAPONS', 'WEAPON')
    AND choice->'item'->>'index' IS NOT NULL
    AND choice->'item'->>'name' IS NOT NULL
) as all_weapons
WHERE weapon_index IS NOT NULL
  AND weapon_name IS NOT NULL
ON CONFLICT (index) DO NOTHING;

-- ============================================
-- STEP 5: Extract armor proficiencies from srd_classes.proficiencies JSONB
-- ============================================

-- Insert unique armor proficiencies
INSERT INTO srd_proficiencies_training (index, name, type, description, category)
SELECT DISTINCT ON (armor_index)
  armor_index as index,
  armor_name as name,
  'armor'::text as type,
  NULL as description,
  COALESCE(armor_category, 'Armor') as category
FROM (
  -- Direct armor references
  SELECT DISTINCT
    prof->>'index' as armor_index,
    prof->>'name' as armor_name,
    prof->>'category' as armor_category
  FROM srd_classes c,
    jsonb_array_elements(c.proficiencies) as prof
  WHERE c.proficiencies IS NOT NULL
    AND jsonb_typeof(c.proficiencies) = 'array'
    AND prof->>'type' = 'ARMOR'
    AND prof->>'index' IS NOT NULL
    AND prof->>'name' IS NOT NULL
  
  UNION
  
  -- Armor choices from proficiency_choices
  SELECT DISTINCT
    choice->'item'->>'index' as armor_index,
    choice->'item'->>'name' as armor_name,
    choice->'item'->>'category' as armor_category
  FROM srd_classes c,
    jsonb_array_elements(c.proficiency_choices) as choice_group,
    jsonb_array_elements(choice_group->'from'->'options') as choice
  WHERE c.proficiency_choices IS NOT NULL
    AND jsonb_typeof(c.proficiency_choices) = 'array'
    AND choice_group->'from'->>'option_set_type' = 'options_array'
    AND choice->'item'->>'type' = 'ARMOR'
    AND choice->'item'->>'index' IS NOT NULL
    AND choice->'item'->>'name' IS NOT NULL
) as all_armor
WHERE armor_index IS NOT NULL
  AND armor_name IS NOT NULL
ON CONFLICT (index) DO NOTHING;

-- ============================================
-- STEP 6: Populate srd_class_proficiencies_training junction table for tools
-- ============================================

-- Insert class-tool mappings (direct references)
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
SELECT DISTINCT
  c.index as class_index,
  prof->>'index' as proficiency_index
FROM srd_classes c,
  jsonb_array_elements(c.proficiencies) as prof
WHERE c.proficiencies IS NOT NULL
  AND jsonb_typeof(c.proficiencies) = 'array'
  AND prof->>'type' = 'TOOLS'
  AND prof->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_proficiencies_training spt 
    WHERE spt.index = prof->>'index'
    AND spt.type = 'tool'
  )
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Insert class-tool mappings (from choices)
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
SELECT DISTINCT
  c.index as class_index,
  choice->'item'->>'index' as proficiency_index
FROM srd_classes c,
  jsonb_array_elements(c.proficiency_choices) as choice_group,
  jsonb_array_elements(choice_group->'from'->'options') as choice
WHERE c.proficiency_choices IS NOT NULL
  AND jsonb_typeof(c.proficiency_choices) = 'array'
  AND choice_group->'from'->>'option_set_type' = 'options_array'
  AND choice->'item'->>'type' = 'TOOLS'
  AND choice->'item'->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_proficiencies_training spt 
    WHERE spt.index = choice->'item'->>'index'
    AND spt.type = 'tool'
  )
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- ============================================
-- STEP 7: Populate srd_class_proficiencies_training junction table for weapons
-- ============================================

-- Insert class-weapon mappings (direct references)
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
SELECT DISTINCT
  c.index as class_index,
  prof->>'index' as proficiency_index
FROM srd_classes c,
  jsonb_array_elements(c.proficiencies) as prof
WHERE c.proficiencies IS NOT NULL
  AND jsonb_typeof(c.proficiencies) = 'array'
  AND prof->>'type' IN ('WEAPONS', 'WEAPON')
  AND prof->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_proficiencies_training spt 
    WHERE spt.index = prof->>'index'
    AND spt.type = 'weapon'
  )
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Insert class-weapon mappings (from choices)
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
SELECT DISTINCT
  c.index as class_index,
  choice->'item'->>'index' as proficiency_index
FROM srd_classes c,
  jsonb_array_elements(c.proficiency_choices) as choice_group,
  jsonb_array_elements(choice_group->'from'->'options') as choice
WHERE c.proficiency_choices IS NOT NULL
  AND jsonb_typeof(c.proficiency_choices) = 'array'
  AND choice_group->'from'->>'option_set_type' = 'options_array'
  AND choice->'item'->>'type' IN ('WEAPONS', 'WEAPON')
  AND choice->'item'->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_proficiencies_training spt 
    WHERE spt.index = choice->'item'->>'index'
    AND spt.type = 'weapon'
  )
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- ============================================
-- STEP 8: Populate srd_class_proficiencies_training junction table for armor
-- ============================================

-- Insert class-armor mappings (direct references)
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
SELECT DISTINCT
  c.index as class_index,
  prof->>'index' as proficiency_index
FROM srd_classes c,
  jsonb_array_elements(c.proficiencies) as prof
WHERE c.proficiencies IS NOT NULL
  AND jsonb_typeof(c.proficiencies) = 'array'
  AND prof->>'type' = 'ARMOR'
  AND prof->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_proficiencies_training spt 
    WHERE spt.index = prof->>'index'
    AND spt.type = 'armor'
  )
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Insert class-armor mappings (from choices)
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
SELECT DISTINCT
  c.index as class_index,
  choice->'item'->>'index' as proficiency_index
FROM srd_classes c,
  jsonb_array_elements(c.proficiency_choices) as choice_group,
  jsonb_array_elements(choice_group->'from'->'options') as choice
WHERE c.proficiency_choices IS NOT NULL
  AND jsonb_typeof(c.proficiency_choices) = 'array'
  AND choice_group->'from'->>'option_set_type' = 'options_array'
  AND choice->'item'->>'type' = 'ARMOR'
  AND choice->'item'->>'index' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM srd_proficiencies_training spt 
    WHERE spt.index = choice->'item'->>'index'
    AND spt.type = 'armor'
  )
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

