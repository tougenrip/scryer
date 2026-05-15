"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Search,
  BookOpen,
  Sparkles,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export interface SpellLite {
  source: "srd" | "homebrew";
  index: string;
  name: string;
  level: number;
  school: string | null;
  casting_time: string | null;
  range: string | null;
  components: string[] | null;
  duration: string | null;
  concentration: boolean | null;
  ritual: boolean | null;
  description: string | null;
  classes: string[] | null;
}

export interface SpellPicks {
  /** Spell `index` values for level-0 picks. */
  cantrips: string[];
  /** Spell `index` values for level ≥ 1 picks, across any level the
   *  class can cast at this character level. */
  leveled: string[];
}

interface Props {
  classIndex: string | null;
  /** Class spellcasting jsonb. Optional — the picker falls back to
   *  hardcoded 5e RAW counts when this is null or missing. */
  spellcasting: {
    cantrips_known?: number[];
    spells_known?: number[];
    spellcasting_ability?: { name?: string; index?: string } | string;
    [k: string]: unknown;
  } | null;
  /** Character level — drives max spell level + count rules. */
  level: number;
  /** Subclass index — drives 1/3-caster unlocks (Eldritch Knight,
   *  Arcane Trickster). Optional; ignored for normal class casters. */
  subclassIndex?: string | null;
  /** Current picks (controlled). */
  value: SpellPicks;
  onChange: (next: SpellPicks) => void;
}

// ── Spell-level access tables (5e RAW) ──────────────────────────────

/** Max spell level a class can cast at a given character level. */
function maxSpellLevel(classIndex: string, level: number): number {
  const c = classIndex.toLowerCase();
  // Full casters
  if (
    c === "wizard" ||
    c === "cleric" ||
    c === "druid" ||
    c === "sorcerer" ||
    c === "bard"
  ) {
    if (level >= 17) return 9;
    if (level >= 15) return 8;
    if (level >= 13) return 7;
    if (level >= 11) return 6;
    if (level >= 9) return 5;
    if (level >= 7) return 4;
    if (level >= 5) return 3;
    if (level >= 3) return 2;
    return 1;
  }
  // Warlock — pact magic, but max level scaling still goes 1→5
  if (c === "warlock") {
    if (level >= 9) return 5;
    if (level >= 7) return 4;
    if (level >= 5) return 3;
    if (level >= 3) return 2;
    return 1;
  }
  // Half casters
  if (c === "paladin" || c === "ranger") {
    if (level < 2) return 0;
    if (level >= 17) return 5;
    if (level >= 13) return 4;
    if (level >= 9) return 3;
    if (level >= 5) return 2;
    return 1;
  }
  return 0;
}

/**
 * D&D Beyond–style spell picker. Sections by spell level (Cantrips,
 * 1st-level, 2nd-level, …) — the player picks up to N cantrips and
 * up to M leveled spells (summed across whatever spell levels they
 * can cast at this character level).
 *
 * Class behaviour is hardcoded against 5e RAW so missing/empty
 * `spellcasting` jsonb in the DB doesn't break casters.
 */
export function SpellPickerStep({
  classIndex,
  spellcasting,
  level,
  subclassIndex,
  value,
  onChange,
}: Props) {
  const [allSpells, setAllSpells] = useState<SpellLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [schoolFilter, setSchoolFilter] = useState<string | "all">("all");

  const rules = useMemo(
    () => deriveRules(classIndex, spellcasting, level, subclassIndex),
    [classIndex, spellcasting, level, subclassIndex]
  );

  // Force-pick any cantrips the subclass mandates (e.g. AT Mage Hand).
  // Runs whenever the rule's forcedCantrips list changes — keeps the
  // value array stable so React's re-render loop doesn't thrash.
  useEffect(() => {
    if (!rules.forcedCantrips || rules.forcedCantrips.length === 0) return;
    const missing = rules.forcedCantrips.filter(
      (idx) => !value.cantrips.includes(idx)
    );
    if (missing.length === 0) return;
    onChange({
      ...value,
      cantrips: Array.from(new Set([...value.cantrips, ...missing])),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rules.forcedCantrips?.join("|")]);

  useEffect(() => {
    if (!classIndex || !rules.castsAtThisLevel) {
      setAllSpells([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("srd_spells")
        .select(
          "index, name, level, school, casting_time, range, components, duration, concentration, ritual, description, classes"
        )
        .lte("level", rules.maxSpellLevel)
        .order("level", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      // EK / AT cast from the WIZARD spell list, not the base class
      // list. `rules.spellPoolClass` overrides the class filter for
      // those subclasses.
      const wantedClass = (rules.spellPoolClass ?? classIndex).toLowerCase();
      const whitelist = rules.schoolWhitelist
        ? new Set(rules.schoolWhitelist.map((s) => s.toLowerCase()))
        : null;
      const rows = ((data ?? []) as Array<Record<string, unknown>>)
        .filter((r) => {
          const cls = r.classes;
          if (!Array.isArray(cls)) return false;
          if (
            !(cls as string[]).some((c) => c.toLowerCase() === wantedClass)
          )
            return false;
          // Apply school whitelist for restricted subclasses. Cantrips
          // are NOT subject to the school filter — both EK and AT
          // pick cantrips from any wizard school.
          if (whitelist && (r.level as number) > 0) {
            const school = (r.school as string | null)?.toLowerCase() ?? "";
            if (!whitelist.has(school)) return false;
          }
          return true;
        })
        .map((r) => ({
          source: "srd" as const,
          index: r.index as string,
          name: r.name as string,
          level: r.level as number,
          school: (r.school as string | null) ?? null,
          casting_time: (r.casting_time as string | null) ?? null,
          range: (r.range as string | null) ?? null,
          components: (r.components as string[] | null) ?? null,
          duration: (r.duration as string | null) ?? null,
          concentration: (r.concentration as boolean | null) ?? null,
          ritual: (r.ritual as boolean | null) ?? null,
          description: (r.description as string | null) ?? null,
          classes: (r.classes as string[] | null) ?? null,
        })) as SpellLite[];
      setAllSpells(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    classIndex,
    rules.castsAtThisLevel,
    rules.maxSpellLevel,
    rules.spellPoolClass,
    // Track whitelist as a stable string so React's deep-equality
    // check on the array reference doesn't refetch on every render.
    rules.schoolWhitelist?.join("|"),
  ]);

  // Group spells by level for sectioned rendering.
  const spellsByLevel = useMemo(() => {
    const map = new Map<number, SpellLite[]>();
    for (const sp of allSpells) {
      const lvl = sp.level;
      if (!map.has(lvl)) map.set(lvl, []);
      map.get(lvl)!.push(sp);
    }
    return map;
  }, [allSpells]);

  const schools = useMemo(() => {
    const s = new Set<string>();
    for (const sp of allSpells) if (sp.school) s.add(sp.school);
    return Array.from(s).sort();
  }, [allSpells]);

  const pickedCantrips = new Set(value.cantrips);
  const pickedLeveled = new Set(value.leveled);

  const forcedCantripSet = new Set(rules.forcedCantrips ?? []);
  const toggle = (kind: "cantrip" | "leveled", index: string) => {
    if (kind === "cantrip") {
      // Forced cantrips (e.g. AT's Mage Hand) can't be removed.
      if (forcedCantripSet.has(index) && pickedCantrips.has(index)) return;
      const next = new Set(pickedCantrips);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (next.size >= rules.cantripsToPick) return;
        next.add(index);
      }
      onChange({ ...value, cantrips: Array.from(next) });
    } else {
      const next = new Set(pickedLeveled);
      if (next.has(index)) {
        next.delete(index);
      } else {
        if (next.size >= rules.leveledToPick) return;
        next.add(index);
      }
      onChange({ ...value, leveled: Array.from(next) });
    }
  };

  // ── Empty / no-spellcaster states ─────────────────────────────────
  if (!classIndex) {
    return (
      <EmptyState
        icon={<BookOpen className="h-8 w-8" />}
        title="Pick a class first"
        body="Spell options appear once you've chosen a class on the previous step."
      />
    );
  }
  if (!rules.castsAtThisLevel) {
    return (
      <EmptyState
        icon={<Sparkles className="h-8 w-8 opacity-50" />}
        title={rules.lockReason ?? "No spellcasting at this level"}
        body={
          rules.unlocksAtLevel
            ? `Your class gains spellcasting at level ${rules.unlocksAtLevel}.`
            : "Your class doesn't cast spells."
        }
      />
    );
  }
  if (rules.cantripsToPick === 0 && rules.leveledToPick === 0 && rules.autoPreparesAll) {
    return (
      <div className="sc-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h3 className="font-serif text-base font-semibold">
            All spells prepared
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {rules.autoPrepareLabel ??
            "Your class prepares its full class spell list each day — no spell picks needed at character creation."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subclass restriction banner — only when EK/AT (or similar)
          gates the spell pool. Keeps players aware of the wizard-list
          + school whitelist + forced-cantrip rules. */}
      {(rules.spellPoolClass || rules.forcedCantrips?.length) && (
        <div className="sc-card border-amber-500/40 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/90">
          <div className="font-semibold uppercase tracking-wider text-[10px] text-amber-300 mb-1">
            Subclass spellcasting
          </div>
          {rules.spellPoolClass && (
            <p>
              You cast from the{" "}
              <span className="font-semibold capitalize">
                {rules.spellPoolClass}
              </span>{" "}
              spell list.
              {rules.schoolWhitelist &&
                ` Leveled spells must be ${rules.schoolWhitelist
                  .map((s) => s[0].toUpperCase() + s.slice(1))
                  .join(" or ")} (cantrips are unrestricted).`}
            </p>
          )}
          {rules.forcedCantrips && rules.forcedCantrips.length > 0 && (
            <p className="mt-1">
              Mandatory cantrip{rules.forcedCantrips.length > 1 ? "s" : ""}:{" "}
              {rules.forcedCantrips
                .map((idx) =>
                  idx
                    .split("-")
                    .map((w) => w[0].toUpperCase() + w.slice(1))
                    .join(" ")
                )
                .join(", ")}{" "}
              (locked, can't be removed).
            </p>
          )}
          {rules.spellPoolClass === "wizard" &&
            rules.schoolWhitelist &&
            rules.schoolWhitelist.length === 2 && (
              <p className="mt-1 italic opacity-80">
                RAW: every few levels you may pick 1 spell from any school
                (this UI doesn't enforce that exception — pick freely and
                track manually).
              </p>
            )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search spells…"
            className="w-full h-8 rounded-md border border-border bg-background pl-7 pr-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <select
          value={schoolFilter}
          onChange={(e) => setSchoolFilter(e.target.value)}
          className="h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          <option value="all">All schools</option>
          {schools.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Cantrips section — default open since picking starts here. */}
      {rules.cantripsToPick > 0 && (
        <SpellSection
          title="Cantrips"
          subtitle={`${pickedCantrips.size} / ${rules.cantripsToPick} picked`}
          spells={applyFilters(spellsByLevel.get(0) ?? [], query, schoolFilter)}
          picked={pickedCantrips}
          atCap={pickedCantrips.size >= rules.cantripsToPick}
          expandedId={expandedId}
          onToggleExpand={(id) =>
            setExpandedId((cur) => (cur === id ? null : id))
          }
          onTogglePick={(idx) => toggle("cantrip", idx)}
          loading={loading}
          error={error}
          defaultOpen
        />
      )}

      {/* Leveled sections — one collapsible per spell level the class
          can cast. Level 1 opens by default; higher levels stay closed
          to keep the picker scannable. */}
      {rules.leveledToPick > 0 &&
        Array.from({ length: rules.maxSpellLevel }, (_, i) => i + 1).map(
          (lvl) => {
            const list = applyFilters(
              spellsByLevel.get(lvl) ?? [],
              query,
              schoolFilter
            );
            return (
              <SpellSection
                key={lvl}
                title={`${ordinal(lvl)}-level spells`}
                subtitle={`${pickedLeveled.size} / ${rules.leveledToPick} total picked`}
                spells={list}
                picked={pickedLeveled}
                atCap={pickedLeveled.size >= rules.leveledToPick}
                expandedId={expandedId}
                onToggleExpand={(id) =>
                  setExpandedId((cur) => (cur === id ? null : id))
                }
                onTogglePick={(idx) => toggle("leveled", idx)}
                loading={loading}
                error={error}
                defaultOpen={lvl === 1}
              />
            );
          }
        )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="sc-card flex flex-col items-center justify-center gap-2 p-8 text-center">
      {icon}
      <h3 className="font-serif text-base font-semibold mt-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{body}</p>
    </div>
  );
}

function SpellSection({
  title,
  subtitle,
  spells,
  picked,
  atCap,
  expandedId,
  onToggleExpand,
  onTogglePick,
  loading,
  error,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  spells: SpellLite[];
  picked: Set<string>;
  atCap: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onTogglePick: (index: string) => void;
  loading: boolean;
  error: string | null;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sc-card p-0 overflow-hidden">
      {/* Collapsible header — click to toggle the section. Counts the
          picks across THIS section so the player can see at a glance
          which spell levels they've actually filled. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <h3 className="font-serif text-base font-semibold flex-1">{title}</h3>
        <Badge variant="outline" className="font-mono text-[10px]">
          {subtitle}
        </Badge>
      </button>

      {!open ? null : (
      <div className="px-3 pb-3">
      {loading ? (
        <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading spells…
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">Could not load spells: {error}</p>
      ) : spells.length === 0 ? (
        <p className="text-sm italic text-muted-foreground p-2">
          No matching spells.
        </p>
      ) : (
        <ul className="space-y-1">
          {spells.map((s) => {
            const isPicked = picked.has(s.index);
            const isExpanded = expandedId === `${title}:${s.index}`;
            const blocked = !isPicked && atCap;
            return (
              <li
                key={s.index}
                className={cn(
                  "rounded-md border transition-colors",
                  isPicked
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/40 bg-muted/10",
                  blocked && "opacity-60"
                )}
              >
                <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => onToggleExpand(`${title}:${s.index}`)}
                    className="flex-1 px-3 py-2 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{s.name}</span>
                      {s.school && (
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase"
                        >
                          {s.school}
                        </Badge>
                      )}
                      {s.ritual && (
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase text-cyan-400 border-cyan-400/40"
                        >
                          Ritual
                        </Badge>
                      )}
                      {s.concentration && (
                        <Badge
                          variant="outline"
                          className="text-[9px] uppercase text-violet-300 border-violet-400/40"
                        >
                          Conc.
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {[s.casting_time, s.range, formatComponents(s.components)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {isExpanded && s.description && (
                      <p className="mt-2 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                        {s.description}
                      </p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePick(s.index)}
                    disabled={blocked}
                    className={cn(
                      "shrink-0 px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors border-l border-border/30",
                      isPicked
                        ? "bg-primary/20 text-primary hover:bg-primary/30"
                        : blocked
                          ? "text-muted-foreground/40 cursor-not-allowed"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                    title={
                      isPicked
                        ? "Remove from picks"
                        : blocked
                          ? "Limit reached — remove another first"
                          : "Add to picks"
                    }
                  >
                    {isPicked ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Picked
                      </span>
                    ) : (
                      "Pick"
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>
      )}
    </div>
  );
}

function applyFilters(
  spells: SpellLite[],
  query: string,
  school: string | "all"
): SpellLite[] {
  const q = query.trim().toLowerCase();
  return spells.filter((s) => {
    if (school !== "all" && s.school?.toLowerCase() !== school.toLowerCase())
      return false;
    if (q && !s.name.toLowerCase().includes(q)) return false;
    return true;
  });
}

function formatComponents(c: string[] | null): string {
  if (!c || c.length === 0) return "";
  return c.join("/");
}

interface PickRules {
  castsAtThisLevel: boolean;
  unlocksAtLevel?: number;
  lockReason?: string;
  /** Max spell level the class can cast at the current character level. */
  maxSpellLevel: number;
  cantripsToPick: number;
  leveledToPick: number;
  autoPreparesAll: boolean;
  autoPrepareLabel?: string;
  /** When the spell pool is a different class's list (e.g. Eldritch
   *  Knight + Arcane Trickster cast from the WIZARD list), this is
   *  the class index to query against. Defaults to the character's
   *  own classIndex. */
  spellPoolClass?: string;
  /** Optional school whitelist (lowercased). When set, only spells
   *  whose `school` matches one of these are eligible. Used for
   *  Eldritch Knight (abjuration/evocation) and Arcane Trickster
   *  (enchantment/illusion). The "free school" exception (EK gets 2
   *  spells outside the restriction) is left to the player's
   *  discretion — UI shows the restricted set + a note. */
  schoolWhitelist?: string[];
  /** Mandatory spell `index` values pre-selected and locked. Used
   *  for Arcane Trickster's required Mage Hand cantrip. */
  forcedCantrips?: string[];
}

/** Translate (class, level) → pick rules. Tolerates null/missing
 *  spellcasting jsonb by falling back to hardcoded 5e RAW counts. */
export function deriveRules(
  classIndex: string | null,
  spellcasting: Props["spellcasting"],
  level: number,
  subclassIndex?: string | null
): PickRules {
  if (!classIndex) {
    return {
      castsAtThisLevel: false,
      cantripsToPick: 0,
      leveledToPick: 0,
      maxSpellLevel: 0,
      autoPreparesAll: false,
    };
  }
  const c = classIndex.toLowerCase();
  const lvlIdx = Math.max(0, level - 1);

  // Fighter / Rogue base classes get spellcasting ONLY from their
  // 1/3-caster subclasses (Eldritch Knight + Arcane Trickster), both
  // unlocking at L3. The picker reads the picked subclass to decide
  // whether to unlock — players who don't pick EK/AT keep the
  // empty-state.
  const sub = subclassIndex?.toLowerCase() ?? "";
  if (c === "fighter") {
    if (sub === "eldritch-knight" || sub === "the-eldritch-knight") {
      if (level < 3) {
        return {
          castsAtThisLevel: false,
          lockReason: "Eldritch Knight spellcasting",
          unlocksAtLevel: 3,
          cantripsToPick: 0,
          leveledToPick: 0,
          maxSpellLevel: 0,
          autoPreparesAll: false,
        };
      }
      // EK is a 1/3 caster: cantrips_known = 2 at L3, scales to 3 at
      // L10. spells_known = 3 at L3, scales up. Max spell level = L4
      // by L20 (1 by L3, 2 by L7, 3 by L13, 4 by L19).
      return {
        castsAtThisLevel: true,
        cantripsToPick: ekCantripsAt(level),
        leveledToPick: ekSpellsKnownAt(level),
        maxSpellLevel: ekMaxSpellLevel(level),
        autoPreparesAll: false,
        spellPoolClass: "wizard",
        schoolWhitelist: ["abjuration", "evocation"],
      };
    }
    // Plain fighter — locked, with the same nudge as before.
    return {
      castsAtThisLevel: false,
      lockReason: "Spellcasting from a subclass (Eldritch Knight)",
      unlocksAtLevel: 3,
      cantripsToPick: 0,
      leveledToPick: 0,
      maxSpellLevel: 0,
      autoPreparesAll: false,
    };
  }
  if (c === "rogue") {
    if (sub === "arcane-trickster" || sub === "the-arcane-trickster") {
      if (level < 3) {
        return {
          castsAtThisLevel: false,
          lockReason: "Arcane Trickster spellcasting",
          unlocksAtLevel: 3,
          cantripsToPick: 0,
          leveledToPick: 0,
          maxSpellLevel: 0,
          autoPreparesAll: false,
        };
      }
      // AT is a 1/3 caster: cantrips_known = 3 (incl. mandatory Mage
      // Hand) at L3, scales up. spells_known = 3 at L3.
      return {
        castsAtThisLevel: true,
        cantripsToPick: atCantripsAt(level),
        leveledToPick: atSpellsKnownAt(level),
        maxSpellLevel: atMaxSpellLevel(level),
        autoPreparesAll: false,
        spellPoolClass: "wizard",
        schoolWhitelist: ["enchantment", "illusion"],
        forcedCantrips: ["mage-hand"],
      };
    }
    return {
      castsAtThisLevel: false,
      lockReason: "Spellcasting from a subclass (Arcane Trickster)",
      unlocksAtLevel: 3,
      cantripsToPick: 0,
      leveledToPick: 0,
      maxSpellLevel: 0,
      autoPreparesAll: false,
    };
  }
  if (c === "barbarian" || c === "monk") {
    return {
      castsAtThisLevel: false,
      lockReason: "No spellcasting",
      cantripsToPick: 0,
      leveledToPick: 0,
      maxSpellLevel: 0,
      autoPreparesAll: false,
    };
  }
  if ((c === "paladin" || c === "ranger") && level < 2) {
    return {
      castsAtThisLevel: false,
      lockReason: "Half-caster",
      unlocksAtLevel: 2,
      cantripsToPick: 0,
      leveledToPick: 0,
      maxSpellLevel: 0,
      autoPreparesAll: false,
    };
  }

  const maxLvl = maxSpellLevel(c, level);

  // Per-class hardcoded RAW rules. Falls back to spellcasting jsonb
  // counts when present, otherwise to canonical 5e numbers.
  const cantripsFromJsonb =
    spellcasting?.cantrips_known?.[lvlIdx] ??
    spellcasting?.cantrips_known?.[0];
  const knownFromJsonb =
    spellcasting?.spells_known?.[lvlIdx] ?? spellcasting?.spells_known?.[0];

  // Wizard — spellbook grows by 2 per level beyond first.
  if (c === "wizard") {
    return {
      castsAtThisLevel: true,
      cantripsToPick: cantripsFromJsonb ?? wizardCantripsAt(level),
      // Spellbook: 6 at L1 + 2 per extra level.
      leveledToPick: 6 + Math.max(0, level - 1) * 2,
      maxSpellLevel: maxLvl,
      autoPreparesAll: false,
    };
  }

  // Cleric / Druid — prepared full casters. Cantrips only at creation;
  // 1st-level spells (and onward) auto-prepare from full class list.
  if (c === "cleric" || c === "druid") {
    return {
      castsAtThisLevel: true,
      cantripsToPick: cantripsFromJsonb ?? (c === "cleric" ? clericCantripsAt(level) : druidCantripsAt(level)),
      leveledToPick: 0,
      maxSpellLevel: maxLvl,
      autoPreparesAll: true,
      autoPrepareLabel:
        "You prepare a number of leveled spells from your class list each day; no leveled picks at creation.",
    };
  }

  // Paladin — prepared, no cantrips.
  if (c === "paladin") {
    return {
      castsAtThisLevel: true,
      cantripsToPick: 0,
      leveledToPick: 0,
      maxSpellLevel: maxLvl,
      autoPreparesAll: true,
      autoPrepareLabel:
        "Paladins prepare from their class list each day — no picks at creation.",
    };
  }

  // Ranger — known-list, no cantrips by RAW (2014).
  if (c === "ranger") {
    return {
      castsAtThisLevel: true,
      cantripsToPick: 0,
      leveledToPick: knownFromJsonb ?? rangerSpellsKnownAt(level),
      maxSpellLevel: maxLvl,
      autoPreparesAll: false,
    };
  }

  // Sorcerer / Bard — known-list with cantrips.
  if (c === "sorcerer") {
    return {
      castsAtThisLevel: true,
      cantripsToPick: cantripsFromJsonb ?? sorcererCantripsAt(level),
      leveledToPick: knownFromJsonb ?? sorcererSpellsKnownAt(level),
      maxSpellLevel: maxLvl,
      autoPreparesAll: false,
    };
  }
  if (c === "bard") {
    return {
      castsAtThisLevel: true,
      cantripsToPick: cantripsFromJsonb ?? bardCantripsAt(level),
      leveledToPick: knownFromJsonb ?? bardSpellsKnownAt(level),
      maxSpellLevel: maxLvl,
      autoPreparesAll: false,
    };
  }
  if (c === "warlock") {
    return {
      castsAtThisLevel: true,
      cantripsToPick: cantripsFromJsonb ?? warlockCantripsAt(level),
      leveledToPick: knownFromJsonb ?? warlockSpellsKnownAt(level),
      maxSpellLevel: maxLvl,
      autoPreparesAll: false,
    };
  }

  // Unknown class — try the jsonb if any, else nothing.
  if (spellcasting) {
    return {
      castsAtThisLevel: true,
      cantripsToPick: cantripsFromJsonb ?? 0,
      leveledToPick: knownFromJsonb ?? 0,
      maxSpellLevel: maxLvl,
      autoPreparesAll: false,
    };
  }

  return {
    castsAtThisLevel: false,
    lockReason: "No spellcasting",
    cantripsToPick: 0,
    leveledToPick: 0,
    maxSpellLevel: 0,
    autoPreparesAll: false,
  };
}

// ── Canonical 5e RAW count tables ──────────────────────────────────
// Indexed by character level - 1.

function pick(arr: number[], level: number): number {
  return arr[Math.max(0, Math.min(arr.length - 1, level - 1))];
}

const WIZARD_CANTRIPS = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
const CLERIC_CANTRIPS = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
const DRUID_CANTRIPS = [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
const SORCERER_CANTRIPS = [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6];
const BARD_CANTRIPS = [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
const WARLOCK_CANTRIPS = [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];

const SORCERER_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15];
const BARD_KNOWN = [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22];
const WARLOCK_KNOWN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];
const RANGER_KNOWN = [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11];

function wizardCantripsAt(level: number) { return pick(WIZARD_CANTRIPS, level); }
function clericCantripsAt(level: number) { return pick(CLERIC_CANTRIPS, level); }
function druidCantripsAt(level: number) { return pick(DRUID_CANTRIPS, level); }
function sorcererCantripsAt(level: number) { return pick(SORCERER_CANTRIPS, level); }
function bardCantripsAt(level: number) { return pick(BARD_CANTRIPS, level); }
function warlockCantripsAt(level: number) { return pick(WARLOCK_CANTRIPS, level); }
function sorcererSpellsKnownAt(level: number) { return pick(SORCERER_KNOWN, level); }
function bardSpellsKnownAt(level: number) { return pick(BARD_KNOWN, level); }
function warlockSpellsKnownAt(level: number) { return pick(WARLOCK_KNOWN, level); }
function rangerSpellsKnownAt(level: number) { return pick(RANGER_KNOWN, level); }

// ── Eldritch Knight (Fighter) — 1/3 caster ─────────────────────────
// PHB tables. Cantrips: 2 from L3, 3 from L10. Spells known: 3 at
// L3, 4 at L4, 5 at L7, 6 at L8, 7 at L10, 8 at L11, 9 at L13, 10
// at L14, 11 at L16, 12 at L17, 13 at L19, 14 at L20.
// Indexed by character level - 1 (slots 0..2 are 0 since L1+L2 are
// pre-unlock; the deriveRules branch returns the locked state for
// those levels, so the table value isn't actually read until L3).
const EK_CANTRIPS = [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
const EK_KNOWN    = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
function ekCantripsAt(level: number) { return pick(EK_CANTRIPS, level); }
function ekSpellsKnownAt(level: number) { return pick(EK_KNOWN, level); }
function ekMaxSpellLevel(level: number): number {
  if (level >= 19) return 4;
  if (level >= 13) return 3;
  if (level >= 7) return 2;
  if (level >= 3) return 1;
  return 0;
}

// ── Arcane Trickster (Rogue) — 1/3 caster ──────────────────────────
// PHB tables. Cantrips: 3 from L3, 4 from L10. Spells known scales
// from 3 (L3) to 13 (L20). Mage Hand is mandatory among cantrips.
const AT_CANTRIPS = [0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
const AT_KNOWN    = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
function atCantripsAt(level: number) { return pick(AT_CANTRIPS, level); }
function atSpellsKnownAt(level: number) { return pick(AT_KNOWN, level); }
function atMaxSpellLevel(level: number): number {
  if (level >= 19) return 4;
  if (level >= 13) return 3;
  if (level >= 7) return 2;
  if (level >= 3) return 1;
  return 0;
}
