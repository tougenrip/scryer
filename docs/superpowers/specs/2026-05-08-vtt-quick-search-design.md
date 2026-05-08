# VTT Quick Search — Design Spec

**Date:** 2026-05-08
**Status:** Approved (defaults)

## Problem

Mid-session, players and the DM constantly need to look things up: how does *Fireball* work, what's the Restrained condition, what does this monster's *Engulf* action do, how much does plate cost. Today they leave the VTT and search D&D Beyond or the SRD. We have all that data already (`srd_*` and `homebrew_*` tables, plus `useDndContent`).

## Goals

1. Single sidebar entry point for rules lookup, no leaving the VTT.
2. One-click jump from in-context things (a spell on a character sheet, an attack in the token inspector, a condition badge) into the matching reference entry.
3. Keep multiple references open at once — a player reading their spell while the DM has the monster open.
4. Visual style that feels like a 5e sourcebook (parchment + serif headers), matching the homebrew page screenshot the user shared.

## Non-Goals

- Editing homebrew content (separate Forge area already does this).
- Cross-user sync of opened cards.
- Search across user campaign notes.
- Mobile-specific layout (works on desktop, doesn't have to be polished on phones).

## Approach

### A. Entry point
A "Quick Search" button at the top of the existing left-sidebar in `app/campaigns/[campaignId]/vtt` (the same column that holds Tokens / Maps / Players). Icon: `BookOpen`. Click toggles a right-side `Sheet` (matches the existing token-inspector docking).

### B. Search drawer
Right-side `Sheet`, ~420px wide. Contents:

- **Header**: title + close + a "Pop out" button (`Maximize2`) that converts the currently-displayed entry into a floating card (see C).
- **Tabs row** (using shadcn `Tabs`, scrollable horizontally on narrow widths):
  Spells · Monsters · Equipment · Magic Items · Conditions · Races · Classes · Features
- **Search input** (per-tab, debounced 150ms). Placeholder reflects the active tab ("Search spells…").
- **Results list** (virtualized only if needed; SRD spells are ~320 rows, fine without). Each row shows name + a small badge for the most useful disambiguator (school for spells, CR for monsters, category for equipment, etc).
- **Detail pane**: clicking a row replaces the list with the full entry rendered by the existing `InfoSheet` component, wrapped in our parchment styling. A back-arrow returns to the list.

### C. Pop-out cards
A "Pop out" button on a detail view detaches it from the drawer into a **floating draggable card** rendered into a portal that sits above the canvas but below the main toolbar. Cards:

- Are draggable by their header.
- Have a close (`X`) and a "minimize to titlebar" toggle.
- Auto-cascade on open (offset 24/24 from the previous card).
- Persist position + size + content in **`localStorage`** keyed by `(userId, campaignId)`. Survives page reload in the same browser tab. Not synced to other users.
- Maximum 8 simultaneous cards (drop oldest).

### D. Info-icon callsites
A small `(i)` button rendered next to:

- **Character sheet**: each spell row, each inventory item row, the race name, the class name, each class feature.
- **Token inspector**: each PC action row, each monster action row, each condition badge, the race/class line for PCs, the monster name itself.

The icon is **player-visible everywhere** (rules text isn't DM-secret). Click handler calls a single `openQuickSearch({type, source, index})` from a Zustand slice.

We do **not** add a (i) badge inside Konva tokens themselves — too noisy at small grid sizes and the inspector already opens on click. The token inspector header already gets a (i) button, which is the canvas-side affordance.

### E. Visual style — "5e statblock parchment"
Match the screenshot the user shared. New CSS module / utility classes:

- Background: linear-gradient cream `#f5ecd7` → `#efe2c0` with subtle paper-noise SVG overlay at 6% opacity.
- Headers: serif (existing `font-serif` Tailwind class) in burgundy `#7a1f1f`, small-caps for entry titles, with a thin double-rule under section headings.
- Body: existing serif body, dark brown `#2b1d10` ink, leading 1.5.
- Stat tables (used for monster STR/DEX/etc.): six-column row with cream cells and a darker beige row stripe.
- Section dividers: thin red horizontal rule (`border-t border-[#7a1f1f]/40`).

Applied to: detail pane in drawer + popped-out cards. The list view keeps a subtler version (cream background, normal sans for scannability, only entry titles in serif).

## Architecture

### New components
- `components/vtt/quick-search/QuickSearchButton.tsx` — sidebar entry.
- `components/vtt/quick-search/QuickSearchDrawer.tsx` — the right-side sheet, owns tabs + search + list.
- `components/vtt/quick-search/QuickSearchDetail.tsx` — detail pane wrapping `InfoSheet` with parchment styling.
- `components/vtt/quick-search/FloatingCard.tsx` — single draggable card. Implements drag with a small custom `pointerdown`/`pointermove`/`pointerup` handler on the card header (no new dependency — `react-rnd` is not installed and we don't need its resize machinery). Resize is fixed-width for v1; only position is mutable.
- `components/vtt/quick-search/FloatingCardLayer.tsx` — portal host that renders all currently-open cards.
- `components/vtt/quick-search/InfoIconButton.tsx` — the `(i)` button used by all callsites.

### State (Zustand slice in existing `lib/store/vtt-store.ts` or a new `quick-search-store.ts`)
```ts
interface QuickSearchState {
  drawerOpen: boolean;
  activeTab: QuickSearchTab;
  selected: { type: QuickSearchTab; source: 'srd'|'homebrew'; index: string } | null;
  cards: Array<{ id: string; type: QuickSearchTab; source: 'srd'|'homebrew'; index: string; x: number; y: number; minimized: boolean }>;
  open: (target?: SelectedRef) => void;
  close: () => void;
  setTab: (t: QuickSearchTab) => void;
  select: (ref: SelectedRef) => void;
  popOut: () => void;
  closeCard: (id: string) => void;
  moveCard: (id: string, x: number, y: number) => void;
}
```
The card list mirrors to `localStorage` on every change (debounced 250ms).

### Data
Reuse `useDndContent`'s existing fetchers (`useSpells`, `useMonsters`, `useEquipment`, `useMagicItems`, `useConditions`, `useRaces`, `useClasses`, `useFeatures`). All already merge SRD + homebrew. Quick Search is a pure consumer; no new tables.

### Integration points
- `app/campaigns/[campaignId]/vtt/page.tsx` (or wherever the sidebar lives) — add `<QuickSearchButton />` and mount `<QuickSearchDrawer />` + `<FloatingCardLayer />` once.
- `components/character/character-sheet.tsx` — add `<InfoIconButton type="spell" .../>` etc on the listed rows.
- `components/vtt/vtt-token-inspector.tsx` — same.

### Error handling
- If a referenced entry isn't found (e.g. homebrew was deleted), show an inline "This entry no longer exists." with a button to remove the stale card.
- Search failures (network) fall back to whatever rows are already cached in `useDndContent`.

## Testing plan
- Click each tab, verify rows render and clicking opens the detail in the parchment style.
- Click an info icon on a spell row → drawer opens on Spells tab with that spell selected.
- Pop out three different entries, drag, reload page — three cards return at saved positions.
- Open as a player (not DM) and verify info icons are visible & functional everywhere.
- Verify no `<button>` inside `<button>` warnings on the rows that get the new (i) buttons (some are already inside clickable rows).

## Out-of-scope follow-ups
- Sync open cards to a Supabase row so they persist across devices.
- "Pin to map" — drop a card next to a token on the canvas.
- Full-text content search (across all tabs) instead of per-tab.
