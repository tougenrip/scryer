# End-with-Loot + Party Shared Inventory + Claim Duel — Design Spec

**Date:** 2026-05-09
**Status:** Approved (all defaults + hand-emoji RPS animation)

## Problem

Coming up with reward loot every encounter is the highest-friction DM task in this app. There's also no shared party stash today — gold and items either disappear into individual character sheets or get tracked off-platform. And when two players want the same item, there's no tooling to settle it.

This spec covers three connected pieces:
1. **Generate loot from encounter CR** when the DM ends a fight.
2. **Hold the loot in a party-level inventory** so anyone can claim from it.
3. **Resolve simultaneous-claim conflicts with a real-time duel** (rock-paper-scissors or coin flip, with animations on both players' screens).

## Goals

1. DM clicks "End with Loot" → modal with rolled gp + items the DM can curate (uncheck things that don't fit, reroll if they hate it) → on confirm, gold lands in the party treasury and items appear in a shared inventory tab everyone can see and claim from.
2. Loot generation feels accurate enough that DMs trust it. Faithful to DMG individual-treasure tables for the encounter's CR tier; magic items roll on the appropriate Magic Item Table by tier.
3. Players race to claim items. If two click within 3 seconds, a duel pops on both their screens with snappy animations and an honest random outcome.
4. Coin treasury lands directly in the party treasury (no claim flow — coin is fungible). Items are the only thing players claim individually.

## Non-Goals (v1)

- Per-character XP awards from the same modal (separate feature).
- Loot generation for non-combat / treasure-hoard scenarios outside an encounter.
- Trading items between characters after they've been claimed.
- Tracking who carries shared items beyond "claimed_by character X."
- Custom DM-defined loot tables (use the existing random-tables tab for that, separately).
- Spectator interaction with the duel (they can watch but not vote).

## Loot generation

### Sources & accuracy
We use the **DMG 2014 Treasure: Individual Treasure** tables (page 136), keyed by encounter CR tier (0–4 / 5–10 / 11–16 / 17+). For each defeated monster we roll once on its tier's table to produce coin amounts. For "treasure hoard" rolls (CR-tiered Magic Item Tables A–I) we roll one shared hoard per encounter (not per monster) so a 6-goblin fight doesn't print six +2 swords.

The actual table data lives in code (a single TypeScript module) — these are static d% tables and don't need a DB round-trip.

**Pipeline:**
1. Aggregate the encounter's monsters → highest CR + total CR.
2. Pick CR tier from highest CR (DMG: tier is determined by the strongest in the fight).
3. For each monster: roll on Individual Treasure table → coin amounts (cp/sp/ep/gp/pp).
4. Roll once on the encounter's hoard table → magic items (% chance per row, per tier).
5. Magic items resolve via `srd_magic_items` table; pick a random row whose `rarity` matches what the DMG row mandates ("magic item from Table A," "magic item from Table B," etc.). We map DMG tables → rarities (Table A = Common, B = Uncommon, C/D/E = Uncommon/Rare/Very Rare/Legendary by table).
6. The output is a `RolledLoot` object: `{ coins: { cp, sp, ep, gp, pp }, items: Array<{ source: 'srd', kind: 'equipment'|'magic', index, name, rarity? }> }`.

### Reroll
The modal has a "Reroll all" button that re-runs the same pipeline with a fresh seed. Individual rows can also be rerolled (a per-row 🎲 button rerolls just that row, picking a new item of the same rarity).

### Manual add
The DM can also click "+ Add item" and pick anything from `srd_equipment` or `srd_magic_items` (search-as-you-type), in case they want a specific item that didn't roll up.

## Party inventory model

### Tables

```sql
-- Shared coin pool. One row per campaign.
create table party_treasury (
  campaign_id uuid primary key references campaigns(id) on delete cascade,
  cp integer not null default 0,
  sp integer not null default 0,
  ep integer not null default 0,
  gp integer not null default 0,
  pp integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Items waiting in the party stash, plus their claim state.
create table party_loot (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  item_source text not null,                    -- 'srd' | 'homebrew'
  item_kind text not null,                      -- 'equipment' | 'magic'
  item_index text not null,                     -- foreign-style ref into srd_equipment/srd_magic_items
  item_name text not null,                      -- denormalized for display + history
  quantity integer not null default 1,
  rarity text,                                  -- denormalized; null for non-magic
  claimed_by_character_id uuid references characters(id) on delete set null,
  claimed_at timestamptz,
  /* Soft-claim window: when set, this row is in a "challenge window."
     Other players can challenge until challenge_until elapses. */
  pending_claim_by_character_id uuid references characters(id) on delete set null,
  pending_claim_at timestamptz,
  challenge_until timestamptz,
  source_encounter_id uuid references encounters(id) on delete set null,
  created_at timestamptz not null default now()
);
create index party_loot_campaign_idx on party_loot(campaign_id);
create index party_loot_unclaimed_idx on party_loot(campaign_id) where claimed_by_character_id is null;
```

### RLS
- `party_treasury`: SELECT — campaign members. UPDATE — DM only (and the system, via signed RPCs for claim/duel resolution).
- `party_loot`: SELECT — campaign members. INSERT/DELETE — DM only. UPDATE — campaign members but only certain columns (claim fields), enforced via a postgres function rather than direct RLS column-level (which Postgres doesn't have natively).

We expose three RPCs (Postgres functions) instead of letting clients update party_loot directly:
- `claim_loot(loot_id, character_id)` — sets pending_claim if unclaimed, errors if not your character.
- `challenge_loot(loot_id, challenger_character_id)` — only valid during the challenge window; creates a duel.
- `resolve_duel(duel_id, winner_character_id)` — server-side validates the duel is finalized, transfers the claim.

### Realtime
Both tables broadcast on Supabase realtime. The Loot tab subscribes to party_loot changes; the treasury widget subscribes to party_treasury.

## End-with-Loot UI

### Trigger
The combat panel's existing "End encounter" button gets a sibling: **"End with Loot"** (gold/amber). Clicking opens the loot modal *before* the encounter ends. The encounter only ends when the DM confirms; "Cancel" leaves the encounter active.

### Modal
A wide `Dialog` (~720px) with three sections:

1. **Header**: "Encounter loot" + the encounter name + a tier indicator ("CR 5–10 tier"). Roll-button cluster: 🎲 Reroll all, 💰 Coin only, ✨ Items only.

2. **Coin row**: each denomination as a chip showing the rolled value with a small input you can edit (DM might want to round). Sum displayed in gp-equivalent at the right.

3. **Item list**: each rolled item is a row with:
   - Checkbox (default checked)
   - Name + rarity badge
   - Per-row 🎲 reroll (rolls a new item of the same rarity)
   - 🗑 Remove
   - "+ Add item" button at the bottom; opens a small searchable picker into `srd_equipment` and `srd_magic_items`.

4. **Footer buttons**: "Cancel" (encounter stays active, modal closes), "Send to Party" (commits the kept loot + ends the encounter).

### Commit
"Send to Party" runs in a single transaction:
- `party_treasury` UPSERT-add the coin amounts.
- `party_loot` INSERT one row per checked item (quantity collapsed for duplicates).
- `endEncounter()` is then called.
- A `vtt_handouts` "Loot delivered" handout is auto-sent to all players (so they get the popup + can click through to the Loot tab).

## Loot tab (left sidebar)

A new tab "Loot" (icon: `Coins` from lucide). Visible to DM + all players.

### Layout
- **Top strip — treasury**: cp / sp / ep / gp / pp chips, big readable numbers. DM has small +/- buttons next to each (manual edits land in `party_treasury`).
- **Items list**:
  - Section: **Unclaimed** — every row with `claimed_by_character_id IS NULL` (sorted newest first).
  - Section: **Claimed** — collapsible, sorted by character.
- Each unclaimed row:
  - Item name + rarity badge
  - Description tooltip on hover (resolves from srd tables)
  - "Claim" button (player picks which of their characters if they have multiple). DM has a dropdown to assign to any character.

### Claim flow with the 3-second challenge window
1. Player A clicks **Claim** on row X.
2. Client calls `claim_loot(row_id, character_a_id)`.
3. RPC sets `pending_claim_by_character_id = A`, `pending_claim_at = now()`, `challenge_until = now() + 3s`.
4. Realtime push → all clients see the row in a "pending" state with a 3-second countdown ring.
5. **No challenge** within 3s → a follow-up RPC (or client-side timeout fallback + server-side cron-style enforcement on the next claim) finalizes the claim: `claimed_by_character_id = A`, clears pending fields. The character's `inventory` JSONB also gets the item appended.
6. **Player B clicks Challenge** within the window → RPC `challenge_loot(row_id, character_b_id)` creates a `loot_duels` row and broadcasts a duel-start event. The pending claim stays frozen until the duel resolves; the row is locked from further challenges.

If a player's character isn't online (no realtime presence) when the window opens, the challenge button is grayed out for them — no asynchronous "I challenge you next session" mechanic.

## Duel — RPS or coin flip

### Tables

```sql
create table loot_duels (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  loot_id uuid not null references party_loot(id) on delete cascade,
  game text not null check (game in ('rps','coin')),

  defender_character_id uuid not null references characters(id),
  defender_user_id uuid not null references auth.users(id),
  defender_choice text,    -- 'rock'|'paper'|'scissors' or 'heads'|'tails' or null until locked

  challenger_character_id uuid not null references characters(id),
  challenger_user_id uuid not null references auth.users(id),
  challenger_choice text,

  status text not null default 'choosing' check (status in ('choosing','revealing','done','tie_rematch')),
  winner_character_id uuid references characters(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index loot_duels_loot_idx on loot_duels(loot_id);
```

### Mode-pick
The challenger picks RPS or coin flip in their challenge dialog (one click). Defender sees "Player B challenged you for [item] — accept?" with the chosen game name. Decline cancels the challenge (defender keeps the claim). Accept opens the duel modal on both screens.

If the defender doesn't respond within 8s, auto-accept (so a stalling defender can't permanently block).

### Duel modal — shared
Big centered modal (cannot be dismissed until the duel resolves). Both players see the same UI; spectators (DM + other players in the campaign) see a read-only version with the same animation.

**Phases (driven by status):**

1. **Choosing** — both players see a 5-second countdown. Each picks privately:
   - **RPS**: three big tappable cards with hand illustrations:
     - ✊ rock — closed fist hand
     - 🖐 paper — flat open hand
     - ✌ scissors — index + middle finger spread
     The hands are bespoke SVG illustrations (one file, three poses) so they animate cleanly. Picked card glows amber and locks; player can swap as long as the timer hasn't ended.
   - **Coin**: two big buttons with face/tails symbols.
   If a player doesn't pick by the timer, the system auto-picks randomly for them.
2. **Revealing** — both choices are now committed. Animation phase:
   - **RPS**: each player's chosen hand is shown in their corner (left + right), both hands shake-shake-shake-throw — they tilt down 30° then back up, three beats of "shake," then on the fourth beat they snap to the chosen pose (fist / flat / scissors). Spring physics. ~1.5 seconds total.
   - **Coin**: a 3D coin centered, perspective wrapper, `rotateY` from 0° to 1080° + 0/180° depending on outcome. Lands with a soft bounce. 1.5 seconds.
3. **Done** — winner card grows + glows; loser card desaturates. "✨ [Winner Character] won [Item]" banner. 2-second auto-dismiss, modal closes, item moves to winner's inventory.
4. **Tie rematch** (RPS only) — choices identical → modal stays open, both players' choices clear, choosing phase restarts with a fresh 5s timer. Coin: ties are impossible (you each pick one side; matching = same call so loser ≠ winner is determined by what side it landed on, not by sides matching).

### Animation tech
- Framer Motion if installed; otherwise plain CSS keyframes — both work.
- The coin is a div with `transform-style: preserve-3d`; faces are absolutely-positioned children with `backface-visibility: hidden`.
- Hand SVGs live in `components/vtt/loot/duel/hands/` — three files: `hand-rock.svg`, `hand-paper.svg`, `hand-scissors.svg`. Each is a single-color (currentColor) line drawing at 256px viewbox. Drawn fresh for this feature; ~10 minutes each.
- Sound: a single `assets/audio/duel-coin.mp3` and `duel-rps.mp3` mixed at low volume; controlled by a session-only "duel sounds" toggle that defaults on.

### Realtime sync
The duel modal subscribes to its `loot_duels` row. Both players' clients watch:
- Other player's locked-in state (so the timer can show "✓ locked / waiting")
- Status transitions

When status flips to `revealing`, both clients run the animation locally with the choices that are now visible. They use `createdAt + delays` so the animation starts at the same wall-clock instant on both screens (within ~100ms). If one client lags, its animation just plays slightly behind; the resolution is server-side anyway.

### Resolution
Server-side: a Postgres function `resolve_duel(duel_id)` runs when both choices are filled, computes the winner deterministically, and updates the row. Clients only display — they never decide who won. This prevents cheating.

### Spectator view
DM + other party members see the duel modal with the same animation but with no buttons — just a "[A] vs [B] for [Item]" header and the unfolding game. Auto-closes on resolution.

## Architecture summary

### New files
- `lib/loot/dmg-tables.ts` — DMG 2014 individual treasure + magic item tables, hard-coded.
- `lib/loot/roll-loot.ts` — pure function: `(monsters: Monster[]) → RolledLoot`. Pulls a random matching item from `srd_equipment` / `srd_magic_items` based on the rolled rarity.
- `hooks/usePartyLoot.ts` — list, claim, challenge, resolve; subscribes to realtime.
- `hooks/usePartyTreasury.ts` — read + DM update.
- `components/vtt/loot/end-with-loot-dialog.tsx` — DM modal.
- `components/vtt/loot/loot-tab-panel.tsx` — left-sidebar Loot panel.
- `components/vtt/loot/treasury-strip.tsx` — coin chips at the top.
- `components/vtt/loot/loot-row.tsx` — one item row with claim/challenge button.
- `components/vtt/loot/duel/duel-modal.tsx` — the shared modal.
- `components/vtt/loot/duel/coin-flip.tsx` — animation.
- `components/vtt/loot/duel/rps-hands.tsx` — animation, three SVG hands.
- `components/vtt/loot/duel/hands/*.svg` — bespoke hand illustrations.
- `lib/store/duel-sounds-store.ts` — toggle.

### SQL
Three migrations:
- `095_party_treasury.sql`
- `096_party_loot.sql`
- `097_loot_duels.sql`
Plus three RPC functions for claim/challenge/resolve.

### Integrations
- Combat panel: add the second button.
- Left sidebar: new "Loot" tab + icon.
- Handouts: auto-send "Loot delivered" handout when DM commits.

## Error handling
- Loot generation failure (no matching srd row for required rarity) → fall back to next-rarity-down, log a console warning. Never block the modal.
- Reroll while modal open is local-only until commit.
- RPC race (A and B both claim the exact same instant) → first to land in postgres wins; the loser's call returns an error and the client immediately tries `challenge_loot`.
- Duel disconnect → server-side timeout (15s after last status change) auto-picks for the missing player and resolves.

## Testing plan
- Roll loot for a CR-2 fight 100x; assert distributions match DMG individual table within tolerance.
- Roll loot for a mixed CR fight; assert tier comes from the strongest monster.
- Two players race-click claim → exactly one becomes pending claimer; the other gets a challenge dialog.
- RPS animation runs identically on two browsers (manual visual check).
- Coin flip: landing matches the server's verdict in 100/100 trials.
- Tie rematch in RPS works.
- Defender ignores challenge → 8s auto-accept.
- Player disconnects mid-duel → 15s server-side resolve.

## Out-of-scope follow-ups
- Per-character XP / level-up from the encounter end.
- Custom DM loot tables tied to scenes/regions.
- Item trading between characters post-claim.
- Audio mixer for duel sound levels (currently a single on/off).
- "Group split" of stacked items (e.g. 3 healing potions split among 3 PCs).
