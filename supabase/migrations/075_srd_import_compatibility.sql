-- Compatibility schema for importing the full public 5e-bits SRD API.
-- Keeps srd_* as 2014/default content and leaves srd2024_* for true 2024 data.

create table if not exists srd_ability_scores (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  full_name text,
  description text,
  skills jsonb default '[]'::jsonb,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_alignments (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  abbreviation text,
  description text,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_conditions (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_damage_types (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_equipment_categories (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  equipment jsonb default '[]'::jsonb,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_feats (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  prerequisites jsonb default '[]'::jsonb,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_languages (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  type text,
  typical_speakers text[] default '{}',
  script text,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_magic_schools (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_magic_items (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  equipment_category text,
  rarity text,
  requires_attunement boolean,
  variant_of text,
  variants text[] default '{}',
  description text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_proficiencies (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  type text,
  classes jsonb default '[]'::jsonb,
  races jsonb default '[]'::jsonb,
  reference jsonb,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_rule_sections (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_rules (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  subsections jsonb default '[]'::jsonb,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_skills (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  ability_score jsonb,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_subraces (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  race jsonb,
  description text,
  ability_bonuses jsonb default '[]'::jsonb,
  starting_proficiencies jsonb default '[]'::jsonb,
  languages jsonb default '[]'::jsonb,
  racial_traits jsonb default '[]'::jsonb,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_traits (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  races jsonb default '[]'::jsonb,
  subraces jsonb default '[]'::jsonb,
  proficiencies jsonb default '[]'::jsonb,
  proficiency_choices jsonb,
  trait_specific jsonb,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd_weapon_properties (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  description text,
  url text,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2014',
  created_at timestamp default now()
);

create table if not exists srd2024_monsters (
  id uuid primary key default gen_random_uuid(),
  index text not null unique,
  name text not null,
  size text,
  type text,
  subtype text,
  alignment text,
  armor_class integer,
  hit_points integer,
  hit_dice text,
  speed jsonb,
  strength integer,
  dexterity integer,
  constitution integer,
  intelligence integer,
  wisdom integer,
  charisma integer,
  proficiencies jsonb default '[]'::jsonb,
  damage_vulnerabilities text[] default '{}',
  damage_resistances text[] default '{}',
  damage_immunities text[] default '{}',
  condition_immunities text[] default '{}',
  senses jsonb default '{}'::jsonb,
  languages text,
  challenge_rating numeric,
  xp integer,
  special_abilities jsonb default '[]'::jsonb,
  actions jsonb default '[]'::jsonb,
  legendary_actions jsonb default '[]'::jsonb,
  reactions jsonb default '[]'::jsonb,
  image_urls jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  source_version text not null default '2024',
  created_at timestamp default now()
);

alter table srd_monsters add column if not exists image_urls jsonb not null default '[]'::jsonb;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'srd_ability_scores',
    'srd_alignments',
    'srd_backgrounds',
    'srd_classes',
    'srd_conditions',
    'srd_damage_types',
    'srd_equipment',
    'srd_equipment_categories',
    'srd_feats',
    'srd_features',
    'srd_languages',
    'srd_magic_items',
    'srd_magic_schools',
    'srd_monsters',
    'srd_proficiencies',
    'srd_proficiencies_training',
    'srd_races',
    'srd_rule_sections',
    'srd_rules',
    'srd_skills',
    'srd_spells',
    'srd_subclasses',
    'srd_subraces',
    'srd_traits',
    'srd_weapon_properties',
    'srd2024_monsters'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table %I add column if not exists raw jsonb not null default ''{}''::jsonb', table_name);
      execute format('alter table %I add column if not exists source_version text not null default ''2014''', table_name);
      execute format('alter table %I enable row level security', table_name);
      execute format('drop policy if exists %I on %I', table_name || '_read', table_name);
      execute format('create policy %I on %I for select using (true)', table_name || '_read', table_name);
    end if;
  end loop;
end $$;

create index if not exists idx_srd_monsters_image_urls on srd_monsters using gin (image_urls);
create index if not exists idx_srd_monsters_source_version on srd_monsters(source_version);
create index if not exists idx_srd2024_monsters_name on srd2024_monsters(name);
create index if not exists idx_srd2024_monsters_challenge_rating on srd2024_monsters(challenge_rating);
