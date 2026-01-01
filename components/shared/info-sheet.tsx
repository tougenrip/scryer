"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Spell, Equipment, Race, DndClass } from "@/hooks/useDndContent";
import { DND_SKILLS, getAbilityModifierString, getAbilityModifier } from "@/lib/utils/character";
import { 
  BookOpen as SpellIcon, 
  Sword, 
  Shield, 
  Zap, 
  Save, 
  Brain, 
  Users, 
  BookOpen,
  Star,
  Info
} from "lucide-react";

// Condition descriptions from D&D 5e
const CONDITION_DESCRIPTIONS: Record<string, string> = {
  "Blinded": "A blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
  "Charmed": "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.",
  "Deafened": "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
  "Frightened": "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear.",
  "Grappled": "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated or if an effect removes the grappled creature from the reach of the grappler or grappling effect.",
  "Incapacitated": "An incapacitated creature can't take actions or reactions.",
  "Invisible": "An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or any tracks it leaves. Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage.",
  "Paralyzed": "A paralyzed creature is incapacitated and can't move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
  "Petrified": "A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). The creature's weight increases by a factor of ten, and it ceases aging. The creature is incapacitated, can't move or speak, and is unaware of its surroundings. Attack rolls against the creature have advantage. The creature automatically fails Strength and Dexterity saving throws. The creature has resistance to all damage. The creature is immune to poison and disease, though a poison or disease already in its system is suspended, not neutralized.",
  "Poisoned": "A poisoned creature has disadvantage on attack rolls and ability checks.",
  "Prone": "A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has advantage.",
  "Restrained": "A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage. The creature has disadvantage on Dexterity saving throws.",
  "Stunned": "A stunned creature is incapacitated, can't move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage.",
  "Unconscious": "An unconscious creature is incapacitated, can't move or speak, and is unaware of its surroundings. The creature drops whatever it's holding and falls prone. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
};

// Type definitions for different content types
export type InfoSheetContent =
  | { type: "spell"; data: Spell }
  | { type: "equipment"; data: Equipment }
  | { type: "ability"; data: { name: string; short: string; score: number } }
  | { type: "saving-throw"; data: { ability: string; short: string; score: number; proficient: boolean; proficiencyBonus: number; description: string; examples: string[] | undefined } }
  | { type: "skill"; data: { name: string; ability: string; score: number; proficient: boolean; expertise: boolean; proficiencyBonus: number; description: string; examples: string[] | undefined } }
  | { type: "condition"; data: { name: string } }
  | { type: "race"; data: Race }
  | { type: "class"; data: DndClass }
  | { type: "trait"; data: { name: string; description: string } }
  | { type: "feature"; data: { name: string; level?: number; description: string; class?: string } };

interface InfoSheetProps {
  content: InfoSheetContent;
  onClose?: () => void;
}

export function InfoSheet({ content, onClose }: InfoSheetProps) {
  const renderContent = () => {
    switch (content.type) {
      case "spell":
        return <SpellInfo spell={content.data} />;
      case "equipment":
        return <EquipmentInfo equipment={content.data} />;
      case "ability":
        return <AbilityInfo ability={content.data} />;
      case "saving-throw":
        return <SavingThrowInfo savingThrow={content.data} />;
      case "skill":
        return <SkillInfo skill={content.data} />;
      case "condition":
        return <ConditionInfo condition={content.data} />;
      case "race":
        return <RaceInfo race={content.data} />;
      case "class":
        return <ClassInfo class={content.data} />;
      case "trait":
        return <TraitInfo trait={content.data} />;
      case "feature":
        return <FeatureInfo feature={content.data} />;
      default:
        return <div>Unknown content type</div>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon(content.type)}
            <CardTitle>{getTitle(content)}</CardTitle>
          </div>
          {content.type === "spell" && content.data.source && (
            <Badge variant={content.data.source === "srd" ? "default" : "secondary"}>
              {content.data.source.toUpperCase()}
            </Badge>
          )}
          {content.type === "equipment" && content.data.source && (
            <Badge variant={content.data.source === "srd" ? "default" : "secondary"}>
              {content.data.source.toUpperCase()}
            </Badge>
          )}
          {content.type === "race" && content.data.source && (
            <Badge variant={content.data.source === "srd" ? "default" : "secondary"}>
              {content.data.source.toUpperCase()}
            </Badge>
          )}
          {content.type === "class" && content.data.source && (
            <Badge variant={content.data.source === "srd" ? "default" : "secondary"}>
              {content.data.source.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {renderContent()}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function getIcon(type: InfoSheetContent["type"]) {
  const iconClass = "h-5 w-5";
  switch (type) {
    case "spell":
      return <SpellIcon className={iconClass} />;
    case "equipment":
      return <Sword className={iconClass} />;
    case "ability":
    case "saving-throw":
      return <Zap className={iconClass} />;
    case "skill":
      return <Brain className={iconClass} />;
    case "condition":
      return <Info className={iconClass} />;
    case "race":
    case "class":
      return <Users className={iconClass} />;
    case "trait":
    case "feature":
      return <Star className={iconClass} />;
    default:
      return <BookOpen className={iconClass} />;
  }
}

function getTitle(content: InfoSheetContent): string {
  switch (content.type) {
    case "spell":
      return content.data.name;
    case "equipment":
      return content.data.name;
    case "ability":
      return content.data.name;
    case "saving-throw":
      return `${content.data.ability} Saving Throw`;
    case "skill":
      return content.data.name;
    case "condition":
      return content.data.name;
    case "race":
      return content.data.name;
    case "class":
      return content.data.name;
    case "trait":
      return content.data.name;
    case "feature":
      return content.data.name;
    default:
      return "Info";
  }
}

// Spell Info Component
function SpellInfo({ spell }: { spell: Spell }) {
  const levelText = spell.level === 0 ? "Cantrip" : `Level ${spell.level}`;
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Badge variant="outline">{levelText}</Badge>
        <Badge variant="secondary">{spell.school}</Badge>
        {spell.concentration && <Badge variant="default">Concentration</Badge>}
        {spell.ritual && <Badge variant="default">Ritual</Badge>}
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-semibold text-muted-foreground">Casting Time</div>
          <div>{spell.casting_time}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Range</div>
          <div>{spell.range}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Components</div>
          <div>{spell.components?.join(", ") || "—"}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Duration</div>
          <div>{spell.duration}</div>
        </div>
      </div>

      {spell.material && (
        <>
          <Separator />
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-1">Material Component</div>
            <div className="text-sm">{spell.material}</div>
          </div>
        </>
      )}

      <Separator />

      <div>
        <div className="font-semibold text-muted-foreground text-sm mb-2">Description</div>
        <div className="text-sm whitespace-pre-wrap">{spell.description}</div>
      </div>

      {spell.higher_level && (
        <>
          <Separator />
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">At Higher Levels</div>
            <div className="text-sm whitespace-pre-wrap">{spell.higher_level}</div>
          </div>
        </>
      )}

      {spell.classes && spell.classes.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Available to Classes</div>
            <div className="flex flex-wrap gap-2">
              {spell.classes.map((cls) => (
                <Badge key={cls} variant="outline">
                  {cls}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Equipment Info Component
function EquipmentInfo({ equipment }: { equipment: Equipment }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{equipment.equipment_category}</Badge>
        {equipment.gear_category && (
          <Badge variant="secondary">{equipment.gear_category}</Badge>
        )}
      </div>

      <Separator />

      {equipment.cost && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold text-muted-foreground">Cost</div>
            <div>
              {equipment.cost.quantity} {equipment.cost.unit}
            </div>
          </div>
          {equipment.weight && (
            <div>
              <div className="font-semibold text-muted-foreground">Weight</div>
              <div>{equipment.weight} lb</div>
            </div>
          )}
        </div>
      )}

      {equipment.description && (
        <>
          <Separator />
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Description</div>
            <div className="text-sm whitespace-pre-wrap">{equipment.description}</div>
          </div>
        </>
      )}

      {/* Weapon Properties */}
      {equipment.weapon_category && (
        <>
          <Separator />
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Weapon Properties</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold text-muted-foreground">Category</div>
                <div>{equipment.weapon_category}</div>
              </div>
              {equipment.weapon_range && (
                <div>
                  <div className="font-semibold text-muted-foreground">Range</div>
                  <div>{equipment.weapon_range}</div>
                </div>
              )}
              {equipment.damage && (
                <div>
                  <div className="font-semibold text-muted-foreground">Damage</div>
                  <div>
                    {equipment.damage.damage_dice} {equipment.damage.damage_type}
                  </div>
                </div>
              )}
              {equipment.properties && Array.isArray(equipment.properties) && equipment.properties.length > 0 && (
                <div>
                  <div className="font-semibold text-muted-foreground">Properties</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {equipment.properties.map((prop: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {prop}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Armor Properties */}
      {equipment.armor_category && (
        <>
          <Separator />
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Armor Properties</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-semibold text-muted-foreground">Category</div>
                <div>{equipment.armor_category}</div>
              </div>
              {equipment.armor_class && (
                <div>
                  <div className="font-semibold text-muted-foreground">Armor Class</div>
                  <div>
                    {typeof equipment.armor_class === "object" 
                      ? `Base ${equipment.armor_class.base}${equipment.armor_class.dex_bonus ? " + Dex" : ""}`
                      : equipment.armor_class}
                  </div>
                </div>
              )}
              {equipment.str_minimum && (
                <div>
                  <div className="font-semibold text-muted-foreground">Strength Minimum</div>
                  <div>{equipment.str_minimum}</div>
                </div>
              )}
              {equipment.stealth_disadvantage && (
                <div>
                  <div className="font-semibold text-muted-foreground">Stealth</div>
                  <div className="text-destructive">Disadvantage</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Ability Info Component
function AbilityInfo({ ability }: { ability: { name: string; short: string; score: number } }) {
  const modifier = getAbilityModifier(ability.score);
  const modifierString = getAbilityModifierString(ability.score);

  return (
    <div className="space-y-4">
      <div className="text-center p-6 bg-muted/30 rounded-lg">
        <div className="text-4xl font-bold mb-2">{ability.score}</div>
        <div className="text-2xl font-semibold">{modifierString}</div>
        <div className="text-sm text-muted-foreground mt-2">Modifier</div>
      </div>

      <Separator />

      <div>
        <div className="font-semibold text-muted-foreground text-sm mb-2">Ability Score</div>
        <div className="text-sm">
          Ability scores represent your character's basic capabilities. Each ability score has a modifier that ranges from -5 to +10. 
          The modifier is calculated as: (Score - 10) / 2, rounded down.
        </div>
      </div>

      <div>
        <div className="font-semibold text-muted-foreground text-sm mb-2">Uses</div>
        <div className="text-sm space-y-1">
          <div>• Saving throws use ability modifiers</div>
          <div>• Skill checks use ability modifiers (plus proficiency if applicable)</div>
          <div>• Attack rolls may use ability modifiers (Strength for melee, Dexterity for ranged)</div>
          <div>• Ability checks use ability modifiers</div>
        </div>
      </div>
    </div>
  );
}

// Saving Throw Info Component
function SavingThrowInfo({ savingThrow }: { savingThrow: { ability: string; short: string; score: number; proficient: boolean; proficiencyBonus: number; description: string; examples: string[] | undefined } }) {
  const abilityMod = getAbilityModifier(savingThrow.score);
  const profMod = (savingThrow.proficient) ? savingThrow.proficiencyBonus : 0;
  const totalMod = abilityMod + profMod;
  const totalModString = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;

  // Format saving throw name (convert kebab-case to Title Case)
  const formatSavingThrowName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  return (
    <div className="space-y-4">
      <div className="text-center p-6 bg-muted/30 rounded-lg">
        <div className="text-2xl font-bold mb-2">{totalModString}</div>
        <div className="text-sm text-muted-foreground">Total Modifier</div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-semibold text-muted-foreground">Saving Throw Name</div>
          <div className="capitalize">{formatSavingThrowName(savingThrow.ability)}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Key Ability</div>
          <div className="capitalize">{savingThrow.ability}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Ability Score</div>
          <div>{savingThrow.score}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Ability Modifier</div>
          <div>{getAbilityModifierString(savingThrow.score)}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Proficiency</div>
          <div>
            {savingThrow.proficient ? (
              <Badge variant="default">Proficient</Badge>
            ) : (
              <span className="text-muted-foreground">Not Proficient</span>
            )}
          </div>
        </div>
        {savingThrow.proficient && (
          <div>
            <div className="font-semibold text-muted-foreground">Proficiency Bonus</div>
            <div>+{savingThrow.proficiencyBonus}</div>
          </div>
        )}
      </div>

      <Separator />

      <div>
        <div className="font-semibold text-muted-foreground text-sm mb-2">Description</div>
        <div className="text-sm">{savingThrow.description}</div>
      </div>

      <Separator />
      <div>
        <div className="font-semibold text-muted-foreground text-sm mb-2">Examples</div>
        <ul className="text-sm space-y-1 list-disc list-inside">
          {savingThrow.examples?.map((example, i) => (
            <li key={i} className="text-muted-foreground">{example}</li>
          ))}
        </ul>
      </div>
      <Separator />
      <div>
        <div className="font-semibold text-muted-foreground text-sm mb-2">About Saving Throws</div>
        <div className="text-sm">
          A saving throw represents an attempt to resist a spell, trap, poison, disease, or similar threat. 
          You don't normally decide to make a saving throw; you are forced to make one because your character is at risk of harm.
        </div>
      </div>

      
    </div>
  );
}

// Skill Info Component
function SkillInfo({ skill }: { skill: { name: string; ability: string; score: number; proficient: boolean; expertise: boolean; proficiencyBonus: number; description: string; examples: string[] | undefined } }) {
  const skillData = DND_SKILLS.find(s => s.name === skill.name);
  const abilityMod = getAbilityModifier(skill.score);
  const profMod = (skill.proficient || skill.expertise) ? skill.proficiencyBonus * (skill.expertise ? 2 : 1) : 0;
  const totalMod = abilityMod + profMod;
  const totalModString = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;

  // Format skill name (convert kebab-case to Title Case)
  const formatSkillName = (name: string) => {
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-4">
      <div className="text-center p-6 bg-muted/30 rounded-lg">
        <div className="text-2xl font-bold mb-2">{totalModString}</div>
        <div className="text-sm text-muted-foreground">Total Modifier</div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="font-semibold text-muted-foreground">Skill Name</div>
          <div>{formatSkillName(skill.name)}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Key Ability</div>
          <div className="capitalize">{skill.ability}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Ability Score</div>
          <div>{skill.score}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Ability Modifier</div>
          <div>{getAbilityModifierString(skill.score)}</div>
        </div>
        <div>
          <div className="font-semibold text-muted-foreground">Proficiency</div>
          <div>
            {skill.expertise ? (
              <Badge variant="default">Expertise</Badge>
            ) : skill.proficient ? (
              <Badge variant="secondary">Proficient</Badge>
            ) : (
              <span className="text-muted-foreground">Not Proficient</span>
            )}
          </div>
        </div>
        {(skill.proficient || skill.expertise) && (
          <div>
            <div className="font-semibold text-muted-foreground">Proficiency Bonus</div>
            <div>+{skill.proficiencyBonus * (skill.expertise ? 2 : 1)}</div>
          </div>
        )}
      </div>

      <Separator />

      {skill.description && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Description</div>
            <div className="text-sm">{skill.description}</div>
          </div>
          <Separator />
        </>
      )}

      {skill.examples && skill.examples.length > 0 && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Examples</div>
            <ul className="text-sm space-y-1 list-disc list-inside">
              {skill.examples.map((example, i) => (
                <li key={i} className="text-muted-foreground">{example}</li>
              ))}
            </ul>
          </div>
          <Separator />
        </>
      )}

      <div>
        <div className="font-semibold text-muted-foreground text-sm mb-2">About Skills</div>
        <div className="text-sm">
          Skills represent areas of expertise. When you make a skill check, you roll a d20 and add your ability modifier 
          for the skill's key ability, plus your proficiency bonus if you're proficient in the skill. Expertise doubles your proficiency bonus.
        </div>
      </div>
    </div>
  );
}

// Condition Info Component
function ConditionInfo({ condition }: { condition: { name: string } }) {
  const description = CONDITION_DESCRIPTIONS[condition.name] || "No description available.";

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="font-semibold mb-2">{condition.name}</div>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</div>
      </div>

      <Separator />

      <div>
        <div className="font-semibold text-muted-foreground text-sm mb-2">About Conditions</div>
        <div className="text-sm">
          Conditions alter a creature's capabilities in a variety of ways and can arise from spells, 
          class features, monster abilities, or other effects. Most conditions, such as blinded, are 
          impediments, but a few, such as invisible, can be advantageous.
        </div>
      </div>
    </div>
  );
}

// Race Info Component
function RaceInfo({ race }: { race: Race }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {race.size && <Badge variant="outline">{race.size}</Badge>}
        {race.speed && <Badge variant="secondary">Speed: {race.speed} ft</Badge>}
      </div>

      <Separator />

      {race.ability_bonuses && Array.isArray(race.ability_bonuses) && race.ability_bonuses.length > 0 && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Ability Score Bonuses</div>
            <div className="flex flex-wrap gap-2">
              {race.ability_bonuses.map((bonus: any, i: number) => (
                <Badge key={i} variant="default">
                  {bonus.ability} +{bonus.bonus}
                </Badge>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {race.size_description && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Size</div>
            <div className="text-sm">{race.size_description}</div>
          </div>
          <Separator />
        </>
      )}

      {race.traits && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Racial Traits</div>
            <div className="space-y-2 text-sm">
              {Array.isArray(race.traits) ? (
                race.traits.map((trait: any, i: number) => (
                  <div key={i} className="p-2 bg-muted/30 rounded">
                    <div className="font-semibold">{trait.name || `Trait ${i + 1}`}</div>
                    <div className="text-muted-foreground mt-1">
                      {typeof trait === "string" ? trait : trait.desc || JSON.stringify(trait)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">{String(race.traits)}</div>
              )}
            </div>
          </div>
          <Separator />
        </>
      )}

      {race.languages && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Languages</div>
            <div className="text-sm">
              {race.language_desc || (Array.isArray(race.languages) ? race.languages.join(", ") : String(race.languages))}
            </div>
          </div>
          {race.subraces && race.subraces.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="font-semibold text-muted-foreground text-sm mb-2">Subraces</div>
                <div className="flex flex-wrap gap-2">
                  {race.subraces.map((subrace) => (
                    <Badge key={subrace} variant="outline">
                      {subrace}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Class Info Component
function ClassInfo({ class: characterClass }: { class: DndClass }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">Hit Die: d{characterClass.hit_die}</Badge>
        {characterClass.saving_throws && characterClass.saving_throws.length > 0 && (
          <Badge variant="secondary">
            Saves: {characterClass.saving_throws.join(", ")}
          </Badge>
        )}
      </div>

      <Separator />

      {characterClass.saving_throws && characterClass.saving_throws.length > 0 && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Saving Throw Proficiencies</div>
            <div className="flex flex-wrap gap-2">
              {characterClass.saving_throws.map((save) => (
                <Badge key={save} variant="default">
                  {save}
                </Badge>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {characterClass.proficiencies && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Proficiencies</div>
            <div className="text-sm">
              {typeof characterClass.proficiencies === "object" 
                ? JSON.stringify(characterClass.proficiencies)
                : String(characterClass.proficiencies)}
            </div>
          </div>
          <Separator />
        </>
      )}

      {characterClass.subclasses && characterClass.subclasses.length > 0 && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Available Subclasses</div>
            <div className="flex flex-wrap gap-2">
              {characterClass.subclasses.map((subclass) => (
                <Badge key={subclass} variant="outline">
                  {subclass}
                </Badge>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {characterClass.class_levels && (
        <>
          <div>
            <div className="font-semibold text-muted-foreground text-sm mb-2">Class Features</div>
            <div className="space-y-3 text-sm">
              {(() => {
                const classLevels = characterClass.class_levels as any;
                const features: Array<{ level: number; name: string; description: string }> = [];
                
                // Parse class_levels to extract features
                if (classLevels) {
                  // Handle different data structures
                  const levels = typeof classLevels === 'object' && !Array.isArray(classLevels)
                    ? Object.keys(classLevels).map(key => {
                        const levelNum = parseInt(key.replace('level_', '').replace('level', '')) || parseInt(key) || 1;
                        return { level: levelNum, data: classLevels[key] };
                      }).sort((a, b) => a.level - b.level)
                    : Array.isArray(classLevels)
                    ? classLevels.map((data: any, idx: number) => ({ level: idx + 1, data }))
                    : [];
                  
                  levels.forEach(({ level, data }) => {
                    if (!data) return;
                    
                    // Extract features
                    if (data.features) {
                      if (Array.isArray(data.features)) {
                        data.features.forEach((feat: any) => {
                          if (typeof feat === 'string') {
                            features.push({ level, name: feat, description: '' });
                          } else if (feat.name || feat.index) {
                            features.push({
                              level,
                              name: feat.name || feat.index || 'Feature',
                              description: feat.desc || feat.description || ''
                            });
                          }
                        });
                      } else if (typeof data.features === 'object') {
                        Object.entries(data.features).forEach(([key, value]: [string, any]) => {
                          features.push({
                            level,
                            name: value?.name || key,
                            description: value?.desc || value?.description || ''
                          });
                        });
                      }
                    }
                    
                    // Extract feature choices
                    if (data.feature_choices) {
                      if (Array.isArray(data.feature_choices)) {
                        data.feature_choices.forEach((choice: any) => {
                          features.push({
                            level,
                            name: choice.name || 'Feature Choice',
                            description: choice.desc || choice.description || 'Choose a feature'
                          });
                        });
                      }
                    }
                    
                    // Extract class-specific features
                    if (data.class_specific) {
                      Object.entries(data.class_specific).forEach(([key, value]: [string, any]) => {
                        features.push({
                          level,
                          name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                          description: typeof value === 'object' ? JSON.stringify(value) : String(value)
                        });
                      });
                    }
                  });
                }
                
                if (features.length === 0) {
                  return (
                    <div className="text-muted-foreground">
                      Class features are displayed in the character sheet. Level progression information is available in the class levels data.
                    </div>
                  );
                }
                
                // Group features by level
                const featuresByLevel = features.reduce((acc, feat) => {
                  if (!acc[feat.level]) acc[feat.level] = [];
                  acc[feat.level].push(feat);
                  return acc;
                }, {} as Record<number, typeof features>);
                
                return Object.entries(featuresByLevel)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([level, levelFeatures]) => (
                    <div key={level} className="border-l-2 border-primary/30 pl-3">
                      <div className="font-semibold mb-1">Level {level}</div>
                      <div className="space-y-2">
                        {levelFeatures.map((feat, idx) => (
                          <div key={idx} className="pl-2">
                            <div className="font-medium">{feat.name}</div>
                            {feat.description && (
                              <div className="text-muted-foreground text-xs mt-0.5">
                                {feat.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Trait Info Component
function TraitInfo({ trait }: { trait: { name: string; description: string } }) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="font-semibold mb-2">{trait.name}</div>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{trait.description}</div>
      </div>
    </div>
  );
}

// Feature Info Component
function FeatureInfo({ feature }: { feature: { name: string; level?: number; description: string; class?: string } }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {feature.level !== undefined && (
          <Badge variant="outline">Level {feature.level}</Badge>
        )}
        {feature.class && (
          <Badge variant="secondary">{feature.class}</Badge>
        )}
      </div>

      <Separator />

      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="font-semibold mb-2">{feature.name}</div>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">{feature.description}</div>
      </div>
    </div>
  );
}

