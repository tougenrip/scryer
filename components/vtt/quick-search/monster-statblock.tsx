"use client";

import type { Monster } from "@/hooks/useDndContent";
import {
  ParchmentTitle,
  ParchmentSection,
  ParchmentLabel,
  ParchmentFeature,
  ParchmentRule,
} from "./parchment";
import { getAbilityModifier, getAbilityModifierString } from "@/lib/utils/character";

interface Props {
  monster: Monster;
}

function describeSpeed(speed: unknown): string {
  if (!speed) return "—";
  if (typeof speed === "string") return speed;
  if (typeof speed === "object") {
    return Object.entries(speed as Record<string, unknown>)
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");
  }
  return String(speed);
}

function describeSenses(senses: unknown): string {
  if (!senses) return "—";
  if (typeof senses === "string") return senses;
  if (typeof senses === "object") {
    return Object.entries(senses as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`)
      .join(", ");
  }
  return "—";
}

function formatCr(cr: number): string {
  if (cr === 0.125) return "1/8";
  if (cr === 0.25) return "1/4";
  if (cr === 0.5) return "1/2";
  return String(cr);
}

interface ActionLike {
  name?: string;
  desc?: string;
  description?: string;
}

function actionsList(actions: unknown): ActionLike[] {
  if (!Array.isArray(actions)) return [];
  return actions as ActionLike[];
}

export function MonsterStatblock({ monster }: Props) {
  const abilities: Array<[string, number]> = [
    ["STR", monster.strength],
    ["DEX", monster.dexterity],
    ["CON", monster.constitution],
    ["INT", monster.intelligence],
    ["WIS", monster.wisdom],
    ["CHA", monster.charisma],
  ];

  const typeLine = [
    monster.size,
    monster.subtype ? `${monster.type} (${monster.subtype})` : monster.type,
    monster.alignment,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{monster.name}</ParchmentTitle>
        <p className="italic text-sm text-[#2b1d10]/80">{typeLine}</p>
      </header>

      <ParchmentRule />

      <div className="space-y-1">
        <ParchmentLabel label="Armor Class">{monster.armor_class}</ParchmentLabel>
        <ParchmentLabel label="Hit Points">
          {monster.hit_points}
          {monster.hit_dice ? ` (${monster.hit_dice})` : ""}
        </ParchmentLabel>
        <ParchmentLabel label="Speed">{describeSpeed(monster.speed)}</ParchmentLabel>
      </div>

      <ParchmentRule />

      <div className="grid grid-cols-6 gap-1 text-center bg-[#e8d9b3] rounded">
        {abilities.map(([label]) => (
          <div
            key={`h-${label}`}
            className="py-1 text-xs font-bold text-[#7a1f1f]"
          >
            {label}
          </div>
        ))}
        {abilities.map(([label, val]) => (
          <div key={`v-${label}`} className="py-1 text-sm">
            {val} ({getAbilityModifierString(getAbilityModifier(val))})
          </div>
        ))}
      </div>

      <ParchmentRule />

      <div className="space-y-1">
        {monster.damage_vulnerabilities?.length > 0 && (
          <ParchmentLabel label="Damage Vulnerabilities">
            {monster.damage_vulnerabilities.join(", ")}
          </ParchmentLabel>
        )}
        {monster.damage_resistances?.length > 0 && (
          <ParchmentLabel label="Damage Resistances">
            {monster.damage_resistances.join(", ")}
          </ParchmentLabel>
        )}
        {monster.damage_immunities?.length > 0 && (
          <ParchmentLabel label="Damage Immunities">
            {monster.damage_immunities.join(", ")}
          </ParchmentLabel>
        )}
        {monster.condition_immunities?.length > 0 && (
          <ParchmentLabel label="Condition Immunities">
            {monster.condition_immunities.join(", ")}
          </ParchmentLabel>
        )}
        <ParchmentLabel label="Senses">{describeSenses(monster.senses)}</ParchmentLabel>
        <ParchmentLabel label="Languages">{monster.languages || "—"}</ParchmentLabel>
        <ParchmentLabel label="Challenge">
          {formatCr(monster.challenge_rating)} ({monster.xp ?? 0} XP)
        </ParchmentLabel>
      </div>

      {actionsList(monster.special_abilities).length > 0 && (
        <ParchmentSection title="Traits">
          {actionsList(monster.special_abilities).map((a, i) => (
            <ParchmentFeature
              key={`trait-${i}`}
              name={a.name ?? "Trait"}
              text={a.desc ?? a.description ?? ""}
            />
          ))}
        </ParchmentSection>
      )}

      {actionsList(monster.actions).length > 0 && (
        <ParchmentSection title="Actions">
          {actionsList(monster.actions).map((a, i) => (
            <ParchmentFeature
              key={`act-${i}`}
              name={a.name ?? "Action"}
              text={a.desc ?? a.description ?? ""}
            />
          ))}
        </ParchmentSection>
      )}

      {actionsList(monster.reactions).length > 0 && (
        <ParchmentSection title="Reactions">
          {actionsList(monster.reactions).map((a, i) => (
            <ParchmentFeature
              key={`rct-${i}`}
              name={a.name ?? "Reaction"}
              text={a.desc ?? a.description ?? ""}
            />
          ))}
        </ParchmentSection>
      )}

      {actionsList(monster.legendary_actions).length > 0 && (
        <ParchmentSection title="Legendary Actions">
          {actionsList(monster.legendary_actions).map((a, i) => (
            <ParchmentFeature
              key={`lg-${i}`}
              name={a.name ?? "Legendary"}
              text={a.desc ?? a.description ?? ""}
            />
          ))}
        </ParchmentSection>
      )}
    </div>
  );
}
