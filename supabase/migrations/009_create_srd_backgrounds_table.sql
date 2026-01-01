-- Migration: Create srd_backgrounds table and populate with D&D 5e SRD backgrounds
-- Based on data from dnd-5e MCP server

-- Create srd_backgrounds table
CREATE TABLE IF NOT EXISTS srd_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  skill_proficiencies TEXT,
  tool_proficiencies TEXT,
  languages TEXT,
  equipment TEXT,
  feature TEXT,
  ability_score_increase TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE srd_backgrounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view SRD backgrounds"
  ON srd_backgrounds FOR SELECT
  USING (true);

-- Populate with standard SRD backgrounds
-- Note: These are the core backgrounds from the Player's Handbook

INSERT INTO srd_backgrounds (index, name, description, skill_proficiencies, tool_proficiencies, languages, equipment, feature, ability_score_increase)
VALUES
  (
    'acolyte',
    'Acolyte',
    'You have spent your life in the service of a temple to a specific god or pantheon of gods. You act as an intermediary between the realm of the holy and the mortal world, performing sacred rites and offering sacrifices in order to conduct worshipers into the presence of the divine.',
    'Insight, Religion',
    '',
    'Two of your choice',
    'A holy symbol (a gift to you when you entered the priesthood), a prayer book or prayer wheel, 5 sticks of incense, vestments, a set of common clothes, and a pouch containing 15 gp',
    'As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity. You and your adventuring companions can expect to receive free healing and care at a temple, shrine, or other established presence of your faith, though you must provide any material components needed for spells. Those who share your religion will support you (but only you) at a modest lifestyle.',
    ''
  ),
  (
    'criminal',
    'Criminal',
    'You are an experienced criminal with a history of breaking the law. You have spent a lot of time among other criminals and still have contacts within the criminal underworld. You''re far closer than most people to the world of murder, theft, and violence that pervades the underbelly of civilization, and you have survived up to this point by flouting the law and its agents.',
    'Deception, Stealth',
    'One type of gaming set, thieves'' tools',
    '',
    'A crowbar, a set of dark common clothes including a hood, and a belt pouch containing 15 gp',
    'You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals. You know how to get messages to and from your contact, even over great distances; specifically, you know the local messengers, corrupt caravan masters, and seedy sailors who can deliver messages for you.',
    ''
  ),
  (
    'folk-hero',
    'Folk Hero',
    'You come from a humble social rank, but you are destined for so much more. Already the people of your home village regard you as their champion, and your destiny calls you to stand against the tyrants and monsters that threaten the common folk everywhere.',
    'Animal Handling, Survival',
    'One type of artisan''s tools, vehicles (land)',
    '',
    'A set of artisan''s tools (one of your choice), a shovel, an iron pot, a set of common clothes, and a pouch containing 10 gp',
    'Since you come from the ranks of the common folk, you fit in among them with ease. You can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.',
    ''
  ),
  (
    'hermit',
    'Hermit',
    'You lived in seclusion—either in a sheltered community such as a monastery, or entirely alone—for a formative part of your life. In your time apart from the clamor of society, you found quiet, solitude, and perhaps some of the answers you were looking for.',
    'Medicine, Religion',
    'Herbalism kit',
    'One of your choice',
    'A scroll case stuffed full of notes from your studies or prayers, a winter blanket, a set of common clothes, an herbalism kit, and 5 gp',
    'The quiet seclusion of your extended hermitage gave you access to a unique and powerful discovery. The exact nature of this revelation depends on the nature of your seclusion. It might be a great truth about the cosmos, the deities, the powerful beings of the outer planes, or the forces of nature. It could be a site that no one else has ever seen. You might have uncovered a fact that has long been forgotten, or unearthed some relic of the past that could rewrite history. It might be information that would be damaging to the people who or consigned you to exile, and hence the reason for your return to society.',
    ''
  ),
  (
    'noble',
    'Noble',
    'You understand wealth, power, and privilege. You carry a noble title, and your family owns land, collects taxes, and wields significant political influence. You might be a pampered aristocrat unfamiliar with work or discomfort, a former merchant just elevated to the nobility, or a disinherited scoundrel with a disproportionate sense of entitlement. Or you could be an honest, hard-working landowner who cares deeply about the people who live and work on your land, keenly aware of your responsibility to them.',
    'History, Persuasion',
    'One type of gaming set',
    'One of your choice',
    'A set of fine clothes, a signet ring, a scroll of pedigree, and a purse containing 25 gp',
    'You know the common people, and you can find a place to hide, rest, or recuperate among other commoners, unless you have shown yourself to be a danger to them. They will shield you from the law or anyone else searching for you, though they will not risk their lives for you.',
    ''
  ),
  (
    'sage',
    'Sage',
    'You spent years learning the lore of the multiverse. You scoured manuscripts, studied scrolls, and listened to the greatest experts on the subjects that interest you. Your efforts have made you a master in your fields of study.',
    'Arcana, History',
    '',
    'Two of your choice',
    'A bottle of black ink, a quill, a small knife, a letter from a dead colleague posing a question you have not yet been able to answer, a set of common clothes, and a belt pouch containing 10 gp',
    'When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it. Usually, this information comes from a library, scriptorium, university, a sage or other learned person or creature. Your DM might rule that the knowledge you seek is secreted away in an almost inaccessible place, or that it simply cannot be found. Unearthing the deepest secrets of the multiverse can require an adventure or even a whole campaign.',
    ''
  ),
  (
    'soldier',
    'Soldier',
    'War has been your life for as long as you care to remember. You trained as a youth, studied the use of weapons and armor, learned basic survival techniques, including how to stay alive on the battlefield. You might have been part of a standing national army or a mercenary company, or perhaps a member of a local militia who rose to prominence during a recent war.',
    'Athletics, Intimidation',
    'One type of gaming set, vehicles (land)',
    '',
    'An insignia of rank, a trophy taken from a fallen enemy (a dagger, broken blade, or piece of a banner), a set of bone dice or deck of cards, a set of common clothes, and a belt pouch containing 10 gp',
    'You have a military rank from your career as a soldier. Soldiers loyal to your former military organization still recognize your authority and influence, and they defer to you if they are of a lower rank. You can invoke your rank to exert influence over other soldiers and requisition simple equipment or horses for temporary use. You can also usually gain access to friendly military encampments and fortresses where your rank is recognized.',
    ''
  ),
  (
    'entertainer',
    'Entertainer',
    'You thrive in front of an audience. You know how to entrance them, entertain them, and even inspire them. Your poetics can stir the hearts of those who hear you, awakening grief or joy, laughter or anger. Your music raises their spirits or captures their sorrow. Your dance steps captivate, your humor cuts to the quick. Whatever techniques you use, your art is your life.',
    'Acrobatics, Performance',
    'Disguise kit, one type of musical instrument',
    '',
    'A musical instrument (one of your choice), the favor of an admirer (love letter, lock of hair, or trinket), a costume, and a belt pouch containing 15 gp',
    'You can always find a place to perform, usually in an inn or tavern but possibly with a circus, at a theater, or even in a noble''s court. At such a place, you receive free lodging and food of a modest or comfortable standard (depending on the quality of the establishment), as long as you perform each night. In addition, your performance makes you something of a local figure. When strangers recognize you in a town where you have performed, they typically take a liking to you.',
    ''
  ),
  (
    'outlander',
    'Outlander',
    'You grew up in the wilds, far from civilization and the comforts of town and technology. You''ve witnessed the migration of herds larger than forests, survived weather more extreme than any city-dweller could comprehend, and enjoyed the solitude of being the only thinking creature for miles in any direction. The wilds are in your blood, whether you were a nomad, an explorer, a recluse, a hunter-gatherer, or even a marauder. Even in places where you don''t know the specific features of the terrain, you know the ways of the wild.',
    'Athletics, Survival',
    'One type of musical instrument',
    'One of your choice',
    'A staff, a hunting trap, a trophy from an animal you killed, a set of traveler''s clothes, and a belt pouch containing 10 gp',
    'You have an excellent memory for maps and geography, and you can always recall the general layout of terrain, settlements, and other features around you. In addition, you can find food and fresh water for yourself and up to five other people each day, provided that the land offers berries, small game, water, and so forth.',
    ''
  )
ON CONFLICT (index) DO NOTHING;

