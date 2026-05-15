"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DND_SKILLS } from "@/lib/utils/character";
import { Sparkles, Check, Loader2 } from "lucide-react";

/** Canonical 2024 PHB Origin Feat info — descriptions + the kind of
 *  picker (if any) each requires. Keyed by feat index AND by the
 *  fuzzy lowercase name so the resolver works even when the DB row
 *  only stores one or the other. */
type FeatKind =
  | "magic-initiate-cleric"
  | "magic-initiate-druid"
  | "magic-initiate-wizard"
  | "skilled"
  | "crafter"
  | "static";

interface FeatInfo {
  kind: FeatKind;
  description: string;
}

const FEAT_LIBRARY: Record<string, FeatInfo> = {
  "magic-initiate-cleric": {
    kind: "magic-initiate-cleric",
    description:
      "You have learned spells from the Cleric spell list. Choose two cantrips and one 1st-level spell. You can cast the 1st-level spell once per long rest at its lowest level without expending a spell slot, or with any spell slot you have. Wisdom is your spellcasting ability for these spells.",
  },
  "magic-initiate-druid": {
    kind: "magic-initiate-druid",
    description:
      "You have learned spells from the Druid spell list. Choose two cantrips and one 1st-level spell. You can cast the 1st-level spell once per long rest at its lowest level without expending a spell slot, or with any spell slot you have. Wisdom is your spellcasting ability for these spells.",
  },
  "magic-initiate-wizard": {
    kind: "magic-initiate-wizard",
    description:
      "You have learned spells from the Wizard spell list. Choose two cantrips and one 1st-level spell. You can cast the 1st-level spell once per long rest at its lowest level without expending a spell slot, or with any spell slot you have. Intelligence is your spellcasting ability for these spells.",
  },
  skilled: {
    kind: "skilled",
    description:
      "You gain proficiency in any combination of three skills or tools of your choice.",
  },
  crafter: {
    kind: "crafter",
    description:
      "You gain proficiency with three artisan's tools of your choice. Additionally, when you buy nonmagical equipment, you receive a 20% discount.",
  },
  alert: {
    kind: "static",
    description:
      "You gain a +5 bonus to Initiative. You can also swap initiative with a willing ally, provided you aren't surprised.",
  },
  lucky: {
    kind: "static",
    description:
      "You have 3 Luck Points. Whenever you make a D20 Test, you can spend 1 Luck Point to roll an additional d20 and choose which die to use. You regain expended Luck Points after a long rest.",
  },
  tough: {
    kind: "static",
    description:
      "Your Hit Point maximum increases by an amount equal to twice your character level when you gain this feat. Whenever you gain a level thereafter, your HP maximum increases by an additional 2 hit points.",
  },
  healer: {
    kind: "static",
    description:
      "You are an able physician — once per turn, when you use a Healer's Kit, the target also regains 1d6 + Proficiency Bonus hit points. You can also expend uses of a Healer's Kit to stabilize a creature without a check.",
  },
  musician: {
    kind: "static",
    description:
      "You gain proficiency with three musical instruments of your choice. After a short or long rest with you, allies who hear you play gain a Heroic Inspiration die equal to your proficiency bonus.",
  },
  "savage-attacker": {
    kind: "static",
    description:
      "Once per turn, when you roll damage for a melee weapon or unarmed strike, you can reroll the weapon's damage dice and use either total.",
  },
  "tavern-brawler": {
    kind: "static",
    description:
      "Your unarmed strike uses a d4 for damage. When you hit with an unarmed strike or improvised weapon on your turn, you can use a bonus action to attempt to grapple the target. You also have proficiency with improvised weapons.",
  },
};

/** Resolve a feat row into FEAT_LIBRARY info — fuzzy-matches by
 *  index first, falling back to the lowercase name. */
function resolveFeat(feat: {
  index?: string;
  name?: string;
} | null): FeatInfo | null {
  if (!feat) return null;
  const idxKey = (feat.index ?? "").toLowerCase().trim();
  if (idxKey && FEAT_LIBRARY[idxKey]) return FEAT_LIBRARY[idxKey];
  // Name-based fallback: "Magic Initiate (Cleric)" → magic-initiate-cleric
  const nameKey = (feat.name ?? "")
    .toLowerCase()
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/\s+/g, "-")
    .trim();
  if (FEAT_LIBRARY[nameKey]) return FEAT_LIBRARY[nameKey];
  // Stripped-name fallback: "Magic Initiate" alone (no class) →
  // can't tell which list to use, so render as static with a hint.
  const baseName = (feat.name ?? "").toLowerCase().trim();
  if (baseName === "magic initiate") {
    return {
      kind: "static",
      description:
        "You have learned spells from a class's spell list (2 cantrips + 1 1st-level spell). The class isn't specified on this background row — the picker can't surface it. Open the character sheet later to configure the spells manually.",
    };
  }
  return null;
}

/** Tools the Crafter feat lets you pick. From PHB 2024 + Equipment
 *  chapter — covers the artisan tool families. */
const CRAFTER_TOOL_OPTIONS = [
  "Alchemist's Supplies",
  "Brewer's Supplies",
  "Calligrapher's Supplies",
  "Carpenter's Tools",
  "Cartographer's Tools",
  "Cobbler's Tools",
  "Cook's Utensils",
  "Glassblower's Tools",
  "Jeweler's Tools",
  "Leatherworker's Tools",
  "Mason's Tools",
  "Painter's Supplies",
  "Potter's Tools",
  "Smith's Tools",
  "Tinker's Tools",
  "Weaver's Tools",
  "Woodcarver's Tools",
];

export interface FeatChoices {
  cantrips: string[];
  spells: string[];
  skills: string[];
  tools: string[];
}

interface Props {
  /** The feat object from the background row. */
  feat: { index?: string; name?: string; description?: string } | null;
  value: FeatChoices;
  onChange: (next: FeatChoices) => void;
  /** Skills already known via class or background — should be
   *  excluded from the Skilled picker so the user can't double-up. */
  excludeSkills?: string[];
}

/**
 * 2024 PHB Origin Feat choice picker. Detects the feat by index and
 * surfaces the appropriate sub-picker:
 *   • magic-initiate-*  → 2 cantrips + 1 spell from the class list
 *   • skilled           → 3 skill proficiencies
 *   • crafter           → 3 tool proficiencies + 20% discount
 *
 * Other feats (Tough, Lucky, Alert, etc.) grant static benefits and
 * render only as a label + description.
 */
export function FeatPicker({ feat, value, onChange, excludeSkills = [] }: Props) {
  if (!feat || (!feat.index && !feat.name)) return null;

  const info = resolveFeat(feat);
  // Prefer the canonical description from FEAT_LIBRARY; fall back to
  // whatever was stored on the feat row.
  const description = info?.description ?? feat.description ?? null;

  // Magic Initiate variants share UI, differ only by spell list.
  const magicInitiateClass =
    info?.kind === "magic-initiate-cleric"
      ? "cleric"
      : info?.kind === "magic-initiate-druid"
        ? "druid"
        : info?.kind === "magic-initiate-wizard"
          ? "wizard"
          : null;

  return (
    <div className="sc-card p-4 space-y-3 border-primary/30">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-400" />
        <div className="flex-1">
          <h3 className="font-serif text-base font-semibold">
            Feat: {feat.name ?? feat.index}
          </h3>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {magicInitiateClass && (
        <MagicInitiatePicker
          classIndex={magicInitiateClass}
          cantrips={value.cantrips}
          spells={value.spells}
          onChangeCantrips={(c) => onChange({ ...value, cantrips: c })}
          onChangeSpells={(s) => onChange({ ...value, spells: s })}
        />
      )}

      {info?.kind === "skilled" && (
        <SkilledPicker
          value={value.skills}
          onChange={(s) => onChange({ ...value, skills: s })}
          excludeSkills={excludeSkills}
        />
      )}

      {info?.kind === "crafter" && (
        <CrafterPicker
          value={value.tools}
          onChange={(t) => onChange({ ...value, tools: t })}
        />
      )}

      {/* No-choice feats — only show the "no picks required" hint
          when we actually identified the feat as static. Unknown
          feats already have their description shown above. */}
      {info?.kind === "static" && (
        <p className="text-[11px] italic text-muted-foreground">
          This feat grants its benefit automatically — no picks required.
        </p>
      )}
    </div>
  );
}

// ── Magic Initiate ──────────────────────────────────────────────────

interface SpellLite {
  index: string;
  name: string;
  level: number;
  school: string | null;
  description: string | null;
  classes: string[] | null;
}

function MagicInitiatePicker({
  classIndex,
  cantrips,
  spells,
  onChangeCantrips,
  onChangeSpells,
}: {
  classIndex: string;
  cantrips: string[];
  spells: string[];
  onChangeCantrips: (next: string[]) => void;
  onChangeSpells: (next: string[]) => void;
}) {
  const [all, setAll] = useState<SpellLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from("srd_spells")
        .select("index, name, level, school, description, classes")
        .lte("level", 1)
        .order("level", { ascending: true })
        .order("name", { ascending: true });
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const filtered = ((data ?? []) as Array<Record<string, unknown>>)
        .filter((r) =>
          Array.isArray(r.classes) &&
          (r.classes as string[]).some(
            (c) => c.toLowerCase() === classIndex
          )
        )
        .map((r) => ({
          index: r.index as string,
          name: r.name as string,
          level: r.level as number,
          school: (r.school as string | null) ?? null,
          description: (r.description as string | null) ?? null,
          classes: (r.classes as string[] | null) ?? null,
        }));
      setAll(filtered);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [classIndex]);

  const cantripList = useMemo(() => all.filter((s) => s.level === 0), [all]);
  const spellList = useMemo(() => all.filter((s) => s.level === 1), [all]);

  const cantripSet = new Set(cantrips);
  const spellSet = new Set(spells);

  const toggleCantrip = (idx: string) => {
    const next = new Set(cantripSet);
    if (next.has(idx)) next.delete(idx);
    else {
      if (next.size >= 2) return;
      next.add(idx);
    }
    onChangeCantrips(Array.from(next));
  };
  const toggleSpell = (idx: string) => {
    const next = new Set(spellSet);
    if (next.has(idx)) next.delete(idx);
    else {
      if (next.size >= 1) return;
      next.add(idx);
    }
    onChangeSpells(Array.from(next));
  };

  if (loading)
    return (
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading spells…
      </p>
    );
  if (error)
    return <p className="text-xs text-destructive">Could not load spells: {error}</p>;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Cantrips ({cantrips.length}/2)
        </p>
        <SpellGrid
          spells={cantripList}
          selected={cantripSet}
          atCap={cantripSet.size >= 2}
          onToggle={toggleCantrip}
        />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          1st-level spell ({spells.length}/1)
        </p>
        <SpellGrid
          spells={spellList}
          selected={spellSet}
          atCap={spellSet.size >= 1}
          onToggle={toggleSpell}
        />
      </div>
    </div>
  );
}

function SpellGrid({
  spells,
  selected,
  atCap,
  onToggle,
}: {
  spells: SpellLite[];
  selected: Set<string>;
  atCap: boolean;
  onToggle: (idx: string) => void;
}) {
  if (spells.length === 0)
    return (
      <p className="text-xs italic text-muted-foreground">No spells found.</p>
    );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
      {spells.map((s) => {
        const isPicked = selected.has(s.index);
        const blocked = !isPicked && atCap;
        return (
          <button
            key={s.index}
            type="button"
            onClick={() => onToggle(s.index)}
            disabled={blocked}
            title={s.description ?? s.name}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors text-left flex items-center gap-1",
              isPicked
                ? "border-primary/60 bg-primary/20 text-primary"
                : blocked
                  ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
                  : "border-border bg-background hover:border-primary/60 hover:bg-primary/10"
            )}
          >
            {isPicked && <Check className="h-3 w-3 shrink-0" />}
            <span className="truncate">{s.name}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Skilled ─────────────────────────────────────────────────────────

function SkilledPicker({
  value,
  onChange,
  excludeSkills,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  excludeSkills: string[];
}) {
  const excluded = new Set(excludeSkills.map((s) => s.toLowerCase()));
  const picked = new Set(value);
  const cap = 3;
  const toggle = (key: string) => {
    const next = new Set(picked);
    if (next.has(key)) next.delete(key);
    else {
      if (next.size >= cap) return;
      next.add(key);
    }
    onChange(Array.from(next));
  };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        Skill proficiencies ({value.length}/{cap})
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
        {DND_SKILLS.map((s) => {
          const isPicked = picked.has(s.name);
          const isExcluded = excluded.has(s.name);
          const blocked = !isPicked && (picked.size >= cap || isExcluded);
          const display = s.name
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          return (
            <button
              key={s.name}
              type="button"
              onClick={() => toggle(s.name)}
              disabled={blocked}
              title={
                isExcluded
                  ? "Already known from your class or background"
                  : s.description
              }
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors text-left flex items-center gap-1",
                isPicked
                  ? "border-primary/60 bg-primary/20 text-primary"
                  : blocked
                    ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
                    : "border-border bg-background hover:border-primary/60 hover:bg-primary/10",
                isExcluded && "line-through"
              )}
            >
              {isPicked && <Check className="h-3 w-3 shrink-0" />}
              <span className="truncate">{display}</span>
              <Badge
                variant="outline"
                className="ml-auto text-[8px] uppercase shrink-0"
              >
                {String(s.ability).slice(0, 3)}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Crafter ─────────────────────────────────────────────────────────

function CrafterPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const picked = new Set(value);
  const cap = 3;
  const toggle = (tool: string) => {
    const next = new Set(picked);
    if (next.has(tool)) next.delete(tool);
    else {
      if (next.size >= cap) return;
      next.add(tool);
    }
    onChange(Array.from(next));
  };
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        Artisan&apos;s tools ({value.length}/{cap})
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
        {CRAFTER_TOOL_OPTIONS.map((tool) => {
          const isPicked = picked.has(tool);
          const blocked = !isPicked && picked.size >= cap;
          return (
            <button
              key={tool}
              type="button"
              onClick={() => toggle(tool)}
              disabled={blocked}
              className={cn(
                "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors text-left flex items-center gap-1",
                isPicked
                  ? "border-primary/60 bg-primary/20 text-primary"
                  : blocked
                    ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
                    : "border-border bg-background hover:border-primary/60 hover:bg-primary/10"
              )}
            >
              {isPicked && <Check className="h-3 w-3 shrink-0" />}
              <span className="truncate">{tool}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] italic text-muted-foreground">
        Crafter also gives a 20% discount on nonmagical equipment.
      </p>
    </div>
  );
}
