"use client";

import { useEffect, useState } from "react";
import { useQuickSearchStore, type FloatingCard as CardModel } from "@/lib/store/quick-search-store";
import {
  useSpells,
  useMonsters,
  useEquipment,
  useRaces,
  useClasses,
} from "@/hooks/useDndContent";
import { createClient } from "@/lib/supabase/client";
import { MonsterStatblock } from "./monster-statblock";
import {
  SpellDetail,
  EquipmentDetail,
  ConditionDetail,
  RaceDetail,
  ClassDetail,
  FeatureDetail,
} from "./generic-detail";
import { FloatingCardShell } from "../floating-card-shell";

interface Props {
  campaignId: string | null;
  card: CardModel;
}

export function FloatingCard({ campaignId, card }: Props) {
  const moveCard = useQuickSearchStore((s) => s.moveCard);
  const closeCard = useQuickSearchStore((s) => s.closeCard);
  const resizeCard = useQuickSearchStore((s) => s.resizeCard);
  const focusCard = useQuickSearchStore((s) => s.focusCard);

  return (
    <FloatingCardShell
      cardId={card.id}
      x={card.x}
      y={card.y}
      width={card.width}
      height={card.height}
      label={labelForType(card.type)}
      onMove={moveCard}
      onResize={resizeCard}
      onClose={closeCard}
      onFocus={focusCard}
    >
      <CardBody campaignId={campaignId} card={card} />
    </FloatingCardShell>
  );
}

function labelForType(t: CardModel["type"]): string {
  switch (t) {
    case "spells":
      return "Spell";
    case "monsters":
      return "Monster";
    case "equipment":
      return "Equipment";
    case "conditions":
      return "Condition";
    case "races":
      return "Race";
    case "classes":
      return "Class";
    case "features":
      return "Feature";
  }
}

function CardBody({ campaignId, card }: { campaignId: string | null; card: CardModel }) {
  const { spells } = useSpells(campaignId);
  const { monsters } = useMonsters(campaignId);
  const { equipment } = useEquipment(campaignId);
  const { races } = useRaces(campaignId);
  const { classes } = useClasses(campaignId);

  const [feature, setFeature] = useState<{
    name: string;
    class_index: string;
    level: number;
    description: string;
    index: string;
    id: string;
    subclass_index: string | null;
    feature_specific: unknown;
    created_at: string;
  } | null>(null);

  useEffect(() => {
    if (card.type !== "features") return;
    const supabase = createClient();
    void supabase
      .from("srd_features")
      .select("*")
      .eq("index", card.index)
      .single()
      .then(({ data }) => {
        if (data) setFeature(data as typeof feature);
      });
  }, [card.type, card.index]);

  switch (card.type) {
    case "spells": {
      const s = spells.find((x) => x.index === card.index && x.source === card.source);
      return s ? <SpellDetail spell={s} /> : <Missing />;
    }
    case "monsters": {
      const m = monsters.find((x) => x.index === card.index && x.source === card.source);
      return m ? <MonsterStatblock monster={m} /> : <Missing />;
    }
    case "equipment": {
      const e = equipment.find((x) => x.index === card.index && x.source === card.source);
      return e ? <EquipmentDetail equipment={e} /> : <Missing />;
    }
    case "conditions":
      return <ConditionDetail name={capitalize(card.index)} />;
    case "races": {
      const r = races.find((x) => x.index === card.index && x.source === card.source);
      return r ? <RaceDetail race={r} /> : <Missing />;
    }
    case "classes": {
      const c = classes.find((x) => x.index === card.index && x.source === card.source);
      return c ? <ClassDetail klass={c} /> : <Missing />;
    }
    case "features":
      return feature ? (
        <FeatureDetail feature={feature} />
      ) : (
        <p className="text-xs italic text-amber-400">Loading…</p>
      );
    default:
      return null;
  }
}

function Missing() {
  return (
    <p className="text-sm italic text-amber-400">
      This entry no longer exists.
    </p>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
