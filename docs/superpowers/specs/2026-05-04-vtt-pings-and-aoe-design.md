# VTT Pings & AOE Areas — Design

**Date:** 2026-05-04
**Status:** Approved, ready for implementation plan

## Goal

Let players and the DM communicate spatially on the VTT canvas via pings, and lay down area-of-effect spell templates (Circle, Cone, Line, Square/Cube, Ring) by click-dragging.

## User stories

- As a player, I press **Alt+left-click** anywhere on the map and a fading pulse appears for everyone in the scene at that point. Same effect by selecting the **Ping** tool from the top toolbar and clicking.
- As a player or DM, I select a shape from the **AOE** popover, click-drag on the map, and a live preview of the spell template follows the cursor with a "20 ft radius" label.
- Releasing the mouse normally clears the preview (ephemeral). Holding **Shift** on release commits the shape to the map as a persistent AOE everyone sees.
- As the AOE owner (or DM), I can click a persistent AOE to select it, drag it to reposition, rotate (cone/line), or delete it.

## Non-goals (v1)

- Auto-detection of which tokens fall inside an AOE.
- Saving AOE templates to a per-spell library.
- Customizing cone angle (fixed 90°) or line width (fixed 5 ft).
- Per-AOE color picker — color comes from the owner's presence color.
- Mobile/touch ergonomics beyond what already works.

## Architecture overview

Three new realtime concerns, all scoped to `(campaignId, mapId)`:

1. **Pings** — broadcast-only ephemeral events. No DB write.
2. **Ephemeral AOE previews** — broadcast while dragging, gone on mouseup-without-Shift.
3. **Persistent AOEs** — committed on Shift+mouseup; written to a new `vtt_aoe_areas` table; subscribed via realtime postgres_changes.

A single Supabase Realtime channel per scene (`vtt_overlays:{campaignId}:{mapId}`) carries pings and ephemeral AOE drag updates. Persistent AOEs sync via postgres_changes on the new table — they don't go through the broadcast channel, so a late joiner reading the table gets full state.

## Components

### New files

- `components/map/PingLayer.tsx` — Konva layer that renders active ping pulses, expanding-ring + fade animation over 1500 ms.
- `components/map/AoeLayer.tsx` — Konva layer that renders ephemeral previews (own + peers') and persistent shapes. Internally dispatches to small primitive renderers per shape.
- `components/vtt/vtt-aoe-popover.tsx` — Toolbar popover containing the 5 shape buttons (Circle, Cone, Line, Square, Ring). Sets `activeTool` to the selected shape.
- `hooks/useVttOverlays.ts` — Owns the `vtt_overlays:*` realtime channel. Exposes:
  - `broadcastPing({ x, y })`
  - `broadcastAoeDrag({ shape, start, end })`
  - `broadcastAoeCancel()`
  - state: `activePings`, `peerEphemerals` (Map<userId, ephemeral>)
- `hooks/useVttAoeAreas.ts` — CRUD + realtime postgres_changes subscription for `vtt_aoe_areas`. Exposes `areas`, `createArea`, `updateArea`, `deleteArea`.
- `lib/vtt/aoe-geometry.ts` — Pure helpers:
  - `snapDistanceToFeet(px, gridSize, feetPerSquare): { feet, px }`
  - `computeConePolygon(origin, angleRad, lengthPx): number[]`
  - `computeRingPath(origin, outerPx, innerPx): string`
  - `computeLineRect(origin, angleRad, lengthPx, widthPx): {x,y,width,height,rotation}`

### Touched files

- `app/(vtt)/campaigns/[campaignId]/vtt/page.tsx`
  - Add a **Ping** ToolButton in the top toolbar (visible to all, not DM-gated).
  - Add an **AOE** ToolButton that opens `VttAoePopover`.
  - The Ping/AOE buttons sit in the existing tool row next to Select/Ruler.
- `components/map/GameCanvas.tsx`
  - In `handleMouseDown`: detect `event.altKey && button === 0` → fire ping (without entering ping tool); detect `activeTool === "ping"` → fire ping on click.
  - Add an AOE drag branch when `activeTool` starts with `"aoe-"`: track `aoeStart`/`aoeEnd`; throttle broadcast at ~30 Hz; on mouseup commit (Shift) or cancel.
  - Mount `<PingLayer/>` and `<AoeLayer/>`.
- `lib/store/vtt-store.ts`
  - Extend `activeTool` union: `"select" | "measure" | "ping" | "aoe-circle" | "aoe-cone" | "aoe-line" | "aoe-square" | "aoe-ring"`.
  - No persistent state added; ephemeral drag state lives in GameCanvas.

## Data flow

### Ping flow

1. Trigger: `Alt+left-click` on canvas, OR `activeTool === "ping"` and left-click.
2. GameCanvas calls `useVttOverlays.broadcastPing({ x, y })`. The hook injects `userId`, `displayName`, presence color, and a client-generated id.
3. All subscribers (including sender's local echo) push the ping into `activePings` with `firedAt = Date.now()`.
4. `PingLayer` renders each active ping as an expanding `Konva.Circle` (radius animates 0 → ~3*gridSize, opacity 1 → 0 over 1500 ms) with the pinger's name in a small label.
5. Entries auto-prune after 1600 ms via a `setTimeout` per ping.

### Ephemeral AOE drag

1. User selects a shape from the popover → `activeTool = "aoe-circle"` (or other).
2. `mousedown` on stage: GameCanvas sets local `aoeDrag = { shape, start: pointer, end: pointer }`.
3. `mousemove`: update local state; throttled (rAF + ~30 Hz cap) call to `broadcastAoeDrag({ shape, start, end })`.
4. `AoeLayer` renders own drag locally for zero-lag feel. Other peers' drags render from `peerEphemerals`.
5. Live label component renders snapped distance ("20 ft radius", "30 ft cone").
6. `mouseup`:
   - **Without Shift:** `broadcastAoeCancel()`, clear local drag, peers clear via cancel event.
   - **With Shift:** call `useVttAoeAreas.createArea({...})`, also fire cancel event so peers' ephemeral preview clears (the persistent area arrives via postgres_changes).
7. After mouseup, return `activeTool` to `"select"` (one-shot tool behavior, matches placement UX).

### Persistent AOE

- Selection: click on a persistent AOE → highlight outline; show a small floating widget with delete (X) and rotate handle (cone/line).
- Drag-to-reposition: only owner or DM. Drag updates `origin_x/y` via `updateArea`.
- Rotate: rotate handle drag → updates `rotation_deg`.
- Delete: only owner or DM. Removes row.

## Database

### New table: `vtt_aoe_areas`

```sql
create table vtt_aoe_areas (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  map_id uuid not null references media_items(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  shape text not null check (shape in ('circle','cone','line','square','ring')),
  origin_x double precision not null,
  origin_y double precision not null,
  length_ft integer not null,
  rotation_deg double precision not null default 0,
  color text not null,
  label text,
  created_at timestamptz not null default now()
);

create index vtt_aoe_areas_map_id_idx on vtt_aoe_areas(map_id);
alter publication supabase_realtime add table vtt_aoe_areas;
```

### RLS

- **SELECT:** any user who is a campaign member (DM or accepted player).
- **INSERT:** any campaign member, with `owner_user_id = auth.uid()`.
- **UPDATE / DELETE:** `auth.uid() = owner_user_id` OR `auth.uid() = campaigns.dm_user_id` for the parent campaign.

Mirror the policy style of existing VTT tables (likely `vtt_tokens`).

## Geometry rules

All sizes snap to 5 ft increments. `5 ft = gridSize` pixels (gridSize and feetPerSquare both come from the store).

| Shape | Drag interpretation | Render |
|-------|---------------------|--------|
| Circle | distance = radius | `Konva.Circle` |
| Cone | distance = length, drag angle = orientation, fixed 90° spread | `Konva.Line` (closed polygon, 3 points) |
| Line | distance = length, drag angle = orientation, width fixed at 5 ft | `Konva.Rect` rotated |
| Square | distance = side length, anchored at start corner along drag axis | `Konva.Rect` |
| Ring | distance = outer radius, inner = outer − 5 ft (min 5 ft outer) | Two `Konva.Circle` (outer fill, inner cutout via composite) or `Konva.Path` |

Snapping math: `feet = max(5, round(distancePx / gridSize) * feetPerSquare)`; render uses the rounded value back in pixels.

## Visual style

- **Ping:** owner's presence color; expanding ring (no fill); name label under the ring fades with it.
- **Ephemeral AOE preview:** owner's presence color, fill at 15% alpha, stroke at 70%, dashed stroke. Label in a pill at the cursor showing "{N} ft {shape}".
- **Persistent AOE:** owner's presence color, fill at 25% alpha, solid stroke. Selected state adds a brighter outline + handle widget.

## Error handling

- Failed persistent insert → `toast.error("Couldn't place area")`, no retry; ephemeral preview is already gone (acceptable lost work).
- Realtime channel disconnect → persistent AOEs already in state stay rendered; new pings/ephemerals from peers stop until reconnect. No client-side retry queue.
- Peer disconnects mid-drag → each peer ephemeral has a 4 s TTL refreshed by drag updates; if no update arrives, it's pruned locally.
- Alt+click on a token: still fires the ping (intentional — pings should work everywhere).

## Testing notes

- Manual: open the same scene in two browser windows under different accounts; verify ping pulses, ephemeral previews, and Shift-commit persistent AOEs all sync.
- Geometry unit tests in `lib/vtt/aoe-geometry.test.ts` for `snapDistanceToFeet`, `computeConePolygon`, `computeLineRect`.
- RLS: confirm a non-owning, non-DM user cannot UPDATE or DELETE another user's AOE row.

## Open implementation questions to resolve in the plan

- Exact location of the AOE popover button in the toolbar row (between Ruler and the DM-only block, or after).
- Whether `useVttOverlays` should also subsume ruler broadcasts in a follow-up (currently ruler is local-only). Out of scope for v1, but worth noting if the channel is reused.
- Whether persistent AOE drag-reposition should be optimistic with rollback or wait for server confirm. Lean optimistic to match token UX.
