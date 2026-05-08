# End with Loot + Party Shared Inventory — Design Spec

**Date:** 2026-05-08
**Status:** Approved (Q1-A accurate, Q2-A treasury, Q3-A party_loot + claim)

## Problem

DMs spend time inventing post-combat loot for every encounter. The user wants a one-click "End with Loot" flow:

1. End the encounter and roll loot at the same time.
2. Roll uses **accurate D&D 5e DMG tables** — per-monster individual treasure plus a once-per-encounter hoard, with magic items pulled from real SRD entries when the relevant table fires.
3. DM reviews the rolled loot in a modal, ticks/unticks items, optionally re-rolls.
4. Approved items go into a **party shared inventory** (claim race) and approved coin goes into a **party treasury**.
5. Players see the loot in a new sidebar tab and click "Claim" to move an item to their character.

## Goals

- Zero-config "End with Loot" — the DM clicks one button, gets DMG-faithful loot.
- Persisted, realtime party_loot + party_treasury that survives reload and syncs across clients.
- Claim flow that doesn't require DM intervention.

## Non-Goals (v1)

- Encumbrance, weight, or item-trade negotiations between players.
- Per-monster loot drops in the modal (we sum to encounter-level for review).
- Editing rolled item details (e.g. changing "Potion of Healing" to "Potion of Greater Healing").
- Auto-distributing coin per character — it stays in the party treasury and players spend collectively.

## DMG Loot Tables (the "really accurate" part)

### Individual Treasure (per monster, by CR tier)

DMG p.136. Each monster rolls a d100 on its tier's table. Result is a coin payout. Tables encoded **verbatim** as data:

| Tier      | Sample table row format                          |
|-----------|--------------------------------------------------|
| CR 0–4    | 01-30 → 5d6 cp; 31-60 → 4d6 sp; 61-70 → 3d6 ep; 71-95 → 3d6 gp; 96-00 → 1d6 pp |
| CR 5–10   | 01-30 → 4d6×100 cp + 1d6×10 ep; 31-60 → 6d6×10 sp + 2d6×10 gp; 61-70 → 3d6×10 ep + 2d6×10 gp; 71-95 → 4d6×10 gp; 96-00 → 2d6×10 pp |
| CR 11–16  | 01-20 → 4d6×100 sp + 1d6×100 gp; 21-35 → 1d6×100 ep + 1d6×100 gp; 36-75 → 2d6×100 gp; 76-00 → 1d6×100 pp |
| CR 17+    | 01-15 → 2d6×1000 ep + 8d6×100 gp; 16-55 → 1d6×1000 gp + 1d6×100 pp; 56-00 → 2d6×100 pp |

Implemented as `INDIVIDUAL_TREASURE_TABLES: Record<Tier, Array<{ rollMin; rollMax; coins: CoinRoll[] }>>`. Each `CoinRoll` is `{ kind: 'cp'|'sp'|'ep'|'gp'|'pp'; dice: string; multiplier: number }`.

### Hoard Treasure (rolled once per encounter)

DMG p.137-149. The encounter as a whole rolls one hoard, using the **encounter's highest-CR monster's tier**. Hoard table fires:

- Coins (always)
- Gems / Art objects (probabilistic by d100)
- Magic items (probabilistic by d100, with a count and a Magic Item Table reference A-I)

Magic Item Tables A-I correspond to rarity tiers:

| Table | Rarity        |
|-------|---------------|
| A     | common (consumables / low) |
| B     | uncommon (consumables / low) |
| C     | rare (consumables / mid) |
| D     | very rare (consumables / high) |
| E     | legendary (consumables / top) |
| F     | uncommon (permanent) |
| G     | rare (permanent) |
| H     | very rare (permanent) |
| I     | legendary (permanent) |

The encoded hoard tables produce a list of `{ table: 'F', count: 2 }`. We then resolve each to `count` random rows from `srd_magic_items` filtered by the matching `rarity` (and a rough "consumable" heuristic for A-E based on equipment_category — Potions, Scrolls). Sampling is uniform random with replacement.

### Gems & Art Objects

DMG also provides gem/art-object tables by gp value (10gp gems, 50gp gems, …, 7500gp art). For v1 we generate them as **named line items** in `party_loot` (e.g. "Cut quartz, 50 gp") with a `notes` field carrying the gp value. They aren't pulled from any item table — they're a small built-in list of canonical D&D gems and art objects.

### Module shape

`lib/loot/dmg-tables.ts` — pure functions, no I/O:

```ts
type Tier = "0-4" | "5-10" | "11-16" | "17+";
type CoinPurse = { cp: number; sp: number; ep: number; gp: number; pp: number };
type GeneratedItem =
  | { kind: "magic"; source: "srd"; index: string; name: string; rarity: string }
  | { kind: "gem"; name: string; gpValue: number; quantity: number }
  | { kind: "art"; name: string; gpValue: number; quantity: number };
type LootResult = { coins: CoinPurse; items: GeneratedItem[] };

export function tierForCr(cr: number): Tier;
export function rollIndividualTreasure(cr: number): CoinPurse;
export function rollHoard(tier: Tier, magicItemPool: SrdMagicItem[]): LootResult;
export function rollEncounterLoot(monsters: Array<{cr: number}>, pool: SrdMagicItem[]): LootResult;
```

`rollEncounterLoot` is the entry point: it sums individual treasure across monsters and adds one hoard (using the highest-tier monster). `magicItemPool` is fetched from `srd_magic_items` once and indexed by rarity.

## Schema

### `party_treasury`
```sql
create table party_treasury (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  cp integer not null default 0,
  sp integer not null default 0,
  ep integer not null default 0,
  gp integer not null default 0,
  pp integer not null default 0,
  updated_at timestamptz not null default now()
);
```
Single row per campaign. Loot deposits **add** to existing values; players spending coin issue updates that **subtract** (UI for spending is not in scope for v1 — DMs can manually adjust if needed via a small input).

### `party_loot`
```sql
create table party_loot (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  -- Source of the item. For SRD/homebrew equipment + magic items, item_source +
  -- item_index can resolve back to the catalog. For gems/art, item_source is
  -- 'gem' or 'art' and the snapshot field carries name/gp_value.
  item_source text not null check (item_source in ('srd','homebrew','gem','art')),
  item_index text,                     -- nullable for gem/art
  quantity integer not null default 1,
  -- Snapshot fields so the row stays renderable if the catalog row is removed.
  name text not null,
  rarity text,                         -- magic items only
  gp_value integer,                    -- gem/art only
  notes text,
  -- Claim state.
  claimed_by_character_id uuid references characters(id) on delete set null,
  claimed_at timestamptz,
  -- Provenance.
  sent_from_encounter_id uuid references combat_encounters(id) on delete set null,
  created_at timestamptz not null default now()
);
create index party_loot_campaign_idx on party_loot(campaign_id, created_at desc);
create index party_loot_unclaimed_idx
  on party_loot(campaign_id) where claimed_by_character_id is null;
```

### RLS
- `party_treasury`: SELECT for campaign members; UPDATE allowed for any campaign member (treasury is shared, so players can deposit/withdraw freely; bad-faith edits are mitigated by realtime visibility).
- `party_loot`: SELECT for campaign members. INSERT only for the DM. UPDATE allowed for any campaign member but only when changing `claimed_by_character_id` from `null` to one of *their own* characters (enforced by a policy that checks the character belongs to `auth.uid()`). DELETE for DM only.

## Architecture

### New files
- `lib/loot/dmg-tables.ts` — pure DMG roll functions described above.
- `lib/loot/gems-art.ts` — canonical gem + art-object lists by gp value.
- `hooks/usePartyTreasury.ts` — read/write per-campaign treasury, realtime.
- `hooks/usePartyLoot.ts` — list / insert / claim / unclaim, realtime.
- `components/vtt/loot/end-with-loot-dialog.tsx` — the review modal opened by the new button.
- `components/vtt/loot/loot-panel.tsx` — sidebar tab with treasury at top + items list with Claim buttons.
- `components/vtt/loot/loot-row.tsx` — single item row.

### Integration points
- `components/vtt/vtt-combat-panel.tsx` — add the "End with Loot" button next to "End." Wires `useGenerateLoot` (hook in the dialog) and on confirm calls `endEncounter()` from `useCombat`.
- `components/vtt/vtt-left-sidebar.tsx` — new `"loot"` tab (icon: `Coins` from lucide), visible to both DM and players.
- `app/(vtt)/campaigns/[campaignId]/vtt/page.tsx` — wire the loot panel into the new sidebar slot.

### "End with Loot" dialog flow
1. DM clicks the button → dialog opens, runs `rollEncounterLoot` against the encounter's monsters and the cached `srd_magic_items` pool.
2. Dialog shows:
   - Header: encounter name + "Reroll" button (re-runs the roll keeping the same monster set).
   - Coin summary in a single row, all selected by default. The DM can edit each coin amount inline before sending (e.g. round to 100 gp).
   - Item list with checkboxes (all checked). Each row shows name + rarity badge / gp-value badge for gems/art. Clicking a row toggles it; "Select all / none" buttons.
   - Footer: "Cancel" + primary "Send & End Encounter".
3. On confirm:
   - Insert one `party_loot` row per checked item (carrying `sent_from_encounter_id` for provenance).
   - Increment `party_treasury` by the (possibly-edited) coin amounts.
   - Call `endEncounter()` to close out the combat.
   - Toast: "Loot sent: 1d6 items + 240 gp."

### Loot sidebar panel
- Top: party treasury card showing all five denominations as big tabular numbers; each is editable inline by anyone (paranoia is the tax for "the player's job" model).
- Below: chronological list of `party_loot` rows. Filter chips: "Unclaimed / Claimed / All." Each row:
  - Item name + rarity badge / gp badge.
  - If unclaimed: "Claim →" dropdown of *the user's own characters* (characters where `user_id = auth.uid()`).
  - If claimed: "Claimed by Bare" + (if the user is the DM or the claimer) an "Unclaim" button.
  - DM-only: "Trash" button to permanently delete the row.
- Click "Claim → Bare" appends the item to Bare's `characters.inventory` JSONB and stamps the loot row's `claimed_by_character_id`. The item still lives in `party_loot` (so we keep history) but no longer shows in the unclaimed list.

## Error handling

- Magic-item pool empty (network failure) → fall back to coin-only loot, toast a hint.
- Encounter has no monsters → "End with Loot" disabled.
- Claim race (two players claim the same row simultaneously) → optimistic UI, the second insert/update fails on the unique-by-id-claim invariant, second user gets a toast "Someone beat you to it."
- Coin amount edited to negative → blocked at the form level.

## Testing plan

- Roll a CR-1 monster encounter 50 times, assert distribution matches the DMG table within ±5% bins.
- Roll a CR-15 hoard, assert at least 1 magic item appears ≥80% of the time and tier-G+ items show with realistic frequency.
- DM unchecks half the items, hits Send → only checked items in `party_loot`, coin matches the (possibly-edited) values.
- Player A and Player B both claim the same row from different browsers → exactly one succeeds, the other sees the row become claimed.
- Deleting an SRD magic item after a handout was rolled → loot row still renders thanks to snapshot fields.

## Out-of-scope follow-ups

- Per-monster loot drops shown in the dialog (right now items are summed across all monsters).
- Currency conversion buttons (10 sp → 1 gp).
- Player-facing "spend gold" dialog that subtracts from the treasury.
- Loot diff between handouts and what landed in inventory.
- Per-table reroll (just the magic items, just the coins).
- Pre-built monster-specific loot overrides (e.g. "this Adult Black Dragon's lair has the lost crown").
