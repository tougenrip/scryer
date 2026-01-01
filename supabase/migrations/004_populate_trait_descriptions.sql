-- Populate trait descriptions from D&D 5e SRD
-- Updates all srd_racial_traits with their official descriptions

UPDATE srd_racial_traits SET description = 
'Accustomed to life underground, you have superior vision in dark and dim conditions. You can see in dim light within 60 feet of you as if it were bright light, and in darkness as if it were dim light. You can''t discern color in darkness, only shades of gray.'
WHERE index = 'darkvision';

UPDATE srd_racial_traits SET description = 
'You have advantage on saving throws against poison, and you have resistance against poison damage.'
WHERE index = 'dwarven-resilience';

UPDATE srd_racial_traits SET description = 
'Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check, instead of your normal proficiency bonus.'
WHERE index = 'stonecunning';

UPDATE srd_racial_traits SET description = 
'You have proficiency with the battleaxe, handaxe, light hammer, and warhammer.'
WHERE index = 'dwarven-combat-training';

UPDATE srd_racial_traits SET description = 
'You gain proficiency with the artisan''s tools of your choice: smith''s tools, brewer''s supplies, or mason''s tools.'
WHERE index = 'tool-proficiency';

UPDATE srd_racial_traits SET description = 
'You have advantage on saving throws against being charmed, and magic can''t put you to sleep.'
WHERE index = 'fey-ancestry';

UPDATE srd_racial_traits SET description = 
'Elves don''t need to sleep. Instead, they meditate deeply, remaining semiconscious, for 4 hours a day. (The Common word for such meditation is "trance.") While meditating, you can dream after a fashion; such dreams are actually mental exercises that have become reflexive through years of practice. After resting in this way, you gain the same benefit that a human does from 8 hours of sleep.'
WHERE index = 'trance';

UPDATE srd_racial_traits SET description = 
'You have proficiency in the Perception skill.'
WHERE index = 'keen-senses';

UPDATE srd_racial_traits SET description = 
'You have advantage on saving throws against being frightened.'
WHERE index = 'brave';

UPDATE srd_racial_traits SET description = 
'You can move through the space of any creature that is of a size larger than yours.'
WHERE index = 'halfling-nimbleness';

UPDATE srd_racial_traits SET description = 
'When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.'
WHERE index = 'lucky';

UPDATE srd_racial_traits SET description = 
'You have draconic ancestry. Choose one type of dragon from the Draconic Ancestry table. Your breath weapon and damage resistance are determined by the dragon type, as shown in the table.'
WHERE index = 'draconic-ancestry';

UPDATE srd_racial_traits SET description = 
'You can use your action to exhale destructive energy. Your draconic ancestry determines the size, shape, and damage type of the exhalation. When you use your breath weapon, each creature in the area of the exhalation must make a saving throw, the type of which is determined by your draconic ancestry. The DC for this saving throw equals 8 + your Constitution modifier + your proficiency bonus. A creature takes 2d6 damage on a failed save, and half as much damage on a successful one. The damage increases to 3d6 at 6th level, 4d6 at 11th level, and 5d6 at 16th level. After you use your breath weapon, you can''t use it again until you complete a short or long rest.'
WHERE index = 'breath-weapon';

UPDATE srd_racial_traits SET description = 
'You have resistance to the damage type associated with your draconic ancestry.'
WHERE index = 'damage-resistance';

UPDATE srd_racial_traits SET description = 
'You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.'
WHERE index = 'gnome-cunning';

UPDATE srd_racial_traits SET description = 
'You gain proficiency in two skills of your choice.'
WHERE index = 'skill-versatility';

UPDATE srd_racial_traits SET description = 
'When you are reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead. You can''t use this feature again until you finish a long rest.'
WHERE index = 'relentless-endurance';

UPDATE srd_racial_traits SET description = 
'When you score a critical hit with a melee weapon attack, you can roll one of the weapon''s damage dice one additional time and add it to the extra damage of the critical hit.'
WHERE index = 'savage-attacks';

UPDATE srd_racial_traits SET description = 
'You gain proficiency in the Intimidation skill.'
WHERE index = 'menacing';

UPDATE srd_racial_traits SET description = 
'You have resistance to fire damage.'
WHERE index = 'hellish-resistance';

UPDATE srd_racial_traits SET description = 
'You know the thaumaturgy cantrip. When you reach 3rd level, you can cast the hellish rebuke spell as a 2nd-level spell once with this trait and regain the ability to do so when you finish a long rest. When you reach 5th level, you can cast the darkness spell once with this trait and regain the ability to do so when you finish a long rest. Charisma is your spellcasting ability for these spells.'
WHERE index = 'infernal-legacy';

