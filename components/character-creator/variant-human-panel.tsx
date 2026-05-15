"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DND_SKILLS } from "@/lib/utils/character";
import { Loader2, Sparkles, BookOpen, Check } from "lucide-react";
import { FeatPicker, type FeatChoices } from "./feat-picker";

/**
 * 2014 PHB Variant Human alternative racial package. Replaces the
 * standard Human +1-to-all-abilities with:
 *   • +1 to two abilities of your choice
 *   • One skill proficiency of your choice
 *   • One feat (from the PHB feat list)
 *
 * Only active when:
 *   • Source version = "2014"
 *   • Race = Human
 *   • The variantHuman.enabled toggle is on
 *
 * The picked feat's own sub-choices (Magic Initiate's cantrips, etc.)
 * are routed into the FeatPicker child component so we reuse all the
 * origin-feat logic. We read the feat list from `srd2024_feats`
 * (the only feats table in the DB) — the 2014 PHB feat set is a
 * functional subset of 2024's, so this is good enough.
 */

const ABILITIES = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

type Ability = (typeof ABILITIES)[number];

export interface VariantHumanState {
  enabled: boolean;
  abilityBonuses: string[]; // length 0–2, distinct
  skill: string | null;
  featIndex: string | null;
  featName: string | null;
  featDescription: string | null;
  featSubChoices: FeatChoices;
}

interface Props {
  value: VariantHumanState;
  onChange: (next: VariantHumanState) => void;
  /** Skills already known via class or background — excluded from
   *  the Variant Human skill picker so the player can't double up. */
  excludeSkills?: string[];
}

interface FeatRow {
  index: string;
  name: string;
  description: string | null;
  type: string | null;
}

export function VariantHumanPanel({ value, onChange, excludeSkills = [] }: Props) {
  const [feats, setFeats] = useState<FeatRow[]>([]);
  const [loadingFeats, setLoadingFeats] = useState(false);
  const [featQuery, setFeatQuery] = useState("");

  // Fetch feats lazily — only after the player opts into Variant Human.
  useEffect(() => {
    if (!value.enabled) {
      setFeats([]);
      return;
    }
    let cancelled = false;
    setLoadingFeats(true);
    void (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("srd2024_feats")
        .select("index, name, description, type")
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error || !data) {
        setFeats([]);
      } else {
        setFeats(data as FeatRow[]);
      }
      setLoadingFeats(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [value.enabled]);

  const toggleEnabled = () => {
    if (value.enabled) {
      // Disabling — reset choices so they don't ghost in the saved
      // character object.
      onChange({
        enabled: false,
        abilityBonuses: [],
        skill: null,
        featIndex: null,
        featName: null,
        featDescription: null,
        featSubChoices: { cantrips: [], spells: [], skills: [], tools: [] },
      });
    } else {
      onChange({ ...value, enabled: true });
    }
  };

  const toggleAbilityBonus = (ability: Ability) => {
    const cur = value.abilityBonuses;
    if (cur.includes(ability)) {
      onChange({
        ...value,
        abilityBonuses: cur.filter((a) => a !== ability),
      });
    } else if (cur.length < 2) {
      onChange({ ...value, abilityBonuses: [...cur, ability] });
    }
  };

  const setSkill = (skill: string) => {
    onChange({ ...value, skill: value.skill === skill ? null : skill });
  };

  const pickFeat = (feat: FeatRow) => {
    if (value.featIndex === feat.index) {
      // Unpicking — reset subchoices.
      onChange({
        ...value,
        featIndex: null,
        featName: null,
        featDescription: null,
        featSubChoices: { cantrips: [], spells: [], skills: [], tools: [] },
      });
    } else {
      onChange({
        ...value,
        featIndex: feat.index,
        featName: feat.name,
        featDescription: feat.description,
        // Reset subchoices when swapping feats so stale picks
        // (e.g. Magic Initiate cantrips) don't bleed across.
        featSubChoices: { cantrips: [], spells: [], skills: [], tools: [] },
      });
    }
  };

  const filteredFeats = (() => {
    const q = featQuery.trim().toLowerCase();
    if (!q) return feats;
    return feats.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q)
    );
  })();

  return (
    <div className="sc-card p-4 space-y-4 border-amber-500/30">
      {/* Header + toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-amber-400 mt-0.5" />
          <div>
            <h3 className="font-serif text-base font-semibold leading-tight">
              Variant Human (2014 PHB)
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
              Trade the standard +1-to-all bonus for: +1 to two abilities, one
              skill proficiency, and one feat.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          className={cn(
            "shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
            value.enabled
              ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
              : "border-border bg-background hover:border-amber-500/40 hover:bg-amber-500/5"
          )}
        >
          {value.enabled ? "Variant: ON" : "Use Variant"}
        </button>
      </div>

      {value.enabled && (
        <>
          {/* Ability bonus picker */}
          <Section
            title="Ability Bonuses"
            subtitle={`${value.abilityBonuses.length} / 2 picked — each picked ability gets +1`}
          >
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {ABILITIES.map((a) => {
                const picked = value.abilityBonuses.includes(a);
                const atCap = !picked && value.abilityBonuses.length >= 2;
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAbilityBonus(a)}
                    disabled={atCap}
                    className={cn(
                      "rounded-md border px-2 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                      picked
                        ? "border-primary/60 bg-primary/20 text-primary"
                        : atCap
                          ? "border-border bg-background opacity-40"
                          : "border-border bg-background hover:border-primary/60 hover:bg-primary/10"
                    )}
                  >
                    {a.slice(0, 3)}
                    {picked && <span className="ml-1">+1</span>}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Skill picker */}
          <Section
            title="Skill Proficiency"
            subtitle={
              value.skill
                ? `Picked: ${value.skill}`
                : "Pick one skill (excludes class/background skills)"
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {DND_SKILLS.map((s) => {
                const skillName = s.name;
                const isExcluded = excludeSkills.includes(skillName);
                const picked = value.skill === skillName;
                return (
                  <button
                    key={skillName}
                    type="button"
                    onClick={() => !isExcluded && setSkill(skillName)}
                    disabled={isExcluded && !picked}
                    className={cn(
                      "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors capitalize",
                      picked
                        ? "border-primary/60 bg-primary/20 text-primary"
                        : isExcluded
                          ? "border-border bg-background opacity-40 line-through"
                          : "border-border bg-background hover:border-primary/60 hover:bg-primary/10"
                    )}
                    title={isExcluded ? "Already known from class/background" : skillName}
                  >
                    {skillName}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Feat browser */}
          <Section
            title="Bonus Feat"
            subtitle={
              value.featName
                ? `Picked: ${value.featName} (click again to unpick)`
                : "Pick one feat from the PHB list"
            }
          >
            <input
              type="text"
              value={featQuery}
              onChange={(e) => setFeatQuery(e.target.value)}
              placeholder="Search feats…"
              className="w-full h-8 mb-2 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
            {loadingFeats ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading feat list…
              </div>
            ) : feats.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                Feat list unavailable. Pick a static feat (Tough, Lucky, Alert)
                manually in Notes for now.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                {filteredFeats.map((f) => {
                  const picked = value.featIndex === f.index;
                  return (
                    <button
                      key={f.index}
                      type="button"
                      onClick={() => pickFeat(f)}
                      className={cn(
                        "text-left rounded-md border px-2 py-1.5 text-[11px] transition-colors",
                        picked
                          ? "border-primary/60 bg-primary/15"
                          : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {picked && <Check className="h-3 w-3 text-primary shrink-0" />}
                        <span className="font-semibold">{f.name}</span>
                      </div>
                      {f.description && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground leading-snug line-clamp-2">
                          {f.description}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </Section>

          {/* Sub-choices for the picked feat (Magic Initiate, Skilled,
              Crafter). Falls through to a static-feat label otherwise.
              We reuse FeatPicker so all the origin-feat logic stays
              in one place. */}
          {value.featIndex && (
            <div className="border-t border-border/40 pt-3">
              <FeatPicker
                feat={{
                  index: value.featIndex,
                  name: value.featName ?? undefined,
                  description: value.featDescription ?? undefined,
                }}
                value={value.featSubChoices}
                onChange={(next) =>
                  onChange({ ...value, featSubChoices: next })
                }
                excludeSkills={[
                  ...excludeSkills,
                  ...(value.skill ? [value.skill] : []),
                ]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground/80">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}
