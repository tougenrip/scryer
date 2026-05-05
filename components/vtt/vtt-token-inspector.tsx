"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDiceRoller, type RollResult } from "@/contexts/dice-roller-context";
import { useCombat } from "@/hooks/useCombat";
import { useUpdateVttToken } from "@/hooks/useUpdateVttToken";
import { useVttStore } from "@/lib/store/vtt-store";
import { cn } from "@/lib/utils";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";
import { Flame, Footprints, HeartPulse, Shield, ShieldAlert, Swords, X } from "lucide-react";

type Props = {
  campaignId: string;
  mapId: string | null;
  isDm: boolean;
  sendRollToChat?: (roll: RollResult) => void | Promise<void>;
};

const CONDITION_OPTIONS = [
  "blinded",
  "charmed",
  "deafened",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
  "concentrating",
  "marked",
  "bloodied",
];

export function VttTokenInspector({
  campaignId,
  mapId,
  isDm,
  sendRollToChat,
}: Props) {
  const tokens = useVttStore((s) => s.tokens);
  const selectedTokenId = useVttStore((s) => s.selectedTokenId);
  const { participants } = useCombat(campaignId, mapId ?? undefined);
  const { updateToken } = useUpdateVttToken(campaignId);
  const { rollDice } = useDiceRoller();

  const sel = useMemo(
    () => tokens.find((t) => t.id === selectedTokenId),
    [tokens, selectedTokenId],
  );

  const participant = useMemo(
    () => (sel ? participants.find((p) => p.token_id === sel.id) : undefined),
    [participants, sel],
  );

  const sourceHp = sel?.hp_max ?? sel?.character?.hp_max ?? sel?.monster?.hit_points ?? null;
  const maxHp = sourceHp ?? 1;
  const hasHp =
    sourceHp !== null &&
    sourceHp !== undefined;
  const displayHp = sel?.hp_current ?? sourceHp ?? 0;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (displayHp / maxHp) * 100)) : 0;
  const conditions = sel?.conditions ?? [];
  const armorClass = sel?.character?.armor_class ?? sel?.monster?.armor_class ?? null;
  const movement = formatSpeed(sel?.monster?.speed ?? sel?.character?.speed ?? null);
  const damageResistances = sel?.monster?.damage_resistances ?? [];
  const damageImmunities = sel?.monster?.damage_immunities ?? [];
  const damageVulnerabilities = sel?.monster?.damage_vulnerabilities ?? [];
  const conditionImmunities = sel?.monster?.condition_immunities ?? [];

  useEffect(() => {
    if (!isDm || !sel || !sourceHp || (sel.hp_current !== null && sel.hp_current !== undefined)) return;
    void updateToken(sel.id, { hp_current: sourceHp, hp_max: sel.hp_max ?? sourceHp });
  }, [isDm, sel, sourceHp, updateToken]);

  if (!mapId) {
    return (
      <InspectorEmpty message="Load a scene from Assets to select tokens on the map." />
    );
  }

  if (!sel) {
    return <InspectorEmpty message="Select a token on the map." />;
  }

  const displayName = cleanTokenName(sel.name || "Unnamed token");
  const creatureMeta = [
    sel.size ? formatLabel(sel.size) : null,
    sel.monster?.type ? formatLabel(sel.monster.type) : null,
    sel.monster?.challenge_rating !== null && sel.monster?.challenge_rating !== undefined
      ? `CR ${sel.monster.challenge_rating}`
      : null,
  ].filter(Boolean);

  const runRoll = async (expression: string, label: string) => {
    const result = await rollDice(expression, {
      label,
      campaignId,
      shareWithCampaign: true,
    });
    if (result && sendRollToChat) await sendRollToChat(result);
  };

  const addCondition = (condition: string) => {
    if (!isDm || conditions.includes(condition)) return;
    void updateToken(sel.id, { conditions: [...conditions, condition] });
  };

  const removeCondition = (condition: string) => {
    if (!isDm) return;
    void updateToken(sel.id, { conditions: conditions.filter((item) => item !== condition) });
  };

  return (
    <div className="space-y-4 border-b border-border bg-gradient-to-b from-card to-card/95 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/80">
          Inspector
        </p>
        {sel.monster_index && (
          <Badge variant="outline" className="h-5 border-amber-400/30 bg-amber-400/10 px-2 text-[10px] text-amber-200">
            Monster
          </Badge>
        )}
      </div>

      <div className="flex gap-3">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-amber-300/80 bg-muted text-sm font-serif font-semibold text-white shadow-[0_0_0_2px_rgba(0,0,0,0.8),0_0_22px_rgba(251,191,36,0.24)]"
          style={{ backgroundColor: sel.color || "#666" }}
        >
          {sel.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sel.image_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (sel.name || "?").slice(0, 2).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <div className="truncate text-base font-semibold leading-tight text-foreground" title={displayName}>
            {displayName}
          </div>
          {creatureMeta.length > 0 && (
            <p className="mt-1 truncate text-[11px] text-muted-foreground">
              {creatureMeta.join(" • ")}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {sel.character_id && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                Character
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <InfoTile icon={<Shield className="h-3.5 w-3.5" />} label="AC" value={armorClass ?? "Unknown"} />
        <InfoTile icon={<HeartPulse className="h-3.5 w-3.5" />} label="HP" value={hasHp ? `${displayHp}/${maxHp}` : "Unknown"} />
        <InfoTile icon={<Swords className="h-3.5 w-3.5" />} label="Init" value={participant?.initiative_roll ?? "None"} />
      </div>

      <InfoTile
        icon={<Footprints className="h-3.5 w-3.5" />}
        label="Movement"
        value={movement}
        wide
      />

      {hasHp && (
        <div className="rounded-md border border-border bg-background/45 p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Health
            </span>
            <span className="font-mono text-xs text-foreground">
              {displayHp}/{maxHp}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/40">
            <div className={cn("h-full transition-all", hpBarClass(hpPct))} style={{ width: `${hpPct}%` }} />
          </div>

          {isDm && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => updateToken(sel.id, { hp_current: Math.max(0, displayHp - 5) })}
              >
                -5
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => updateToken(sel.id, { hp_current: Math.min(maxHp, displayHp + 5) })}
              >
                +5
              </Button>
            </div>
          )}
        </div>
      )}

      <DefenseList
        title="Defenses"
        icon={<ShieldAlert className="h-3.5 w-3.5" />}
        groups={[
          ["Resist", damageResistances],
          ["Immune", damageImmunities],
          ["Vulnerable", damageVulnerabilities],
          ["Cond. Immune", conditionImmunities],
        ]}
      />

      <div className="space-y-2 rounded-md border border-border bg-background/35 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            Conditions
          </p>
          {isDm && conditions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground"
              onClick={() => updateToken(sel.id, { conditions: [] })}
            >
              Clear
            </Button>
          )}
        </div>
        {conditions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {conditions.map((condition) => (
              <Badge key={condition} variant="outline" className="gap-1 text-[10px] capitalize">
                {condition}
                {isDm && (
                  <button
                    type="button"
                    className="-mr-0.5 rounded-sm text-muted-foreground hover:text-foreground"
                    onClick={() => removeCondition(condition)}
                    title={`Remove ${condition}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No conditions</p>
        )}
        {isDm && (
          <div className="flex flex-wrap gap-1 pt-1">
            {CONDITION_OPTIONS.filter((condition) => !conditions.includes(condition)).map((condition) => (
              <button
                key={condition}
                type="button"
                className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] capitalize text-muted-foreground hover:border-amber-400/50 hover:bg-amber-400/10 hover:text-foreground"
                onClick={() => addCondition(condition)}
              >
                + {condition}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1 pt-1">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
          Quick rolls
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="w-full h-8 text-xs justify-start gap-2"
          onClick={() => runRoll("1d20+5", `${sel.name} attack`)}
        >
          <Swords className="h-3.5 w-3.5" />
          Attack +5
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full h-8 text-xs justify-start gap-2"
          onClick={() => runRoll("2d6+3", `${sel.name} damage`)}
        >
          <Flame className="h-3.5 w-3.5" />
          2d6+3
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full h-8 text-xs justify-start gap-2"
          onClick={() => runRoll("1d20+2", `${sel.name} save`)}
        >
          <Shield className="h-3.5 w-3.5" />
          Save +2
        </Button>
      </div>
    </div>
  );
}

function formatSpeed(speed: unknown): string {
  if (typeof speed === "number") return `${speed} ft.`;
  if (typeof speed === "string") return speed || "Unknown";
  if (!speed || typeof speed !== "object") return "Unknown";

  const entries = Object.entries(speed as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${formatLabel(key)} ${String(value)}`);

  return entries.length ? entries.join(", ") : "Unknown";
}

function cleanTokenName(name: string) {
  return cleanVttDisplayName(name, name);
}

function hpBarClass(hpPct: number) {
  if (hpPct > 60) return "bg-gradient-to-r from-emerald-600 to-emerald-400";
  if (hpPct > 25) return "bg-gradient-to-r from-amber-600 to-amber-400";
  return "bg-gradient-to-r from-red-700 to-red-500";
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function DefenseList({
  title,
  icon,
  groups,
}: {
  title: string;
  icon: ReactNode;
  groups: Array<[string, string[]]>;
}) {
  const populated = groups.filter(([, values]) => values.length > 0);

  return (
    <div className="rounded-md border border-border bg-background/45 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      {populated.length > 0 ? (
        <div className="space-y-2">
          {populated.map(([label, values]) => (
            <div key={label} className="flex items-start gap-2">
              <p className="w-20 shrink-0 pt-1 text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
              <div className="flex flex-wrap gap-1">
                {values.map((value) => (
                  <Badge key={`${label}-${value}`} variant="outline" className="h-6 border-border bg-muted/40 px-2 text-[10px] capitalize">
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No special defenses</p>
      )}
    </div>
  );
}

function InspectorEmpty({ message }: { message: string }) {
  return (
    <div className="p-3 border-b border-border">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Inspector
      </p>
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  wide = false,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("rounded-md border border-border bg-background/45 p-2.5", wide && "min-h-0")}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("mt-1 text-sm font-semibold leading-snug text-foreground", wide ? "font-sans" : "font-mono tabular-nums")}>
        {value}
      </div>
    </div>
  );
}
