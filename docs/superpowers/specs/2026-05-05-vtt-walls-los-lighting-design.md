# VTT Walls, Line of Sight, and Reactive Lighting — Design

**Date:** 2026-05-05
**Status:** Approved, ready for implementation plan

## Goal

Add dynamic line-of-sight and reactive lighting to the VTT, gated by a per-scene toggle. Walls block sight and movement. Doors can be opened/closed by anyone. A scene-darkness mode restricts player vision to the union of their tokens' light radii. Existing manual fog of war stays unchanged; a new per-player "memory" layer accumulates terrain a player's tokens have personally seen.

## Non-goals (v1)

- Vision modes (darkvision, blindsight, truesight). Only torch-radius-as-light.
- Per-vertex editing of pen-tool walls — delete and redraw.
- Locked doors.
- Sound-blocking flag separate from sight-blocking.
- Worker-thread visibility computation (only if perf demands it later).
- "Heard but not seen" indicators.
- Replay / time-travel of memory.
- Party-shared memory (memory is strictly per-user).

## User stories

- As the DM, I draw walls around the rooms of a dungeon using a pen tool, mark some segments as doors, and toggle the scene's vision system on. Players' tokens immediately have line-of-sight constrained to what their tokens can see.
- As a player, when I move my token down a corridor I see new rooms light up as my LOS reaches them. Areas I've left behind dim to gray "memory" — I can see the layout but not anything currently happening there.
- As a player in a dark cavern, my torch (20 ft light radius) lets me see a 20 ft circle around my token. Outside that circle, I see only previously-explored memory or pitch black.
- As anyone (DM or player), I click a closed door wall to open it and immediately see through it.
- As the DM, I switch to a non-combat scene (city map) and toggle the scene's vision system off. Walls no longer affect sight or memory; players see the whole map.

## Architecture overview

Layered, pure-function-first. Geometry and collision logic live as pure helpers below a hooks layer below presentation layers, so each piece can be tested in isolation and the algorithms can be replaced (e.g., a Worker-thread sweep) without touching UI.

**New schema:**
- `vtt_walls` — wall segments and doors per map.
- `vtt_player_visibility` — per-user accumulated memory polygon per map.
- `media_items.vision_enabled` (bool, default false) — per-scene vision toggle.
- `media_items.scene_dark` (bool, default false) — scene darkness mode (only meaningful when vision_enabled).
- `tokens.light_radius_ft` (int, default 0) — torch range emitted by this token.

**New realtime channel:** `vtt_scene:{campaignId}:{mapId}` for door toggles. Wall edits sync via existing postgres_changes on `vtt_walls`. Memory writes do NOT broadcast — each user's memory is private to their browser session and persisted to their own row.

**New code units:**
- `hooks/useVttWalls.ts` — CRUD + postgres_changes subscription. Optimistic create/update/delete (mirrors `useVttAoeAreas`).
- `hooks/useVttPlayerVisibility.ts` — load/save the current user's accumulated memory polygon for the active map. Debounced writes.
- `lib/vtt/visibility.ts` — pure geometry. `computeVisibilityPolygon(viewpoint, walls): Point[]`. Angular-sweep algorithm.
- `lib/vtt/movement.ts` — pure geometry. `slideAgainstWalls(from, desired, walls): Point` and `segmentBlocked(from, to, walls): boolean`.
- `lib/vtt/visibility-memory.ts` — pure: `unionPolygons(existing, newPoly): MultiPolygon`. Used to accumulate memory.
- `components/map/WallLayer.tsx` — DM-only render of walls/doors (cyan strokes, orange-amber for doors, dashed when open). Hosts the editor when active.
- `components/map/LosMaskLayer.tsx` — player-only. Renders the dark + memory-dim composite mask above the map but below tokens-the-player-can-see.
- `components/vtt/vtt-wall-tool.tsx` — toolbar entry for the DM with mode popover (segment / pen / door). Visible only to DM.
- `components/vtt/vtt-token-light-field.tsx` — small UI block for the inspector to edit `light_radius_ft`.
- New moon-icon button in the DM toolbar group for `scene_dark`. Vision-on/off toggle in the same group.

## Visibility model

For a player, every region of the map falls into one of four states:

1. **Outside DM-revealed fog** → pitch black (existing fog behavior, unchanged).
2. Inside DM-revealed fog AND vision system off → fully visible (existing behavior preserved when vision off).
3. Inside DM-revealed fog AND vision on AND **currently visible** by an owned token → fully visible, live tokens drawn here.
4. Inside DM-revealed fog AND vision on AND **previously seen but not currently visible** → dim gray (50% black). Map terrain shows through; live tokens here are NOT drawn.
5. Inside DM-revealed fog AND vision on AND **never seen** → pitch black.

DM always sees everything; the LosMaskLayer never renders for the DM.

### Currently-visible computation

Per frame for the local user:

1. Find the user's owned tokens — `token.character_id` joined to `characters.user_id === currentUser`. (DM bypasses; computes for nobody.)
2. For each owned token, compute its LOS polygon via `computeVisibilityPolygon(token.position, walls)` where `walls` excludes any door with `is_open = true`.
3. If the scene is dark (`scene_dark = true`), intersect each token's LOS polygon with a circle of radius `feetToPx(token.light_radius_ft)` centered on the token. Union all light circles from any token (even non-owned, even DM-only tokens) — light is global; ownership only matters for the LOS clip.
4. The union of all per-token clipped polygons is the **currently visible** region.

### Visibility polygon algorithm

Standard angular sweep / endpoint sort.

1. Collect all wall endpoints. For each endpoint, generate three rays from the viewpoint: through the endpoint, and rotated by ±ε (≈0.0001 rad) to handle the "see past corner" case.
2. Sort all rays by angle.
3. For each ray in order, find the closest intersection with any wall segment. The successive intersections form the visibility polygon vertices in order.
4. Cap the polygon to a large bounding circle (e.g., 200 ft) so unbounded sweeps don't produce huge geometry.
5. Memoize on `(viewpointHash, wallSetHash)` to skip recomputation between renders when nothing changed.

Performance budget: ~200 walls × ~5 owned tokens × 60 fps. Main thread is fine for this scope. If a megadungeon stresses it later, swap the implementation behind `lib/vtt/visibility.ts` with a Worker-backed version.

### Memory layer

- Per-user, per-map polygon stored as `vtt_player_visibility.seen_polygon` jsonb (a flat array of polygon rings, each ring is `[x, y, x, y, ...]`).
- On each token move (debounced ~250 ms after movement settles), the client computes the new currently-visible region, unions with the stored seen polygon, and writes back. Optimistic local update; failures retry once then quietly drop.
- On scene load, the row for `(campaign_id, map_id, current_user)` is fetched and used to seed local state.
- DM does not accumulate memory (sees everything anyway). DM bypasses both the read and the write.
- Memory does NOT cross fog: union is implicitly clipped by the DM-revealed fog region in the renderer; we don't need to clip server-side.

### LosMaskLayer rendering

Implemented as a single Konva.Group on top of the map and grid layers, below tokens.

- Background: a Konva.Rect covering the map size, filled black at 100% opacity. This is the "never seen" mask.
- A first hole punched: union of memory polygons (rendered with `globalCompositeOperation: 'destination-out'` set to 50% — punches a 50%-transparent hole, leaving dim gray).
- A second hole punched: currently-visible polygon (`destination-out` at 100%, leaving fully transparent).
- The whole group is clipped by the DM-revealed fog region (so we never lighten anything outside fog).

The DM-revealed fog rendering itself is unchanged from today (it's drawn by `FogLayer` and we layer LosMaskLayer above the map but using the same fog clip).

For player view only — `LosMaskLayer` returns null for the DM.

Tokens that fall inside the currently-visible region render normally. Tokens in the memory-only or never-seen regions are *not rendered for that player*. The `TokenLayer` will receive a `visibilityRegion` prop describing currently-visible polygon(s) and skip tokens whose centers fall outside it. The DM still sees everything.

## Wall editor UX

DM-only toolbar tool: **Wall** button (Construction icon). Active state behaves like the existing AOE popover — opens a small popover with three sub-modes:

- **Pen** (default): click to start, click to add vertices, double-click or Esc to finish. Live preview line follows the cursor. Endpoints snap to grid intersections by default; Alt while clicking disables snap. Stored as one `vtt_walls` row with all points in `points`.
- **Segment**: each click pair places one straight wall (2 points). Stored as separate rows.
- **Door segment**: same as Segment but stores `is_door = true, is_open = false`. Visualized in orange-amber instead of cyan.

While the Wall tool is active:
- Existing walls render with selection affordances when hovered (faint glow). Clicking a wall selects it; selected wall shows a small × delete button at its first vertex (mirrors AOE delete UX).
- Pen-tool polylines treat the entire polyline as one selectable unit. No vertex editing in v1.

While the Wall tool is **not** active:
- Walls render only for the DM (in WallLayer). Players never see wall geometry.
- Closed door segments are clickable for everyone — clicking toggles `is_open`. Open doors are clickable to close them. Door click target uses the underlying segment with a hit stroke wider than the visual stroke for easy clicking. Click is realtime: optimistic local toggle, immediate broadcast via `vtt_scene` channel for snappy peer feedback, plus persistent UPDATE to `vtt_walls.is_open`.

## Movement collision

Walls (and closed doors) block token movement.

`lib/vtt/movement.ts` provides:

- `segmentBlocked(from, to, walls): boolean` — does the open line segment from→to intersect any wall segment? Open doors are filtered from `walls` before this check.
- `slideAgainstWalls(from, desired, walls): Point` — if the direct path from→desired is blocked, find the first wall it hits, project the residual movement (from intersection to desired) onto that wall's tangent, recurse once with the new desired (capped at 2 iterations to prevent loops). Returns the final reachable position.

Wired into `Token.tsx`:
- `onDragMove`: compute slid position from the drag-start position to the current cursor position; set the Konva node's position to that result. The token visually sticks against walls and slides along them rather than teleporting through.
- `onDragEnd`: same computation for the final position, then snap to grid and write to DB. Multi-token group drag (existing behavior) preserved — the leader's slid delta is the delta applied to followers; followers do their own collision check before applying the delta, so a follower against a wall stops while the leader keeps moving.

The movement collision applies regardless of vision state. Even when the per-scene vision system is off, walls still block drag (so combat encounter maps without LOS still get door behavior).

## Doors

`vtt_walls.is_door = true, is_open boolean`.

- Closed door (`is_open=false`): blocks sight and movement, renders orange-amber solid.
- Open door (`is_open=true`): blocks neither, renders orange-amber dashed and translucent (50% opacity).
- Door segments must be 2 points (single segment). Pen-tool walls cannot be doors. The wall tool enforces this.
- Anyone (DM or player) can click a door segment outside of the wall editor to toggle.
- A toggle does an UPDATE on `is_open` plus a broadcast on `vtt_scene` for immediate visual feedback. Postgres_changes catches up shortly after for any client that missed the broadcast.

## Lighting

Two states, configured per scene by the DM:

- **Bright** (`scene_dark = false`, default): currently-visible = full LOS polygon for each token.
- **Dark** (`scene_dark = true`): currently-visible = LOS polygon ∩ light coverage. Light coverage is the union of `light_radius_ft` circles around every token on the map (regardless of ownership). A token with `light_radius_ft = 0` emits no light.

Token light radius is set in the inspector via a new numeric field. DM can edit any token; players can edit only their own tokens (existing inspector permission rules).

Scene-darkness toggle is a moon-icon button in the DM-only scene-controls toolbar group, alongside grid/fog/weather. Its state is persisted on `media_items.scene_dark` and broadcast through the existing media_items realtime subscription.

## Per-scene vision toggle

`media_items.vision_enabled boolean default false`.

- **Off** (default for new scenes; existing scenes default to off so behavior is unchanged on rollout): no LOS, no lighting, no memory. Players see whatever DM-revealed fog reveals. Walls still block movement.
- **On**: full vision system per the model above. Layered with existing fog.

A toggle button in the DM toolbar group switches it; persists to `media_items.vision_enabled`.

## Realtime sync

| Event | Mechanism |
|---|---|
| Wall create / update / delete (DM only) | `vtt_walls` postgres_changes |
| Door toggle (anyone) | `vtt_walls` UPDATE + `vtt_scene` broadcast for immediate UX |
| Scene dark toggle | `media_items.scene_dark` UPDATE; existing subscription |
| Vision-enabled toggle | `media_items.vision_enabled` UPDATE; existing subscription |
| Token light radius edit | existing token UPDATE + realtime |
| Memory accumulation | `vtt_player_visibility` UPDATE per user (debounced); NOT broadcast |

## Schema

```sql
create table public.vtt_walls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  points jsonb not null,                  -- [{x:N,y:N}, ...]
  is_door boolean not null default false,
  is_open boolean not null default false,
  created_at timestamptz not null default now(),
  check (jsonb_array_length(points) >= 2),
  check (not is_door or jsonb_array_length(points) = 2)  -- doors are single segments
);
create index vtt_walls_map_id_idx on public.vtt_walls(map_id);

create table public.vtt_player_visibility (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seen_polygon jsonb not null default '[]'::jsonb,  -- array of rings
  updated_at timestamptz not null default now(),
  primary key (campaign_id, map_id, user_id)
);

alter table public.media_items
  add column if not exists vision_enabled boolean not null default false,
  add column if not exists scene_dark boolean not null default false;

alter table public.tokens
  add column if not exists light_radius_ft integer not null default 0
  check (light_radius_ft >= 0);

alter publication supabase_realtime add table public.vtt_walls;
```

### RLS

- `vtt_walls`
  - SELECT: campaign members (DM and players in the campaign).
  - INSERT / UPDATE (non-door fields) / DELETE: campaign DM only.
  - UPDATE on `is_open`: any campaign member (including players). Implemented with a trigger or column-level grant — player UPDATE policy permits modifying the row only when nothing other than `is_open` changes, and only when `is_door = true`.
- `vtt_player_visibility`
  - SELECT / INSERT / UPDATE / DELETE: only the row's own `user_id`. DM cannot read other players' memory.

## Error handling

- Wall create/update/delete: optimistic. On error, revert local state, show toast "Couldn't save wall."
- Door toggle: optimistic. On error, broadcast a "revert" event that flips back. Toast "Couldn't open/close door."
- Visibility computation: catch any exception → fall back to a fully-visible polygon (the player still sees the map). Log to console; never block the render.
- Memory write: silent retry once; if both fail, drop. The next move will overwrite anyway.
- Realtime channel disconnect: existing walls and door states stay in local memory; new edits from peers won't appear until reconnect (matches AOE/drawing behavior).

## Testing plan

- Geometry helpers in `lib/vtt/visibility.ts` and `lib/vtt/movement.ts` are pure and unit-testable in isolation. Test cases: closed convex polygon (full visibility inside), L-shape corridor (visibility around corner via ε offsets), parallel walls (slide along), corner pinning (no oscillation), open door (visibility passes through).
- Manual scene tests: a 4-room dungeon with one corridor, doors on each room, two PCs and one monster. Walk PCs through, verify memory accumulates correctly, doors block/unblock visibility live, scene_dark with torches limits LOS to circles, scene with vision_enabled=false behaves identically to today.
- Realtime: two browser windows. DM draws a wall, player sees their LOS update next move. Player A toggles a door, player B sees it update. DM toggles scene_dark, players see darkness apply.

## Open implementation questions to resolve in the plan

- Where exactly to clip LosMaskLayer rendering by the DM-revealed fog region. FogLayer renders into a Konva layer; we likely need to share the fog mask shape rather than re-derive. The plan should specify whether to lift fog state into a shared context or expose a "compiled fog clip" prop.
- Snap-to-grid behavior in the pen tool: snap each new vertex to the nearest grid intersection by default, with Alt-disable. The plan must specify the snap logic and how it interacts with the live preview line.
- Memory write debounce strategy: per-token debounce vs per-user single timer. Lean toward a single per-user 250 ms trailing debounce that recomputes the union from current state.
