-- Populate the 2024 PHB Origin backgrounds. The 2024 schema differs
-- from 2014:
--   ability_scores  jsonb — array of three ability codes
--   feat            jsonb — origin feat object
--   proficiencies   jsonb — skills + tool grants
--   equipment_options jsonb — "Choice A items" vs "50 gp" alternative
--
-- We also add a `description` text column so the panel can render
-- prose for these rows (matching the 2014 schema for consistency).

-- Add description column if it doesn't exist.
alter table public.srd2024_backgrounds
  add column if not exists description text;

create or replace function public._patch_2024_background(
  p_index text,
  p_name text,
  p_description text,
  p_ability_scores jsonb,
  p_feat jsonb,
  p_proficiencies jsonb,
  p_equipment_options jsonb
) returns void language plpgsql as $$
begin
  insert into public.srd2024_backgrounds (index, name)
    values (p_index, p_name)
    on conflict (index) do nothing;

  update public.srd2024_backgrounds set
    name = coalesce(nullif(name, ''), p_name),
    description = coalesce(nullif(description, ''), p_description),
    ability_scores = case
      when ability_scores is null or ability_scores = '[]'::jsonb
      then p_ability_scores else ability_scores end,
    feat = case when feat is null then p_feat else feat end,
    proficiencies = case
      when proficiencies is null or proficiencies = '[]'::jsonb
      then p_proficiencies else proficiencies end,
    equipment_options = case
      when equipment_options is null then p_equipment_options
      else equipment_options end
  where lower(index) = lower(p_index);
end;
$$;

-- 2024 PHB Origin Backgrounds — 16 entries.
-- Each grants: 3 ability score options (distribute +2/+1 or +1/+1/+1),
-- 2 skill profs, 1 tool prof, an origin feat, and equipment (gear set
-- OR 50 gp alternative).
--
-- Wrapped in a DO/BEGIN block so the function returning VOID is
-- consumed cleanly (top-level `select fn()` returning void can fail
-- in some Postgres clients with a misleading "relation X does not
-- exist" — PERFORM inside plpgsql avoids that pitfall).

do $migrate$
begin

perform public._patch_2024_background(
  'acolyte', 'Acolyte',
  'You devoted yourself to service in a temple, either nestled in a town or secluded in a sacred grove. There you performed rites in honor of a god or pantheon. You served under a priest and studied religion. Thanks to your priestly mentor and your own devotion, you also learned to channel a modicum of divine power in service to your place of worship and the people who prayed there.',
  '["int","wis","cha"]'::jsonb,
  '{"index":"magic-initiate-cleric","name":"Magic Initiate (Cleric)"}'::jsonb,
  $j$[
    {"type":"skill","name":"Insight"},
    {"type":"skill","name":"Religion"},
    {"type":"tool","name":"Calligrapher''s Supplies"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Calligrapher''s Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe of common clothing, 8 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'artisan', 'Artisan',
  'You began mopping floors and scrubbing counters in an artisan''s workshop for a few coppers per day as soon as you were strong enough to carry a bucket. When you were old enough to apprentice, you learned to create basic crafts of your own as well as how to sweet-talk the occasional demanding customer.',
  '["str","dex","int"]'::jsonb,
  '{"index":"crafter","name":"Crafter"}'::jsonb,
  $j$[
    {"type":"skill","name":"Investigation"},
    {"type":"skill","name":"Persuasion"},
    {"type":"tool","name":"Artisan''s Tools"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Artisan''s Tools (one of your choice), 2 pouches, Traveler''s Clothes, 32 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'charlatan', 'Charlatan',
  'You have always had a way with people, knowing exactly what to say to leave them eating out of your palm. You picked up the tricks of professional confidence artists by working for one, learning the trade quickly enough that you avoided punishment for too many mistakes.',
  '["dex","con","cha"]'::jsonb,
  '{"index":"skilled","name":"Skilled"}'::jsonb,
  $j$[
    {"type":"skill","name":"Deception"},
    {"type":"skill","name":"Sleight of Hand"},
    {"type":"tool","name":"Forgery Kit"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Forgery Kit, Costume, Fine Clothes, 15 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'criminal', 'Criminal',
  'You eked out a living in dark alleyways, cutting purses or burgling shops. Perhaps you were part of a small gang of like-minded wrongdoers who looked out for each other. Or maybe you were a lone wolf, fending for yourself against the local thieves'' guild and older, more-experienced criminals.',
  '["dex","con","int"]'::jsonb,
  '{"index":"alert","name":"Alert"}'::jsonb,
  $j$[
    {"type":"skill","name":"Sleight of Hand"},
    {"type":"skill","name":"Stealth"},
    {"type":"tool","name":"Thieves'' Tools"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"2 Daggers, Thieves'' Tools, Crowbar, dark common clothes including hood, 16 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'entertainer', 'Entertainer',
  'You spent much of your youth following roving fairs and carnivals, performing odd jobs for musicians and acrobats in exchange for lessons. You may have learned how to tumble from former circus performers, how to play instruments from wandering bards, or how to recite poetry from traveling actors.',
  '["str","dex","cha"]'::jsonb,
  '{"index":"musician","name":"Musician"}'::jsonb,
  $j$[
    {"type":"skill","name":"Acrobatics"},
    {"type":"skill","name":"Performance"},
    {"type":"tool","name":"Musical Instrument"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Musical Instrument (one of your choice), Costume, 2 Musical Instruments, 11 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'farmer', 'Farmer',
  'You grew up close to the land. Years tending animals and cultivating the earth rewarded you with patience and good health. You have a keen appreciation of nature''s bounty alongside a healthy respect for nature''s wrath.',
  '["str","con","wis"]'::jsonb,
  '{"index":"tough","name":"Tough"}'::jsonb,
  $j$[
    {"type":"skill","name":"Animal Handling"},
    {"type":"skill","name":"Nature"},
    {"type":"tool","name":"Carpenter''s Tools"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Carpenter''s Tools, Healer''s Kit, Iron Pot, Shovel, Traveler''s Clothes, 30 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'guard', 'Guard',
  'You stood watch over high castle walls or among the trees of treacherous forest passes, fending off threats to civilization. The bonds you formed with fellow guards have proven as strong as steel, and you''re ready to apply your courage and skill to challenges beyond the boundaries of your former post.',
  '["str","int","wis"]'::jsonb,
  '{"index":"alert","name":"Alert"}'::jsonb,
  $j$[
    {"type":"skill","name":"Athletics"},
    {"type":"skill","name":"Perception"},
    {"type":"tool","name":"Gaming Set"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Spear, Light Crossbow, 20 Bolts, Gaming Set, Hooded Lantern, Manacles, Traveler''s Clothes, 12 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'guide', 'Guide',
  'You came of age in the outdoors, far from the comforts of town and city. You''ve witnessed nature''s splendor, weathered its storms, and learned to live in cooperation with the wild. Trappers, foragers, or outcasts might have been your companions, teaching you to survive in the wilderness and revere it.',
  '["dex","con","wis"]'::jsonb,
  '{"index":"magic-initiate-druid","name":"Magic Initiate (Druid)"}'::jsonb,
  $j$[
    {"type":"skill","name":"Stealth"},
    {"type":"skill","name":"Survival"},
    {"type":"tool","name":"Cartographer''s Tools"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Cartographer''s Tools, Traveler''s Clothes, Bedroll, Tent, 3 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'hermit', 'Hermit',
  'You spent your early years secluded in a hut or monastery located far from the bustle of city life. In those days, your only companions were the creatures of field and forest and perhaps a few fellow recluses. The solitude allowed you to spend many hours pondering the mysteries of creation.',
  '["con","wis","cha"]'::jsonb,
  '{"index":"healer","name":"Healer"}'::jsonb,
  $j$[
    {"type":"skill","name":"Medicine"},
    {"type":"skill","name":"Religion"},
    {"type":"tool","name":"Herbalism Kit"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Quarterstaff, Herbalism Kit, Bedroll, Lamp, Oil flask (3), Scroll Case stuffed with notes, Traveler''s Clothes, 16 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'merchant', 'Merchant',
  'You were apprenticed to a trader, caravan master, or shopkeeper, learning the fundamentals of commerce. You traveled broadly, and you''ve gained a working knowledge of many lands, peoples, and the value of their goods.',
  '["con","int","cha"]'::jsonb,
  '{"index":"lucky","name":"Lucky"}'::jsonb,
  $j$[
    {"type":"skill","name":"Animal Handling"},
    {"type":"skill","name":"Persuasion"},
    {"type":"tool","name":"Navigator''s Tools"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Navigator''s Tools, 2 Pouches, Traveler''s Clothes, 22 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'noble', 'Noble',
  'You were raised in a castle, surrounded by wealth, power, and privilege. Your family of minor aristocrats ensured that you received a first-rate education, some of which you appreciated and some of which you resented.',
  '["str","int","cha"]'::jsonb,
  '{"index":"skilled","name":"Skilled"}'::jsonb,
  $j$[
    {"type":"skill","name":"History"},
    {"type":"skill","name":"Persuasion"},
    {"type":"tool","name":"Gaming Set"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Gaming Set, Fine Clothes, Signet Ring, scroll of Pedigree, 29 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'sage', 'Sage',
  'You spent your formative years in libraries and the company of scholars, learning to read, write, and study the world. You may have been a librarian or research assistant in an academy, a wizard''s apprentice, or a young scribe transcribing ancient tomes.',
  '["con","int","wis"]'::jsonb,
  '{"index":"magic-initiate-wizard","name":"Magic Initiate (Wizard)"}'::jsonb,
  $j$[
    {"type":"skill","name":"Arcana"},
    {"type":"skill","name":"History"},
    {"type":"tool","name":"Calligrapher''s Supplies"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Quarterstaff, Calligrapher''s Supplies, Book (history), Parchment (8 sheets), Robe of common clothing, 8 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'sailor', 'Sailor',
  'You spent your formative years living on a sailing ship that visited ports far and wide. The skills you picked up on that vessel — minding rigging, weathering rough seas, brawling with rival sailors — come in handy in your new life of adventure.',
  '["str","dex","wis"]'::jsonb,
  '{"index":"tavern-brawler","name":"Tavern Brawler"}'::jsonb,
  $j$[
    {"type":"skill","name":"Acrobatics"},
    {"type":"skill","name":"Perception"},
    {"type":"tool","name":"Navigator''s Tools"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Dagger, Navigator''s Tools, Rope (50 ft), Traveler''s Clothes, 20 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'scribe', 'Scribe',
  'You apprenticed to a scrivener, scholar, or monastery, learning to record and copy texts. You may have helped to transcribe ledgers, religious works, or legal documents — a routine but valuable craft.',
  '["dex","int","wis"]'::jsonb,
  '{"index":"skilled","name":"Skilled"}'::jsonb,
  $j$[
    {"type":"skill","name":"Investigation"},
    {"type":"skill","name":"Perception"},
    {"type":"tool","name":"Calligrapher''s Supplies"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Calligrapher''s Supplies, Parchment (12 sheets), Fine Clothes, Lamp, Oil flask, 23 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'soldier', 'Soldier',
  'Your training for war began when you were young. You enlisted or were conscripted into a militia, mercenary company, or formal army, and your time there taught you about weapons, armor, and the brutal realities of battle.',
  '["str","dex","con"]'::jsonb,
  '{"index":"savage-attacker","name":"Savage Attacker"}'::jsonb,
  $j$[
    {"type":"skill","name":"Athletics"},
    {"type":"skill","name":"Intimidation"},
    {"type":"tool","name":"Gaming Set"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"Spear, Shortbow, 20 Arrows, Gaming Set, Healer''s Kit, Traveler''s Clothes, 14 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

perform public._patch_2024_background(
  'wayfarer', 'Wayfarer',
  'You grew up on the streets, surrounded by similar misfortunates — some of them friends and some hostile rivals. You slept where you could, often beside trash heaps or beneath bridges. You begged or stole to survive.',
  '["dex","wis","cha"]'::jsonb,
  '{"index":"lucky","name":"Lucky"}'::jsonb,
  $j$[
    {"type":"skill","name":"Insight"},
    {"type":"skill","name":"Stealth"},
    {"type":"tool","name":"Thieves'' Tools"}
  ]$j$::jsonb,
  $j$[
    {"label":"Gear","items":"2 Daggers, Thieves'' Tools, Gaming Set, 2 Pouches, Traveler''s Clothes, 16 GP"},
    {"label":"Gold","items":"50 GP"}
  ]$j$::jsonb
);

end;
$migrate$;

drop function public._patch_2024_background(text, text, text, jsonb, jsonb, jsonb, jsonb);
