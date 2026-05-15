-- Mirror of migration 115, targeting `srd2024_subclasses`. The hook
-- `useSubclasses()` queries `srd2024_subclasses` whenever the player
-- picks the 2024 source on the Home step, but migration 115 only
-- populated `srd_subclasses` — so on the 2024 path the subclass
-- cards still render the empty-state fallback ("Click the info icon
-- for full subclass features.").
--
-- There is NO `srd2024_features` table — the project uses the
-- shared `srd_features` table for class/subclass features across
-- both rule sets. So this migration ONLY backfills descriptions in
-- the 2024 subclasses table; feature rows added by 115 are already
-- visible on the 2024 path (the query is by class_index +
-- subclass_index, both shared across rule sets).
--
-- Idempotent: only fills NULL/empty descriptions; re-running is
-- safe and won't clobber edited rows.

create or replace function public._patch_2024_subclass_desc(
  p_index text,
  p_description text
) returns void language plpgsql as $$
begin
  update srd2024_subclasses
     set description = coalesce(nullif(description, ''), p_description)
   where index = p_index;
exception when others then
  raise notice 'patch_2024_subclass_desc skip: % - %', p_index, sqlerrm;
end;
$$;

do $migrate$
begin
  -- Barbarian
  perform public._patch_2024_subclass_desc('berserker', 'For some barbarians, rage is a means to an end — that end being violence. The Path of the Berserker is a path of untrammeled fury, slick with blood. Berserkers excel in dealing damage while inflicting fear in their foes.');
  perform public._patch_2024_subclass_desc('totem-warrior', 'The Path of the Totem Warrior is a spiritual journey, as the barbarian accepts a spirit animal as guide, protector, and inspiration. Each totem grants different powers reflecting the chosen beast.');
  perform public._patch_2024_subclass_desc('path-of-the-wild-heart', 'The Path of the Wild Heart (2024 evolution of Totem Warrior) draws on the spiritual bond between the barbarian and the beasts of the natural world. You channel animal spirits to gain their powers, and even shapeshift while raging.');
  perform public._patch_2024_subclass_desc('path-of-the-world-tree', 'Drawing power from the cosmic World Tree that unites all planes, you channel its branches to teleport, share vitality with allies, and ground yourself with primal resilience.');
  perform public._patch_2024_subclass_desc('path-of-the-zealot', 'Zealots are warriors who channel the fury of their gods through themselves to deal devastating blows on the battlefield. Even death cannot easily claim them while their rage burns.');

  -- Bard
  perform public._patch_2024_subclass_desc('lore', 'Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales. They use their gifts to hold audiences spellbound, and they cherish the gift of magical inspiration.');
  perform public._patch_2024_subclass_desc('valor', 'Bards of the College of Valor are daring skalds whose tales keep alive the memory of the great heroes of the past. They inspire others to brave deeds, and they wade into battle alongside the warriors they sing of.');
  perform public._patch_2024_subclass_desc('college-of-dance', 'Bards of the College of Dance use their bodies as both instrument and weapon, weaving magic through fluid movement. They are nimble combatants who inspire allies through performance.');
  perform public._patch_2024_subclass_desc('college-of-glamour', 'Bards of the College of Glamour are steeped in the magic of the Feywild, lending its enchanting magic to their performances. The beauty and brilliance they bestow can make any audience weep with joy or rage to murder.');

  -- Cleric Domains
  perform public._patch_2024_subclass_desc('knowledge', 'The gods of knowledge value learning and understanding above all. Clerics of these deities act as scribes and sages, gathering knowledge and passing it on to those who seek it.');
  perform public._patch_2024_subclass_desc('life', 'The Life domain focuses on the vibrant positive energy that sustains all life. Clerics of this domain are masters of healing, devoted to preserving life and to making the bodies of others a vessel for divine power.');
  perform public._patch_2024_subclass_desc('light', 'Gods of light promote the ideals of rebirth and renewal, truth, vigilance, and beauty, often using the symbol of the sun. Some of these gods are portrayed as the sun itself or as a charioteer who guides the sun across the sky.');
  perform public._patch_2024_subclass_desc('nature', 'Gods of nature are as varied as the natural world itself, from inscrutable gods of the deep forests to friendly deities associated with particular springs and groves.');
  perform public._patch_2024_subclass_desc('tempest', 'Gods whose portfolios include the Tempest domain govern storms, sea, and sky. They include gods of lightning and thunder, of earthquakes, and of any other primal force.');
  perform public._patch_2024_subclass_desc('trickery', 'Gods of trickery are mischief-makers and instigators who stand as a constant challenge to the accepted order among both gods and mortals. They are patrons of thieves, scoundrels, gamblers, rebels, and liberators.');
  perform public._patch_2024_subclass_desc('war', 'War has many manifestations. Clerics of war gods excel in combat, inspiring others to fight the good fight or to embrace bloodlust and slaughter.');

  -- Druid
  perform public._patch_2024_subclass_desc('land', 'The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through a vast oral tradition. Each circle''s druids meet within sacred circles of trees or standing stones.');
  perform public._patch_2024_subclass_desc('moon', 'Druids of the Circle of the Moon are fierce guardians of the wilds. Their order gathers under the full moon to share news and trade warnings, and they confront the entities that threaten the natural world.');
  perform public._patch_2024_subclass_desc('circle-of-the-sea', 'Druids of the Circle of the Sea draw their power from the rhythm of tides and currents, calling forth waves and storms to defend the wild places of the world.');
  perform public._patch_2024_subclass_desc('circle-of-the-stars', 'Druids of the Circle of the Stars find strength in starlight, channeling constellations to guide their actions. They study the heavens for portents and harness ancient celestial patterns.');

  -- Fighter
  perform public._patch_2024_subclass_desc('champion', 'The archetypal Champion focuses on the development of raw physical power honed to deadly perfection. Those who model themselves on this archetype combine rigorous training with physical excellence to deal devastating blows.');
  perform public._patch_2024_subclass_desc('battle-master', 'Those who emulate the archetypal Battle Master employ martial techniques passed down through generations. To a Battle Master, combat is an academic field.');
  perform public._patch_2024_subclass_desc('eldritch-knight', 'The archetypal Eldritch Knight combines the martial mastery common to all fighters with a careful study of magic. Eldritch Knights use abjuration and evocation spells.');
  perform public._patch_2024_subclass_desc('psi-warrior', 'A Psi Warrior is a soldier trained to channel psionic energies in service of body and blade, projecting force to shield allies, strike at range, and bolster their own physical prowess.');

  -- Monk
  perform public._patch_2024_subclass_desc('open-hand', 'Monks of the Way of the Open Hand are the ultimate masters of martial arts combat, whether armed or unarmed. They learn techniques to push and trip their opponents, manipulate ki to heal damage to their bodies, and practice advanced meditation.');
  perform public._patch_2024_subclass_desc('shadow', 'Monks of the Way of Shadow follow a tradition that values stealth and subterfuge. These monks might be called ninjas or shadowdancers, and they serve as spies and assassins.');
  perform public._patch_2024_subclass_desc('four-elements', 'You follow a monastic tradition that teaches you to harness the elements. When you focus your ki, you can align yourself with the forces of creation and bend the four elements to your will.');
  perform public._patch_2024_subclass_desc('warrior-of-mercy', 'Warriors of Mercy use their ki to mend wounds or hasten death. Their masks hide their identity as healers and reapers alike, granting them anonymity in their dual role.');

  -- Paladin
  perform public._patch_2024_subclass_desc('devotion', 'The Oath of Devotion binds a paladin to the loftiest ideals of justice, virtue, and order. Sometimes called cavaliers, white knights, or holy warriors, these paladins meet the ideal of the knight in shining armor.');
  perform public._patch_2024_subclass_desc('ancients', 'The Oath of the Ancients is as old as the race of elves and the rituals of the druids. Paladins who swear this oath cast their lot with the side of the light in the cosmic struggle against darkness.');
  perform public._patch_2024_subclass_desc('vengeance', 'The Oath of Vengeance is a solemn commitment to punish those who have committed a grievous sin. Driven by a single-minded purpose, vengeance paladins are willing to make terrible sacrifices.');
  perform public._patch_2024_subclass_desc('oath-of-glory', 'Paladins who take the Oath of Glory believe they and their companions are destined to achieve glory through deeds of heroism. They train both body and spirit to display peerless ability.');

  -- Ranger
  perform public._patch_2024_subclass_desc('hunter', 'Emulating the Hunter archetype means accepting your place as a bulwark between civilization and the terrors of the wilderness. You learn specialized techniques for fighting the threats you face.');
  perform public._patch_2024_subclass_desc('beast-master', 'The Beast Master archetype embodies a friendship between the civilized races and the beasts of the world. United in focus, beast and ranger work as one to fight monstrous foes.');
  perform public._patch_2024_subclass_desc('fey-wanderer', 'Fey Wanderers walk the world with the magic of the Feywild bound to them. They charm and dazzle in equal measure, weaving illusion and joy into their pursuit of monsters and quarry.');
  perform public._patch_2024_subclass_desc('gloom-stalker', 'Gloom Stalkers haunt the darkest places of the world. Their tradition trains them to hunt in shadows, strike from ambush, and use the night itself as their ally.');

  -- Rogue
  perform public._patch_2024_subclass_desc('thief', 'You hone your skills in the larcenous arts. Burglars, bandits, cutpurses, and other criminals typically follow this archetype, but so do rogues who prefer to think of themselves as professional treasure seekers.');
  perform public._patch_2024_subclass_desc('assassin', 'You focus your training on the grim art of death. Stealth, poison, and disguise help you eliminate your foes with deadly efficiency.');
  perform public._patch_2024_subclass_desc('arcane-trickster', 'Some rogues enhance their fine-honed skills of stealth and agility with magic, learning tricks of enchantment and illusion. These rogues include pickpockets and burglars, but also pranksters.');
  perform public._patch_2024_subclass_desc('soulknife', 'Soulknives manifest blades of psychic energy from the mind. They are duelists, infiltrators, and spies whose weapons are as much extensions of their thoughts as physical objects.');

  -- Sorcerer
  perform public._patch_2024_subclass_desc('draconic-bloodline', 'Your innate magic comes from draconic magic that was mingled with your blood or that of your ancestors. Most often, sorcerers with this origin trace their descent back to a mighty sorcerer of ancient times.');
  perform public._patch_2024_subclass_desc('wild-magic', 'Your innate magic comes from the wild forces of chaos that underlie the order of creation. Raw magic flows through you, manifesting in unpredictable surges.');
  perform public._patch_2024_subclass_desc('clockwork-soul', 'Clockwork Soul sorcerers are connected to the cosmic forces of order, drawing power from the gear-driven mechanism that underlies reality. Their magic enforces stability and predictability.');
  perform public._patch_2024_subclass_desc('aberrant-mind', 'Aberrant Mind sorcerers wield psionic power that originates from contact with an aberration, a psychic event in their past, or strange knowledge from beyond reality.');

  -- Warlock Patrons (key for the screenshot the user reported)
  perform public._patch_2024_subclass_desc('archfey', 'Your patron is a lord or lady of the fey, a creature of legend who holds secrets that were forgotten before the mortal races were born. This being''s motivations are often inscrutable, and sometimes whimsical, and might involve a striving for greater magical power or the settling of age-old grudges.');
  perform public._patch_2024_subclass_desc('celestial', 'Your patron is a powerful being of the Upper Planes. You have bound yourself to an ancient empyrean, solar, ki-rin, unicorn, or other entity that resides in the planes of everlasting bliss. Your pact with that being allows you to experience the barest touch of the holy light that illuminates the multiverse.');
  perform public._patch_2024_subclass_desc('fiend', 'You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil, even if you strive against those aims. Fiends powerful enough to forge a pact include demon lords, archdevils, and ultroloths.');
  perform public._patch_2024_subclass_desc('great-old-one', 'Your patron is a mysterious entity whose nature is utterly foreign to the fabric of reality. It might come from the Far Realm, the space beyond reality, or it could be one of the elder gods known only in legends. Its motives are incomprehensible to mortals.');
  perform public._patch_2024_subclass_desc('hexblade', 'You have made your pact with a mysterious entity from the Shadowfell — a force that manifests in sentient magic weapons carved from the stuff of shadow. The Raven Queen is whispered to have forged the first of these weapons.');

  -- Wizard Schools (Arcane Traditions)
  perform public._patch_2024_subclass_desc('abjuration', 'The School of Abjuration emphasizes magic that blocks, banishes, or protects. You understand that magic that becomes a shield, a mystic ward against harm, is just as potent as protective magic against fire or attacks.');
  perform public._patch_2024_subclass_desc('conjuration', 'As a conjurer, you favor spells that produce objects and creatures out of thin air. You can conjure killing fog or summon creatures from elsewhere to fight on your behalf.');
  perform public._patch_2024_subclass_desc('divination', 'The counsel of a diviner is sought by royalty and commoners alike, for all seek a clearer understanding of the past, present, and future. You strive to part the veils of space, time, and consciousness so that you can see clearly.');
  perform public._patch_2024_subclass_desc('enchantment', 'As a member of the School of Enchantment, you have honed your ability to magically entrance and beguile other people and monsters. Some enchanters are peacemakers; others use their gifts for control and manipulation.');
  perform public._patch_2024_subclass_desc('evocation', 'You focus your study on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid. Some evokers find employment in military forces.');
  perform public._patch_2024_subclass_desc('illusion', 'You focus your studies on magic that dazzles the senses, befuddles the mind, and tricks even the wisest folk. Your magic is subtle, but the illusions crafted by your keen mind make the impossible seem real.');
  perform public._patch_2024_subclass_desc('necromancy', 'The School of Necromancy explores the cosmic forces of life, death, and undeath. As you focus your studies in this tradition, you learn to manipulate the energy that animates all living things.');
  perform public._patch_2024_subclass_desc('transmutation', 'You are a student of spells that modify energy and matter. The world is not a fixed thing, but eminently mutable, and you delight in being an agent of change.');

  -- ── Common name-variant aliases (some imports use prefixed slugs)
  -- The 2024 PHB uses slugs like "the-archfey" / "the-celestial" /
  -- "the-fiend" / "the-great-old-one". Patch both so whichever
  -- format your import chose, the cards get text.
  perform public._patch_2024_subclass_desc('the-archfey', 'Your patron is a lord or lady of the fey, a creature of legend who holds secrets that were forgotten before the mortal races were born.');
  perform public._patch_2024_subclass_desc('the-celestial', 'Your patron is a powerful being of the Upper Planes. You have bound yourself to an ancient empyrean, solar, ki-rin, unicorn, or other entity that resides in the planes of everlasting bliss.');
  perform public._patch_2024_subclass_desc('the-fiend', 'You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil, even if you strive against those aims.');
  perform public._patch_2024_subclass_desc('the-great-old-one', 'Your patron is a mysterious entity whose nature is utterly foreign to the fabric of reality. It might come from the Far Realm or be one of the elder gods.');
  perform public._patch_2024_subclass_desc('the-hexblade', 'You have made your pact with a mysterious entity from the Shadowfell — a force that manifests in sentient magic weapons carved from the stuff of shadow.');

  -- Apply same aliases to the 2014 table in case the SRD import used
  -- the "the-" prefix there too. This is a no-op if 115 already
  -- populated descriptions without the prefix.
  update srd_subclasses set description = coalesce(nullif(description, ''),
    'Your patron is a lord or lady of the fey, a creature of legend who holds secrets that were forgotten before the mortal races were born.')
    where index = 'the-archfey';
  update srd_subclasses set description = coalesce(nullif(description, ''),
    'Your patron is a powerful being of the Upper Planes.')
    where index = 'the-celestial';
  update srd_subclasses set description = coalesce(nullif(description, ''),
    'You have made a pact with a fiend from the lower planes of existence, a being whose aims are evil.')
    where index = 'the-fiend';
  update srd_subclasses set description = coalesce(nullif(description, ''),
    'Your patron is a mysterious entity whose nature is utterly foreign to the fabric of reality.')
    where index = 'the-great-old-one';
end $migrate$;

drop function if exists public._patch_2024_subclass_desc(text, text);

-- ─── Add the-* aliased feature rows to srd_features ────────────────
-- The features query in page.tsx filters by `class_index +
-- subclass_index`, so when the subclass index is "the-fiend" rather
-- than "fiend" the existing rows added by 115 won't match. Insert
-- copies under the prefixed slug so both variants find features.

create or replace function public._alias_subclass_feature(
  p_source_subclass_index text,
  p_target_subclass_index text
) returns void language plpgsql as $$
declare
  r record;
  new_index text;
begin
  for r in
    select index, name, level, class_index, description
      from srd_features
     where subclass_index = p_source_subclass_index
  loop
    new_index := replace(r.index, p_source_subclass_index || '-',
                                   p_target_subclass_index || '-');
    -- If the index didn't contain the prefix, fall back to appending
    if new_index = r.index then
      new_index := p_target_subclass_index || '-' || r.index;
    end if;
    insert into srd_features
      (index, name, level, class_index, subclass_index, description)
    values
      (new_index, r.name, r.level, r.class_index, p_target_subclass_index, r.description)
    on conflict (index) do nothing;
  end loop;
end;
$$;

do $migrate$
begin
  -- Mirror warlock patron features under the-* slugs.
  perform public._alias_subclass_feature('archfey', 'the-archfey');
  perform public._alias_subclass_feature('celestial', 'the-celestial');
  perform public._alias_subclass_feature('fiend', 'the-fiend');
  perform public._alias_subclass_feature('great-old-one', 'the-great-old-one');
end $migrate$;

drop function if exists public._alias_subclass_feature(text, text);
