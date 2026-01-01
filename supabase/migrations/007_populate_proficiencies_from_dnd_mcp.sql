-- Data migration: Populate srd_proficiencies_training from D&D MCP class data
-- This script adds all proficiencies (weapons, armor, tools) from official D&D 5e classes
-- Based on data from dnd-5e MCP server

-- ============================================
-- STEP 1: Insert weapon proficiencies
-- ============================================

INSERT INTO srd_proficiencies_training (index, name, type, description, category)
VALUES
  ('simple-weapons', 'Simple Weapons', 'weapon', 'Simple weapons include clubs, maces, and other weapons favored by commoners.', 'Simple Weapons'),
  ('martial-weapons', 'Martial Weapons', 'weapon', 'Martial weapons, including swords, axes, and polearms, require more specialized training to use effectively.', 'Martial Weapons'),
  ('daggers', 'Daggers', 'weapon', 'Light, finesse melee weapons that can be thrown.', 'Simple Weapons'),
  ('darts', 'Darts', 'weapon', 'Light ranged weapons that can be thrown.', 'Simple Weapons'),
  ('slings', 'Slings', 'weapon', 'Simple ranged weapons that use ammunition.', 'Simple Weapons'),
  ('quarterstaffs', 'Quarterstaffs', 'weapon', 'Simple melee weapons, versatile two-handed staves.', 'Simple Weapons'),
  ('light-crossbows', 'Light Crossbows', 'weapon', 'Simple ranged weapons that use crossbow bolts.', 'Simple Weapons'),
  ('hand-crossbows', 'Hand Crossbows', 'weapon', 'Light ranged weapons that use crossbow bolts.', 'Simple Weapons'),
  ('longswords', 'Longswords', 'weapon', 'Martial melee weapons, versatile one-handed swords.', 'Martial Weapons'),
  ('rapiers', 'Rapiers', 'weapon', 'Martial melee weapons with the finesse property.', 'Martial Weapons'),
  ('shortswords', 'Shortswords', 'weapon', 'Martial melee weapons with the finesse and light properties.', 'Martial Weapons'),
  ('clubs', 'Clubs', 'weapon', 'Simple melee weapons, basic bludgeoning weapons.', 'Simple Weapons'),
  ('maces', 'Maces', 'weapon', 'Simple melee weapons, bludgeoning weapons.', 'Simple Weapons'),
  ('warhammers', 'Warhammers', 'weapon', 'Martial melee weapons, versatile hammers.', 'Martial Weapons'),
  ('javelins', 'Javelins', 'weapon', 'Simple melee weapons that can be thrown.', 'Simple Weapons'),
  ('spears', 'Spears', 'weapon', 'Simple melee weapons, versatile polearms.', 'Simple Weapons'),
  ('scimitars', 'Scimitars', 'weapon', 'Martial melee weapons with the finesse and light properties.', 'Martial Weapons'),
  ('sickles', 'Sickles', 'weapon', 'Simple melee weapons, light bladed weapons.', 'Simple Weapons'),
  ('shortbows', 'Shortbows', 'weapon', 'Simple ranged weapons that use arrows.', 'Simple Weapons'),
  ('longbows', 'Longbows', 'weapon', 'Martial ranged weapons that use arrows.', 'Martial Weapons')
ON CONFLICT (index) DO NOTHING;

-- ============================================
-- STEP 2: Insert armor proficiencies
-- ============================================

INSERT INTO srd_proficiencies_training (index, name, type, description, category)
VALUES
  ('light-armor', 'Light Armor', 'armor', 'Light armor offers basic protection while allowing freedom of movement.', 'Light Armor'),
  ('medium-armor', 'Medium Armor', 'armor', 'Medium armor offers more protection than light armor, but it also impairs movement more.', 'Medium Armor'),
  ('heavy-armor', 'Heavy Armor', 'armor', 'Heavy armor offers the best protection, but it also impairs movement the most.', 'Heavy Armor'),
  ('shields', 'Shields', 'armor', 'A shield is made from wood or metal and is carried in one hand. Wielding a shield increases your Armor Class by 2.', 'Shields'),
  ('leather-armor', 'Leather Armor', 'armor', 'The breastplate and shoulder protectors of this armor are made of leather that has been stiffened by being boiled in oil.', 'Light Armor'),
  ('scale-mail', 'Scale Mail', 'armor', 'This armor consists of a coat and leggings (and perhaps a separate skirt) of leather covered with overlapping pieces of metal, much like the scales of a fish.', 'Medium Armor'),
  ('chain-mail', 'Chain Mail', 'armor', 'Made of interlocking metal rings, chain mail includes a layer of quilted fabric worn underneath the mail to prevent chafing and to cushion the impact of blows.', 'Heavy Armor')
ON CONFLICT (index) DO NOTHING;

-- ============================================
-- STEP 3: Insert tool proficiencies
-- ============================================

INSERT INTO srd_proficiencies_training (index, name, type, description, category)
VALUES
  ('thieves-tools', 'Thieves'' Tools', 'tool', 'This set of tools includes a small file, a set of lock picks, a small mirror mounted on a metal handle, a pair of narrow-bladed scissors, and a pair of pliers.', 'Thieves'' Tools'),
  ('herbalism-kit', 'Herbalism Kit', 'tool', 'This kit contains a variety of instruments such as clippers, mortar and pestle, and pouches and vials used by herbalists to create remedies and potions.', 'Herbalism Kit'),
  ('musical-instruments', 'Musical Instruments', 'tool', 'Several types of musical instruments are available to bards and other characters, including bagpipes, drums, dulcimers, flutes, lutes, lyres, horns, pan flutes, shawms, and viols.', 'Musical Instruments'),
  ('artisans-tools', 'Artisan''s Tools', 'tool', 'These special tools include the items needed to pursue a craft or trade. Proficiency with a set of artisan''s tools lets you add your proficiency bonus to any ability checks you make using the tools in your craft.', 'Artisan''s Tools'),
  ('alchemists-supplies', 'Alchemist''s Supplies', 'tool', 'Alchemist''s supplies enable a character to produce useful concoctions, such as acid or alchemist''s fire.', 'Artisan''s Tools'),
  ('brewers-supplies', 'Brewer''s Supplies', 'tool', 'Brewer''s supplies enable a character to produce beer and other alcoholic beverages.', 'Artisan''s Tools'),
  ('calligraphers-supplies', 'Calligrapher''s Supplies', 'tool', 'Calligrapher''s supplies enable a character to create beautiful writing and documents.', 'Artisan''s Tools'),
  ('carpenters-tools', 'Carpenter''s Tools', 'tool', 'Carpenter''s tools enable a character to construct wooden structures and items.', 'Artisan''s Tools'),
  ('cartographers-tools', 'Cartographer''s Tools', 'tool', 'Cartographer''s tools enable a character to create accurate maps and charts.', 'Artisan''s Tools'),
  ('cobblers-tools', 'Cobbler''s Tools', 'tool', 'Cobbler''s tools enable a character to create and repair footwear.', 'Artisan''s Tools'),
  ('cooks-utensils', 'Cook''s Utensils', 'tool', 'Cook''s utensils enable a character to prepare meals and identify ingredients.', 'Artisan''s Tools'),
  ('glassblowers-tools', 'Glassblower''s Tools', 'tool', 'Glassblower''s tools enable a character to create glass items and works of art.', 'Artisan''s Tools'),
  ('jewelers-tools', 'Jeweler''s Tools', 'tool', 'Jeweler''s tools enable a character to create and appraise jewelry and gems.', 'Artisan''s Tools'),
  ('leatherworkers-tools', 'Leatherworker''s Tools', 'tool', 'Leatherworker''s tools enable a character to create and repair leather goods.', 'Artisan''s Tools'),
  ('masons-tools', 'Mason''s Tools', 'tool', 'Mason''s tools enable a character to work with stone and create stone structures.', 'Artisan''s Tools'),
  ('painters-supplies', 'Painter''s Supplies', 'tool', 'Painter''s supplies enable a character to create works of art and visual records.', 'Artisan''s Tools'),
  ('potters-tools', 'Potter''s Tools', 'tool', 'Potter''s tools enable a character to create ceramic items and works of art.', 'Artisan''s Tools'),
  ('smiths-tools', 'Smith''s Tools', 'tool', 'Smith''s tools enable a character to work with metal and create metal items.', 'Artisan''s Tools'),
  ('tinkers-tools', 'Tinker''s Tools', 'tool', 'Tinker''s tools enable a character to create and repair small mechanical devices.', 'Artisan''s Tools'),
  ('weavers-tools', 'Weaver''s Tools', 'tool', 'Weaver''s tools enable a character to create textiles and fabrics.', 'Artisan''s Tools'),
  ('woodcarvers-tools', 'Woodcarver''s Tools', 'tool', 'Woodcarver''s tools enable a character to create wooden items and works of art.', 'Artisan''s Tools'),
  ('disguise-kit', 'Disguise Kit', 'tool', 'This pouch of cosmetics, hair dyes, and small props lets you create disguises that change your physical appearance.', 'Disguise Kit'),
  ('forgery-kit', 'Forgery Kit', 'tool', 'This small box contains a variety of papers and parchments, pens and inks, seals and sealing wax, gold and silver leaf, and other supplies necessary to create convincing forgeries of physical documents.', 'Forgery Kit'),
  ('gaming-set', 'Gaming Set', 'tool', 'This item encompasses a wide range of game pieces, including dice and decks of cards (for games such as Three-Dragon Ante).', 'Gaming Set'),
  ('navigators-tools', 'Navigator''s Tools', 'tool', 'This set of instruments is used for navigation at sea. Proficiency with navigator''s tools lets you chart a ship''s course and follow navigation charts.', 'Navigator''s Tools'),
  ('poisoners-kit', 'Poisoner''s Kit', 'tool', 'A poisoner''s kit includes the vials, chemicals, and other equipment necessary for the creation of poisons.', 'Poisoner''s Kit'),
  ('vehicles-land', 'Vehicles (Land)', 'tool', 'A land vehicle is a device for transporting people or goods over land.', 'Vehicles'),
  ('vehicles-water', 'Vehicles (Water)', 'tool', 'A water vehicle is a device for transporting people or goods over water.', 'Vehicles')
ON CONFLICT (index) DO NOTHING;

-- ============================================
-- STEP 4: Link classes to weapon proficiencies based on D&D MCP data
-- ============================================

-- Barbarian: Simple weapons, martial weapons
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('barbarian', 'simple-weapons'),
  ('barbarian', 'martial-weapons')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Bard: Simple weapons, hand crossbows, longswords, rapiers, shortswords
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('bard', 'simple-weapons'),
  ('bard', 'hand-crossbows'),
  ('bard', 'longswords'),
  ('bard', 'rapiers'),
  ('bard', 'shortswords')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Cleric: Simple weapons
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('cleric', 'simple-weapons')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Druid: Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('druid', 'clubs'),
  ('druid', 'daggers'),
  ('druid', 'darts'),
  ('druid', 'javelins'),
  ('druid', 'maces'),
  ('druid', 'quarterstaffs'),
  ('druid', 'scimitars'),
  ('druid', 'sickles'),
  ('druid', 'slings'),
  ('druid', 'spears')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Fighter: Simple weapons, martial weapons
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('fighter', 'simple-weapons'),
  ('fighter', 'martial-weapons')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Monk: Simple weapons, shortswords
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('monk', 'simple-weapons'),
  ('monk', 'shortswords')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Paladin: Simple weapons, martial weapons
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('paladin', 'simple-weapons'),
  ('paladin', 'martial-weapons')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Ranger: Simple weapons, martial weapons
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('ranger', 'simple-weapons'),
  ('ranger', 'martial-weapons')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Rogue: Simple weapons, hand crossbows, longswords, rapiers, shortswords
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('rogue', 'simple-weapons'),
  ('rogue', 'hand-crossbows'),
  ('rogue', 'longswords'),
  ('rogue', 'rapiers'),
  ('rogue', 'shortswords')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Sorcerer: Daggers, darts, slings, quarterstaffs, light crossbows
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('sorcerer', 'daggers'),
  ('sorcerer', 'darts'),
  ('sorcerer', 'slings'),
  ('sorcerer', 'quarterstaffs'),
  ('sorcerer', 'light-crossbows')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Warlock: Simple weapons
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('warlock', 'simple-weapons')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Wizard: Daggers, darts, slings, quarterstaffs, light crossbows
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('wizard', 'daggers'),
  ('wizard', 'darts'),
  ('wizard', 'slings'),
  ('wizard', 'quarterstaffs'),
  ('wizard', 'light-crossbows')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- ============================================
-- STEP 5: Link classes to armor proficiencies based on D&D MCP data
-- ============================================

-- Barbarian: Light armor, medium armor, shields
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('barbarian', 'light-armor'),
  ('barbarian', 'medium-armor'),
  ('barbarian', 'shields')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Bard: Light armor
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('bard', 'light-armor')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Cleric: Light armor, medium armor, shields
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('cleric', 'light-armor'),
  ('cleric', 'medium-armor'),
  ('cleric', 'shields')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Druid: Light armor, medium armor, shields (druids will not wear armor or use shields made of metal)
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('druid', 'light-armor'),
  ('druid', 'medium-armor'),
  ('druid', 'shields')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Fighter: All armor, shields
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('fighter', 'light-armor'),
  ('fighter', 'medium-armor'),
  ('fighter', 'heavy-armor'),
  ('fighter', 'shields')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Monk: None
-- (No armor proficiencies for monk)

-- Paladin: All armor, shields
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('paladin', 'light-armor'),
  ('paladin', 'medium-armor'),
  ('paladin', 'heavy-armor'),
  ('paladin', 'shields')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Ranger: Light armor, medium armor, shields
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('ranger', 'light-armor'),
  ('ranger', 'medium-armor'),
  ('ranger', 'shields')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Rogue: Light armor
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('rogue', 'light-armor')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Sorcerer: None
-- (No armor proficiencies for sorcerer)

-- Warlock: Light armor
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('warlock', 'light-armor')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Wizard: None
-- (No armor proficiencies for wizard)

-- ============================================
-- STEP 6: Link classes to tool proficiencies based on D&D MCP data
-- ============================================

-- Barbarian: None
-- (No tool proficiencies for barbarian)

-- Bard: Three musical instruments of your choice
-- Note: This is a choice, so we'll link to the general musical-instruments proficiency
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('bard', 'musical-instruments')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Cleric: None
-- (No tool proficiencies for cleric)

-- Druid: Herbalism kit
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('druid', 'herbalism-kit')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Fighter: None
-- (No tool proficiencies for fighter)

-- Monk: Choose one type of artisan's tools or one musical instrument
-- Note: This is a choice, so we'll link to both general categories
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('monk', 'artisans-tools'),
  ('monk', 'musical-instruments')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Paladin: None
-- (No tool proficiencies for paladin)

-- Ranger: None
-- (No tool proficiencies for ranger)

-- Rogue: Thieves' tools
INSERT INTO srd_class_proficiencies_training (class_index, proficiency_index)
VALUES
  ('rogue', 'thieves-tools')
ON CONFLICT (class_index, proficiency_index) DO NOTHING;

-- Sorcerer: None
-- (No tool proficiencies for sorcerer)

-- Warlock: None
-- (No tool proficiencies for warlock)

-- Wizard: None
-- (No tool proficiencies for wizard)

