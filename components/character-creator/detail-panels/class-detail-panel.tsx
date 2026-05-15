"use client";

import { useMemo } from "react";
import type { DndClass } from "@/hooks/useDndContent";
import { useClassFeatures } from "@/hooks/useDndContent";
import { Badge } from "@/components/ui/badge";

interface Props {
  cls: DndClass | null | undefined;
  level: number;
}

/**
 * Persistent right-pane detail panel for the Class step. Surfaces hit
 * die, primary saves, proficiencies, spellcasting summary, and class
 * features up to the chosen level.
 *
 * (Features-vs-Spells sub-tabs live in the lower `ClassFeaturesList`
 * section, not here, because that's where level changes too — keeping
 * the level-bound UI in one place.)
 */
export function ClassDetailPanel({ cls, level }: Props) {
  const { features, loading: featuresLoading } = useClassFeatures(
    cls?.index ?? null
  );

  const levelFeatures = useMemo(
    () => features.filter((f) => f.level <= level),
    [features, level]
  );

  if (!cls) {
    return (
      <div
        className="sc-card flex items-center justify-center p-6 text-center text-sm text-muted-foreground"
        style={{ height: "100%", minHeight: 280 }}
      >
        Pick a class to see its hit die, features, and proficiencies.
      </div>
    );
  }

  const profs = parseList(cls.proficiencies);
  const savingThrows = (cls.saving_throws ?? []) as string[];
  const spellcasting = cls.spellcasting as
    | { spellcasting_ability?: { name?: string; index?: string } | string }
    | null;
  const spellAbility =
    typeof spellcasting?.spellcasting_ability === "object"
      ? spellcasting?.spellcasting_ability?.name
      : spellcasting?.spellcasting_ability;

  return (
    <div
      className="sc-card flex flex-col gap-3 p-4 custom-scrollbar"
      style={{ height: "100%", minHeight: 0, overflowY: "auto" }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold leading-tight">
          {cls.name}
        </h3>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {cls.source}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px]">
          Hit die d{cls.hit_die}
        </Badge>
        {savingThrows.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            Saves: {savingThrows.map((s) => s.toUpperCase()).join(", ")}
          </Badge>
        )}
        {spellcasting && (
          <Badge variant="outline" className="text-[10px]">
            Spellcaster{spellAbility ? ` (${String(spellAbility).slice(0, 3).toUpperCase()})` : ""}
          </Badge>
        )}
      </div>

      {profs.length > 0 && (
        <Section title="Proficiencies">
          <div className="flex flex-wrap gap-1">
            {profs.map((p, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] font-normal"
              >
                {p}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      <Section title={`Features (level 1${level > 1 ? `–${level}` : ""})`}>
        {featuresLoading ? (
          <p className="text-xs text-muted-foreground italic">
            Loading features…
          </p>
        ) : levelFeatures.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            No features at this level.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {levelFeatures.map((f) => (
              <li
                key={f.id}
                className="rounded border border-border/40 bg-muted/20 px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{f.name}</p>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Lvl {f.level}
                  </span>
                </div>
                {f.description && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                    {f.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {cls.subclasses && cls.subclasses.length > 0 && (
        <Section title="Subclasses">
          <div className="flex flex-wrap gap-1">
            {cls.subclasses.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="text-[10px] capitalize"
              >
                {s.replace(/-/g, " ")}
              </Badge>
            ))}
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

function parseList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object") {
          const obj = v as { name?: string; index?: string };
          return obj.name ?? obj.index ?? "";
        }
        return "";
      })
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/[,;]\s*/).filter(Boolean);
  }
  return [];
}
