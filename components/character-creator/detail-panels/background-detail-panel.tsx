"use client";

import type { Background } from "@/hooks/useDndContent";
import { Badge } from "@/components/ui/badge";

interface Props {
  background: Background | null | undefined;
}

/**
 * Persistent right-pane detail panel for the Background step. Renders
 * BOTH the 2014 SRD text shape (description / skill_proficiencies /
 * tool_proficiencies / languages / equipment / feature as prose
 * strings) AND the 2024 PHB Origin shape (ability_scores + feat +
 * proficiencies + equipment_options as jsonb). Whichever fields are
 * populated render — if both happen to be present the panel shows
 * both for clarity.
 */
export function BackgroundDetailPanel({ background }: Props) {
  if (!background) {
    return (
      <div className="sc-card flex h-full min-h-[280px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Pick a background to see its skills, languages, and feature.
      </div>
    );
  }

  // Split 2024 proficiencies into skills + tools for cleaner display.
  const profs = Array.isArray(background.proficiencies)
    ? background.proficiencies
    : [];
  const skillProfs = profs.filter((p) => p.type === "skill");
  const toolProfs = profs.filter((p) => p.type === "tool");

  const has2024 =
    !!background.ability_scores ||
    !!background.feat ||
    profs.length > 0 ||
    !!background.equipment_options;

  const { featureName, featureBody } = parseFeature(background.feature);

  return (
    <div
      className="sc-card flex flex-col gap-3 p-4 custom-scrollbar"
      style={{ height: "100%", minHeight: 0, overflowY: "auto" }}
    >
      <h3 className="font-serif text-lg font-semibold leading-tight">
        {background.name}
      </h3>

      {background.description && (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {background.description}
        </p>
      )}

      {/* ── 2024 Origin shape ─────────────────────────────────────── */}
      {has2024 && (
        <>
          {background.ability_scores && background.ability_scores.length > 0 && (
            <Section title="Ability Score Options">
              <div className="flex flex-wrap gap-1">
                {(background.ability_scores as unknown[]).map((a, i) => {
                  // Tolerant of both shapes:
                  //   • string ["str", "dex", "con"]               (migration 113)
                  //   • { ability_score: {index/name}, bonus }     (legacy 2014 shape)
                  //   • { ability, bonus }                         (some homebrew)
                  let label = "";
                  if (typeof a === "string") label = a;
                  else if (a && typeof a === "object") {
                    const obj = a as {
                      ability_score?: { index?: string; name?: string } | string;
                      ability?: string;
                      name?: string;
                      index?: string;
                    };
                    if (typeof obj.ability_score === "object")
                      label =
                        obj.ability_score?.name ??
                        obj.ability_score?.index ??
                        "";
                    else
                      label =
                        (obj.ability_score as string) ??
                        obj.ability ??
                        obj.name ??
                        obj.index ??
                        "";
                  }
                  if (!label) return null;
                  return (
                    <Badge key={i} variant="default" className="text-[10px]">
                      {String(label).slice(0, 3).toUpperCase()}
                    </Badge>
                  );
                })}
              </div>
              <p className="mt-1 text-[10px] italic text-muted-foreground">
                Distribute +2/+1 or +1/+1/+1 across these.
              </p>
            </Section>
          )}

          {background.feat?.name && (
            <Section title="Origin Feat">
              <div className="rounded border border-primary/30 bg-primary/5 px-3 py-2">
                <p className="text-xs font-semibold text-primary">
                  {background.feat.name}
                </p>
                {background.feat.description && (
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    {background.feat.description}
                  </p>
                )}
              </div>
            </Section>
          )}

          {skillProfs.length > 0 && (
            <Section title="Skill Proficiencies">
              <div className="flex flex-wrap gap-1">
                {skillProfs.map((p, i) => (
                  <Badge key={i} variant="default" className="text-[10px]">
                    {p.name}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {toolProfs.length > 0 && (
            <Section title="Tool Proficiencies">
              <div className="flex flex-wrap gap-1">
                {toolProfs.map((p, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px]">
                    {p.name}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {background.equipment_options && background.equipment_options.length > 0 && (
            <Section title="Starting Equipment">
              <div className="space-y-1.5">
                {background.equipment_options.map((opt, i) => (
                  <div
                    key={i}
                    className="rounded border border-border/40 bg-muted/20 px-2 py-1.5"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {opt.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed">{opt.items}</p>
                  </div>
                ))}
                {background.equipment_options.length > 1 && (
                  <p className="text-[10px] italic text-muted-foreground">
                    Choose one option above.
                  </p>
                )}
              </div>
            </Section>
          )}
        </>
      )}

      {/* ── 2014 SRD shape (text fields) ─────────────────────────── */}
      {!has2024 && (
        <>
          {background.skill_proficiencies && (
            <Section title="Skill Proficiencies">
              <div className="flex flex-wrap gap-1">
                {splitList(background.skill_proficiencies).map((s, i) => (
                  <Badge key={i} variant="default" className="text-[10px]">
                    {s}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {background.tool_proficiencies && (
            <Section title="Tool Proficiencies">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {background.tool_proficiencies}
              </p>
            </Section>
          )}

          {background.languages && (
            <Section title="Languages">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {background.languages}
              </p>
            </Section>
          )}

          {background.equipment && (
            <Section title="Starting Equipment">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {background.equipment}
              </p>
            </Section>
          )}

          {background.feature && (
            <Section title="Background Feature">
              <div className="rounded border border-primary/30 bg-primary/5 px-3 py-2">
                <p className="text-xs font-semibold text-primary">
                  {featureName || "Feature"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  {featureBody}
                </p>
              </div>
            </Section>
          )}

          {background.ability_score_increase && (
            <Section title="Ability Score Increase">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {background.ability_score_increase}
              </p>
            </Section>
          )}
        </>
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

function splitList(value: string): string[] {
  return value
    .split(/[,;]\s*|\sand\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseFeature(raw: string | null | undefined): {
  featureName: string | null;
  featureBody: string;
} {
  if (!raw) return { featureName: null, featureBody: "" };
  const m = raw.match(/^([^.]+?\.)\s+(.+)$/s);
  if (!m) return { featureName: null, featureBody: raw };
  return {
    featureName: m[1].replace(/\.$/, "").trim(),
    featureBody: m[2].trim(),
  };
}
