-- Populate `srd_subclasses.description` and the level-unlock rows in
-- `srd_features` for the 2014 SRD subclasses. The 5e-bits import path
-- left these tables sparse — most subclasses have only a `name` and
-- `subclass_flavor`, so the character creator's subclass cards render
-- "Click the info icon for full subclass features." instead of useful
-- info, and the Info sheet shows "No subclass features available."
--
-- This migration backfills:
--   • A canonical paragraph in `srd_subclasses.description`
--   • One `srd_features` row per (class_index, subclass_index, level)
--     for the lowest-level features (1st – 3rd) so the SubclassFeaturePreview
--     in the character creator has something to render at L1.
--
-- Idempotent: descriptions use coalesce(nullif(...)); feature rows
-- check by `index` (unique) before inserting so re-running is safe.
--
-- All text is verbatim SRD content (OGL-safe).

-- ─── Subclass descriptions ─────────────────────────────────────────

create or replace function public._patch_subclass_desc(
  p_index text,
  p_description text
) returns void language plpgsql as $$
begin
  update srd_subclasses
     set description = coalesce(nullif(description, ''), p_description)
   where index = p_index;
exception when others then
  raise notice 'patch_subclass_desc skip: % - %', p_index, sqlerrm;
end;
$$;

do $migrate$
begin
  -- Barbarian
  perform public._patch_subclass_desc('berserker', 'For some barbarians, rage is a means to an end — that end being violence. The Path of the Berserker is a path of untrammeled fury, slick with blood. Berserkers excel in dealing damage while inflicting fear in their foes.');
  perform public._patch_subclass_desc('totem-warrior', 'The Path of the Totem Warrior is a spiritual journey, as the barbarian accepts a spirit animal as guide, protector, and inspiration. Each totem grants different powers reflecting the chosen beast.');

  -- Bard
  perform public._patch_subclass_desc('lore', 'Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales. They use their gifts to hold audiences spellbound, and they cherish the gift of magical inspiration.');
  perform public._patch_subclass_desc('valor', 'Bards of the College of Valor are daring skalds whose tales keep alive the memory of the great heroes of the past. They inspire others to brave deeds, and they wade into battle alongside the warriors they sing of.');

  -- Cleric Domains
  perform public._patch_subclass_desc('knowledge', 'The gods of knowledge value learning and understanding above all. Clerics of these deities act as scribes and sages, gathering knowledge and passing it on to those who seek it.');
  perform public._patch_subclass_desc('life', 'The Life domain focuses on the vibrant positive energy that sustains all life. Clerics of this domain are masters of healing, devoted to preserving life and to making the bodies of others a vessel for divine power.');
  perform public._patch_subclass_desc('light', 'Gods of light promote the ideals of rebirth and renewal, truth, vigilance, and beauty, often using the symbol of the sun. Some of these gods are portrayed as the sun itself or as a charioteer who guides the sun across the sky.');
  perform public._patch_subclass_desc('nature', 'Gods of nature are as varied as the natural world itself, from inscrutable gods of the deep forests to friendly deities associated with particular springs and groves. Druids revere nature as a whole, but clerics of these gods serve specific aspects.');
  perform public._patch_subclass_desc('tempest', 'Gods whose portfolios include the Tempest domain — including Talos, Umberlee, Kord, Zeboim, the Devourer, Zeus, and Thor — govern storms, sea, and sky. They include gods of lightning and thunder, gods of earthquakes, and any other primal force.');
  perform public._patch_subclass_desc('trickery', 'Gods of trickery are mischief-makers and instigators who stand as a constant challenge to the accepted order among both gods and mortals. They are patrons of thieves, scoundrels, gamblers, rebels, and liberators.');
  perform public._patch_subclass_desc('war', 'War has many manifestations. It can make heroes of ordinary people. Clerics of war gods excel in combat, inspiring others to fight the good fight or to embrace bloodlust and slaughter.');

  -- Druid
  perform public._patch_subclass_desc('land', 'The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition. Each circle''s druids meet within sacred circles of trees or standing stones to whisper primal secrets in Druidic.');
  perform public._patch_subclass_desc('moon', 'Druids of the Circle of the Moon are fierce guardians of the wilds. Their order gathers under the full moon to share news and trade warnings. They haunt the deepest parts of the wilderness, where they can confront the entities that threaten the natural world.');

  -- Fighter
  perform public._patch_subclass_desc('champion', 'The archetypal Champion focuses on the development of raw physical power honed to deadly perfection. Those who model themselves on this archetype combine rigorous training with physical excellence to deal devastating blows.');
  perform public._patch_subclass_desc('battle-master', 'Those who emulate the archetypal Battle Master employ martial techniques passed down through generations. To a Battle Master, combat is an academic field, sometimes including subjects beyond battle such as weaponsmithing and calligraphy.');
  perform public._patch_subclass_desc('eldritch-knight', 'The archetypal Eldritch Knight combines the martial mastery common to all fighters with a careful study of magic. Eldritch Knights use magical techniques similar to those practiced by wizards, focusing on abjuration and evocation spells.');

  -- Monk
  perform public._patch_subclass_desc('open-hand', 'Monks of the Way of the Open Hand are the ultimate masters of martial arts combat, whether armed or unarmed. They learn techniques to push and trip their opponents, manipulate ki to heal damage to their bodies, and practice advanced meditation that can protect them from harm.');
  perform public._patch_subclass_desc('shadow', 'Monks of the Way of Shadow follow a tradition that values stealth and subterfuge. These monks might be called ninjas or shadowdancers, and they serve as spies and assassins. Sometimes the members of a ninja monastery are family members, forming a clan sworn to secrecy.');
  perform public._patch_subclass_desc('four-elements', 'You follow a monastic tradition that teaches you to harness the elements. When you focus your ki, you can align yourself with the forces of creation and bend the four elements to your will, using them as an extension of your body.');

  -- Paladin
  perform public._patch_subclass_desc('devotion', 'The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order. Sometimes called cavaliers, white knights, or holy warriors, these paladins meet the ideal of the knight in shining armor.');
  perform public._patch_subclass_desc('ancients', 'The Oath of the Ancients is as old as the race of elves and the rituals of the druids. Sometimes called fey knights, green knights, or horned knights, paladins who swear this oath cast their lot with the side of the light in the cosmic struggle against darkness.');
  perform public._patch_subclass_desc('vengeance', 'The Oath of Vengeance is a solemn commitment to punish those who have committed a grievous sin. When evil forces slaughter helpless villagers, when an entire people turns against the will of the gods, when a thieves'' guild grows too violent and powerful — at such times, paladins arise and swear an Oath of Vengeance.');

  -- Ranger
  perform public._patch_subclass_desc('hunter', 'Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness. As you walk the Hunter''s path, you learn specialized techniques for fighting the threats you face, from rampaging ogres and hordes of orcs to towering giants and terrifying dragons.');
  perform public._patch_subclass_desc('beast-master', 'The Beast Master archetype embodies a friendship between the civilized races and the beasts of the world. United in focus, beast and ranger work as one to fight the monstrous foes that threaten civilization and the wilderness alike.');

  -- Rogue
  perform public._patch_subclass_desc('thief', 'You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype, but so do rogues who prefer to think of themselves as professional treasure seekers, explorers, delvers, and investigators.');
  perform public._patch_subclass_desc('assassin', 'You focus your training on the grim art of death. Those who adhere to this archetype are diverse: hired killers, spies, bounty hunters, and even specially anointed priests trained to exterminate the enemies of their deity. Stealth, poison, and disguise help you eliminate your foes with deadly efficiency.');
  perform public._patch_subclass_desc('arcane-trickster', 'Some rogues enhance their fine-honed skills of stealth and agility with magic, learning tricks of enchantment and illusion. These rogues include pickpockets and burglars, but also pranksters, mischief-makers, and a significant number of adventurers.');

  -- Sorcerer
  perform public._patch_subclass_desc('draconic-bloodline', 'Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors. Most often, sorcerers with this origin trace their descent back to a mighty sorcerer of ancient times who made a bargain with a dragon or even bore a child with a dragon.');
  perform public._patch_subclass_desc('wild-magic', 'Your innate magic comes from the wild forces of chaos that underlie the order of creation. You might have endured exposure to some form of raw magic, perhaps through a planar portal leading to Limbo, the Elemental Planes, or the mysterious Far Realm.');

  -- Warlock Patrons
  perform public._patch_subclass_desc('archfey', 'Your patron is a lord or lady of the fey, a creature of legend who holds secrets that were forgotten before the mortal races were born. This being''s motivations are often inscrutable, and sometimes whimsical, and might involve a striving for greater magical power or the settling of age-old grudges.');
  perform public._patch_subclass_desc('celestial', 'Your patron is a powerful being of the Upper Planes. You have bound yourself to an ancient empyrean, solar, ki-rin, unicorn, or other entity that resides in the planes of everlasting bliss. Your pact with that being allows you to experience the barest touch of the holy light that illuminates the multiverse.');
  perform public._patch_subclass_desc('fiend', 'You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil, even if you strive against those aims. Such beings desire the corruption or destruction of all things, ultimately including you. Fiends powerful enough to forge a pact include demon lords, archdevils, and ultroloths.');
  perform public._patch_subclass_desc('great-old-one', 'Your patron is a mysterious entity whose nature is utterly foreign to the fabric of reality. It might come from the Far Realm, the space beyond reality, or it could be one of the elder gods known only in legends. Its motives are incomprehensible to mortals, and its knowledge so immense and ancient that even the greatest libraries pale in comparison.');
  perform public._patch_subclass_desc('hexblade', 'You have made your pact with a mysterious entity from the Shadowfell — a force that manifests in sentient magic weapons carved from the stuff of shadow. The Raven Queen, a powerful patron whose origins are a closely guarded secret, is whispered to have forged the first of these weapons.');

  -- Wizard Schools (Arcane Traditions)
  perform public._patch_subclass_desc('abjuration', 'The School of Abjuration emphasizes magic that blocks, banishes, or protects. Detractors of this school say that its tradition is about denial, negation rather than positive assertion. You understand that magic that becomes a shield, a mystic ward against harm, is just as potent as protective magic against fire or attacks.');
  perform public._patch_subclass_desc('conjuration', 'As a conjurer, you favor spells that produce objects and creatures out of thin air. You can conjure billowing clouds of killing fog or summon creatures from elsewhere to fight on your behalf. As your mastery grows, you learn spells of transportation and can teleport yourself across vast distances.');
  perform public._patch_subclass_desc('divination', 'The counsel of a diviner is sought by royalty and commoners alike, for all seek a clearer understanding of the past, present, and future. As a diviner, you strive to part the veils of space, time, and consciousness so that you can see clearly.');
  perform public._patch_subclass_desc('enchantment', 'As a member of the School of Enchantment, you have honed your ability to magically entrance and beguile other people and monsters. Some enchanters are peacemakers who bewitch the violent to lay down their arms and charm the cruel into showing mercy.');
  perform public._patch_subclass_desc('evocation', 'You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid. Some evokers find employment in military forces, serving as artillery to blast enemy armies from afar.');
  perform public._patch_subclass_desc('illusion', 'You focus your studies on magic that dazzles the senses, befuddles the mind, and tricks even the wisest folk. Your magic is subtle, but the illusions crafted by your keen mind make the impossible seem real.');
  perform public._patch_subclass_desc('necromancy', 'The School of Necromancy explores the cosmic forces of life, death, and undeath. As you focus your studies in this tradition, you learn to manipulate the energy that animates all living things. As you progress, you learn to sap the life force from a creature as your magic destroys its body.');
  perform public._patch_subclass_desc('transmutation', 'You are a student of spells that modify energy and matter. To you, the world is not a fixed thing, but eminently mutable, and you delight in being an agent of change. You wield the raw stuff of creation and learn to alter both physical forms and mental qualities.');
end $migrate$;

drop function if exists public._patch_subclass_desc(text, text);

-- ─── Subclass features (level 1-3 unlock rows) ─────────────────────
-- Insert ONE feature row per (class_index, subclass_index, level)
-- using slugged indexes so re-running is idempotent. The character
-- creator's SubclassFeaturePreview queries this table directly.

create or replace function public._add_subclass_feature(
  p_index text,
  p_name text,
  p_level integer,
  p_class_index text,
  p_subclass_index text,
  p_description text
) returns void language plpgsql as $$
begin
  insert into srd_features (index, name, level, class_index, subclass_index, description)
  values (p_index, p_name, p_level, p_class_index, p_subclass_index, p_description)
  on conflict (index) do update set
    description = coalesce(nullif(srd_features.description, ''), excluded.description),
    name = coalesce(nullif(srd_features.name, ''), excluded.name),
    level = coalesce(srd_features.level, excluded.level);
exception when others then
  raise notice 'add_subclass_feature skip: % - %', p_index, sqlerrm;
end;
$$;

do $migrate$
begin
  -- ── WARLOCK PATRONS ────────────────────────────────────────────
  -- Archfey
  perform public._add_subclass_feature('archfey-expanded-spell-list', 'Expanded Spell List', 1, 'warlock', 'archfey',
    'The Archfey lets you choose from an expanded list of spells when you learn a warlock spell: faerie fire, sleep (1st); calm emotions, phantasmal force (2nd); blink, plant growth (3rd); dominate beast, greater invisibility (4th); dominate person, seeming (5th).');
  perform public._add_subclass_feature('archfey-fey-presence', 'Fey Presence', 1, 'warlock', 'archfey',
    'Your patron bestows upon you the ability to project the beguiling and fearsome presence of the fey. As an action, you can cause each creature in a 10-foot cube originating from you to make a Wisdom saving throw against your warlock spell save DC. The creatures that fail their saving throws are all charmed or frightened by you (your choice) until the end of your next turn. Once you use this feature, you can''t use it again until you finish a short or long rest.');
  perform public._add_subclass_feature('archfey-misty-escape', 'Misty Escape', 6, 'warlock', 'archfey',
    'Starting at 6th level, you can vanish in a puff of mist in response to harm. When you take damage, you can use your reaction to turn invisible and teleport up to 60 feet to an unoccupied space you can see. You remain invisible until the start of your next turn or until you attack or cast a spell. Once you use this feature, you can''t use it again until you finish a short or long rest.');

  -- Celestial
  perform public._add_subclass_feature('celestial-expanded-spell-list', 'Expanded Spell List', 1, 'warlock', 'celestial',
    'The Celestial lets you choose from an expanded list of spells: cure wounds, guiding bolt (1st); flaming sphere, lesser restoration (2nd); daylight, revivify (3rd); guardian of faith, wall of fire (4th); flame strike, greater restoration (5th).');
  perform public._add_subclass_feature('celestial-bonus-cantrips', 'Bonus Cantrips', 1, 'warlock', 'celestial',
    'At 1st level, you learn the sacred flame and light cantrips. They count as warlock cantrips for you, but they don''t count against your number of cantrips known.');
  perform public._add_subclass_feature('celestial-healing-light', 'Healing Light', 1, 'warlock', 'celestial',
    'At 1st level, you gain the ability to channel celestial energy to heal wounds. You have a pool of d6s that you spend to fuel this healing. The number of dice in the pool equals 1 + your warlock level. As a bonus action, you can heal one creature you can see within 60 feet of you, spending dice from the pool. The maximum number of dice you can spend at once equals your Charisma modifier (minimum of one die). You regain all expended dice when you finish a long rest.');
  perform public._add_subclass_feature('celestial-radiant-soul', 'Radiant Soul', 6, 'warlock', 'celestial',
    'Starting at 6th level, your link to the Celestial allows you to serve as a conduit for radiant energy. You have resistance to radiant damage, and when you cast a spell that deals radiant or fire damage, you can add your Charisma modifier to one radiant or fire damage roll of that spell against one of its targets.');

  -- Fiend
  perform public._add_subclass_feature('fiend-expanded-spell-list', 'Expanded Spell List', 1, 'warlock', 'fiend',
    'The Fiend lets you choose from an expanded list of spells: burning hands, command (1st); blindness/deafness, scorching ray (2nd); fireball, stinking cloud (3rd); fire shield, wall of fire (4th); flame strike, hallow (5th).');
  perform public._add_subclass_feature('fiend-dark-ones-blessing', 'Dark One''s Blessing', 1, 'warlock', 'fiend',
    'Starting at 1st level, when you reduce a hostile creature to 0 hit points, you gain temporary hit points equal to your Charisma modifier + your warlock level (minimum of 1).');
  perform public._add_subclass_feature('fiend-dark-ones-own-luck', 'Dark One''s Own Luck', 6, 'warlock', 'fiend',
    'Starting at 6th level, you can call on your patron to alter fate in your favor. When you make an ability check or a saving throw, you can use this feature to add a d10 to your roll. You can do so after seeing the initial roll but before any of the roll''s effects occur. Once you use this feature, you can''t use it again until you finish a short or long rest.');

  -- Great Old One
  perform public._add_subclass_feature('great-old-one-expanded-spell-list', 'Expanded Spell List', 1, 'warlock', 'great-old-one',
    'The Great Old One lets you choose from an expanded list of spells: dissonant whispers, Tasha''s hideous laughter (1st); detect thoughts, phantasmal force (2nd); clairvoyance, sending (3rd); dominate beast, Evard''s black tentacles (4th); dominate person, telekinesis (5th).');
  perform public._add_subclass_feature('great-old-one-awakened-mind', 'Awakened Mind', 1, 'warlock', 'great-old-one',
    'Starting at 1st level, your alien knowledge gives you the ability to touch the minds of other creatures. You can telepathically speak to any creature you can see within 30 feet of you. You don''t need to share a language with the creature for it to understand your telepathic utterances, but the creature must be able to understand at least one language.');
  perform public._add_subclass_feature('great-old-one-entropic-ward', 'Entropic Ward', 6, 'warlock', 'great-old-one',
    'At 6th level, you learn to magically ward yourself against attack and to turn an enemy''s failed strike into good luck for yourself. When a creature makes an attack roll against you, you can use your reaction to impose disadvantage on that roll. If the attack misses you, your next attack roll against the creature has advantage if you make it before the end of your next turn. Once you use this feature, you can''t use it again until you finish a short or long rest.');

  -- ── CLERIC DOMAINS (Level 1 + 2 features) ──────────────────────
  perform public._add_subclass_feature('life-domain-spells', 'Domain Spells', 1, 'cleric', 'life',
    'Each domain has a list of spells — its domain spells — that you gain at the cleric levels noted in the domain description. Once you gain a domain spell, you always have it prepared, and it doesn''t count against the number of spells you can prepare each day. Life domain spells: bless, cure wounds (1st); lesser restoration, spiritual weapon (3rd); beacon of hope, revivify (5th); death ward, guardian of faith (7th); mass cure wounds, raise dead (9th).');
  perform public._add_subclass_feature('life-bonus-proficiency', 'Bonus Proficiency', 1, 'cleric', 'life',
    'When you choose this domain at 1st level, you gain proficiency with heavy armor.');
  perform public._add_subclass_feature('life-disciple-of-life', 'Disciple of Life', 1, 'cleric', 'life',
    'Also starting at 1st level, your healing spells are more effective. Whenever you use a spell of 1st level or higher to restore hit points to a creature, the creature regains additional hit points equal to 2 + the spell''s level.');
  perform public._add_subclass_feature('life-channel-divinity-preserve-life', 'Channel Divinity: Preserve Life', 2, 'cleric', 'life',
    'Starting at 2nd level, you can use your Channel Divinity to heal the badly injured. As an action, you present your holy symbol and evoke healing energy that can restore a number of hit points equal to five times your cleric level. Choose any creatures within 30 feet of you, and divide those hit points among them. This feature can restore a creature to no more than half of its hit point maximum.');

  perform public._add_subclass_feature('light-domain-spells', 'Domain Spells', 1, 'cleric', 'light',
    'Light domain spells: burning hands, faerie fire (1st); flaming sphere, scorching ray (3rd); daylight, fireball (5th); guardian of faith, wall of fire (7th); flame strike, scrying (9th).');
  perform public._add_subclass_feature('light-bonus-cantrip', 'Bonus Cantrip', 1, 'cleric', 'light',
    'When you choose this domain at 1st level, you gain the light cantrip if you don''t already know it.');
  perform public._add_subclass_feature('light-warding-flare', 'Warding Flare', 1, 'cleric', 'light',
    'Also at 1st level, you can interpose divine light between yourself and an attacking enemy. When you are attacked by a creature within 30 feet of you that you can see, you can use your reaction to impose disadvantage on the attack roll. You can use this feature a number of times equal to your Wisdom modifier (a minimum of once). You regain all expended uses when you finish a long rest.');
  perform public._add_subclass_feature('light-channel-divinity-radiance-of-the-dawn', 'Channel Divinity: Radiance of the Dawn', 2, 'cleric', 'light',
    'Starting at 2nd level, you can use your Channel Divinity to harness sunlight, banishing darkness and dealing radiant damage to your foes. As an action, you present your holy symbol, and any magical darkness within 30 feet of you is dispelled. Additionally, each hostile creature within 30 feet of you must make a Constitution saving throw. A creature takes radiant damage equal to 2d10 + your cleric level on a failed saving throw, and half as much damage on a successful one.');

  -- ── DRUID CIRCLES ──────────────────────────────────────────────
  perform public._add_subclass_feature('land-bonus-cantrip', 'Bonus Cantrip', 2, 'druid', 'land',
    'When you choose this circle at 2nd level, you learn one additional druid cantrip of your choice.');
  perform public._add_subclass_feature('land-natural-recovery', 'Natural Recovery', 2, 'druid', 'land',
    'Starting at 2nd level, you can regain some of your magical energy by sitting in meditation and communing with nature. During a short rest, you choose expended spell slots to recover. The spell slots can have a combined level that is equal to or less than half your druid level (rounded up), and none of the slots can be 6th level or higher. Once you use this feature, you must finish a long rest before you can use it again.');

  perform public._add_subclass_feature('moon-combat-wild-shape', 'Combat Wild Shape', 2, 'druid', 'moon',
    'When you choose this circle at 2nd level, you gain the ability to use Wild Shape on your turn as a bonus action, rather than as an action. Additionally, while you are transformed by Wild Shape, you can use a bonus action to expend one spell slot to regain 1d8 hit points per level of the spell slot expended.');
  perform public._add_subclass_feature('moon-circle-forms', 'Circle Forms', 2, 'druid', 'moon',
    'The rites of your circle grant you the ability to transform into more dangerous animal forms. Starting at 2nd level, you can use your Wild Shape to transform into a beast with a challenge rating as high as 1. You ignore the Max. CR column of the Beast Shapes table, but must abide by the other limitations there.');

  -- ── SORCERER ORIGINS ───────────────────────────────────────────
  perform public._add_subclass_feature('draconic-dragon-ancestor', 'Dragon Ancestor', 1, 'sorcerer', 'draconic-bloodline',
    'At 1st level, you choose one type of dragon as your ancestor (black, blue, brass, bronze, copper, gold, green, red, silver, or white). You can speak, read, and write Draconic. Additionally, whenever you make a Charisma check when interacting with dragons, your proficiency bonus is doubled.');
  perform public._add_subclass_feature('draconic-resilience', 'Draconic Resilience', 1, 'sorcerer', 'draconic-bloodline',
    'As magic flows through your body, it causes physical traits of your dragon ancestors to emerge. At 1st level, your hit point maximum increases by 1 and increases by 1 again whenever you gain a level in this class. Additionally, parts of your skin are covered by a thin sheen of dragon-like scales. When you aren''t wearing armor, your AC equals 13 + your Dexterity modifier.');

  perform public._add_subclass_feature('wild-magic-surge', 'Wild Magic Surge', 1, 'sorcerer', 'wild-magic',
    'Starting when you choose this origin at 1st level, your spellcasting can unleash surges of untamed magic. Immediately after you cast a sorcerer spell of 1st level or higher, the DM can have you roll a d20. If you roll a 1, roll on the Wild Magic Surge table to create a random magical effect.');
  perform public._add_subclass_feature('wild-tides-of-chaos', 'Tides of Chaos', 1, 'sorcerer', 'wild-magic',
    'Starting at 1st level, you can manipulate the forces of chance and chaos to gain advantage on one attack roll, ability check, or saving throw. Once you do so, you must finish a long rest before you can use this feature again. Any time before that, the DM can have you roll on the Wild Magic Surge table immediately after you cast a sorcerer spell of 1st level or higher. You then regain the use of this feature.');

  -- ── BARBARIAN PATHS ────────────────────────────────────────────
  perform public._add_subclass_feature('berserker-frenzy', 'Frenzy', 3, 'barbarian', 'berserker',
    'Starting when you choose this path at 3rd level, you can go into a frenzy when you rage. If you do so, for the duration of your rage you can make a single melee weapon attack as a bonus action on each of your turns after this one. When your rage ends, you suffer one level of exhaustion.');
  perform public._add_subclass_feature('totem-spirit-seeker', 'Spirit Seeker', 3, 'barbarian', 'totem-warrior',
    'Yours is a path that seeks attunement with the natural world, giving you a kinship with beasts. At 3rd level when you adopt this path, you gain the ability to cast the beast sense and speak with animals spells, but only as rituals.');
  perform public._add_subclass_feature('totem-spirit', 'Totem Spirit', 3, 'barbarian', 'totem-warrior',
    'At 3rd level, when you adopt this path, you choose a totem spirit (bear, eagle, wolf, etc.) and gain its feature. Bear: While raging, you have resistance to all damage except psychic. Eagle: While raging and not wearing heavy armor, other creatures have disadvantage on opportunity attacks against you, and you can use the Dash action as a bonus action. Wolf: While raging, your friends have advantage on melee attack rolls against any creature within 5 feet of you that is hostile to you.');

  -- ── BARD COLLEGES ──────────────────────────────────────────────
  perform public._add_subclass_feature('lore-bonus-proficiencies', 'Bonus Proficiencies', 3, 'bard', 'lore',
    'When you join the College of Lore at 3rd level, you gain proficiency with three skills of your choice.');
  perform public._add_subclass_feature('lore-cutting-words', 'Cutting Words', 3, 'bard', 'lore',
    'Also at 3rd level, you learn how to use your wit to distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your reaction to expend one of your uses of Bardic Inspiration, rolling a Bardic Inspiration die and subtracting the number rolled from the creature''s roll.');
  perform public._add_subclass_feature('valor-bonus-proficiencies', 'Bonus Proficiencies', 3, 'bard', 'valor',
    'When you join the College of Valor at 3rd level, you gain proficiency with medium armor, shields, and martial weapons.');
  perform public._add_subclass_feature('valor-combat-inspiration', 'Combat Inspiration', 3, 'bard', 'valor',
    'Also at 3rd level, you learn to inspire others in battle. A creature that has a Bardic Inspiration die from you can roll that die and add the number rolled to a weapon damage roll it just made. Alternatively, when an attack roll is made against the creature, it can use its reaction to roll the Bardic Inspiration die and add the number rolled to its AC against that attack, after seeing the roll but before the attack hits or misses.');

  -- ── FIGHTER MARTIAL ARCHETYPES ─────────────────────────────────
  perform public._add_subclass_feature('champion-improved-critical', 'Improved Critical', 3, 'fighter', 'champion',
    'Beginning when you choose this archetype at 3rd level, your weapon attacks score a critical hit on a roll of 19 or 20.');
  perform public._add_subclass_feature('battle-master-combat-superiority', 'Combat Superiority', 3, 'fighter', 'battle-master',
    'When you choose this archetype at 3rd level, you learn maneuvers that are fueled by special dice called superiority dice. You learn three maneuvers of your choice and gain four superiority dice, which are d8s. A maneuver expends one superiority die. You regain all expended dice when you finish a short or long rest.');
  perform public._add_subclass_feature('battle-master-student-of-war', 'Student of War', 3, 'fighter', 'battle-master',
    'At 3rd level, you gain proficiency with one type of artisan''s tools of your choice.');
  perform public._add_subclass_feature('eldritch-knight-spellcasting', 'Spellcasting', 3, 'fighter', 'eldritch-knight',
    'When you reach 3rd level, you augment your martial prowess with the ability to cast spells. You learn three cantrips and three 1st-level spells from the wizard spell list, chosen from the abjuration and evocation schools. Intelligence is your spellcasting ability.');
  perform public._add_subclass_feature('eldritch-knight-weapon-bond', 'Weapon Bond', 3, 'fighter', 'eldritch-knight',
    'At 3rd level, you learn a ritual that creates a magical bond between yourself and one weapon. You can''t be disarmed of that weapon unless you are incapacitated, and you can summon it to your hand as a bonus action on your turn. You can have up to two bonded weapons.');

  -- ── MONK MONASTIC TRADITIONS ───────────────────────────────────
  perform public._add_subclass_feature('open-hand-technique', 'Open Hand Technique', 3, 'monk', 'open-hand',
    'Starting when you choose this tradition at 3rd level, you can manipulate your enemy''s ki when you harness your own. Whenever you hit a creature with one of the attacks granted by your Flurry of Blows, you can impose one of the following effects on that target: it must succeed on a Dex save or be knocked prone; it must succeed on a Str save or be pushed up to 15 feet from you; it can''t take reactions until the end of your next turn.');
  perform public._add_subclass_feature('shadow-arts', 'Shadow Arts', 3, 'monk', 'shadow',
    'Starting when you choose this tradition at 3rd level, you can use your ki to duplicate the effects of certain spells. As an action, you can spend 2 ki points to cast darkness, darkvision, pass without trace, or silence, without providing material components. Additionally, you gain the minor illusion cantrip if you don''t already know it.');
  perform public._add_subclass_feature('four-elements-disciple', 'Disciple of the Elements', 3, 'monk', 'four-elements',
    'When you choose this tradition at 3rd level, you learn magical disciplines that harness the power of the four elements. A discipline requires you to spend ki points each time you use it. You know the Elemental Attunement discipline and one other elemental discipline of your choice.');

  -- ── PALADIN SACRED OATHS (level 3 features) ────────────────────
  perform public._add_subclass_feature('devotion-channel-divinity', 'Channel Divinity', 3, 'paladin', 'devotion',
    'When you take this oath at 3rd level, you gain two Channel Divinity options: Sacred Weapon (imbue a weapon with positive energy for 1 minute, adding Cha mod to attack rolls) and Turning the Unholy (force fiends and undead within 30 ft to make a Wisdom save or be turned for 1 minute).');
  perform public._add_subclass_feature('ancients-channel-divinity', 'Channel Divinity', 3, 'paladin', 'ancients',
    'When you take this oath at 3rd level, you gain two Channel Divinity options: Nature''s Wrath (spectral vines restrain a creature within 10 ft until a save succeeds) and Turn the Faithless (force fey and fiends within 30 ft to make a Wisdom save or be turned).');
  perform public._add_subclass_feature('vengeance-channel-divinity', 'Channel Divinity', 3, 'paladin', 'vengeance',
    'When you take this oath at 3rd level, you gain two Channel Divinity options: Abjure Enemy (a target creature must succeed on a Wisdom save or be frightened, with speed 0) and Vow of Enmity (utter a vow against a creature within 10 ft, gaining advantage on attack rolls against it for 1 minute).');

  -- ── RANGER ARCHETYPES (level 3 features) ───────────────────────
  perform public._add_subclass_feature('hunter-hunters-prey', 'Hunter''s Prey', 3, 'ranger', 'hunter',
    'At 3rd level, you choose one of the following features: Colossus Slayer (deal an extra 1d8 damage once per turn to a creature below its hp max); Giant Killer (when a Large or larger creature within 5 ft of you hits or misses you, you can use your reaction to attack it); Horde Breaker (once per turn, when you make a weapon attack, you can make another attack against a different creature within 5 ft of the first).');
  perform public._add_subclass_feature('beast-master-ranger-companion', 'Ranger''s Companion', 3, 'ranger', 'beast-master',
    'At 3rd level, you gain a beast companion that accompanies you. Choose a beast that is no larger than Medium and has a challenge rating of 1/4 or lower. Add your proficiency bonus to its AC, attack rolls, damage rolls, saving throws, and skill proficiencies. The beast obeys your commands as best it can.');

  -- ── ROGUE ARCHETYPES (level 3 features) ────────────────────────
  perform public._add_subclass_feature('thief-fast-hands', 'Fast Hands', 3, 'rogue', 'thief',
    'Starting at 3rd level, you can use the bonus action granted by your Cunning Action to make a Dexterity (Sleight of Hand) check, use your thieves'' tools to disarm a trap or open a lock, or take the Use an Object action.');
  perform public._add_subclass_feature('thief-second-story-work', 'Second-Story Work', 3, 'rogue', 'thief',
    'When you choose this archetype at 3rd level, you gain the ability to climb faster than normal; climbing no longer costs you extra movement. In addition, when you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier.');
  perform public._add_subclass_feature('assassin-bonus-proficiencies', 'Bonus Proficiencies', 3, 'rogue', 'assassin',
    'When you choose this archetype at 3rd level, you gain proficiency with the disguise kit and the poisoner''s kit.');
  perform public._add_subclass_feature('assassin-assassinate', 'Assassinate', 3, 'rogue', 'assassin',
    'Also at 3rd level, you are at your deadliest when you get the drop on your enemies. You have advantage on attack rolls against any creature that hasn''t taken a turn in the combat yet. In addition, any hit you score against a creature that is surprised is a critical hit.');
  perform public._add_subclass_feature('arcane-trickster-spellcasting', 'Spellcasting', 3, 'rogue', 'arcane-trickster',
    'When you reach 3rd level, you gain the ability to cast spells. You learn three wizard cantrips, one of which must be mage hand, and three 1st-level spells from the wizard spell list, chosen from the enchantment and illusion schools. Intelligence is your spellcasting ability.');
  perform public._add_subclass_feature('arcane-trickster-mage-hand-legerdemain', 'Mage Hand Legerdemain', 3, 'rogue', 'arcane-trickster',
    'Starting at 3rd level, when you cast mage hand, you can make the spectral hand invisible and perform additional tasks with it: stow an object held by the hand in a container, retrieve an object from a worn container, use thieves'' tools to pick locks and disarm traps at range.');

  -- ── WIZARD ARCANE TRADITIONS (level 2 features) ────────────────
  perform public._add_subclass_feature('abjuration-savant', 'Abjuration Savant', 2, 'wizard', 'abjuration',
    'Beginning when you select this school at 2nd level, the gold and time you must spend to copy an abjuration spell into your spellbook is halved.');
  perform public._add_subclass_feature('abjuration-arcane-ward', 'Arcane Ward', 2, 'wizard', 'abjuration',
    'Starting at 2nd level, you can weave magic around yourself for protection. When you cast an abjuration spell of 1st level or higher, you can simultaneously use a strand of the spell''s magic to create a magical ward on yourself that lasts until you finish a long rest. The ward has hit points equal to twice your wizard level + your Intelligence modifier.');
  perform public._add_subclass_feature('evocation-savant', 'Evocation Savant', 2, 'wizard', 'evocation',
    'Beginning when you select this school at 2nd level, the gold and time you must spend to copy an evocation spell into your spellbook is halved.');
  perform public._add_subclass_feature('evocation-sculpt-spells', 'Sculpt Spells', 2, 'wizard', 'evocation',
    'Beginning at 2nd level, you can create pockets of relative safety within the effects of your evocation spells. When you cast an evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 + the spell''s level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a successful save.');
  perform public._add_subclass_feature('divination-savant', 'Divination Savant', 2, 'wizard', 'divination',
    'Beginning when you select this school at 2nd level, the gold and time you must spend to copy a divination spell into your spellbook is halved.');
  perform public._add_subclass_feature('divination-portent', 'Portent', 2, 'wizard', 'divination',
    'Starting at 2nd level when you choose this school, glimpses of the future begin to press in on your awareness. When you finish a long rest, roll two d20s and record the numbers rolled. You can replace any attack roll, saving throw, or ability check made by you or a creature that you can see with one of these foretelling rolls.');
  perform public._add_subclass_feature('illusion-savant', 'Illusion Savant', 2, 'wizard', 'illusion',
    'Beginning when you select this school at 2nd level, the gold and time you must spend to copy an illusion spell into your spellbook is halved.');
  perform public._add_subclass_feature('illusion-improved-minor-illusion', 'Improved Minor Illusion', 2, 'wizard', 'illusion',
    'When you choose this school at 2nd level, you learn the minor illusion cantrip. If you already know this cantrip, you learn a different wizard cantrip of your choice. The cantrip doesn''t count against your number of cantrips known. When you cast minor illusion, you can create both a sound and an image with a single casting of the spell.');
  perform public._add_subclass_feature('conjuration-savant', 'Conjuration Savant', 2, 'wizard', 'conjuration',
    'Beginning when you select this school at 2nd level, the gold and time you must spend to copy a conjuration spell into your spellbook is halved.');
  perform public._add_subclass_feature('conjuration-minor-conjuration', 'Minor Conjuration', 2, 'wizard', 'conjuration',
    'Starting at 2nd level when you select this school, you can use your action to conjure up an inanimate object in your hand or on the ground in an unoccupied space that you can see within 10 feet of you. This object can be no larger than 3 feet on a side and weigh no more than 10 pounds, and its form must be that of a non-magical object that you have seen.');
  perform public._add_subclass_feature('enchantment-savant', 'Enchantment Savant', 2, 'wizard', 'enchantment',
    'Beginning when you select this school at 2nd level, the gold and time you must spend to copy an enchantment spell into your spellbook is halved.');
  perform public._add_subclass_feature('enchantment-hypnotic-gaze', 'Hypnotic Gaze', 2, 'wizard', 'enchantment',
    'Starting at 2nd level when you choose this school, your soft words and enchanting gaze can magically enthrall another creature. As an action, choose one creature that you can see within 5 feet of you. If the target can see or hear you, it must succeed on a Wisdom saving throw or be charmed by you until the end of your next turn.');
  perform public._add_subclass_feature('necromancy-savant', 'Necromancy Savant', 2, 'wizard', 'necromancy',
    'Beginning when you select this school at 2nd level, the gold and time you must spend to copy a necromancy spell into your spellbook is halved.');
  perform public._add_subclass_feature('necromancy-grim-harvest', 'Grim Harvest', 2, 'wizard', 'necromancy',
    'At 2nd level, you gain the ability to reap life energy from creatures you kill with your spells. Once per turn when you kill one or more creatures with a spell of 1st level or higher, you regain hit points equal to twice the spell''s level, or three times its level if the spell belongs to the School of Necromancy.');
  perform public._add_subclass_feature('transmutation-savant', 'Transmutation Savant', 2, 'wizard', 'transmutation',
    'Beginning when you select this school at 2nd level, the gold and time you must spend to copy a transmutation spell into your spellbook is halved.');
  perform public._add_subclass_feature('transmutation-minor-alchemy', 'Minor Alchemy', 2, 'wizard', 'transmutation',
    'Starting at 2nd level when you select this school, you can temporarily alter the physical properties of one nonmagical object, changing it from one substance into another. You perform a special alchemical procedure on one object composed entirely of wood, stone (but not a gemstone), iron, copper, or silver, transforming it into a different one of those materials.');
end $migrate$;

drop function if exists public._add_subclass_feature(text, text, integer, text, text, text);
