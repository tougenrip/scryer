-- Populate canonical subrace data for the 2014 SRD subraces. The
-- 5e-bits import seeds parent races (Dwarf, Elf, Halfling, Gnome) but
-- leaves subrace rows (Hill Dwarf, Mountain Dwarf, High Elf, Wood Elf,
-- Lightfoot Halfling, Stout Halfling, Rock Gnome) with sparse data —
-- no inline traits, often no ability bonuses. The character creator's
-- race detail panel surfaces those fields directly, so a subrace row
-- with empty `traits` jsonb renders as "No traits listed."
--
-- Same idempotent strategy as migration 111: only fills columns that
-- are currently NULL / empty so re-running won't clobber edited rows.
--
-- Notes on RAW:
--   • Subraces INHERIT parent traits (the detail panel will surface
--     them via a parent lookup added in a follow-up commit). The
--     entries here are the deltas: ability bonus + subrace-specific
--     traits, plus speed for Wood Elf.
--   • All data here is 5e SRD (PHB Chapter 2), safe under OGL.

create or replace function public._patch_subrace(
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
exception when others then
  raise notice 'patch_subrace skip: % - %', p_name, sqlerrm;
end;
$$;

do $migrate$
declare
  t regclass;
begin
  foreach t in array array[
    'public.srd_races'::regclass,
    'public.srd2024_races'::regclass
  ]
  loop
    -- HILL DWARF (+1 Wis, Dwarven Toughness)
    perform public._patch_subrace(t,
      'Hill Dwarf', 25, 'Medium',
      'Dwarves stand between 4 and 5 feet tall and average about 150 pounds.',
      '[{"ability_score":{"index":"wis","name":"Wisdom"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Dwarven Toughness","desc":"Your hit point maximum increases by 1, and it increases by 1 every time you gain a level."}
      ]$j$::jsonb,
      '["Common","Dwarvish"]'::jsonb,
      'You can speak, read, and write Common and Dwarvish.'
    );

    -- MOUNTAIN DWARF (+2 Str, Dwarven Armor Training)
    perform public._patch_subrace(t,
      'Mountain Dwarf', 25, 'Medium',
      'Dwarves stand between 4 and 5 feet tall and average about 150 pounds.',
      '[{"ability_score":{"index":"str","name":"Strength"},"bonus":2}]'::jsonb,
      $j$[
        {"name":"Dwarven Armor Training","desc":"You have proficiency with light and medium armor."}
      ]$j$::jsonb,
      '["Common","Dwarvish"]'::jsonb,
      'You can speak, read, and write Common and Dwarvish.'
    );

    -- HIGH ELF (+1 Int, Elf Weapon Training, Cantrip, Extra Language)
    perform public._patch_subrace(t,
      'High Elf', 30, 'Medium',
      'Elves range from under 5 to over 6 feet tall and have slender builds.',
      '[{"ability_score":{"index":"int","name":"Intelligence"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Elf Weapon Training","desc":"You have proficiency with the longsword, shortsword, shortbow, and longbow."},
        {"name":"Cantrip","desc":"You know one cantrip of your choice from the wizard spell list. Intelligence is your spellcasting ability for it."},
        {"name":"Extra Language","desc":"You can speak, read, and write one extra language of your choice."}
      ]$j$::jsonb,
      '["Common","Elvish"]'::jsonb,
      'You can speak, read, and write Common, Elvish, and one extra language of your choice.'
    );

    -- WOOD ELF (+1 Wis, 35 ft speed, Mask of the Wild)
    perform public._patch_subrace(t,
      'Wood Elf', 35, 'Medium',
      'Wood elves are typically taller and have copper or pale skin tones.',
      '[{"ability_score":{"index":"wis","name":"Wisdom"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Elf Weapon Training","desc":"You have proficiency with the longsword, shortsword, shortbow, and longbow."},
        {"name":"Fleet of Foot","desc":"Your base walking speed increases to 35 feet."},
        {"name":"Mask of the Wild","desc":"You can attempt to hide even when you are only lightly obscured by foliage, heavy rain, falling snow, mist, and other natural phenomena."}
      ]$j$::jsonb,
      '["Common","Elvish"]'::jsonb,
      'You can speak, read, and write Common and Elvish.'
    );

    -- DARK ELF / DROW (+1 Cha, Superior Darkvision, Sunlight Sensitivity, Drow Magic, Drow Weapon Training)
    perform public._patch_subrace(t,
      'Drow', 30, 'Medium',
      'Drow are short compared to other elves, between 4½ and 5½ feet tall.',
      '[{"ability_score":{"index":"cha","name":"Charisma"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Superior Darkvision","desc":"Your darkvision has a radius of 120 feet, instead of the typical 60 feet."},
        {"name":"Sunlight Sensitivity","desc":"You have disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight when you, the target of your attack, or whatever you are trying to perceive is in direct sunlight."},
        {"name":"Drow Magic","desc":"You know the dancing lights cantrip. When you reach 3rd level, you can cast the faerie fire spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can also cast the darkness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells."},
        {"name":"Drow Weapon Training","desc":"You have proficiency with rapiers, shortswords, and hand crossbows."}
      ]$j$::jsonb,
      '["Common","Elvish"]'::jsonb,
      'You can speak, read, and write Common and Elvish.'
    );

    -- DARK ELF (alternate name spelling)
    perform public._patch_subrace(t,
      'Dark Elf', 30, 'Medium',
      'Drow are short compared to other elves, between 4½ and 5½ feet tall.',
      '[{"ability_score":{"index":"cha","name":"Charisma"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Superior Darkvision","desc":"Your darkvision has a radius of 120 feet, instead of the typical 60 feet."},
        {"name":"Sunlight Sensitivity","desc":"You have disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight when you, the target of your attack, or whatever you are trying to perceive is in direct sunlight."},
        {"name":"Drow Magic","desc":"You know the dancing lights cantrip. When you reach 3rd level, you can cast faerie fire once per long rest. At 5th level, darkness once per long rest. Charisma is your spellcasting ability."},
        {"name":"Drow Weapon Training","desc":"You have proficiency with rapiers, shortswords, and hand crossbows."}
      ]$j$::jsonb,
      '["Common","Elvish"]'::jsonb,
      'You can speak, read, and write Common and Elvish.'
    );

    -- LIGHTFOOT HALFLING (+1 Cha, Naturally Stealthy)
    perform public._patch_subrace(t,
      'Lightfoot Halfling', 25, 'Small',
      'Halflings average about 3 feet tall and weigh about 40 pounds.',
      '[{"ability_score":{"index":"cha","name":"Charisma"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Naturally Stealthy","desc":"You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you."}
      ]$j$::jsonb,
      '["Common","Halfling"]'::jsonb,
      'You can speak, read, and write Common and Halfling.'
    );

    -- STOUT HALFLING (+1 Con, Stout Resilience)
    perform public._patch_subrace(t,
      'Stout Halfling', 25, 'Small',
      'Halflings average about 3 feet tall and weigh about 40 pounds.',
      '[{"ability_score":{"index":"con","name":"Constitution"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Stout Resilience","desc":"You have advantage on saving throws against poison, and you have resistance against poison damage."}
      ]$j$::jsonb,
      '["Common","Halfling"]'::jsonb,
      'You can speak, read, and write Common and Halfling.'
    );

    -- ROCK GNOME (+1 Con, Artificer's Lore, Tinker)
    perform public._patch_subrace(t,
      'Rock Gnome', 25, 'Small',
      'Gnomes are between 3 and 4 feet tall and average about 40 pounds.',
      '[{"ability_score":{"index":"con","name":"Constitution"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Artificer''s Lore","desc":"Whenever you make an Intelligence (History) check related to magic items, alchemical objects, or technological devices, you can add twice your proficiency bonus, instead of any proficiency bonus you normally apply."},
        {"name":"Tinker","desc":"You have proficiency with artisan''s tools (tinker''s tools). Using those tools, you can spend 1 hour and 10 gp worth of materials to construct a Tiny clockwork device (AC 5, 1 hp)."}
      ]$j$::jsonb,
      '["Common","Gnomish"]'::jsonb,
      'You can speak, read, and write Common and Gnomish.'
    );

    -- FOREST GNOME (+1 Dex, Natural Illusionist, Speak with Small Beasts)
    perform public._patch_subrace(t,
      'Forest Gnome', 25, 'Small',
      'Gnomes are between 3 and 4 feet tall and average about 40 pounds.',
      '[{"ability_score":{"index":"dex","name":"Dexterity"},"bonus":1}]'::jsonb,
      $j$[
        {"name":"Natural Illusionist","desc":"You know the minor illusion cantrip. Intelligence is your spellcasting ability for it."},
        {"name":"Speak with Small Beasts","desc":"Through sounds and gestures, you can communicate simple ideas with Small or smaller beasts. Forest gnomes love animals and often keep squirrels, badgers, rabbits, moles, woodpeckers, and other creatures as beloved pets."}
      ]$j$::jsonb,
      '["Common","Gnomish"]'::jsonb,
      'You can speak, read, and write Common and Gnomish.'
    );

    -- ─── 2024 PHB Dragonborn Ancestries ────────────────────────────
    -- 2024 collapsed Draconic Ancestry into the parent Dragonborn row
    -- with a player choice; subrace-style rows aren't standard, but
    -- some imports do split them. Patch the common ones with their
    -- breath weapon damage type.
    perform public._patch_subrace(t,
      'Black Dragonborn', 30, 'Medium',
      'Dragonborn resemble dragons standing erect in humanoid form.',
      '[]'::jsonb,
      $j$[
        {"name":"Breath Weapon (Acid)","desc":"You exhale destructive energy in a 5-foot-wide, 30-foot line. Each creature in the line must make a Dexterity save. On a failure, the target takes 1d10 acid damage."}
      ]$j$::jsonb,
      '["Common","Draconic"]'::jsonb,
      'You can speak, read, and write Common and Draconic.'
    );

    -- TIEFLING — Infernal Legacy
    perform public._patch_subrace(t,
      'Infernal Tiefling', 30, 'Medium',
      'Tieflings are about the same size and build as humans.',
      '[]'::jsonb,
      $j$[
        {"name":"Infernal Legacy","desc":"You know the thaumaturgy cantrip. At 3rd level, you can cast hellish rebuke once per long rest as a 2nd-level spell. At 5th level, you can cast darkness once per long rest. Charisma is your spellcasting ability."}
      ]$j$::jsonb,
      '["Common","Infernal"]'::jsonb,
      'You can speak, read, and write Common and Infernal.'
    );

    -- AASIMAR — Protector
    perform public._patch_subrace(t,
      'Protector Aasimar', 30, 'Medium',
      'Aasimar are descended from celestials and stand a bit taller than humans.',
      '[]'::jsonb,
      $j$[
        {"name":"Radiant Soul","desc":"Starting at 3rd level, you can use your action to unleash the divine energy within you, causing your eyes to glimmer and two luminous, incorporeal wings to sprout from your back. Your transformation lasts for 1 minute. During it, you have a flying speed of 30 feet, and once on each of your turns, you can deal extra radiant damage to one target when you deal damage to it with an attack or a spell. The extra radiant damage equals your level."}
      ]$j$::jsonb,
      '["Common","Celestial"]'::jsonb,
      'You can speak, read, and write Common and Celestial.'
    );
  end loop;
end $migrate$;

-- Cleanup the helper.
drop function if exists public._patch_subrace(regclass, text, integer, text, text, jsonb, jsonb, jsonb, text);
