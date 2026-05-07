"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDiceRoller, type RollResult } from "@/contexts/dice-roller-context";
import { useCombat } from "@/hooks/useCombat";
import { useUpdateVttToken } from "@/hooks/useUpdateVttToken";
import { useVttStore } from "@/lib/store/vtt-store";
import { cn } from "@/lib/utils";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";
import { createClient } from "@/lib/supabase/client";
import { Footprints, HeartPulse, Shield, ShieldAlert, Swords, X } from "lucide-react";
import { parseActions, partitionActions, type ParsedAction } from "@/lib/vtt/monster-actions";
import {
  deriveWeaponAction,
  proficiencyBonusForLevel,
  unarmedStrikeAction,
  type ParsedPcAction,
} from "@/lib/vtt/pc-actions";

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

  // Re-fetch the linked character on selection so equipment/AC changes from the
  // character sheet show up here without a page refresh. The token's joined
  // `character` data was a snapshot at token-load time.
  type FreshChar = {
    armor_class: number | null;
    speed: number | null;
    hp_current: number | null;
    hp_max: number | null;
    level: number | null;
    strength: number | null;
    dexterity: number | null;
    inventory: unknown;
  } | null;
  const [freshCharacter, setFreshCharacter] = useState<FreshChar>(null);
  const [pcActions, setPcActions] = useState<ParsedPcAction[]>([]);

  useEffect(() => {
    setFreshCharacter(null);
    setPcActions([]);
    const cid = sel?.character_id;
    if (!cid) return;
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const { data: charData } = await supabase
        .from('characters')
        .select('armor_class, speed, hp_current, hp_max, level, strength, dexterity, inventory')
        .eq('id', cid)
        .maybeSingle();
      if (cancelled) return;
      setFreshCharacter((charData as FreshChar) ?? null);

      // Derive PC weapon actions from equipped inventory
      if (!charData) return;
      const inventoryJsonb = Array.isArray(charData.inventory)
        ? (charData.inventory as Array<{
            source: "srd" | "homebrew";
            index: string;
            equipped: boolean;
            attuned: boolean;
            quantity: number;
          }>)
        : [];
      const equipped = inventoryJsonb.filter((i) => i.equipped);

      const level = charData.level ?? 1;
      const profBonus = proficiencyBonusForLevel(level);
      const abilityScores = {
        strength: charData.strength ?? 10,
        dexterity: charData.dexterity ?? 10,
      };

      const derived: ParsedPcAction[] = [];
      // Every PC always has Unarmed Strike — useful for monks, grappled
      // casters, etc. Comes first in the list.
      derived.push(unarmedStrikeAction(abilityScores, profBonus));

      const srdIndices = equipped.filter((i) => i.source === "srd").map((i) => i.index);
      const homebrewIds = equipped.filter((i) => i.source === "homebrew").map((i) => i.index);

      // Fetch equipment data in parallel
      const [srdResult, homebrewResult] = await Promise.all([
        srdIndices.length > 0
          ? supabase.from("srd_equipment").select("*").in("index", srdIndices)
          : Promise.resolve({ data: [] as unknown[] }),
        homebrewIds.length > 0
          ? supabase.from("homebrew_equipment").select("*").in("id", homebrewIds)
          : Promise.resolve({ data: [] as unknown[] }),
      ]);
      if (cancelled) return;

      for (const inv of equipped) {
        let eqData: unknown = null;
        if (inv.source === "srd") {
          eqData =
            (srdResult.data as Array<Record<string, unknown>>)?.find(
              (e) => e.index === inv.index
            ) ?? null;
        } else {
          eqData =
            (homebrewResult.data as Array<Record<string, unknown>>)?.find(
              (e) => e.id === inv.index
            ) ?? null;
        }
        if (!eqData) continue;
        const equipmentDataTyped = eqData as { name?: string } & Record<string, unknown>;
        const action = deriveWeaponAction(
          { name: (equipmentDataTyped.name as string) ?? inv.index, equipmentData: eqData },
          abilityScores,
          profBonus
        );
        if (action) derived.push(action);
      }

      setPcActions(derived);
    })();
    return () => {
      cancelled = true;
    };
  }, [sel?.character_id]);

  const sourceHp =
    sel?.hp_max ??
    freshCharacter?.hp_max ??
    sel?.character?.hp_max ??
    sel?.monster?.hit_points ??
    null;
  const maxHp = sourceHp ?? 1;
  const hasHp =
    sourceHp !== null &&
    sourceHp !== undefined;
  const displayHp = sel?.hp_current ?? sourceHp ?? 0;
  const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (displayHp / maxHp) * 100)) : 0;
  const conditions = sel?.conditions ?? [];
  // For PC tokens with sparse data, fall back to D&D defaults (10 AC, 30 ft) so
  // the inspector doesn't read as "Unknown" before the player fills out their sheet.
  const isPcToken = !!sel?.character_id;
  const armorClass =
    freshCharacter?.armor_class ??
    sel?.character?.armor_class ??
    sel?.monster?.armor_class ??
    (isPcToken ? 10 : null);
  const speedSource =
    sel?.monster?.speed ??
    freshCharacter?.speed ??
    sel?.character?.speed ??
    null;
  const movement = formatSpeed(speedSource ?? (isPcToken ? 30 : null));
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

      {/* Orphan-token diagnostic: token isn't linked to a character or monster.
          Most common cause: token was placed before the character_id-on-insert
          fix landed. The user has to re-place it from the Players list. */}
      {!sel.character_id && !sel.monster_index && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-[11px] leading-snug text-amber-600 dark:text-amber-300">
          This token isn&apos;t linked to a character or monster, so the
          inspector can&apos;t pull stats or actions for it. Delete it and
          re-place from <span className="font-medium">Library → Tokens →
          Players</span> (for PCs) or <span className="font-medium">Samples →
          Tokens</span> (for monsters).
        </div>
      )}

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
            <HpAdjuster
              displayHp={displayHp}
              maxHp={maxHp}
              onApply={(delta) =>
                updateToken(sel.id, {
                  hp_current: Math.max(0, Math.min(maxHp, displayHp + delta)),
                })
              }
            />
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
          <div className="flex items-center gap-1">
            {isDm && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    + Add
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1" align="end">
                  <div className="grid grid-cols-2 gap-1">
                    {CONDITION_OPTIONS.filter((c) => !conditions.includes(c)).map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="rounded px-2 py-1 text-left text-[11px] capitalize text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => addCondition(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
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
      </div>

      <ActionsBlock token={sel} runRoll={runRoll} />
      {sel.character_id && (
        <PcActionsBlock
          actions={pcActions}
          characterName={displayName}
          runRoll={runRoll}
        />
      )}
    </div>
  );
}

function ActionsBlock({
  token,
  runRoll,
}: {
  token: import("@/types/vtt").Token;
  runRoll: (expression: string, label: string) => Promise<void>;
}) {
  const monster = token.monster;
  const groups: Array<[string, ParsedAction[]]> = useMemo(() => {
    if (!monster) return [];
    const { actions, bonusActions } = partitionActions(monster.actions);
    return [
      ["Actions", actions],
      ["Bonus actions", bonusActions],
      ["Reactions", parseActions(monster.reactions)],
      ["Legendary actions", parseActions(monster.legendary_actions)],
      ["Special abilities", parseActions(monster.special_abilities)],
    ];
  }, [monster]);

  const tokenName = cleanTokenName(token.name ?? "");
  const populated = groups.filter(([, list]) => list.length > 0);
  if (populated.length === 0) return null;

  return (
    <>
      {populated.map(([label, list]) => (
        <div key={label} className="space-y-1 pt-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            {label}
          </p>
          {list.map((action) => (
            <ActionRow
              key={`${label}-${action.name}`}
              action={action}
              tokenName={tokenName}
              runRoll={runRoll}
            />
          ))}
        </div>
      ))}
    </>
  );
}

function PcActionsBlock({
  actions,
  characterName,
  runRoll,
}: {
  actions: ParsedPcAction[];
  characterName: string;
  runRoll: (expression: string, label: string) => Promise<void>;
}) {
  return (
    <div className="space-y-1 pt-1">
      <p className="text-[10px] font-semibold uppercase text-muted-foreground">
        Actions
      </p>
      {actions.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          No equipped weapons. Equip one in the character sheet.
        </p>
      ) : (
        actions.map((action) => (
          <PcActionRow
            key={action.name}
            action={action}
            characterName={characterName}
            runRoll={runRoll}
          />
        ))
      )}
    </div>
  );
}

function PcActionRow({
  action,
  characterName,
  runRoll,
}: {
  action: ParsedPcAction;
  characterName: string;
  runRoll: (expression: string, label: string) => Promise<void>;
}) {
  const summaryParts: string[] = [];
  if (action.hitBonus !== null) summaryParts.push(action.hitBonus);
  if (action.damages.length > 0) {
    summaryParts.push(action.damages.map((d) => d.dice).join(", "));
  }

  const isRollable = action.attackRoll !== null || action.damages.length > 0;

  const onClick = async () => {
    if (action.attackRoll) {
      await runRoll(
        action.attackRoll,
        `${characterName} – ${action.name} (attack)`
      );
    }
    for (const dmg of action.damages) {
      const label = dmg.type
        ? `${characterName} – ${action.name} (${dmg.type})`
        : `${characterName} – ${action.name} (damage)`;
      await runRoll(dmg.dice, label);
    }
  };

  return (
    <button
      type="button"
      onClick={isRollable ? onClick : undefined}
      disabled={!isRollable}
      title={action.description || action.name}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background/45 px-2 py-1.5 text-xs",
        isRollable
          ? "hover:border-amber-400/50 hover:bg-amber-400/10"
          : "cursor-default opacity-90"
      )}
    >
      <span className="truncate text-left font-medium">{action.name}</span>
      {summaryParts.length > 0 && (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {summaryParts.join(" · ")}
        </span>
      )}
    </button>
  );
}

function ActionRow({
  action,
  tokenName,
  runRoll,
}: {
  action: ParsedAction;
  tokenName: string;
  runRoll: (expression: string, label: string) => Promise<void>;
}) {
  const summaryParts: string[] = [];
  if (action.attackBonus !== null) {
    summaryParts.push(
      action.attackBonus >= 0 ? `+${action.attackBonus}` : `${action.attackBonus}`
    );
  }
  if (action.damages.length > 0) {
    summaryParts.push(action.damages.map((d) => d.dice).join(", "));
  }
  if (action.saveDc) {
    summaryParts.push(`DC ${action.saveDc.value} ${action.saveDc.ability}`);
  }
  if (action.usage) summaryParts.push(action.usage);

  const isRollable = action.attackRoll !== null || action.damages.length > 0;

  const onClick = async () => {
    if (action.attackRoll) {
      await runRoll(action.attackRoll, `${tokenName} – ${action.name} (attack)`);
    }
    for (const dmg of action.damages) {
      const label = dmg.type
        ? `${tokenName} – ${action.name} (${dmg.type})`
        : `${tokenName} – ${action.name} (damage)`;
      await runRoll(dmg.dice, label);
    }
  };

  return (
    <button
      type="button"
      onClick={isRollable ? onClick : undefined}
      disabled={!isRollable}
      title={action.desc || action.name}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background/45 px-2 py-1.5 text-xs",
        isRollable
          ? "hover:border-amber-400/50 hover:bg-amber-400/10"
          : "cursor-default opacity-90"
      )}
    >
      <span className="truncate text-left font-medium">{action.name}</span>
      {summaryParts.length > 0 && (
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {summaryParts.join(" · ")}
        </span>
      )}
    </button>
  );
}

function HpAdjuster({
  displayHp,
  maxHp,
  onApply,
}: {
  displayHp: number;
  maxHp: number;
  onApply: (delta: number) => void;
}) {
  const [value, setValue] = useState("");
  const submit = (sign: 1 | -1) => {
    const trimmed = value.trim().replace(/^[+\-]/, "");
    const n = parseInt(trimmed, 10);
    if (Number.isNaN(n) || n <= 0) return;
    onApply(sign * n);
    setValue("");
  };
  return (
    <div className="mt-3 flex items-center gap-1">
      <Input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit(-1);
          }
        }}
        placeholder="amount"
        className="h-8 flex-1 text-xs"
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
        title="Damage (Enter)"
        onClick={() => submit(-1)}
      >
        Damage
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-2 text-xs text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10 dark:text-emerald-400"
        title="Heal"
        onClick={() => submit(+1)}
      >
        Heal
      </Button>
      <span className="ml-1 font-mono text-[10px] text-muted-foreground">
        {displayHp}/{maxHp}
      </span>
    </div>
  );
}

function LightRadiusRow({
  token,
  isDm,
  onUpdate,
}: {
  token: import("@/types/vtt").Token;
  isDm: boolean;
  onUpdate: (lightFt: number) => void;
}) {
  const [value, setValue] = useState(String(token.light_radius_ft ?? 0));
  useEffect(() => {
    setValue(String(token.light_radius_ft ?? 0));
  }, [token.light_radius_ft]);
  if (!isDm) return null;
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            Light emitted
          </p>
          <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">
            How far this token emits light. Shared with all nearby tokens.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              const n = parseInt(value, 10);
              if (!Number.isNaN(n) && n >= 0) onUpdate(n);
              else setValue(String(token.light_radius_ft ?? 0));
            }}
            className="h-7 w-20 text-xs"
          />
          <span className="text-[10px] text-muted-foreground">ft</span>
        </div>
      </div>
    </div>
  );
}

function VisionRangeRow({
  token,
  isDm,
  onUpdate,
}: {
  token: import("@/types/vtt").Token;
  isDm: boolean;
  onUpdate: (visionFt: number) => void;
}) {
  const [value, setValue] = useState(String(token.vision_range_ft ?? 0));
  useEffect(() => {
    setValue(String(token.vision_range_ft ?? 0));
  }, [token.vision_range_ft]);
  if (!isDm) return null;
  return (
    <div className="rounded-md border border-border bg-background/35 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
            Darkvision
          </p>
          <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground">
            How far this token sees in pitch darkness. 0 = needs light.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              const n = parseInt(value, 10);
              if (!Number.isNaN(n) && n >= 0) onUpdate(n);
              else setValue(String(token.vision_range_ft ?? 0));
            }}
            className="h-7 w-20 text-xs"
          />
          <span className="text-[10px] text-muted-foreground">ft</span>
        </div>
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
