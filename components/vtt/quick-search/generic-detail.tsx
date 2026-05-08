"use client";

import {
  ParchmentTitle,
  ParchmentSection,
  ParchmentLabel,
  ParchmentRule,
} from "./parchment";
import type {
  Spell,
  Equipment,
  Race,
  DndClass,
  SrdFeature,
} from "@/hooks/useDndContent";

const CONDITION_DESCRIPTIONS: Record<string, string> = {
  blinded: "A blinded creature can't see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
  charmed: "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.",
  deafened: "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
  frightened: "A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear.",
  grappled: "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated, or if an effect removes the grappled creature from the reach of the grappler.",
  incapacitated: "An incapacitated creature can't take actions or reactions.",
  invisible: "An invisible creature is impossible to see without the aid of magic or a special sense. For hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or any tracks it leaves. Attack rolls against it have disadvantage, and its attack rolls have advantage.",
  paralyzed: "A paralyzed creature is incapacitated and can't move or speak. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against it have advantage. Any attack that hits is a critical hit if the attacker is within 5 feet.",
  petrified: "A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging. The creature is incapacitated, can't move or speak, and is unaware of its surroundings.",
  poisoned: "A poisoned creature has disadvantage on attack rolls and ability checks.",
  prone: "A prone creature's only movement option is to crawl, unless it stands up. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet.",
  restrained: "A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed. Attack rolls against it have advantage, and its attack rolls have disadvantage. The creature has disadvantage on Dexterity saving throws.",
  stunned: "A stunned creature is incapacitated, can't move, and can speak only falteringly. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against it have advantage.",
  unconscious: "An unconscious creature is incapacitated, can't move or speak, and is unaware of its surroundings. The creature drops whatever it's holding and falls prone. The creature automatically fails Strength and Dexterity saving throws. Attack rolls against it have advantage.",
  exhaustion: "Exhaustion has six levels. Each level adds further penalties: 1) Disadvantage on ability checks. 2) Speed halved. 3) Disadvantage on attack rolls and saving throws. 4) Hit point maximum halved. 5) Speed reduced to 0. 6) Death.",
};

export function SpellDetail({ spell }: { spell: Spell }) {
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{spell.name}</ParchmentTitle>
        <p className="italic text-sm">
          {spell.level === 0 ? "Cantrip" : `${spell.level}${spell.level === 1 ? "st" : spell.level === 2 ? "nd" : spell.level === 3 ? "rd" : "th"}-level`}{" "}
          {spell.school}
        </p>
      </header>
      <ParchmentRule />
      <div className="space-y-1">
        <ParchmentLabel label="Casting Time">{spell.casting_time}</ParchmentLabel>
        <ParchmentLabel label="Range">{spell.range}</ParchmentLabel>
        <ParchmentLabel label="Components">
          {(spell.components ?? []).join(", ")}
          {spell.material ? ` (${spell.material})` : ""}
        </ParchmentLabel>
        <ParchmentLabel label="Duration">{spell.duration}</ParchmentLabel>
      </div>
      <ParchmentRule />
      <div className="space-y-2 text-sm leading-relaxed whitespace-pre-wrap">
        {Array.isArray(spell.description)
          ? (spell.description as string[]).join("\n\n")
          : spell.description ?? ""}
      </div>
      {spell.higher_level && (
        <ParchmentSection title="At Higher Levels">
          <p className="text-sm whitespace-pre-wrap">
            {Array.isArray(spell.higher_level)
              ? (spell.higher_level as string[]).join("\n\n")
              : spell.higher_level}
          </p>
        </ParchmentSection>
      )}
    </div>
  );
}

export function EquipmentDetail({ equipment }: { equipment: Equipment }) {
  const ac = equipment.armor_class as
    | number
    | { base?: number; dex_bonus?: boolean; max_bonus?: number | null }
    | null;
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{equipment.name}</ParchmentTitle>
        <p className="italic text-sm">
          {equipment.equipment_category}
          {equipment.gear_category ? ` — ${equipment.gear_category}` : ""}
        </p>
      </header>
      <ParchmentRule />
      <div className="space-y-1">
        {equipment.cost && (
          <ParchmentLabel label="Cost">
            {(equipment.cost as { quantity?: number; unit?: string }).quantity}{" "}
            {(equipment.cost as { quantity?: number; unit?: string }).unit}
          </ParchmentLabel>
        )}
        {equipment.weight !== null && equipment.weight !== undefined && (
          <ParchmentLabel label="Weight">{equipment.weight} lb</ParchmentLabel>
        )}
        {equipment.damage && (
          <ParchmentLabel label="Damage">
            {(equipment.damage as { damage_dice?: string }).damage_dice}{" "}
            {(() => {
              const dt = (equipment.damage as { damage_type?: unknown })
                .damage_type;
              if (!dt) return "";
              if (typeof dt === "string") return dt;
              const o = dt as { name?: string };
              return o.name ?? "";
            })()}
          </ParchmentLabel>
        )}
        {ac !== null && ac !== undefined && (
          <ParchmentLabel label="Armor Class">
            {typeof ac === "number"
              ? ac
              : `${ac.base ?? 10}${ac.dex_bonus ? ` + Dex${ac.max_bonus ? ` (max ${ac.max_bonus})` : ""}` : ""}`}
          </ParchmentLabel>
        )}
        {equipment.str_minimum ? (
          <ParchmentLabel label="Strength">{equipment.str_minimum}</ParchmentLabel>
        ) : null}
        {equipment.stealth_disadvantage ? (
          <ParchmentLabel label="Stealth">Disadvantage</ParchmentLabel>
        ) : null}
      </div>
      {equipment.description && (
        <>
          <ParchmentRule />
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {equipment.description}
          </p>
        </>
      )}
    </div>
  );
}

export function ConditionDetail({ name }: { name: string }) {
  const key = name.toLowerCase();
  const desc = CONDITION_DESCRIPTIONS[key] ?? "No description available.";
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{name}</ParchmentTitle>
      </header>
      <ParchmentRule />
      <p className="text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

export function RaceDetail({ race }: { race: Race }) {
  const langs = Array.isArray(race.languages)
    ? (race.languages as Array<{ name?: string } | string>)
        .map((l) => (typeof l === "string" ? l : l.name ?? ""))
        .filter(Boolean)
        .join(", ")
    : "";
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{race.name}</ParchmentTitle>
        <p className="italic text-sm">
          {race.size ? `${race.size} race` : "Race"}
          {race.speed ? ` · Speed ${race.speed} ft.` : ""}
        </p>
      </header>
      <ParchmentRule />
      {race.size_description && (
        <ParchmentLabel label="Size">{race.size_description}</ParchmentLabel>
      )}
      {langs && <ParchmentLabel label="Languages">{langs}</ParchmentLabel>}
      {race.language_desc && (
        <p className="text-sm italic leading-relaxed">{race.language_desc}</p>
      )}
    </div>
  );
}

export function ClassDetail({ klass }: { klass: DndClass }) {
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{klass.name}</ParchmentTitle>
        <p className="italic text-sm">
          {klass.hit_die ? `Hit die: d${klass.hit_die}` : "Class"}
        </p>
      </header>
      <ParchmentRule />
      {klass.proficiencies && Array.isArray(klass.proficiencies) && (
        <ParchmentLabel label="Proficiencies">
          {(klass.proficiencies as Array<{ name?: string } | string>)
            .map((p) => (typeof p === "string" ? p : p.name ?? ""))
            .filter(Boolean)
            .join(", ")}
        </ParchmentLabel>
      )}
      {klass.saving_throws && Array.isArray(klass.saving_throws) && (
        <ParchmentLabel label="Saving Throws">
          {(klass.saving_throws as Array<{ name?: string } | string>)
            .map((p) => (typeof p === "string" ? p : p.name ?? ""))
            .filter(Boolean)
            .join(", ")}
        </ParchmentLabel>
      )}
    </div>
  );
}

export function FeatureDetail({ feature }: { feature: SrdFeature }) {
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{feature.name}</ParchmentTitle>
        <p className="italic text-sm">
          {feature.class_index ? feature.class_index : "Feature"}
          {feature.level ? ` · Level ${feature.level}` : ""}
        </p>
      </header>
      <ParchmentRule />
      <p className="text-sm whitespace-pre-wrap leading-relaxed">
        {feature.description ?? "No description."}
      </p>
    </div>
  );
}
