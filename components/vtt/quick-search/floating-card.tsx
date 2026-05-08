"use client";

import { useEffect, useRef, useState } from "react";
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
  MagicItemDetail,
  ConditionDetail,
  RaceDetail,
  ClassDetail,
  FeatureDetail,
} from "./generic-detail";
import { PARCHMENT_BG, PARCHMENT_BORDER } from "./parchment";
import { cn } from "@/lib/utils";
import { X, Minus, Square as Maximize } from "lucide-react";

const CARD_WIDTH = 360;
const CARD_MAX_HEIGHT = 540;

interface Props {
  campaignId: string | null;
  card: CardModel;
}

export function FloatingCard({ campaignId, card }: Props) {
  const moveCard = useQuickSearchStore((s) => s.moveCard);
  const closeCard = useQuickSearchStore((s) => s.closeCard);
  const toggleMin = useQuickSearchStore((s) => s.toggleMinimize);

  const headerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    cardX: number;
    cardY: number;
  } | null>(null);

  const [pos, setPos] = useState({ x: card.x, y: card.y });

  // Keep local position in sync if store changes externally
  useEffect(() => {
    setPos({ x: card.x, y: card.y });
  }, [card.x, card.y]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    headerRef.current?.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      cardX: pos.x,
      cardY: pos.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const nx = Math.max(0, dragState.current.cardX + dx);
    const ny = Math.max(0, dragState.current.cardY + dy);
    setPos({ x: nx, y: ny });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
    headerRef.current?.releasePointerCapture(e.pointerId);
    moveCard(card.id, pos.x, pos.y);
    dragState.current = null;
  };

  return (
    <div
      className={cn(
        "fixed z-40 shadow-2xl rounded-md flex flex-col",
        PARCHMENT_BORDER,
        PARCHMENT_BG
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: CARD_WIDTH,
        maxHeight: card.minimized ? undefined : CARD_MAX_HEIGHT,
      }}
    >
      <div
        ref={headerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex items-center gap-1 px-2 py-1 cursor-move bg-[#7a1f1f] text-[#f5ecd7] rounded-t-md select-none"
      >
        <span className="text-[10px] uppercase tracking-wider font-bold flex-1 truncate font-serif">
          {labelForType(card.type)}
        </span>
        <button
          type="button"
          onClick={() => toggleMin(card.id)}
          className="h-5 w-5 flex items-center justify-center hover:bg-white/15 rounded"
          title={card.minimized ? "Restore" : "Minimize"}
        >
          {card.minimized ? <Maximize className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => closeCard(card.id)}
          className="h-5 w-5 flex items-center justify-center hover:bg-white/15 rounded"
          title="Close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {!card.minimized && (
        <div className="overflow-y-auto p-3">
          <CardBody campaignId={campaignId} card={card} />
        </div>
      )}
    </div>
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
    case "magic-items":
      return "Magic Item";
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

  const [magicItem, setMagicItem] = useState<{
    name: string;
    equipment_category: string | null;
    rarity: string | null;
    description: string | null;
    requires_attunement: boolean | string | null;
  } | null>(null);
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
    if (card.type !== "magic-items") return;
    const supabase = createClient();
    void supabase
      .from("srd_magic_items")
      .select("name,equipment_category,rarity,description,requires_attunement")
      .eq("index", card.index)
      .single()
      .then(({ data }) => {
        if (data) setMagicItem(data as typeof magicItem);
      });
  }, [card.type, card.index]);

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
    case "magic-items":
      return magicItem ? (
        <MagicItemDetail item={{ ...magicItem }} />
      ) : (
        <p className="text-xs italic text-[#7a1f1f]">Loading…</p>
      );
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
        <p className="text-xs italic text-[#7a1f1f]">Loading…</p>
      );
    default:
      return null;
  }
}

function Missing() {
  return (
    <p className="text-sm italic text-[#7a1f1f]">
      This entry no longer exists.
    </p>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
