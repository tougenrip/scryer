"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuickSearchStore, type QuickSearchTab } from "@/lib/store/quick-search-store";
import {
  useSpells,
  useMonsters,
  useEquipment,
  useRaces,
  useClasses,
} from "@/hooks/useDndContent";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Maximize2, Search } from "lucide-react";
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

const TABS: Array<{ id: QuickSearchTab; label: string }> = [
  { id: "spells", label: "Spells" },
  { id: "monsters", label: "Monsters" },
  { id: "equipment", label: "Equipment" },
  { id: "magic-items", label: "Magic" },
  { id: "conditions", label: "Conditions" },
  { id: "races", label: "Races" },
  { id: "classes", label: "Classes" },
  { id: "features", label: "Features" },
];

const CONDITIONS = [
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious",
  "Exhaustion",
];

interface MagicItem {
  id: string;
  index: string;
  name: string;
  equipment_category: string | null;
  rarity: string | null;
  description: string | null;
  requires_attunement: boolean | string | null;
}

interface FeatureRow {
  id: string;
  index: string;
  name: string;
  class_index: string;
  level: number;
  description: string;
  source: "srd";
}

interface QuickSearchPanelProps {
  campaignId: string | null;
}

export function QuickSearchPanel({ campaignId }: QuickSearchPanelProps) {
  const activeTab = useQuickSearchStore((s) => s.activeTab);
  const selected = useQuickSearchStore((s) => s.selected);
  const setTab = useQuickSearchStore((s) => s.setTab);
  const select = useQuickSearchStore((s) => s.select);
  const popOut = useQuickSearchStore((s) => s.popOut);

  const [query, setQuery] = useState("");

  // Reset query when tab changes
  useEffect(() => {
    setQuery("");
  }, [activeTab]);

  // Data sources (already merge SRD + homebrew where applicable)
  const { spells } = useSpells(campaignId);
  const { monsters } = useMonsters(campaignId);
  const { equipment } = useEquipment(campaignId);
  const { races } = useRaces(campaignId);
  const { classes } = useClasses(campaignId);

  // Magic items + features fetched directly (no existing hook)
  const [magicItems, setMagicItems] = useState<MagicItem[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);

  useEffect(() => {
    if (activeTab !== "magic-items" || magicItems.length > 0) return;
    const supabase = createClient();
    void supabase
      .from("srd_magic_items")
      .select("id,index,name,equipment_category,rarity,description,requires_attunement")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setMagicItems(data as MagicItem[]);
      });
  }, [activeTab, magicItems.length]);

  useEffect(() => {
    if (activeTab !== "features" || features.length > 0) return;
    const supabase = createClient();
    void supabase
      .from("srd_features")
      .select("id,index,name,class_index,level,description")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) {
          setFeatures(
            (data as Omit<FeatureRow, "source">[]).map((f) => ({
              ...f,
              source: "srd" as const,
            }))
          );
        }
      });
  }, [activeTab, features.length]);

  // Filter rows
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = <T extends { name: string }>(items: T[]) =>
      q
        ? items.filter((i) => i.name.toLowerCase().includes(q))
        : items;
    switch (activeTab) {
      case "spells":
        return match(spells);
      case "monsters":
        return match(monsters);
      case "equipment":
        return match(equipment);
      case "magic-items":
        return match(magicItems);
      case "races":
        return match(races);
      case "classes":
        return match(classes);
      case "features":
        return match(features);
      case "conditions":
        return q
          ? CONDITIONS.filter((c) => c.toLowerCase().includes(q)).map((c) => ({
              name: c,
              index: c.toLowerCase(),
              source: "srd" as const,
            }))
          : CONDITIONS.map((c) => ({
              name: c,
              index: c.toLowerCase(),
              source: "srd" as const,
            }));
      default:
        return [];
    }
  }, [activeTab, query, spells, monsters, equipment, magicItems, races, classes, features]);

  // Render the chosen entry's detail view
  const detail = useMemo(() => {
    if (!selected) return null;
    switch (selected.type) {
      case "spells": {
        const s = spells.find(
          (x) => x.index === selected.index && x.source === selected.source
        );
        return s ? <SpellDetail spell={s} /> : <NotFound />;
      }
      case "monsters": {
        const m = monsters.find(
          (x) => x.index === selected.index && x.source === selected.source
        );
        return m ? <MonsterStatblock monster={m} /> : <NotFound />;
      }
      case "equipment": {
        const e = equipment.find(
          (x) => x.index === selected.index && x.source === selected.source
        );
        return e ? <EquipmentDetail equipment={e} /> : <NotFound />;
      }
      case "magic-items": {
        const m = magicItems.find((x) => x.index === selected.index);
        return m ? <MagicItemDetail item={m} /> : <NotFound />;
      }
      case "conditions":
        return <ConditionDetail name={capitalize(selected.index)} />;
      case "races": {
        const r = races.find(
          (x) => x.index === selected.index && x.source === selected.source
        );
        return r ? <RaceDetail race={r} /> : <NotFound />;
      }
      case "classes": {
        const c = classes.find(
          (x) => x.index === selected.index && x.source === selected.source
        );
        return c ? <ClassDetail klass={c} /> : <NotFound />;
      }
      case "features": {
        const f = features.find((x) => x.index === selected.index);
        return f ? <FeatureDetail feature={f} /> : <NotFound />;
      }
      default:
        return null;
    }
  }, [selected, spells, monsters, equipment, magicItems, races, classes, features]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-neutral-800 px-2 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "text-xs px-2 py-1 rounded font-medium transition-colors",
              activeTab === t.id
                ? "bg-amber-500/15 text-amber-400"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {selected ? (
        // Detail view with parchment styling
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 px-2 py-1 border-b border-neutral-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => select(null)}
              className="h-7 px-2"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => popOut()}
              className="h-7 px-2"
              title="Open as floating card"
            >
              <Maximize2 className="h-3.5 w-3.5 mr-1" /> Pop out
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className={cn("p-5", PARCHMENT_BG)}>
              <div className={cn("rounded-md p-4", PARCHMENT_BORDER, "bg-[#f5ecd7]/40")}>
                {detail}
              </div>
            </div>
          </ScrollArea>
        </div>
      ) : (
        // List view
        <>
          <div className="px-2 py-2 border-b border-neutral-800">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}…`}
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <ul className="divide-y divide-neutral-800">
              {(rows as Array<{ name: string; index: string; source?: "srd" | "homebrew" } & Record<string, unknown>>).map(
                (r) => (
                  <ResultRow
                    key={`${r.source ?? "srd"}-${r.index}`}
                    row={r}
                    tab={activeTab}
                    onClick={() =>
                      select({
                        type: activeTab,
                        source: (r.source as "srd" | "homebrew") ?? "srd",
                        index: r.index,
                      })
                    }
                  />
                )
              )}
              {rows.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No results.
                </li>
              )}
            </ul>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

function ResultRow({
  row,
  tab,
  onClick,
}: {
  row: { name: string; index: string; source?: "srd" | "homebrew" } & Record<string, unknown>;
  tab: QuickSearchTab;
  onClick: () => void;
}) {
  const sub = subtitle(row, tab);
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2"
      >
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{row.name}</div>
          {sub && (
            <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
          )}
        </div>
        {row.source === "homebrew" && (
          <Badge variant="secondary" className="text-[9px]">
            HB
          </Badge>
        )}
      </button>
    </li>
  );
}

function subtitle(
  row: Record<string, unknown>,
  tab: QuickSearchTab
): string | null {
  switch (tab) {
    case "spells":
      return `${row.level === 0 ? "Cantrip" : `Lv ${row.level}`} · ${row.school}`;
    case "monsters":
      return `CR ${row.challenge_rating ?? "?"} · ${row.type ?? ""}`;
    case "equipment":
      return String(row.equipment_category ?? "");
    case "magic-items":
      return [row.equipment_category, row.rarity].filter(Boolean).join(" · ");
    case "races":
      return String(row.size ?? "");
    case "classes":
      return row.hit_die ? `d${row.hit_die}` : null;
    case "features":
      return `${row.class_index ?? ""} · Lv ${row.level ?? 1}`;
    default:
      return null;
  }
}

function NotFound() {
  return (
    <p className="italic text-sm text-[#7a1f1f]">
      This entry no longer exists.
    </p>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
