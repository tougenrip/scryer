"use client";

import { useEffect, useMemo, useState } from "react";
import type { Race } from "@/hooks/useDndContent";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Props {
  /** The currently-selected race row from the picker. May be a
   *  parent race OR a subrace (both live in the same table). */
  race: Race | null | undefined;
  /** Full race list so we can resolve subrace indexes → rows. */
  allRaces: Race[];
  /** Click a subrace chip → swap selection to the subrace row. */
  onSelectRace: (race: Race) => void;
}

/** Normalised ability bonus row used by the renderer. */
interface NormalizedBonus {
  label: string;
  bonus: number;
}

/** Normalised trait row used by the renderer. */
interface NormalizedTrait {
  name: string;
  description: string;
  /** True when the trait comes from a parent race (i.e. we're showing
   *  it on a subrace and want to label it "Inherited"). */
  inherited?: boolean;
}

/**
 * Persistent right-pane detail panel for the Race step. Replaces the
 * old Info modal — surfaces ability bonuses, traits, languages, and
 * an interactive subrace picker without breaking the player's flow.
 *
 * When viewing a SUBRACE (e.g. Hill Dwarf) the panel also merges in
 * the PARENT race's ability bonuses + traits so the player sees the
 * full effective package, matching RAW (subraces inherit parent
 * features). Inherited traits get an "Inherited" tag so it's clear
 * what comes from where.
 */
export function RaceDetailPanel({ race, allRaces, onSelectRace }: Props) {
  // Resolve subraces. Parent race lists indexes in `subraces`; the
  // actual rows live in the same race list.
  // ── All hooks must run unconditionally on every render ─────────────
  // (Rules of Hooks — early-returning before some of them caused the
  //  hook-order drift error.) Plain (non-hook) computations stay
  //  below the early-return.
  const subraces = useMemo(() => {
    if (!race?.subraces?.length) return [];
    const wanted = new Set(race.subraces);
    return allRaces.filter(
      (r) => wanted.has(r.index) && r.source === race.source
    );
  }, [race, allRaces]);

  // If this race IS a subrace, surface its parent for context.
  const parent = useMemo(() => {
    if (!race) return null;
    return (
      allRaces.find(
        (r) =>
          r.source === race.source &&
          Array.isArray(r.subraces) &&
          r.subraces.includes(race.index)
      ) ?? null
    );
  }, [race, allRaces]);

  // Sibling subraces when viewing a subrace — lets the player swap
  // between Hill/Mountain Dwarf without backing out to the parent.
  const siblingSubraces = useMemo(() => {
    if (!parent?.subraces?.length) return [];
    const wanted = new Set(parent.subraces);
    return allRaces.filter(
      (r) => wanted.has(r.index) && r.source === parent.source
    );
  }, [parent, allRaces]);

  // Trait-index list (string-typed traits only — object traits already
  // carry their own descriptions). Includes BOTH the current race's
  // string-traits AND any parent's string-traits when viewing a
  // subrace, since we need both resolved.
  const traitIndexes = useMemo(() => {
    const collect = (r: Race | null): string[] => {
      if (!r?.traits || !Array.isArray(r.traits)) return [];
      return r.traits.filter((t): t is string => typeof t === "string");
    };
    return Array.from(new Set([...collect(race ?? null), ...collect(parent)]));
  }, [race, parent]);

  const [traitLookup, setTraitLookup] = useState<
    Record<string, { name: string; description: string | null }>
  >({});

  useEffect(() => {
    if (traitIndexes.length === 0) {
      setTraitLookup({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("srd_racial_traits")
        .select("index, name, description")
        .in("index", traitIndexes);
      if (cancelled) return;
      if (error || !data) return;
      const map: Record<string, { name: string; description: string | null }> = {};
      for (const row of data as Array<{
        index: string;
        name: string;
        description: string | null;
      }>) {
        map[row.index] = { name: row.name, description: row.description };
      }
      setTraitLookup(map);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [traitIndexes.join("|")]);

  // ── End of hooks. Early-return + derived values below ──────────────
  if (!race) {
    return (
      <div className="sc-card flex h-full min-h-[280px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Pick a race to see its traits, languages, and subraces.
      </div>
    );
  }

  // Normalise ability_bonuses across the 4 shapes we've seen in the
  // wild. Reused for both `race` and `parent` so the renderer can
  // merge them without duplicating the parsing logic.
  const normalizeBonuses = (raw: unknown): NormalizedBonus[] => {
    let value = raw;
    if (typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch {
        value = [];
      }
    }
    if (Array.isArray(value)) {
      return value
        .map((b) => {
          const obj = b as {
            ability_score?: { index?: string; name?: string } | string;
            ability?: string;
            bonus?: number;
          };
          const label =
            typeof obj.ability_score === "object"
              ? obj.ability_score?.name ?? obj.ability_score?.index ?? ""
              : (obj.ability_score as string) ?? obj.ability ?? "";
          return { label: String(label).toUpperCase().slice(0, 3), bonus: obj.bonus ?? 0 };
        })
        .filter((b) => b.label && b.bonus !== 0);
    }
    if (value && typeof value === "object") {
      return Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => ({
          label: k.toUpperCase().slice(0, 3),
          bonus: typeof v === "number" ? v : Number(v) || 0,
        }))
        .filter((b) => b.bonus !== 0);
    }
    return [];
  };

  const normalizeTraits = (
    raw: unknown,
    inherited: boolean
  ): NormalizedTrait[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((t): NormalizedTrait | null => {
        if (typeof t === "string") {
          const resolved = traitLookup[t];
          return {
            name: resolved?.name ?? t.replace(/-/g, " "),
            description: resolved?.description ?? "",
            inherited,
          };
        }
        const obj = t as {
          name?: string;
          desc?: string | string[];
          description?: string | string[];
          text?: string | string[];
        };
        const rawDesc = obj.desc ?? obj.description ?? obj.text;
        const description = Array.isArray(rawDesc)
          ? rawDesc.join("\n\n")
          : typeof rawDesc === "string"
            ? rawDesc
            : "";
        return {
          name: obj.name ?? "Trait",
          description,
          inherited,
        };
      })
      .filter((t): t is NormalizedTrait => t !== null);
  };

  const ownBonuses = normalizeBonuses(race.ability_bonuses);
  const parentBonuses = parent ? normalizeBonuses(parent.ability_bonuses) : [];
  // Combine but DON'T double-count when subrace duplicates the parent
  // entry (some imports redundantly store both).
  const seenBonusKey = new Set<string>();
  const allBonuses: Array<NormalizedBonus & { inherited?: boolean }> = [];
  for (const b of parentBonuses) {
    const key = `${b.label}:${b.bonus}`;
    if (seenBonusKey.has(key)) continue;
    seenBonusKey.add(key);
    allBonuses.push({ ...b, inherited: true });
  }
  for (const b of ownBonuses) {
    const key = `${b.label}:${b.bonus}`;
    if (seenBonusKey.has(key)) continue;
    seenBonusKey.add(key);
    allBonuses.push(b);
  }

  const ownTraits = normalizeTraits(race.traits, false);
  const parentTraits = parent ? normalizeTraits(parent.traits, true) : [];
  // Dedupe by trait name (case-insensitive) so a subrace re-declaring
  // a parent trait doesn't render twice.
  const seenTraitNames = new Set<string>();
  const allTraits: NormalizedTrait[] = [];
  for (const t of ownTraits) {
    const key = t.name.toLowerCase();
    if (seenTraitNames.has(key)) continue;
    seenTraitNames.add(key);
    allTraits.push(t);
  }
  for (const t of parentTraits) {
    const key = t.name.toLowerCase();
    if (seenTraitNames.has(key)) continue;
    seenTraitNames.add(key);
    allTraits.push(t);
  }

  // Languages: prefer the subrace's own description, fall back to the
  // parent's. (Subraces almost never redeclare languages, so the
  // parent value is usually the correct one.)
  const pickLanguages = (r: Race | null | undefined): string | null => {
    if (!r) return null;
    return (
      r.language_desc ??
      (Array.isArray(r.languages)
        ? (r.languages as unknown[]).map(String).join(", ")
        : typeof r.languages === "string"
          ? r.languages
          : null)
    );
  };
  const languages = pickLanguages(race) ?? pickLanguages(parent);

  // Size pretty-print: 2014 SRD stores "Medium"; some imports store the
  // category number ("3" → Medium). Mirror the picker card's helper.
  const SIZE_NAMES: Record<string, string> = {
    "1": "Tiny", "2": "Small", "3": "Medium", "4": "Large",
    "5": "Huge", "6": "Gargantuan",
  };
  const formatSize = (raw: string | null | undefined): string => {
    if (!raw) return "";
    const trimmed = String(raw).trim();
    const parts = trimmed
      .split(/[\s/|,-]+|\bor\b/i)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts
      .map((p) => SIZE_NAMES[p.toLowerCase()] || p[0].toUpperCase() + p.slice(1))
      .join(" / ");
  };

  // Speed/size fall back to parent when the subrace row is sparse —
  // Hill Dwarf inherits Dwarf's 25 ft unless it overrides.
  const effectiveSpeed =
    typeof race.speed === "number" && race.speed > 0
      ? race.speed
      : typeof parent?.speed === "number"
        ? parent.speed
        : null;
  const effectiveSize = race.size || parent?.size || null;
  const effectiveSizeDescription =
    race.size_description || parent?.size_description || null;

  return (
    <div
      className="sc-card flex flex-col gap-3 p-4 custom-scrollbar"
      // Fills the grid cell (stretched to match cards). Content
      // scrolls internally when it exceeds the cell height.
      style={{ height: "100%", minHeight: 0, overflowY: "auto" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg font-semibold leading-tight">
            {race.name}
          </h3>
          {parent && (
            <p className="text-[11px] text-muted-foreground">
              Subrace of {parent.name}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {race.source}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1">
        {effectiveSize && (
          <Badge variant="outline">{formatSize(effectiveSize) || effectiveSize}</Badge>
        )}
        {effectiveSpeed !== null && (
          <Badge variant="outline">{effectiveSpeed} ft</Badge>
        )}
      </div>

      {/* Ability Bonuses — combines parent + subrace when applicable.
          Inherited rows render in `secondary` so the player can tell
          which bonuses come from the parent at a glance. */}
      <Section title="Ability Bonuses">
        {allBonuses.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {allBonuses.map((b, i) => (
              <Badge
                key={i}
                variant={b.inherited ? "secondary" : "default"}
                className="text-[10px]"
                title={
                  b.inherited
                    ? `Inherited from ${parent?.name ?? "parent race"}`
                    : undefined
                }
              >
                {b.label} {b.bonus >= 0 ? `+${b.bonus}` : b.bonus}
                {b.inherited ? " ·" : ""}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            None specified.
          </p>
        )}
        {parent && (
          <p className="mt-1 text-[10px] italic text-muted-foreground/70">
            Secondary badges = inherited from {parent.name}.
          </p>
        )}
      </Section>

      {effectiveSizeDescription && (
        <Section title="Size">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {effectiveSizeDescription}
          </p>
        </Section>
      )}

      <Section title="Traits">
        {allTraits.length === 0 && (
          <p className="text-xs italic text-muted-foreground">
            No traits listed for this race.
          </p>
        )}
        {allTraits.length > 0 && (
          <ul className="space-y-1.5">
            {allTraits.map((t, i) => (
              <li
                key={i}
                className="rounded border border-border/40 bg-muted/20 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold capitalize">{t.name}</p>
                  {t.inherited && parent && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-[9px] uppercase tracking-wider"
                      title={`Inherited from ${parent.name}`}
                    >
                      Inherited
                    </Badge>
                  )}
                </div>
                {t.description ? (
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
                    {t.description}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] italic text-muted-foreground/60">
                    Description not available.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Languages">
        {languages ? (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {languages}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            None specified.
          </p>
        )}
      </Section>

      {/* Subrace picker — shown when this race HAS subraces (player
          must pick one) OR when this race IS a subrace (let the
          player swap to a sibling without backing out). */}
      {(subraces.length > 0 || siblingSubraces.length > 0) && (
        <Section title="Subraces">
          {/* Required-step nudge: only when viewing a parent race
              that has subraces and the player hasn't picked one. */}
          {subraces.length > 0 && !parent && (
            <div className="mb-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
              Pick a subrace below to continue.
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(subraces.length > 0 ? subraces : siblingSubraces).map((sr) => {
              const isPicked = race?.index === sr.index;
              return (
                <button
                  key={sr.index}
                  type="button"
                  onClick={() => onSelectRace(sr)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                    isPicked
                      ? "border-primary/60 bg-primary/20 text-primary"
                      : "border-border bg-background hover:border-primary/60 hover:bg-primary/10"
                  )}
                >
                  {sr.name}
                </button>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}
