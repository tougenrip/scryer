-- Migration: Create SRD 2024 Tables
-- These tables store the 2024 D&D 5e SRD content, separate from the 2014 content

-- ============================================
-- srd2024_equipment
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    equipment_categories JSONB DEFAULT '[]',
    cost JSONB,
    weight NUMERIC,
    description TEXT,
    -- Weapon specific fields
    weapon_category TEXT,
    weapon_range TEXT,
    damage JSONB,
    two_handed_damage JSONB,
    range JSONB,
    properties JSONB DEFAULT '[]',
    mastery JSONB,
    throw_range JSONB,
    -- Armor specific fields
    armor_category TEXT,
    armor_class JSONB,
    str_minimum INTEGER,
    stealth_disadvantage BOOLEAN DEFAULT FALSE,
    -- Tool specific fields
    ability JSONB,
    craft JSONB,
    utilize JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_feats
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_feats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    repeatable TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_backgrounds
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_backgrounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    ability_scores JSONB DEFAULT '[]',
    feat JSONB,
    proficiencies JSONB DEFAULT '[]',
    proficiency_choices JSONB,
    equipment_options JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_conditions
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_languages
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_languages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_rare BOOLEAN DEFAULT FALSE,
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_weapon_mastery
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_weapon_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_proficiencies
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_proficiencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT,
    backgrounds JSONB DEFAULT '[]',
    classes JSONB DEFAULT '[]',
    species JSONB DEFAULT '[]',
    reference JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_skills
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    ability_score JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_ability_scores
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_ability_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    full_name TEXT,
    description TEXT,
    skills JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_damage_types
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_damage_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_magic_schools
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_magic_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_weapon_properties
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_weapon_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_equipment_categories
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_equipment_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    equipment JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_alignments
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_alignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    abbreviation TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Enable RLS on all tables
-- ============================================
ALTER TABLE srd2024_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_feats ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_weapon_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_proficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_ability_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_damage_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_magic_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_weapon_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_alignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create RLS policies (public read access for SRD content)
-- ============================================
CREATE POLICY "srd2024_equipment_read" ON srd2024_equipment FOR SELECT USING (true);
CREATE POLICY "srd2024_feats_read" ON srd2024_feats FOR SELECT USING (true);
CREATE POLICY "srd2024_backgrounds_read" ON srd2024_backgrounds FOR SELECT USING (true);
CREATE POLICY "srd2024_conditions_read" ON srd2024_conditions FOR SELECT USING (true);
CREATE POLICY "srd2024_languages_read" ON srd2024_languages FOR SELECT USING (true);
CREATE POLICY "srd2024_weapon_mastery_read" ON srd2024_weapon_mastery FOR SELECT USING (true);
CREATE POLICY "srd2024_proficiencies_read" ON srd2024_proficiencies FOR SELECT USING (true);
CREATE POLICY "srd2024_skills_read" ON srd2024_skills FOR SELECT USING (true);
CREATE POLICY "srd2024_ability_scores_read" ON srd2024_ability_scores FOR SELECT USING (true);
CREATE POLICY "srd2024_damage_types_read" ON srd2024_damage_types FOR SELECT USING (true);
CREATE POLICY "srd2024_magic_schools_read" ON srd2024_magic_schools FOR SELECT USING (true);
CREATE POLICY "srd2024_weapon_properties_read" ON srd2024_weapon_properties FOR SELECT USING (true);
CREATE POLICY "srd2024_equipment_categories_read" ON srd2024_equipment_categories FOR SELECT USING (true);
CREATE POLICY "srd2024_alignments_read" ON srd2024_alignments FOR SELECT USING (true);

-- ============================================
-- Create indexes for common queries
-- ============================================
CREATE INDEX IF NOT EXISTS idx_srd2024_equipment_name ON srd2024_equipment(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_feats_name ON srd2024_feats(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_feats_type ON srd2024_feats(type);
CREATE INDEX IF NOT EXISTS idx_srd2024_backgrounds_name ON srd2024_backgrounds(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_conditions_name ON srd2024_conditions(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_languages_name ON srd2024_languages(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_proficiencies_type ON srd2024_proficiencies(type);

-- ============================================
-- srd2024_classes
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    hit_die INTEGER,
    proficiency_choices JSONB DEFAULT '[]',
    proficiencies JSONB DEFAULT '[]',
    saving_throws TEXT[] DEFAULT '{}',
    starting_equipment JSONB,
    class_levels JSONB,
    spellcasting JSONB,
    subclasses TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_races
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_races (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    speed INTEGER,
    ability_bonuses JSONB DEFAULT '[]',
    size TEXT,
    size_description TEXT,
    languages JSONB DEFAULT '[]',
    language_desc TEXT,
    traits JSONB DEFAULT '[]',
    subraces TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_spells
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_spells (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    level INTEGER,
    school TEXT,
    casting_time TEXT,
    range TEXT,
    components TEXT[] DEFAULT '{}',
    material TEXT,
    duration TEXT,
    concentration BOOLEAN DEFAULT FALSE,
    ritual BOOLEAN DEFAULT FALSE,
    description TEXT,
    higher_level TEXT,
    classes TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- srd2024_subclasses
-- ============================================
CREATE TABLE IF NOT EXISTS srd2024_subclasses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    class_index TEXT,
    subclass_flavor TEXT,
    description TEXT,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE srd2024_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_spells ENABLE ROW LEVEL SECURITY;
ALTER TABLE srd2024_subclasses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "srd2024_classes_read" ON srd2024_classes FOR SELECT USING (true);
CREATE POLICY "srd2024_races_read" ON srd2024_races FOR SELECT USING (true);
CREATE POLICY "srd2024_spells_read" ON srd2024_spells FOR SELECT USING (true);
CREATE POLICY "srd2024_subclasses_read" ON srd2024_subclasses FOR SELECT USING (true);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_srd2024_classes_name ON srd2024_classes(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_races_name ON srd2024_races(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_spells_name ON srd2024_spells(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_spells_level ON srd2024_spells(level);
CREATE INDEX IF NOT EXISTS idx_srd2024_spells_school ON srd2024_spells(school);
CREATE INDEX IF NOT EXISTS idx_srd2024_subclasses_name ON srd2024_subclasses(name);
CREATE INDEX IF NOT EXISTS idx_srd2024_subclasses_class_index ON srd2024_subclasses(class_index);
