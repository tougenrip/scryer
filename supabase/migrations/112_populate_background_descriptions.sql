-- Populate canonical 5e SRD background data. Migration 009 already
-- seeded Acolyte / Criminal / Entertainer / Folk Hero / Hermit /
-- Noble / Outlander / Sage / Soldier. This pass fills in the other
-- 2014 SRD backgrounds (Charlatan, Guild Artisan, Sailor, Urchin)
-- and patches anything still empty in srd2024_backgrounds.
--
-- Idempotent: each column is only filled when currently NULL or
-- empty so re-running won't clobber existing data or DM edits.

create or replace function public._patch_background(
  p_table regclass,
  p_index text,
  p_name text,
  p_description text,
  p_skill_proficiencies text,
  p_tool_proficiencies text,
  p_languages text,
  p_equipment text,
  p_feature text
) returns void language plpgsql as $$
begin
  -- Ensure the row exists. If not, insert a stub so the UPDATE below
  -- has something to patch.
  execute format(
    'insert into %s (index, name) values (%L, %L) on conflict (index) do nothing',
    p_table, p_index, p_name
  );

  execute format(
    'update %s set
      description = coalesce(nullif(description, ''''), %L),
      skill_proficiencies = coalesce(nullif(skill_proficiencies, ''''), %L),
      tool_proficiencies = coalesce(nullif(tool_proficiencies, ''''), %L),
      languages = coalesce(nullif(languages, ''''), %L),
      equipment = coalesce(nullif(equipment, ''''), %L),
      feature = coalesce(nullif(feature, ''''), %L)
     where lower(index) = lower(%L)',
    p_table,
    p_description, p_skill_proficiencies, p_tool_proficiencies,
    p_languages, p_equipment, p_feature, p_index
  );
end;
$$;

-- NOTE: srd2024_backgrounds has a completely different schema
-- (jsonb columns: ability_scores, feat, proficiencies,
-- proficiency_choices, equipment_options — no text columns). Only
-- the 2014 SRD table is patched here; 2024 backgrounds need their
-- own data migration with the matching shape.
do $$
declare
  t regclass;
begin
  foreach t in array array[
    'public.srd_backgrounds'::regclass
  ]
  loop
    -- ── CHARLATAN ────────────────────────────────────────────────
    perform public._patch_background(t,
      'charlatan', 'Charlatan',
      'You have always had a way with people. You know what makes them tick, you can tease out their hearts'' desires after a few minutes of conversation, and with a few leading questions you can read them like they were children''s books. It''s a useful talent, and one that you''re perfectly willing to use for your advantage.',
      'Deception, Sleight of Hand',
      'Disguise kit, forgery kit',
      '',
      'A set of fine clothes, a disguise kit, tools of the con of your choice (ten stoppered bottles filled with colored liquid, a set of weighted dice, a deck of marked cards, or a signet ring of an imaginary duke), and a belt pouch containing 15 gp',
      'False Identity. You have created a second identity that includes documentation, established acquaintances, and disguises that allow you to assume that persona. Additionally, you can forge documents including official papers and personal letters, as long as you have seen an example of the kind of document or the handwriting you are trying to copy.'
    );

    -- ── GUILD ARTISAN ────────────────────────────────────────────
    perform public._patch_background(t,
      'guild-artisan', 'Guild Artisan',
      'You are a member of an artisan''s guild, skilled in a particular field and closely associated with other artisans. You are a well-established part of the mercantile world, freed by talent and wealth from the constraints of a feudal social order. You learned your skills as an apprentice to a master artisan, under the sponsorship of your guild, until you became a master in your own right.',
      'Insight, Persuasion',
      'One type of artisan''s tools',
      'One of your choice',
      'A set of artisan''s tools (one of your choice), a letter of introduction from your guild, a set of traveler''s clothes, and a belt pouch containing 15 gp',
      'Guild Membership. As an established and respected member of a guild, you can rely on certain benefits that membership provides. Your fellow guild members will provide you with lodging and food if necessary, and pay for your funeral if needed. In some cities and towns, a guildhall offers a central place to meet other members of your profession.'
    );

    -- ── SAILOR ───────────────────────────────────────────────────
    perform public._patch_background(t,
      'sailor', 'Sailor',
      'You sailed on a seagoing vessel for years. In that time, you faced down mighty storms, monsters of the deep, and those who wanted to sink your craft to the bottomless depths. Your first love is the distant line of the horizon, but the time has come to try your hand at something new.',
      'Athletics, Perception',
      'Navigator''s tools, vehicles (water)',
      '',
      'A belaying pin (club), 50 feet of silk rope, a lucky charm such as a rabbit foot or a small stone with a hole in the center (or you may roll for a random trinket), a set of common clothes, and a belt pouch containing 10 gp',
      'Ship''s Passage. When you need to, you can secure free passage on a sailing ship for yourself and your adventuring companions. You might sail on the ship you served on, or another ship you have good relations with. Because you''re calling in a favor, you can''t be certain of a schedule or route that will meet your every need. Your DM will determine how long it takes to get where you need to go.'
    );

    -- ── URCHIN ───────────────────────────────────────────────────
    perform public._patch_background(t,
      'urchin', 'Urchin',
      'You grew up on the streets alone, orphaned, and poor. You had no one to watch over you or to provide for you, so you learned to provide for yourself. You fought fiercely over food and kept a constant watch out for other desperate souls who might steal from you. You slept on rooftops and in alleyways, exposed to the elements, and endured sickness without the advantage of medicine or a place to recuperate.',
      'Sleight of Hand, Stealth',
      'Disguise kit, thieves'' tools',
      '',
      'A small knife, a map of the city you grew up in, a pet mouse, a token to remember your parents by, a set of common clothes, and a belt pouch containing 10 gp',
      'City Secrets. You know the secret patterns and flow to cities and can find passages through the urban sprawl that others would miss. When you are not in combat, you (and companions you lead) can travel between any two locations in the city twice as fast as your speed would normally allow.'
    );

    -- ── Re-patch the migration-009 backgrounds in case any field
    -- ── was left empty by an older import. All idempotent.
    perform public._patch_background(t,
      'acolyte', 'Acolyte',
      'You have spent your life in the service of a temple to a specific god or pantheon of gods. You act as an intermediary between the realm of the holy and the mortal world, performing sacred rites and offering sacrifices in order to conduct worshipers into the presence of the divine.',
      'Insight, Religion', '', 'Two of your choice',
      'A holy symbol (a gift to you when you entered the priesthood), a prayer book or prayer wheel, 5 sticks of incense, vestments, a set of common clothes, and a pouch containing 15 gp',
      'Shelter of the Faithful. As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle.'
    );
    perform public._patch_background(t,
      'criminal', 'Criminal',
      'You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld. You''re far closer than most people to the world of murder, theft, and violence that pervades the underbelly of civilization, and you have survived up to this point by flouting the law and its agents.',
      'Deception, Stealth', 'One type of gaming set, thieves'' tools', '',
      'A crowbar, a set of dark common clothes including a hood, and a belt pouch containing 15 gp',
      'Criminal Contact. You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.'
    );
    perform public._patch_background(t,
      'entertainer', 'Entertainer',
      'You thrive in front of an audience. You know how to entrance them, entertain them, and even inspire them. Your poetics can stir the hearts of those who hear you, awakening grief or joy, laughter or anger. Your music raises their spirits or captures their sorrow. Your dance steps captivate, your humor cuts to the quick. Whatever techniques you use, your art is your life.',
      'Acrobatics, Performance', 'Disguise kit, one type of musical instrument', '',
      'A musical instrument (one of your choice), the favor of an admirer (love letter, lock of hair, or trinket), a costume, and a belt pouch containing 15 gp',
      'By Popular Demand. You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble''s court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night.'
    );
    perform public._patch_background(t,
      'folk-hero', 'Folk Hero',
      'You come from a humble social rank, but you are destined for so much more. Already the people of your home village regard you as their champion, and your destiny calls you to stand against the tyrants and monsters that threaten the common folk everywhere.',
      'Animal Handling, Survival', 'One type of artisan''s tools, vehicles (land)', '',
      'A set of artisan''s tools (one of your choice), a shovel, an iron pot, a set of common clothes, and a pouch containing 10 gp',
      'Rustic Hospitality. Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.'
    );
    perform public._patch_background(t,
      'hermit', 'Hermit',
      'You lived in seclusion—either in a sheltered community such as a monastery, or entirely alone—for a formative part of your life. In your time apart from the clamor of society, you found quiet, solitude, and perhaps some of the answers you were looking for.',
      'Medicine, Religion', 'Herbalism kit', 'One of your choice',
      'A scroll case stuffed full of notes from your studies or prayers, a winter blanket, a set of common clothes, an herbalism kit, and 5 gp',
      'Discovery. The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature.'
    );
    perform public._patch_background(t,
      'noble', 'Noble',
      'You understand wealth, power, and privilege. You carry a noble title, and your family owns land, collects taxes, and wields significant political influence. You might be a pampered aristocrat unfamiliar with work or discomfort, a former merchant just elevated to the nobility, or a disinherited scoundrel with a disproportionate sense of entitlement.',
      'History, Persuasion', 'One type of gaming set', 'One of your choice',
      'A set of fine clothes, a signet ring, a scroll of pedigree, and a purse containing 25 gp',
      'Position of Privilege. Thanks to your noble birth, people are inclined to think the best of you. You are welcome in high society, and people assume you have the right to be wherever you are. The common folk make every effort to accommodate you and avoid your displeasure, and other people of high birth treat you as a member of the same social sphere.'
    );
    perform public._patch_background(t,
      'outlander', 'Outlander',
      'You grew up in the wilds, far from civilization and the comforts of town and technology. You''ve witnessed the migration of herds larger than forests, survived weather more extreme than any city-dweller could comprehend, and enjoyed the solitude of being the only thinking creature for miles in any direction.',
      'Athletics, Survival', 'One type of musical instrument', 'One of your choice',
      'A staff, a hunting trap, a trophy from an animal you killed, a set of traveler''s clothes, and a belt pouch containing 10 gp',
      'Wanderer. You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.'
    );
    perform public._patch_background(t,
      'sage', 'Sage',
      'You spent years learning the lore of the multiverse. You scoured manuscripts, studied scrolls, and listened to the greatest experts on the subjects that interest you. Your efforts have made you a master in your fields of study.',
      'Arcana, History', '', 'Two of your choice',
      'A bottle of black ink, a quill, a small knife, a letter from a dead colleague posing a question you have not yet been able to answer, a set of common clothes, and a belt pouch containing 10 gp',
      'Researcher. When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, a sage or other learned person or creature.'
    );
    perform public._patch_background(t,
      'soldier', 'Soldier',
      'War has been your life for as long as you care to remember. You trained as a youth, studied the use of weapons and armor, learned basic survival techniques, including how to stay alive on the battlefield. You might have been part of a standing national army or a mercenary company, or perhaps a member of a local militia who rose to prominence during a recent war.',
      'Athletics, Intimidation', 'One type of gaming set, vehicles (land)', '',
      'An insignia of rank, a trophy taken from a fallen enemy (a dagger, broken blade, or piece of a banner), a set of bone dice or deck of cards, a set of common clothes, and a belt pouch containing 10 gp',
      'Military Rank. You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they defer to you if they are of a lower rank.'
    );
  end loop;
end $$;

drop function public._patch_background(regclass, text, text, text, text, text, text, text, text);
