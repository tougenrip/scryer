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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowDownAZ, ArrowUpAZ, Maximize2, Search } from "lucide-react";
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
import { PARCHMENT_BG, PARCHMENT_BORDER } from "./parchment";
import { cn } from "@/lib/utils";

const TABS: Array<{ id: QuickSearchTab; label: string }> = [
  { id: "spells", label: "Spells" },
  { id: "monsters", label: "Monsters" },
  { id: "equipment", label: "Equipment" },
  { id: "conditions", label: "Conditions" },
  { id: "races", label: "Races" },
  { id: "classes", label: "Classes" },
  { id: "features", label: "Features" },
];

const sortableTabs = new Set<QuickSearchTab>([
  "spells",
  "monsters",
  "equipment",
  "races",
  "classes",
  "features",
]);

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
  const [equipmentCategory, setEquipmentCategory] = useState<string>("all");
  const [spellSchool, setSpellSchool] = useState<string>("all");
  const [spellLevel, setSpellLevel] = useState<string>("all"); // "all" | "0".."9"
  const [monsterSize, setMonsterSize] = useState<string>("all");
  const [monsterCr, setMonsterCr] = useState<string>("all");
  const [featureLevel, setFeatureLevel] = useState<string>("all");
  const [featureClass, setFeatureClass] = useState<string>("all");
  const [sortReversed, setSortReversed] = useState(false);

  // Reset query + filters + sort dir when tab changes
  useEffect(() => {
    setQuery("");
    setEquipmentCategory("all");
    setSpellSchool("all");
    setSpellLevel("all");
    setMonsterSize("all");
    setMonsterCr("all");
    setFeatureLevel("all");
    setFeatureClass("all");
    setSortReversed(false);
  }, [activeTab]);

  // Data sources (already merge SRD + homebrew where applicable)
  const { spells } = useSpells(campaignId);
  const { monsters } = useMonsters(campaignId);
  const { equipment } = useEquipment(campaignId);
  const { races } = useRaces(campaignId);
  const { classes } = useClasses(campaignId);

  // Features fetched directly (no existing hook)
  const [features, setFeatures] = useState<FeatureRow[]>([]);

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

  // Distinct equipment sub-categories for the filter dropdown.
  const equipmentCategories = useMemo(() => {
    const set = new Set<string>();
    for (const e of equipment) {
      if (e.equipment_category) set.add(e.equipment_category);
    }
    return ["all", ...Array.from(set).sort()];
  }, [equipment]);

  // Distinct spell schools.
  const spellSchools = useMemo(() => {
    const set = new Set<string>();
    for (const s of spells) {
      if (s.school) set.add(s.school);
    }
    return ["all", ...Array.from(set).sort()];
  }, [spells]);

  // Distinct spell levels (sorted numerically).
  const spellLevels = useMemo(() => {
    const set = new Set<number>();
    for (const s of spells) set.add(s.level ?? 0);
    return ["all", ...Array.from(set).sort((a, b) => a - b).map(String)];
  }, [spells]);

  // Distinct monster sizes — kept in canonical D&D order.
  const SIZE_ORDER = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
  const monsterSizes = useMemo(() => {
    const present = new Set<string>();
    for (const m of monsters) {
      if (m.size) present.add(m.size);
    }
    const ordered = SIZE_ORDER.filter((s) => present.has(s));
    return ["all", ...ordered];
  }, [monsters]);

  // Distinct monster CRs (sorted numerically; 0/⅛/¼/½ first).
  const monsterCrs = useMemo(() => {
    const set = new Set<number>();
    for (const m of monsters) set.add(m.challenge_rating ?? 0);
    return [
      "all",
      ...Array.from(set)
        .sort((a, b) => a - b)
        .map(String),
    ];
  }, [monsters]);

  // Distinct feature levels.
  const featureLevels = useMemo(() => {
    const set = new Set<number>();
    for (const f of features) set.add(f.level ?? 0);
    return ["all", ...Array.from(set).sort((a, b) => a - b).map(String)];
  }, [features]);

  // Distinct feature classes (class_index).
  const featureClasses = useMemo(() => {
    const set = new Set<string>();
    for (const f of features) {
      if (f.class_index) set.add(f.class_index);
    }
    return ["all", ...Array.from(set).sort()];
  }, [features]);

  function formatCr(cr: string): string {
    if (cr === "all") return "All CRs";
    const n = parseFloat(cr);
    if (n === 0.125) return "CR 1/8";
    if (n === 0.25) return "CR 1/4";
    if (n === 0.5) return "CR 1/2";
    return `CR ${n}`;
  }

  // Filter rows
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = <T extends { name: string }>(items: T[]) =>
      q
        ? items.filter((i) => i.name.toLowerCase().includes(q))
        : items;
    const maybeReverse = <T,>(arr: T[]) => (sortReversed ? [...arr].reverse() : arr);
    switch (activeTab) {
      case "spells": {
        // Filter by school + level, then sort cantrip → high level, then name.
        let filtered = match(spells);
        if (spellSchool !== "all") {
          filtered = filtered.filter((s) => s.school === spellSchool);
        }
        if (spellLevel !== "all") {
          const lvl = parseInt(spellLevel, 10);
          filtered = filtered.filter((s) => (s.level ?? 0) === lvl);
        }
        const sorted = [...filtered].sort(
          (a, b) =>
            (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name)
        );
        return maybeReverse(sorted);
      }
      case "monsters": {
        // Filter by size + CR, then sort ascending CR, then name.
        let filtered = match(monsters);
        if (monsterSize !== "all") {
          filtered = filtered.filter((m) => m.size === monsterSize);
        }
        if (monsterCr !== "all") {
          const cr = parseFloat(monsterCr);
          filtered = filtered.filter((m) => (m.challenge_rating ?? 0) === cr);
        }
        const sorted = [...filtered].sort(
          (a, b) =>
            (a.challenge_rating ?? 0) - (b.challenge_rating ?? 0) ||
            a.name.localeCompare(b.name)
        );
        return maybeReverse(sorted);
      }
      case "equipment": {
        // Filter by sub-category, then alphabetical.
        let filtered = match(equipment);
        if (equipmentCategory !== "all") {
          filtered = filtered.filter(
            (e) => e.equipment_category === equipmentCategory
          );
        }
        const sorted = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        return maybeReverse(sorted);
      }
      case "races":
        return maybeReverse([...match(races)].sort((a, b) => a.name.localeCompare(b.name)));
      case "classes":
        return maybeReverse([...match(classes)].sort((a, b) => a.name.localeCompare(b.name)));
      case "features": {
        // Filter by class + level, then sort ascending level → name.
        let filtered = match(features);
        if (featureClass !== "all") {
          filtered = filtered.filter((f) => f.class_index === featureClass);
        }
        if (featureLevel !== "all") {
          const lvl = parseInt(featureLevel, 10);
          filtered = filtered.filter((f) => (f.level ?? 0) === lvl);
        }
        const sorted = [...filtered].sort(
          (a, b) =>
            (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name)
        );
        return maybeReverse(sorted);
      }
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
  }, [activeTab, query, equipmentCategory, spellSchool, spellLevel, monsterSize, monsterCr, featureLevel, featureClass, sortReversed, spells, monsters, equipment, races, classes, features]);

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
  }, [selected, spells, monsters, equipment, races, classes, features]);

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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className={cn("p-5", PARCHMENT_BG)}>
              <div className={cn("rounded-md p-4", PARCHMENT_BORDER, "bg-card")}>
                {detail}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // List view
        <>
          {activeTab === "equipment" && equipmentCategories.length > 1 && (
            <FilterChipRow
              values={equipmentCategories}
              active={equipmentCategory}
              onSelect={setEquipmentCategory}
              labelFor={(v) => (v === "all" ? "All" : v)}
            />
          )}
          {activeTab === "spells" && spellSchools.length > 1 && (
            <FilterChipRow
              values={spellSchools}
              active={spellSchool}
              onSelect={setSpellSchool}
              labelFor={(v) => (v === "all" ? "All schools" : v)}
            />
          )}
          {activeTab === "spells" && spellLevels.length > 1 && (
            <FilterChipRow
              values={spellLevels}
              active={spellLevel}
              onSelect={setSpellLevel}
              labelFor={(v) =>
                v === "all"
                  ? "All levels"
                  : v === "0"
                  ? "Cantrip"
                  : `Lvl ${v}`
              }
            />
          )}
          {activeTab === "monsters" && monsterSizes.length > 1 && (
            <FilterChipRow
              values={monsterSizes}
              active={monsterSize}
              onSelect={setMonsterSize}
              labelFor={(v) => (v === "all" ? "All sizes" : v)}
            />
          )}
          {activeTab === "monsters" && monsterCrs.length > 1 && (
            <FilterChipRow
              values={monsterCrs}
              active={monsterCr}
              onSelect={setMonsterCr}
              labelFor={formatCr}
            />
          )}
          {activeTab === "features" && featureClasses.length > 1 && (
            <FilterChipRow
              values={featureClasses}
              active={featureClass}
              onSelect={setFeatureClass}
              labelFor={(v) => (v === "all" ? "All classes" : v)}
            />
          )}
          {activeTab === "features" && featureLevels.length > 1 && (
            <FilterChipRow
              values={featureLevels}
              active={featureLevel}
              onSelect={setFeatureLevel}
              labelFor={(v) =>
                v === "all" ? "All levels" : `Lvl ${v}`
              }
            />
          )}
          <div className="flex items-center gap-2 px-2 py-2 border-b border-neutral-800">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${TABS.find((t) => t.id === activeTab)?.label.toLowerCase()}…`}
                className="h-8 pl-7 text-sm"
              />
            </div>
            {sortableTabs.has(activeTab) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSortReversed((r) => !r)}
                title={sortReversed ? "Sort ascending" : "Sort descending"}
              >
                {sortReversed ? (
                  <ArrowUpAZ className="h-4 w-4" />
                ) : (
                  <ArrowDownAZ className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
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
          </div>
        </>
      )}
    </div>
  );
}

function FilterChipRow({
  values,
  active,
  onSelect,
  labelFor,
}: {
  values: string[];
  active: string;
  onSelect: (v: string) => void;
  labelFor: (v: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1 px-2 py-2 border-b border-neutral-800">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onSelect(v)}
          className={cn(
            "text-[10px] px-2 py-0.5 rounded font-medium transition-colors capitalize",
            active === v
              ? "bg-amber-500/20 text-amber-400"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {labelFor(v)}
        </button>
      ))}
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
    <p className="italic text-sm text-amber-400">
      This entry no longer exists.
    </p>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
