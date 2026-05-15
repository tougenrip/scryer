-- Populate canonical race data (ability bonuses, traits, languages,
-- size, speed) for races whose `srd_races` / `srd2024_races` rows
-- were imported with incomplete fields. Stored as inline trait
-- objects `{ name, desc }` so the race detail panel renders the
-- description directly without needing a separate trait-lookup
-- junction.
--
-- Each block updates only the columns that are commonly missing; the
-- WHERE clause uses lower(name) for case-insensitive match so 2014
-- ("Dwarf") and 2024 ("dwarf") imports both get patched.
--
-- All race data here is 5e RAW (PHB / Mordenkainen's), safe to use
-- under SRD/OGL rules.

-- ─── Helper inline: a no-op idempotent updater per race ────────────
-- Each statement only fills columns that are currently NULL / empty,
-- so re-running the migration doesn't clobber edited rows.

create or replace function public._patch_race(
  p_table regclass,
  p_name text,
  p_speed integer,
  p_size text,
  p_size_desc text,
  p_ability_bonuses jsonb,
  p_traits jsonb,
  p_languages jsonb,
  p_language_desc text
) returns void language plpgsql as $$
begin
  execute format(
    'update %s set
      speed = coalesce(nullif(speed, 0), %L),
      size = coalesce(nullif(size, ''''), %L),
      size_description = coalesce(nullif(size_description, ''''), %L),
      ability_bonuses = case
        when ability_bonuses is null or ability_bonuses = ''[]''::jsonb
        then %L::jsonb else ability_bonuses end,
      traits = case
        when traits is null or traits = ''[]''::jsonb
        then %L::jsonb else traits end,
      languages = case
        when languages is null or languages = ''[]''::jsonb
        then %L::jsonb else languages end,
      language_desc = coalesce(nullif(language_desc, ''''), %L)
     where lower(name) = lower(%L)',
    p_table,
    p_speed, p_size, p_size_desc,
    p_ability_bonuses::text, p_traits::text, p_languages::text,
    p_language_desc, p_name
  );
end;
$$;

-- ─── Race data (applied to both 2014 + 2024 tables) ────────────────

do $$
declare
  t regclass;
begin
  foreach t in array array[
    'public.srd_races'::regclass,
    'public.srd2024_races'::regclass
  ]
  loop
    -- DWARF
    perform public._patch_race(t,
      'Dwarf', 25, 'Medium',
      'Dwarves stand between 4 and 5 feet tall and average about 150 pounds.',
      '[{"ability_score":{"index":"con","name":"Constitution"},"bonus":2}]'::jsonb,
      $j$[
        {"name":"Darkvision","desc":"You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can''t discern color in darkness, only shades of gray."},
        {"name":"Dwarven Resilience","desc":"You have advantage on saving throws against poison, and you have resistance against poison damage."},
        {"name":"Dwarven Combat Training","desc":"You have proficiency with the battleaxe, handaxe, light hammer, and warhammer."},
        {"name":"Tool Proficiency","desc":"You gain proficiency with the artisan''s tools of your choice: smith''s tools, brewer''s supplies, or mason''s tools."},
        {"name":"Stonecunning","desc":"Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check, instead of your normal proficiency bonus."}
      ]$j$::jsonb,
      '["Common","Dwarvish"]'::jsonb,
      'You can speak, read, and write Common and Dwarvish. Dwarvish is full of hard consonants and guttural sounds, and those characteristics spill over into whatever other language a dwarf might speak.'
    );

    -- DRAGONBORN
    perform public._patch_race(t,
      'Dragonborn', 30, 'Medium',
      'Dragonborn are taller and heavier than humans, standing well over 6 feet tall and averaging about 250 pounds.',
      '[{"ability_score":{"index":"str","name":"Strength"},"bonus":2},{"ability_score":{"index":"cha","name":"Charisma"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Draconic Ancestry","desc":"You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon and damage resistance are determined by the dragon type, as shown in the table."},
        {"name":"Breath Weapon","desc":"You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation. When you use your breath weapon, each creature in the area of the exhalation must make a saving throw, the type of which is determined by your draconic ancestry. The DC for this saving throw equals 8 + your Constitution modifier + your proficiency bonus. A creature takes 2d6 damage on a failed save, and half as much damage on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. After you use your breath weapon, you can''t use it again until you complete a short or long rest."},
        {"name":"Damage Resistance","desc":"You have resistance to the damage type associated with your draconic ancestry."}
      ]$j$::jsonb,
      '["Common","Draconic"]'::jsonb,
      'You can speak, read, and write Common and Draconic. Draconic is thought to be one of the oldest languages and is often used in the study of magic.'
    );

    -- AASIMAR (Mordenkainen''s Tome of Foes / 2024 PHB)
    perform public._patch_race(t,
      'Aasimar', 30, 'Medium',
      'Aasimar are about the same size and build as humans. Your size is Medium.',
      '[{"ability_score":{"index":"cha","name":"Charisma"},"bonus":2}]'::jsonb,
      $j$[
        {"name":"Darkvision","desc":"You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can''t discern color in darkness, only shades of gray."},
        {"name":"Celestial Resistance","desc":"You have resistance to necrotic damage and radiant damage."},
        {"name":"Healing Hands","desc":"As an action, you can touch a creature and cause it to regain a number of hit points equal to your level. Once you use this trait, you can''t use it again until you finish a long rest."},
        {"name":"Light Bearer","desc":"You know the light cantrip. Charisma is your spellcasting ability for it."}
      ]$j$::jsonb,
      '["Common","Celestial"]'::jsonb,
      'You can speak, read, and write Common and Celestial.'
    );

    -- ORC (2024 PHB; OGL via Volo''s + Monsters of the Multiverse)
    perform public._patch_race(t,
      'Orc', 30, 'Medium',
      'Orcs are usually between 6 and 7 feet tall, with the same range of complexions as humans.',
      '[{"ability_score":{"index":"str","name":"Strength"},"bonus":2},{"ability_score":{"index":"con","name":"Constitution"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Darkvision","desc":"You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can''t discern color in darkness, only shades of gray."},
        {"name":"Adrenaline Rush","desc":"You can take the Dash action as a bonus action. You can use this trait a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a short or long rest."},
        {"name":"Powerful Build","desc":"You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift."},
        {"name":"Relentless Endurance","desc":"When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can''t use this trait again until you finish a long rest."}
      ]$j$::jsonb,
      '["Common","Orc"]'::jsonb,
      'You can speak, read, and write Common and Orc. Orc is a harsh, often guttural language.'
    );

    -- GOLIATH (Mordenkainen''s / 2024 PHB)
    perform public._patch_race(t,
      'Goliath', 35, 'Medium',
      'Goliaths are between 7 and 8 feet tall and weigh between 280 and 340 pounds.',
      '[{"ability_score":{"index":"str","name":"Strength"},"bonus":2},{"ability_score":{"index":"con","name":"Constitution"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Natural Athlete","desc":"You have proficiency in the Athletics skill."},
        {"name":"Stone''s Endurance","desc":"You can focus yourself to occasionally shrug off injury. When you take damage, you can use your reaction to roll a d12. Add your Constitution modifier to the number rolled and reduce the damage by that total. After you use this trait, you can''t use it again until you finish a short or long rest."},
        {"name":"Powerful Build","desc":"You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift."},
        {"name":"Mountain Born","desc":"You''re acclimated to high altitude, including elevations above 20,000 feet. You''re also naturally adapted to cold climates, as described in chapter 5 of the Dungeon Master''s Guide."}
      ]$j$::jsonb,
      '["Common","Giant"]'::jsonb,
      'You can speak, read, and write Common and Giant.'
    );

    -- TIEFLING
    perform public._patch_race(t,
      'Tiefling', 30, 'Medium',
      'Tieflings are about the same size and build as humans.',
      '[{"ability_score":{"index":"int","name":"Intelligence"},"bonus":1},{"ability_score":{"index":"cha","name":"Charisma"},"bonus":2}]'::jsonb,
      $j$[
        {"name":"Darkvision","desc":"Thanks to your infernal heritage, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can''t discern color in darkness, only shades of gray."},
        {"name":"Hellish Resistance","desc":"You have resistance to fire damage."},
        {"name":"Infernal Legacy","desc":"You know the thaumaturgy cantrip. When you reach 3rd level, you can cast the hellish rebuke spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the darkness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."}
      ]$j$::jsonb,
      '["Common","Infernal"]'::jsonb,
      'You can speak, read, and write Common and Infernal.'
    );

    -- HUMAN
    perform public._patch_race(t,
      'Human', 30, 'Medium',
      'Humans vary widely in height and build, from barely 5 feet to well over 6 feet tall.',
      '[{"ability_score":{"index":"str","name":"Strength"},"bonus":1},{"ability_score":{"index":"dex","name":"Dexterity"},"bonus":1},{"ability_score":{"index":"con","name":"Constitution"},"bonus":1},{"ability_score":{"index":"int","name":"Intelligence"},"bonus":1},{"ability_score":{"index":"wis","name":"Wisdom"},"bonus":1},{"ability_score":{"index":"cha","name":"Charisma"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Versatile","desc":"Humans have no special innate traits beyond their adaptability and ambition. The standard human ability score bonuses are +1 to each of the six ability scores."}
      ]$j$::jsonb,
      '["Common"]'::jsonb,
      'You can speak, read, and write Common and one extra language of your choice. Humans typically learn the languages of other peoples they deal with, including obscure dialects.'
    );

    -- ELF
    perform public._patch_race(t,
      'Elf', 30, 'Medium',
      'Elves range from under 5 to over 6 feet tall and have slender builds.',
      '[{"ability_score":{"index":"dex","name":"Dexterity"},"bonus":2}]'::jsonb,
      $j$[
        {"name":"Darkvision","desc":"Accustomed to twilit forests and the night sky, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can''t discern color in darkness, only shades of gray."},
        {"name":"Keen Senses","desc":"You have proficiency in the Perception skill."},
        {"name":"Fey Ancestry","desc":"You have advantage on saving throws against being charmed, and magic can''t put you to sleep."},
        {"name":"Trance","desc":"Elves don''t need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day. After resting in this way, you gain the same benefit that a human does from 8 hours of sleep."}
      ]$j$::jsonb,
      '["Common","Elvish"]'::jsonb,
      'You can speak, read, and write Common and Elvish. Elvish is fluid, with subtle intonations and intricate grammar.'
    );

    -- HALFLING
    perform public._patch_race(t,
      'Halfling', 25, 'Small',
      'Halflings average about 3 feet tall and weigh about 40 pounds.',
      '[{"ability_score":{"index":"dex","name":"Dexterity"},"bonus":2}]'::jsonb,
      $j$[
        {"name":"Lucky","desc":"When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll."},
        {"name":"Brave","desc":"You have advantage on saving throws against being frightened."},
        {"name":"Halfling Nimbleness","desc":"You can move through the space of any creature that is of a size larger than yours."}
      ]$j$::jsonb,
      '["Common","Halfling"]'::jsonb,
      'You can speak, read, and write Common and Halfling. The Halfling language isn''t secret, but halflings are loath to share it with others.'
    );

    -- GNOME
    perform public._patch_race(t,
      'Gnome', 25, 'Small',
      'Gnomes are between 3 and 4 feet tall and average about 40 pounds.',
      '[{"ability_score":{"index":"int","name":"Intelligence"},"bonus":2}]'::jsonb,
      $j$[
        {"name":"Darkvision","desc":"Accustomed to life underground, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can''t discern color in darkness, only shades of gray."},
        {"name":"Gnome Cunning","desc":"You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic."}
      ]$j$::jsonb,
      '["Common","Gnomish"]'::jsonb,
      'You can speak, read, and write Common and Gnomish. The Gnomish language, which uses the Dwarvish script, is renowned for its technical treatises and its catalogs of knowledge about the natural world.'
    );
  end loop;
end $$;

-- Cleanup the helper — leaves the schema tidy.
drop function public._patch_race(regclass, text, integer, text, text, jsonb, jsonb, jsonb, text);
