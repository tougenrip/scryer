# VTT Walls, LOS, and Reactive Lighting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-scene line-of-sight, reactive torch lighting, doors, and a per-player memory layer to the VTT, while preserving the existing manual fog of war.

**Architecture:** Layered, pure-function-first. Geometry and collision live as pure helpers (`lib/vtt/visibility.ts`, `lib/vtt/movement.ts`) below hooks (`useVttWalls`, `useVttPlayerVisibility`) below presentation layers (`WallLayer`, `LosMaskLayer`). Realtime via `vtt_walls` postgres_changes plus a `vtt_scene` broadcast channel for door snappiness.

**Tech Stack:** Next.js, React 19, react-konva, Zustand, Supabase Realtime + Postgres, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-05-vtt-walls-los-lighting-design.md`

**Note on testing:** No test runner configured in this project. Each task ends with a `pnpm type-check` gate plus a manual verification at the end (Task 21). Pure geometry helpers are written so a future Vitest/Jest setup can unit-test them without modification.

---

## File map

**Create:**
- `supabase/migrations/085_vtt_walls_and_vision.sql` — schema changes
- `types/vtt-walls.ts` — `Wall`, `Point`, `WallSegment` types
- `lib/vtt/visibility.ts` — visibility polygon, ray-segment intersection, segment expansion
- `lib/vtt/movement.ts` — `segmentBlocked`, `slideAgainstWalls`
- `lib/vtt/visibility-memory.ts` — polygon union helper for accumulating memory
- `hooks/useVttWalls.ts` — CRUD + postgres_changes + vtt_scene broadcast
- `hooks/useVttPlayerVisibility.ts` — per-user memory load/save
- `components/map/WallLayer.tsx` — DM render + door click handling + editor host
- `components/map/LosMaskLayer.tsx` — player-only mask
- `components/vtt/vtt-wall-tool.tsx` — toolbar entry with mode popover

**Modify:**
- `lib/store/vtt-store.ts` — extend `activeTool` with `'wall'`; add `wallEditorMode` state
- `types/vtt.ts` — add `light_radius_ft` to `Token`
- `app/api/vtt/tokens/route.ts` — include `light_radius_ft` in token selects
- `components/vtt/vtt-token-inspector.tsx` — add a Light radius numeric field
- `components/map/Token.tsx` — apply `slideAgainstWalls` in `onDragMove`
- `components/map/GameCanvas.tsx` — mount new layers; route door clicks; handle wall editor input
- `app/(vtt)/campaigns/[campaignId]/vtt/page.tsx` — Wall tool button, vision-on toggle, scene-dark moon button

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/085_vtt_walls_and_vision.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Walls + per-player visibility memory + per-scene/per-token vision config.

create table if not exists public.vtt_walls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  points jsonb not null,
  is_door boolean not null default false,
  is_open boolean not null default false,
  created_at timestamptz not null default now(),
  check (jsonb_array_length(points) >= 2),
  check (not is_door or jsonb_array_length(points) = 2)
);
create index if not exists vtt_walls_map_id_idx on public.vtt_walls(map_id);
create index if not exists vtt_walls_campaign_id_idx on public.vtt_walls(campaign_id);

alter table public.vtt_walls enable row level security;

drop policy if exists "Campaign members can view walls" on public.vtt_walls;
create policy "Campaign members can view walls"
  on public.vtt_walls for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_walls.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "DM can insert walls" on public.vtt_walls;
create policy "DM can insert walls"
  on public.vtt_walls for insert
  with check (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "DM can update walls" on public.vtt_walls;
create policy "DM can update walls"
  on public.vtt_walls for update
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
  );

-- Players (campaign members) can ONLY toggle is_open on door rows. Enforced via
-- a separate UPDATE policy combined with a trigger that rejects updates to any
-- column other than is_open + updated_at when the actor is not the DM.
drop policy if exists "Campaign members can toggle doors" on public.vtt_walls;
create policy "Campaign members can toggle doors"
  on public.vtt_walls for update
  using (
    is_door = true
    and exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_walls.campaign_id and cm.user_id = auth.uid()
    )
  )
  with check (
    is_door = true
    and exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_walls.campaign_id and cm.user_id = auth.uid()
    )
  );

create or replace function public.guard_wall_player_update()
returns trigger language plpgsql as $$
declare
  is_dm boolean;
begin
  select exists (
    select 1 from public.campaigns c
    where c.id = new.campaign_id and c.dm_user_id = auth.uid()
  ) into is_dm;
  if is_dm then
    return new;
  end if;
  -- non-DM: only is_open may change
  if (old.points is distinct from new.points)
     or (old.is_door is distinct from new.is_door)
     or (old.campaign_id is distinct from new.campaign_id)
     or (old.map_id is distinct from new.map_id) then
    raise exception 'Only the DM can edit walls; players can only toggle doors';
  end if;
  return new;
end$$;

drop trigger if exists trg_guard_wall_player_update on public.vtt_walls;
create trigger trg_guard_wall_player_update
  before update on public.vtt_walls
  for each row execute function public.guard_wall_player_update();

drop policy if exists "DM can delete walls" on public.vtt_walls;
create policy "DM can delete walls"
  on public.vtt_walls for delete
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_walls.campaign_id and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.vtt_walls;

-- Per-user, per-map accumulated memory polygon.
create table if not exists public.vtt_player_visibility (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seen_polygon jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (campaign_id, map_id, user_id)
);
create index if not exists vtt_player_visibility_map_idx on public.vtt_player_visibility(map_id);

alter table public.vtt_player_visibility enable row level security;

drop policy if exists "Own visibility row" on public.vtt_player_visibility;
create policy "Own visibility row"
  on public.vtt_player_visibility for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Scene flags
alter table public.media_items
  add column if not exists vision_enabled boolean not null default false;
alter table public.media_items
  add column if not exists scene_dark boolean not null default false;

-- Token light radius
alter table public.tokens
  add column if not exists light_radius_ft integer not null default 0
  check (light_radius_ft >= 0 and light_radius_ft <= 500);
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `pnpm supabase db push` (or whatever the project's standard apply command is).
Expected: applies cleanly with no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/085_vtt_walls_and_vision.sql
git commit -m "feat(vtt): walls table + visibility memory + scene/token vision columns"
```

---

## Task 2: Wall TS types

**Files:**
- Create: `types/vtt-walls.ts`

- [ ] **Step 1: Write the types**

```ts
export interface Point {
  x: number;
  y: number;
}

/** Database row. `points` is the polyline; for doors it must be exactly 2 points. */
export interface Wall {
  id: string;
  campaign_id: string;
  map_id: string;
  points: Point[];
  is_door: boolean;
  is_open: boolean;
  created_at: string;
}

/** A 2-point primitive used by the geometry helpers after polylines are expanded. */
export interface WallSegment {
  /** Wall row id this segment belongs to. */
  wallId: string;
  a: Point;
  b: Point;
  isDoor: boolean;
  isOpen: boolean;
}

/** Per-user, per-map memory polygon. seen_polygon is an array of rings, each ring is a flat [x,y,...]. */
export interface PlayerVisibility {
  campaign_id: string;
  map_id: string;
  user_id: string;
  seen_polygon: number[][];
  updated_at: string;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add types/vtt-walls.ts
git commit -m "feat(vtt): wall and visibility types"
```

---

## Task 3: Token type + API for light_radius_ft

**Files:**
- Modify: `types/vtt.ts`
- Modify: `app/api/vtt/tokens/route.ts`

- [ ] **Step 1: Add `light_radius_ft` to the Token type**

In `types/vtt.ts`, find the `Token` interface and add the field after `scale`:

```ts
  scale: number;
  light_radius_ft?: number;
  /** DB column: library portrait; falls back to character image in hooks */
```

- [ ] **Step 2: Include `light_radius_ft` in token API selects**

In `app/api/vtt/tokens/route.ts`, find every `select(` for the `tokens` table and add `light_radius_ft` to the column list. There are typically two places (one in GET, one in POST/PATCH return).

Run: `grep -n "from.*tokens" app/api/vtt/tokens/route.ts` to find them.

For each:
```ts
.select("id, campaign_id, map_id, ..., scale, light_radius_ft, ...")
```

(Match the existing format — comma-separated string literal vs template literal.)

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add types/vtt.ts app/api/vtt/tokens/route.ts
git commit -m "feat(vtt): plumb light_radius_ft through token type + API"
```

---

## Task 4: Visibility polygon geometry

**Files:**
- Create: `lib/vtt/visibility.ts`

- [ ] **Step 1: Write the helpers**

```ts
import type { Point, Wall, WallSegment } from "@/types/vtt-walls";

const RAY_EPSILON = 0.0001;
const VIEW_RADIUS_PX = 5000; // bound the polygon when no wall is hit

/** Expand a list of Walls (each a polyline) into 2-point segments. */
export function wallsToSegments(walls: Wall[]): WallSegment[] {
  const segs: WallSegment[] = [];
  for (const w of walls) {
    for (let i = 0; i < w.points.length - 1; i++) {
      segs.push({
        wallId: w.id,
        a: w.points[i],
        b: w.points[i + 1],
        isDoor: w.is_door,
        isOpen: w.is_open,
      });
    }
  }
  return segs;
}

/** Filter sight-blocking segments (closed walls + closed doors). */
export function sightBlockingSegments(walls: Wall[]): WallSegment[] {
  return wallsToSegments(walls).filter((s) => !(s.isDoor && s.isOpen));
}

/** Filter movement-blocking segments. Same set as sight in this design. */
export function movementBlockingSegments(walls: Wall[]): WallSegment[] {
  return sightBlockingSegments(walls);
}

interface RayHit {
  point: Point;
  t: number; // distance along ray from origin
}

/**
 * Intersect a ray (origin, unit dir) with a segment (a→b). Returns t (distance
 * along ray) and hit point if the intersection is in the forward direction and
 * within the segment, else null.
 */
function raySegmentIntersect(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): RayHit | null {
  const sx = bx - ax;
  const sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((ax - ox) * sy - (ay - oy) * sx) / denom;
  const u = ((ax - ox) * dy - (ay - oy) * dx) / denom;
  if (t < 0 || u < 0 || u > 1) return null;
  return { point: { x: ox + dx * t, y: oy + dy * t }, t };
}

/**
 * Compute the visibility polygon from `viewpoint` against `segments`.
 * Standard angular sweep over endpoints, with ±epsilon offsets for the
 * see-past-corner case. Returns a polygon as a list of ordered points.
 */
export function computeVisibilityPolygon(
  viewpoint: Point,
  segments: WallSegment[]
): Point[] {
  const angles: number[] = [];
  for (const s of segments) {
    for (const p of [s.a, s.b]) {
      const a = Math.atan2(p.y - viewpoint.y, p.x - viewpoint.x);
      angles.push(a, a + RAY_EPSILON, a - RAY_EPSILON);
    }
  }
  // If there are no walls, the polygon is just a big circle approximation.
  if (angles.length === 0) {
    const out: Point[] = [];
    const N = 32;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      out.push({
        x: viewpoint.x + Math.cos(a) * VIEW_RADIUS_PX,
        y: viewpoint.y + Math.sin(a) * VIEW_RADIUS_PX,
      });
    }
    return out;
  }

  angles.sort((a, b) => a - b);

  const polygon: Point[] = [];
  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closest: RayHit | null = null;
    for (const s of segments) {
      const hit = raySegmentIntersect(
        viewpoint.x,
        viewpoint.y,
        dx,
        dy,
        s.a.x,
        s.a.y,
        s.b.x,
        s.b.y
      );
      if (hit && (!closest || hit.t < closest.t)) closest = hit;
    }
    if (!closest) {
      polygon.push({
        x: viewpoint.x + dx * VIEW_RADIUS_PX,
        y: viewpoint.y + dy * VIEW_RADIUS_PX,
      });
    } else {
      polygon.push(closest.point);
    }
  }
  return polygon;
}

/** Convert a polygon to a flat [x,y,x,y,...] array for Konva.Line(closed). */
export function polygonToFlatPoints(poly: Point[]): number[] {
  const out: number[] = [];
  for (const p of poly) {
    out.push(p.x, p.y);
  }
  return out;
}

/** Test if a point is inside a polygon. Ray casting. */
export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/vtt/visibility.ts
git commit -m "feat(vtt): visibility polygon sweep + ray-segment intersect"
```

---

## Task 5: Movement collision geometry

**Files:**
- Create: `lib/vtt/movement.ts`

- [ ] **Step 1: Write the helpers**

```ts
import type { Point, WallSegment } from "@/types/vtt-walls";

const SLIDE_BACK_EPS = 0.5; // px to back off from a wall after a hit

interface SegHit {
  t: number; // 0..1 along (from→to)
  point: Point;
  segment: WallSegment;
}

/** Intersect two segments (p→q) and (a→b). Returns t along p→q and the point. */
function segmentSegmentIntersect(
  px: number,
  py: number,
  qx: number,
  qy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { t: number; point: Point } | null {
  const rx = qx - px;
  const ry = qy - py;
  const sx = bx - ax;
  const sy = by - ay;
  const denom = rx * sy - ry * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((ax - px) * sy - (ay - py) * sx) / denom;
  const u = ((ax - px) * ry - (ay - py) * rx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { t, point: { x: px + rx * t, y: py + ry * t } };
}

/** Returns the first segment hit by from→to, if any. */
function firstHit(
  from: Point,
  to: Point,
  segments: WallSegment[]
): SegHit | null {
  let best: SegHit | null = null;
  for (const s of segments) {
    const hit = segmentSegmentIntersect(
      from.x,
      from.y,
      to.x,
      to.y,
      s.a.x,
      s.a.y,
      s.b.x,
      s.b.y
    );
    if (hit && (!best || hit.t < best.t)) {
      best = { t: hit.t, point: hit.point, segment: s };
    }
  }
  return best;
}

export function segmentBlocked(
  from: Point,
  to: Point,
  segments: WallSegment[]
): boolean {
  return firstHit(from, to, segments) !== null;
}

/**
 * If the direct path is blocked, slide the residual movement along the
 * obstructing wall. Recurse once more so corner-then-corner works. Returns
 * the final reachable position.
 */
export function slideAgainstWalls(
  from: Point,
  desired: Point,
  segments: WallSegment[],
  iterations = 0
): Point {
  if (iterations >= 2) return from;
  const hit = firstHit(from, desired, segments);
  if (!hit) return desired;

  // Step back from the wall a touch so we're never *on* it.
  const dxFull = desired.x - from.x;
  const dyFull = desired.y - from.y;
  const totalDist = Math.hypot(dxFull, dyFull);
  if (totalDist < 1e-9) return from;
  const reachableDist = Math.max(0, hit.t * totalDist - SLIDE_BACK_EPS);
  const ux = dxFull / totalDist;
  const uy = dyFull / totalDist;
  const reached: Point = {
    x: from.x + ux * reachableDist,
    y: from.y + uy * reachableDist,
  };

  // Project residual onto wall tangent.
  const wx = hit.segment.b.x - hit.segment.a.x;
  const wy = hit.segment.b.y - hit.segment.a.y;
  const wLen = Math.hypot(wx, wy);
  if (wLen < 1e-9) return reached;
  const tx = wx / wLen;
  const ty = wy / wLen;
  const remX = desired.x - reached.x;
  const remY = desired.y - reached.y;
  const proj = remX * tx + remY * ty;
  const slid: Point = {
    x: reached.x + tx * proj,
    y: reached.y + ty * proj,
  };
  return slideAgainstWalls(reached, slid, segments, iterations + 1);
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/vtt/movement.ts
git commit -m "feat(vtt): wall collision + slide-along helper"
```

---

## Task 6: Memory polygon union helper

**Files:**
- Create: `lib/vtt/visibility-memory.ts`

This module wraps a polygon-clipping implementation. The simplest robust path is to use `polygon-clipping` (a small, well-tested library). Add it to the project.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add polygon-clipping`

- [ ] **Step 2: Write the helpers**

```ts
import polygonClipping from "polygon-clipping";
import type { Point } from "@/types/vtt-walls";

type Ring = [number, number][];

function pointsToRing(points: Point[]): Ring {
  // polygon-clipping requires the first and last points to be equal (closed ring).
  const ring: Ring = points.map((p) => [p.x, p.y] as [number, number]);
  if (ring.length === 0) return ring;
  const [fx, fy] = ring[0];
  const last = ring[ring.length - 1];
  if (last[0] !== fx || last[1] !== fy) ring.push([fx, fy]);
  return ring;
}

/** Memory storage shape: array of polygons, each polygon is array of rings (outer + holes). */
export type StoredMemory = number[][][][];

function ringsToFlat(rings: Ring[][]): StoredMemory {
  return rings.map((poly) =>
    poly.map((ring) => ring.flatMap(([x, y]) => [x, y]))
  ) as StoredMemory;
}

function flatToRings(stored: StoredMemory): Ring[][] {
  return stored.map((poly) =>
    poly.map((ring) => {
      const out: Ring = [];
      for (let i = 0; i < ring.length; i += 2) {
        out.push([ring[i], ring[i + 1]]);
      }
      return out;
    })
  );
}

/** Union an existing stored memory with a newly-visible polygon. */
export function unionWithVisible(
  stored: StoredMemory,
  visible: Point[]
): StoredMemory {
  const newPolyRing = pointsToRing(visible);
  if (newPolyRing.length < 4) return stored; // need at least a closed triangle
  const a = flatToRings(stored);
  // polygon-clipping types accept a ring array per polygon:
  const result = polygonClipping.union(a as never, [newPolyRing] as never);
  return ringsToFlat(result as Ring[][]);
}

/** Convert stored memory to a list of Konva-friendly polygons (flat point arrays). */
export function storedMemoryToKonvaPolys(stored: StoredMemory): number[][] {
  // Outer ring of each polygon. Holes ignored for v1 (room shapes don't produce holes).
  return stored.map((poly) => poly[0] ?? []);
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS. If `polygon-clipping` lacks types in the node_modules, add a quick declaration: create `types/polygon-clipping.d.ts` with `declare module 'polygon-clipping';` only if needed.

- [ ] **Step 4: Commit**

```bash
git add lib/vtt/visibility-memory.ts package.json pnpm-lock.yaml
git commit -m "feat(vtt): polygon union helpers for visibility memory"
```

---

## Task 7: `useVttWalls` hook

**Files:**
- Create: `hooks/useVttWalls.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Point, Wall } from "@/types/vtt-walls";

interface CreateWallInput {
  points: Point[];
  is_door?: boolean;
}

export function useVttWalls(campaignId: string | null, mapId: string | null) {
  const [walls, setWalls] = useState<Wall[]>([]);
  const sceneChannelRef = useRef<RealtimeChannel | null>(null);

  // Initial load + postgres_changes subscription
  useEffect(() => {
    if (!campaignId || !mapId) {
      setWalls([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("vtt_walls")
        .select("*")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load walls:", error);
        return;
      }
      setWalls((data ?? []) as unknown as Wall[]);
    };
    void fetchAll();

    const channel = supabase
      .channel(`vtt_walls:${mapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_walls",
          filter: `map_id=eq.${mapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as Wall;
            setWalls((prev) =>
              prev.some((w) => w.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as Wall;
            setWalls((prev) => prev.map((w) => (w.id === row.id ? row : w)));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as Wall;
            setWalls((prev) => prev.filter((w) => w.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId, mapId]);

  // Snappy door-toggle broadcast channel
  useEffect(() => {
    if (!campaignId || !mapId) return;
    const supabase = createClient();
    const ch = supabase.channel(`vtt_scene:${campaignId}:${mapId}`);
    ch.on("broadcast", { event: "door_toggle" }, ({ payload }) => {
      const p = payload as { id: string; is_open: boolean };
      setWalls((prev) =>
        prev.map((w) => (w.id === p.id ? { ...w, is_open: p.is_open } : w))
      );
    });
    ch.subscribe();
    sceneChannelRef.current = ch;
    return () => {
      supabase.removeChannel(ch);
      sceneChannelRef.current = null;
    };
  }, [campaignId, mapId]);

  const createWall = useCallback(
    async (input: CreateWallInput): Promise<Wall | null> => {
      if (!campaignId || !mapId) return null;
      const supabase = createClient();
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Wall = {
        id,
        campaign_id: campaignId,
        map_id: mapId,
        points: input.points,
        is_door: input.is_door ?? false,
        is_open: false,
        created_at: new Date().toISOString(),
      };
      setWalls((prev) => [...prev, optimistic]);
      const { data, error } = await supabase
        .from("vtt_walls")
        .insert({
          id,
          campaign_id: campaignId,
          map_id: mapId,
          points: input.points,
          is_door: input.is_door ?? false,
          is_open: false,
        } as never)
        .select("*")
        .single();
      if (error) {
        console.error("Failed to create wall:", error);
        toast.error("Couldn't save wall");
        setWalls((prev) => prev.filter((w) => w.id !== id));
        return null;
      }
      const row = data as unknown as Wall;
      setWalls((prev) => prev.map((w) => (w.id === id ? row : w)));
      return row;
    },
    [campaignId, mapId]
  );

  const deleteWall = useCallback(
    async (id: string) => {
      const supabase = createClient();
      setWalls((prev) => prev.filter((w) => w.id !== id));
      const { error } = await supabase.from("vtt_walls").delete().eq("id", id);
      if (error) {
        console.error("Failed to delete wall:", error);
        toast.error("Couldn't delete wall");
      }
    },
    []
  );

  const toggleDoor = useCallback(
    async (id: string) => {
      const target = walls.find((w) => w.id === id);
      if (!target || !target.is_door) return;
      const nextOpen = !target.is_open;
      // Optimistic + broadcast for snappy peer feedback.
      setWalls((prev) =>
        prev.map((w) => (w.id === id ? { ...w, is_open: nextOpen } : w))
      );
      const ch = sceneChannelRef.current;
      if (ch) {
        void ch.send({
          type: "broadcast",
          event: "door_toggle",
          payload: { id, is_open: nextOpen },
        });
      }
      const supabase = createClient();
      const { error } = await supabase
        .from("vtt_walls")
        .update({ is_open: nextOpen } as never)
        .eq("id", id);
      if (error) {
        console.error("Failed to toggle door:", error);
        toast.error("Couldn't open/close door");
        // revert
        setWalls((prev) =>
          prev.map((w) => (w.id === id ? { ...w, is_open: !nextOpen } : w))
        );
        if (ch) {
          void ch.send({
            type: "broadcast",
            event: "door_toggle",
            payload: { id, is_open: !nextOpen },
          });
        }
      }
    },
    [walls]
  );

  return { walls, createWall, deleteWall, toggleDoor };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS. If Supabase generated types don't yet include `vtt_walls`, the `as never` casts handle it.

- [ ] **Step 3: Commit**

```bash
git add hooks/useVttWalls.ts
git commit -m "feat(vtt): useVttWalls CRUD + realtime + door broadcast"
```

---

## Task 8: `useVttPlayerVisibility` hook

**Files:**
- Create: `hooks/useVttPlayerVisibility.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Point } from "@/types/vtt-walls";
import {
  unionWithVisible,
  storedMemoryToKonvaPolys,
  type StoredMemory,
} from "@/lib/vtt/visibility-memory";

const DEBOUNCE_MS = 250;

/**
 * Loads the current user's accumulated memory polygon for (campaign, map).
 * Exposes a debounced `accumulate(visiblePolygon)` that unions and persists.
 */
export function useVttPlayerVisibility(
  campaignId: string | null,
  mapId: string | null,
  enabled: boolean
) {
  const [memory, setMemory] = useState<StoredMemory>([]);
  const memoryRef = useRef<StoredMemory>([]);
  const userIdRef = useRef<string | null>(null);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    memoryRef.current = memory;
  }, [memory]);

  useEffect(() => {
    if (!campaignId || !mapId || !enabled) {
      setMemory([]);
      memoryRef.current = [];
      userIdRef.current = null;
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      userIdRef.current = user.id;
      const { data, error } = await supabase
        .from("vtt_player_visibility")
        .select("seen_polygon")
        .eq("campaign_id", campaignId)
        .eq("map_id", mapId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("Failed to load player visibility:", error);
        return;
      }
      const stored = (data?.seen_polygon as StoredMemory | null) ?? [];
      setMemory(stored);
      memoryRef.current = stored;
    };
    void run();
    return () => {
      cancelled = true;
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = null;
    };
  }, [campaignId, mapId, enabled]);

  const flush = useCallback(async () => {
    const userId = userIdRef.current;
    if (!campaignId || !mapId || !userId) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("vtt_player_visibility")
      .upsert(
        {
          campaign_id: campaignId,
          map_id: mapId,
          user_id: userId,
          seen_polygon: memoryRef.current as unknown as object,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: "campaign_id,map_id,user_id" }
      );
    if (error) console.error("Failed to persist player visibility:", error);
  }, [campaignId, mapId]);

  const accumulate = useCallback(
    (visible: Point[]) => {
      if (!enabled) return;
      const next = unionWithVisible(memoryRef.current, visible);
      memoryRef.current = next;
      setMemory(next);
      if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
      writeTimerRef.current = setTimeout(() => {
        void flush();
      }, DEBOUNCE_MS);
    },
    [enabled, flush]
  );

  /** Memory as Konva-ready outer ring polygons (flat [x,y,...]). */
  const memoryPolys = storedMemoryToKonvaPolys(memory);

  return { memoryPolys, accumulate };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add hooks/useVttPlayerVisibility.ts
git commit -m "feat(vtt): per-user accumulated visibility memory hook"
```

---

## Task 9: Extend `vtt-store` with wall tool + editor mode

**Files:**
- Modify: `lib/store/vtt-store.ts`

- [ ] **Step 1: Add `'wall'` to the activeTool union and add `wallEditorMode`**

Find the `activeTool` union and append:

```ts
    | 'aoe-ring'
    | 'wall';
  wallEditorMode: 'pen' | 'segment' | 'door';
  aoeShape: 'circle' | 'cone' | 'line' | 'square' | 'ring';
```

In the setter type list:

```ts
      | 'aoe-ring'
      | 'wall'
  ) => void;
  setWallEditorMode: (mode: 'pen' | 'segment' | 'door') => void;
  setAoeShape: (shape: 'circle' | 'cone' | 'line' | 'square' | 'ring') => void;
```

In the state defaults inside `create`:

```ts
  aoeShape: 'circle',
  wallEditorMode: 'pen',
```

In the actions block:

```ts
  setAoeShape: (shape) => set({ aoeShape: shape }),
  setWallEditorMode: (mode) => set({ wallEditorMode: mode }),
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/store/vtt-store.ts
git commit -m "feat(vtt): wall tool + editor mode in store"
```

---

## Task 10: `WallLayer` component (DM-only render + door click + editor host)

**Files:**
- Create: `components/map/WallLayer.tsx`

- [ ] **Step 1: Write the layer**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Layer, Group, Line, Circle, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Point, Wall } from "@/types/vtt-walls";

interface Props {
  walls: Wall[];
  isDm: boolean;
  /** Active wall-tool sub-mode; null when wall tool isn't active. */
  editorMode: "pen" | "segment" | "door" | null;
  selectedWallId: string | null;
  onSelectWall: (id: string | null) => void;
  onDeleteWall: (id: string) => void;
  onCreateWall: (points: Point[], isDoor: boolean) => void;
  onToggleDoor: (id: string) => void;
  gridSize: number;
}

const SNAP_THRESHOLD_PX = 10;

function snapToGridIntersection(p: Point, gridSize: number): Point {
  return {
    x: Math.round(p.x / gridSize) * gridSize,
    y: Math.round(p.y / gridSize) * gridSize,
  };
}

export function WallLayer({
  walls,
  isDm,
  editorMode,
  selectedWallId,
  onSelectWall,
  onDeleteWall,
  onCreateWall,
  onToggleDoor,
  gridSize,
}: Props) {
  // Editor in-progress points (pen tool & segment first click).
  const [editorPoints, setEditorPoints] = useState<Point[]>([]);
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  // Reset editor state when leaving wall tool.
  useEffect(() => {
    if (!editorMode) {
      setEditorPoints([]);
      setHoverPoint(null);
    }
  }, [editorMode]);

  // Listen for Esc to cancel + Enter to finish pen.
  useEffect(() => {
    if (!editorMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editorPoints.length >= 2 && editorMode === "pen") {
          onCreateWall(editorPoints, false);
        }
        setEditorPoints([]);
      } else if (e.key === "Enter") {
        if (editorPoints.length >= 2 && editorMode === "pen") {
          onCreateWall(editorPoints, false);
          setEditorPoints([]);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editorMode, editorPoints, onCreateWall]);

  // DM and players need the layer mounted (door clicks). Players see only doors.
  const visibleWalls = isDm ? walls : walls.filter((w) => w.is_door);

  return (
    <Layer>
      {visibleWalls.map((w) => (
        <WallShape
          key={w.id}
          wall={w}
          isDm={isDm}
          selected={selectedWallId === w.id && isDm && editorMode !== null}
          editorMode={editorMode}
          onSelect={() => onSelectWall(w.id)}
          onDelete={() => onDeleteWall(w.id)}
          onToggleDoor={() => onToggleDoor(w.id)}
        />
      ))}
      {isDm && editorMode && (
        <EditorOverlay
          mode={editorMode}
          points={editorPoints}
          hover={hoverPoint}
          gridSize={gridSize}
          setEditorPoints={setEditorPoints}
          setHoverPoint={setHoverPoint}
          onCommit={(pts, isDoor) => {
            onCreateWall(pts, isDoor);
            setEditorPoints([]);
          }}
        />
      )}
    </Layer>
  );
}

function WallShape({
  wall,
  isDm,
  selected,
  editorMode,
  onSelect,
  onDelete,
  onToggleDoor,
}: {
  wall: Wall;
  isDm: boolean;
  selected: boolean;
  editorMode: "pen" | "segment" | "door" | null;
  onSelect: () => void;
  onDelete: () => void;
  onToggleDoor: () => void;
}) {
  const flat: number[] = [];
  for (const p of wall.points) flat.push(p.x, p.y);
  const stroke = wall.is_door ? "#f59e0b" : "#06b6d4";
  const dash =
    wall.is_door && wall.is_open ? [10, 6] : selected ? [4, 4] : undefined;
  const opacity = wall.is_door && wall.is_open ? 0.5 : 1;
  const strokeWidth = selected ? 5 : 3;

  return (
    <Group>
      <Line
        points={flat}
        stroke={stroke}
        strokeWidth={strokeWidth}
        dash={dash}
        opacity={opacity}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={Math.max(14, strokeWidth + 10)}
        onMouseDown={(e: KonvaEventObject<MouseEvent>) => {
          if (e.evt.button !== 0) return;
          e.cancelBubble = true;
          if (editorMode && isDm) {
            onSelect();
          } else if (wall.is_door) {
            onToggleDoor();
          }
        }}
      />
      {selected && wall.points[0] && (
        <Group
          x={wall.points[0].x}
          y={wall.points[0].y}
          onMouseDown={(e) => {
            e.cancelBubble = true;
            onDelete();
          }}
        >
          <Circle
            radius={12}
            fill="#ef4444"
            stroke="#fff"
            strokeWidth={2}
            shadowColor="#000"
            shadowBlur={6}
            shadowOpacity={0.5}
          />
          <Text
            text="×"
            fontSize={20}
            fill="#fff"
            width={24}
            height={24}
            offsetX={12}
            offsetY={12}
            align="center"
            verticalAlign="middle"
          />
        </Group>
      )}
    </Group>
  );
}

function EditorOverlay({
  mode,
  points,
  hover,
  gridSize,
  setEditorPoints,
  setHoverPoint,
  onCommit,
}: {
  mode: "pen" | "segment" | "door";
  points: Point[];
  hover: Point | null;
  gridSize: number;
  setEditorPoints: (p: Point[]) => void;
  setHoverPoint: (p: Point | null) => void;
  onCommit: (pts: Point[], isDoor: boolean) => void;
}) {
  // Big invisible Rect-style hit catcher for the whole stage isn't strictly
  // necessary here — GameCanvas forwards mouse events into props. But the
  // editor still needs to render the in-progress preview line.
  const livePts: Point[] = [];
  for (const p of points) livePts.push(p);
  if (hover && points.length > 0) livePts.push(hover);

  if (livePts.length < 2) return null;
  const flat: number[] = [];
  for (const p of livePts) flat.push(p.x, p.y);

  return (
    <Group listening={false}>
      <Line
        points={flat}
        stroke={mode === "door" ? "#f59e0b" : "#06b6d4"}
        strokeWidth={3}
        dash={[6, 4]}
        opacity={0.7}
        lineCap="round"
        lineJoin="round"
      />
      {points.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={4}
          fill={mode === "door" ? "#f59e0b" : "#06b6d4"}
          listening={false}
        />
      ))}
    </Group>
  );
}

export const wallEditorSnap = snapToGridIntersection;
export const WALL_SNAP_THRESHOLD_PX = SNAP_THRESHOLD_PX;
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/map/WallLayer.tsx
git commit -m "feat(vtt): WallLayer renders walls/doors and the editor overlay"
```

---

## Task 11: `vtt-wall-tool` toolbar component

**Files:**
- Create: `components/vtt/vtt-wall-tool.tsx`

- [ ] **Step 1: Write the popover toolbar entry**

```tsx
"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Construction, Slash, MousePointer2, DoorOpen } from "lucide-react";
import { useVttStore } from "@/lib/store/vtt-store";
import { cn } from "@/lib/utils";

const MODES: Array<{
  mode: "pen" | "segment" | "door";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { mode: "pen", label: "Pen (polyline)", icon: MousePointer2 },
  { mode: "segment", label: "Segment", icon: Slash },
  { mode: "door", label: "Door segment", icon: DoorOpen },
];

export function VttWallTool() {
  const [open, setOpen] = useState(false);
  const { activeTool, setActiveTool, wallEditorMode, setWallEditorMode } =
    useVttStore();
  const isActive = activeTool === "wall";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="icon"
              className={cn(
                "h-8 w-8",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              onClick={() => {
                if (!isActive) setActiveTool("wall");
              }}
            >
              <Construction className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Walls (DM)</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-1" align="end">
        <div className="flex items-center gap-1">
          {MODES.map(({ mode, label, icon: Icon }) => (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive && wallEditorMode === mode ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setActiveTool("wall");
                    setWallEditorMode(mode);
                    setOpen(false);
                  }}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/vtt/vtt-wall-tool.tsx
git commit -m "feat(vtt): wall tool toolbar entry with mode popover"
```

---

## Task 12: `LosMaskLayer` component

**Files:**
- Create: `components/map/LosMaskLayer.tsx`

- [ ] **Step 1: Write the layer**

```tsx
"use client";

import { Layer, Group, Rect, Line } from "react-konva";
import type { Point } from "@/types/vtt-walls";

interface Props {
  /** Map dimensions in stage coords. */
  mapWidth: number;
  mapHeight: number;
  /** Currently-visible polygons (one per owned token, possibly clipped to light radii). */
  visiblePolygons: number[][];
  /** Memory polygons (already accumulated). */
  memoryPolygons: number[][];
  /** Hide entirely (DM bypass / vision_enabled false). */
  hidden: boolean;
}

const NEVER_SEEN_COLOR = "#000";
const MEMORY_COLOR = "#000";

export function LosMaskLayer({
  mapWidth,
  mapHeight,
  visiblePolygons,
  memoryPolygons,
  hidden,
}: Props) {
  if (hidden) return null;
  return (
    <Layer listening={false}>
      {/* Layer 1: solid black covering everything ("never seen") */}
      <Rect x={0} y={0} width={mapWidth} height={mapHeight} fill={NEVER_SEEN_COLOR} />
      {/* Layer 2: punch memory polygons to 50% — destination-out at 0.5 alpha */}
      {memoryPolygons.map((flat, i) => (
        <Line
          key={`mem-${i}`}
          points={flat}
          closed
          fill="rgba(0,0,0,1)"
          opacity={0.5}
          globalCompositeOperation="destination-out"
        />
      ))}
      {/* Layer 3: punch currently-visible to 100% transparent */}
      {visiblePolygons.map((flat, i) => (
        <Line
          key={`vis-${i}`}
          points={flat}
          closed
          fill="rgba(0,0,0,1)"
          globalCompositeOperation="destination-out"
        />
      ))}
      {/* This layer composites only against itself; it sits over the map but
          below tokens. Konva applies globalCompositeOperation per shape within
          the same Layer canvas. */}
      <Rect x={0} y={0} width={0} height={0} listening={false} />
      {/* Decorative bottom rect just to ensure layer height stays correct on
          empty input; keeps Konva happy. */}
      {memoryPolygons.length === 0 && visiblePolygons.length === 0 && (
        <Rect
          x={0}
          y={0}
          width={mapWidth}
          height={mapHeight}
          fill="rgba(0,0,0,0)"
        />
      )}
    </Layer>
  );
}

/** Helper to convert Point[] to flat number[] for Konva. */
export function pointsToFlat(points: Point[]): number[] {
  const out: number[] = [];
  for (const p of points) out.push(p.x, p.y);
  return out;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/map/LosMaskLayer.tsx
git commit -m "feat(vtt): LosMaskLayer for never-seen / memory / currently-visible"
```

---

## Task 13: Inspector light-radius field

**Files:**
- Modify: `components/vtt/vtt-token-inspector.tsx`

- [ ] **Step 1: Add the Light radius row**

Find the HpAdjuster placement (after the HP block) and add a sibling row that lets DM (or token owner) edit `light_radius_ft`. Insert this block right before the conditions section:

```tsx
      {sel && (
        <LightRadiusRow
          token={sel}
          isDm={isDm}
          onUpdate={(v) => updateToken(sel.id, { light_radius_ft: v })}
        />
      )}
```

Then add the helper component near the other small components in this file (before `formatSpeed`):

```tsx
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
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">
          Light radius
        </p>
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
```

The file already imports `Input`, `useState`, `useEffect`. If not, add them at the top.

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/vtt/vtt-token-inspector.tsx
git commit -m "feat(vtt): inspector light_radius_ft field"
```

---

## Task 14: Mount + wire WallLayer + LosMaskLayer + door click in GameCanvas

**Files:**
- Modify: `components/map/GameCanvas.tsx`

- [ ] **Step 1: Add imports**

Near the top of `components/map/GameCanvas.tsx`, add:

```ts
import { useVttWalls } from '@/hooks/useVttWalls';
import { useVttPlayerVisibility } from '@/hooks/useVttPlayerVisibility';
import { WallLayer, wallEditorSnap, WALL_SNAP_THRESHOLD_PX } from './WallLayer';
import { LosMaskLayer, pointsToFlat } from './LosMaskLayer';
import {
  computeVisibilityPolygon,
  sightBlockingSegments,
  polygonToFlatPoints,
  pointInPolygon,
} from '@/lib/vtt/visibility';
import {
  movementBlockingSegments,
  slideAgainstWalls,
} from '@/lib/vtt/movement';
import type { Point } from '@/types/vtt-walls';
```

- [ ] **Step 2: Pull walls + scene flags + memory hook into the component**

Below the existing `useVttFog` and `useVttDrawings` calls, add:

```ts
  const { walls, createWall, deleteWall, toggleDoor } = useVttWalls(
    campaignId,
    mapId ?? null
  );

  const visionEnabled = !!loadedMapItem?.vision_enabled;
  const sceneDark = !!loadedMapItem?.scene_dark;

  const { memoryPolys, accumulate: accumulateVisibility } =
    useVttPlayerVisibility(campaignId, mapId ?? null, visionEnabled && !isDm);

  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const wallEditorMode = useVttStore((s) =>
    s.activeTool === 'wall' ? s.wallEditorMode : null
  );
```

Note: `loadedMapItem` does not currently include `vision_enabled` or `scene_dark`. The `loadedMapItem` is set in the page from a Supabase select; we need to add those columns to that select. That update happens in **Task 18 — Page wiring**. Until then, `vision_enabled` will read undefined → falsy, so the system stays off. That's the safe default during integration.

- [ ] **Step 3: Compute owned-token visibility polygons**

Add inside the component, below the new state:

```ts
  // Owned tokens for the local user (player view). DM bypasses.
  const ownedTokenIds = useVttStore.getState().tokens
    .filter((t) => false) // placeholder; replaced below
    .map((t) => t.id);
```

Replace that placeholder with the real computation. The existing token data has a joined `character` shape via the API. Whether `characters.user_id` is exposed depends on the existing select. For v1, use a heuristic: a token is "owned" by a user if `token.character_id` is non-null AND the token row's joined character has a `user_id` matching the current user. We need to thread the current user id into the canvas. The existing GameCanvasProps already has `campaignId`; user id needs to come from the page.

For minimum surface-area: read the user id via Supabase auth in an effect:

```ts
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);
```

(At top of file: `import { createClient } from '@/lib/supabase/client';` if not already present.)

Then derive owned tokens:

```ts
  const ownedTokens = !visionEnabled || isDm ? [] : tokens.filter((t) => {
    // Token has character info embedded with user_id when fetched. If your
    // tokens API doesn't return character.user_id, extend it now.
    const characterUserId = (t as unknown as { character?: { user_id?: string } })
      .character?.user_id;
    return characterUserId && currentUserId && characterUserId === currentUserId;
  });
```

If `characters.user_id` isn't currently selected by the API, also extend `app/api/vtt/tokens/route.ts` to include it in the join. (See Task 18 for the page-side concrete change; the API extension can be done as part of Task 3 if you want to keep migrations together, otherwise here.)

- [ ] **Step 4: Compute visibility polygons + accumulate memory**

Add:

```ts
  const sightSegs = sightBlockingSegments(walls);
  const visiblePolygons = ownedTokens.map((t) => {
    const center: Point = { x: t.x + gridSize / 2, y: t.y + gridSize / 2 };
    const poly = computeVisibilityPolygon(center, sightSegs);
    return polygonToFlatPoints(poly);
  });

  // Accumulate memory whenever any owned token's position changes.
  useEffect(() => {
    if (!visionEnabled || isDm) return;
    for (const t of ownedTokens) {
      const center: Point = { x: t.x + gridSize / 2, y: t.y + gridSize / 2 };
      const poly = computeVisibilityPolygon(center, sightSegs);
      accumulateVisibility(poly);
    }
    // Intentionally depending on token positions rather than full token objects
  }, [
    visionEnabled,
    isDm,
    ownedTokens.map((t) => `${t.id}:${t.x}:${t.y}`).join('|'),
    accumulateVisibility,
    sightSegs.length,
  ]);
```

- [ ] **Step 5: Mount WallLayer + LosMaskLayer**

Find the existing layer order in the JSX (Map/Grid → Tokens → Fog → Ruler → AOE → Drawing → Ping). Insert WallLayer above the AOE/Drawing layers and LosMaskLayer between fog and tokens. Specifically, just after `<FogLayer ... />`:

```tsx
        <FogLayer onFogUpdate={updateFogShapes} isDm={isDm} />
        {!isDm && visionEnabled && mapDimensions && (
          <LosMaskLayer
            mapWidth={mapDimensions.width}
            mapHeight={mapDimensions.height}
            visiblePolygons={visiblePolygons}
            memoryPolygons={memoryPolys}
            hidden={false}
          />
        )}
        <WallLayer
          walls={walls}
          isDm={!!isDm}
          editorMode={wallEditorMode}
          selectedWallId={selectedWallId}
          onSelectWall={setSelectedWallId}
          onDeleteWall={(id) => {
            void deleteWall(id);
            setSelectedWallId(null);
          }}
          onCreateWall={(points, isDoor) => {
            void createWall({ points, is_door: isDoor });
          }}
          onToggleDoor={(id) => void toggleDoor(id)}
          gridSize={gridSize}
        />
```

`mapDimensions` comes from `useVttStore`. Ensure it's destructured if not already; default to `{width: 0, height: 0}` if null.

- [ ] **Step 6: Filter tokens to currently-visible region for player view**

Modify TokenLayer's render input. Two options: filter at the GameCanvas level by passing a `visibleTokenIds` prop, or compute inside TokenLayer. To keep TokenLayer focused, do it here.

After the `visiblePolygons` computation, add:

```ts
  const visibleTokenIds: Set<string> | null =
    isDm || !visionEnabled
      ? null
      : (() => {
          const ids = new Set<string>();
          for (const t of tokens) {
            const center: Point = { x: t.x + gridSize / 2, y: t.y + gridSize / 2 };
            // Convert each visible polygon flat array back to Point[] for the test
            for (const flat of visiblePolygons) {
              const poly: Point[] = [];
              for (let i = 0; i < flat.length; i += 2) {
                poly.push({ x: flat[i], y: flat[i + 1] });
              }
              if (pointInPolygon(center, poly)) {
                ids.add(t.id);
                break;
              }
            }
          }
          // Also ensure owned tokens are always visible to their owner.
          for (const t of ownedTokens) ids.add(t.id);
          return ids;
        })();
```

Then pass `visibleTokenIds` to `<TokenLayer>` (extend its props in Task 16):

```tsx
        <TokenLayer
          ...
          visibleTokenIds={visibleTokenIds}
        />
```

- [ ] **Step 7: Type-check**

Run: `pnpm type-check`
Expected: PASS. (Until Task 18 lands, `vision_enabled` will be undefined and the new layers stay off.)

- [ ] **Step 8: Commit**

```bash
git add components/map/GameCanvas.tsx
git commit -m "feat(vtt): mount WallLayer + LosMaskLayer + visibility computation"
```

---

## Task 15: Wire wall editor input into the Stage mouse handlers

**Files:**
- Modify: `components/map/GameCanvas.tsx`

- [ ] **Step 1: Add wall-editor branches in handleMouseDown**

Inside `handleMouseDown`, after the `if (activeTool === 'erase' && ...)` branch and before AOE, add:

```ts
    // Wall editor (DM)
    if (activeTool === 'wall' && isDm && e.evt.button === 0) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      // Snap to grid intersection unless Alt held
      const useSnap = !e.evt.altKey;
      const placed = useSnap ? wallEditorSnap(pointer, gridSize) : pointer;
      const mode = useVttStore.getState().wallEditorMode;
      if (mode === 'segment' || mode === 'door') {
        // Two-click segment: first click stores; second click commits.
        setWallEditorPoints((prev) => {
          if (prev.length === 0) return [placed];
          // Commit the two-point segment.
          void createWall({ points: [prev[0], placed], is_door: mode === 'door' });
          return [];
        });
        return;
      }
      // Pen mode: append vertex; double-click finishes.
      setWallEditorPoints((prev) => [...prev, placed]);
      return;
    }
```

This relies on a new piece of state on GameCanvas:

```ts
  const [wallEditorPoints, setWallEditorPoints] = useState<Point[]>([]);
```

Place it near the `aoeDrag` state.

- [ ] **Step 2: Add hover-line preview in handleMouseMove**

Inside `handleMouseMove`, after the existing branches, add:

```ts
    if (activeTool === 'wall' && isDm) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      const useSnap = !e.evt.altKey;
      const placed = useSnap ? wallEditorSnap(pointer, gridSize) : pointer;
      setWallEditorHover(placed);
      return;
    }
```

And the hover state:

```ts
  const [wallEditorHover, setWallEditorHover] = useState<Point | null>(null);
```

- [ ] **Step 3: Pen-mode finish on double-click**

Add a Stage `onDblClick`:

```tsx
        onDblClick={() => {
          if (activeTool !== 'wall' || !isDm) return;
          if (useVttStore.getState().wallEditorMode !== 'pen') return;
          if (wallEditorPoints.length >= 2) {
            void createWall({ points: wallEditorPoints, is_door: false });
          }
          setWallEditorPoints([]);
        }}
```

- [ ] **Step 4: Pass editor state into WallLayer**

Replace the `WallLayer` mount from Task 14 step 5 with one that receives the in-progress points:

```tsx
        <WallLayer
          walls={walls}
          isDm={!!isDm}
          editorMode={wallEditorMode}
          selectedWallId={selectedWallId}
          onSelectWall={setSelectedWallId}
          onDeleteWall={(id) => {
            void deleteWall(id);
            setSelectedWallId(null);
          }}
          onCreateWall={(points, isDoor) => {
            void createWall({ points, is_door: isDoor });
          }}
          onToggleDoor={(id) => void toggleDoor(id)}
          gridSize={gridSize}
          editorPoints={wallEditorPoints}
          editorHover={wallEditorHover}
          onClearEditorPoints={() => setWallEditorPoints([])}
        />
```

Update `WallLayer`'s `Props` and `EditorOverlay` to accept the new props (they currently keep their own state — refactor to accept points/hover from parent so the GameCanvas owns input state, which is cleaner):

In `WallLayer`, replace the local state with these props and stop registering its own keydown handler (move that to GameCanvas):

```tsx
interface Props {
  walls: Wall[];
  isDm: boolean;
  editorMode: "pen" | "segment" | "door" | null;
  selectedWallId: string | null;
  onSelectWall: (id: string | null) => void;
  onDeleteWall: (id: string) => void;
  onCreateWall: (points: Point[], isDoor: boolean) => void;
  onToggleDoor: (id: string) => void;
  gridSize: number;
  editorPoints: Point[];
  editorHover: Point | null;
  onClearEditorPoints: () => void;
}
```

And remove the `useState` / `useEffect` for editorPoints/hoverPoint and the keydown listener from `WallLayer.tsx`. The keydown handling moves to GameCanvas in step 5.

- [ ] **Step 5: Esc cancels / Enter finishes pen — in GameCanvas**

Add an effect in GameCanvas:

```ts
  useEffect(() => {
    if (activeTool !== 'wall') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWallEditorPoints([]);
      } else if (e.key === 'Enter') {
        if (
          useVttStore.getState().wallEditorMode === 'pen' &&
          wallEditorPoints.length >= 2
        ) {
          void createWall({ points: wallEditorPoints, is_door: false });
          setWallEditorPoints([]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTool, wallEditorPoints, createWall]);
```

- [ ] **Step 6: Update cursor**

In the `cursorClass` block, add:

```ts
  else if (activeTool === 'wall') cursorClass = 'cursor-crosshair';
```

- [ ] **Step 7: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/map/GameCanvas.tsx components/map/WallLayer.tsx
git commit -m "feat(vtt): wire wall editor input into Stage mouse handlers"
```

---

## Task 16: TokenLayer accepts visibleTokenIds for player view

**Files:**
- Modify: `components/map/TokenLayer.tsx`

- [ ] **Step 1: Add the prop and filter**

Extend `TokenLayerProps`:

```ts
interface TokenLayerProps {
  onTokenUpdate: (id: string, updates: Partial<TokenType>) => void;
  onTokenContextMenu?: (id: string, position: { x: number; y: number }) => void;
  onTokenDragMove?: (id: string, x: number, y: number) => void;
  onTokenDragEnd?: () => void;
  groupDrag?: { leadId: string; dx: number; dy: number } | null;
  /** When non-null, only tokens whose ids are in this set render (player view). */
  visibleTokenIds?: Set<string> | null;
}
```

In the component body, accept the prop and filter tokens before mapping:

```ts
const TokenLayerComponent: React.FC<TokenLayerProps> = ({
  onTokenUpdate,
  onTokenContextMenu,
  onTokenDragMove,
  onTokenDragEnd,
  groupDrag,
  visibleTokenIds,
}) => {
  ...
  const renderedTokens = visibleTokenIds
    ? tokens.filter((t) => visibleTokenIds.has(t.id))
    : tokens;

  return (
    <Layer listening={isInteractive}>
      {renderedTokens.map((token) => {
        ...
      })}
    </Layer>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/map/TokenLayer.tsx
git commit -m "feat(vtt): TokenLayer respects visibleTokenIds for player LOS"
```

---

## Task 17: Token slide-against-walls on drag

**Files:**
- Modify: `components/map/Token.tsx`

- [ ] **Step 1: Add a `walls` prop and slide on drag**

Extend `TokenProps`:

```ts
import type { WallSegment } from "@/types/vtt-walls";
import { slideAgainstWalls } from "@/lib/vtt/movement";

interface TokenProps {
  ...
  /** Sight+movement-blocking wall segments (filtered by caller). */
  blockingSegments?: WallSegment[];
}
```

In `TokenComponent`, accept `blockingSegments`:

```ts
function TokenComponent({
  ...,
  blockingSegments,
}: TokenProps) {
```

Replace `handleDragMove` and `handleDragEnd` with collision-aware versions:

```ts
  const handleDragMove = (e: KonvaEventObject<DragEvent>) => {
    const desired = { x: e.target.x(), y: e.target.y() };
    if (blockingSegments && blockingSegments.length > 0) {
      const start = { x: token.x, y: token.y };
      const slid = slideAgainstWalls(start, desired, blockingSegments);
      e.target.x(slid.x);
      e.target.y(slid.y);
      onDragMove?.(token.id, slid.x, slid.y);
      return;
    }
    onDragMove?.(token.id, desired.x, desired.y);
  };

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    let endX = e.target.x();
    let endY = e.target.y();
    if (blockingSegments && blockingSegments.length > 0) {
      const start = { x: token.x, y: token.y };
      const slid = slideAgainstWalls(start, { x: endX, y: endY }, blockingSegments);
      endX = slid.x;
      endY = slid.y;
    }
    const x = Math.round(endX / gridSize) * gridSize;
    const y = Math.round(endY / gridSize) * gridSize;
    e.target.to({ x, y, duration: 0.1 });
    if (onUpdate) onUpdate(token.id, { x, y });
    onDragEnd?.();
  };
```

- [ ] **Step 2: Pass `blockingSegments` from TokenLayer**

In `TokenLayer.tsx`, add `blockingSegments` prop and forward:

```ts
interface TokenLayerProps {
  ...
  blockingSegments?: WallSegment[];
}

// in component:
<Token
  ...
  blockingSegments={blockingSegments}
/>
```

Import the type at the top of `TokenLayer.tsx`:

```ts
import type { WallSegment } from "@/types/vtt-walls";
```

- [ ] **Step 3: Compute and pass `blockingSegments` from GameCanvas**

In `GameCanvas.tsx`, update the TokenLayer mount:

```tsx
        <TokenLayer
          onTokenUpdate={handleTokenUpdate}
          onTokenContextMenu={handleTokenContextMenu}
          onTokenDragMove={handleTokenDragMove}
          onTokenDragEnd={handleTokenDragEnd}
          groupDrag={groupDrag}
          visibleTokenIds={visibleTokenIds}
          blockingSegments={movementBlockingSegments(walls)}
        />
```

- [ ] **Step 4: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/map/Token.tsx components/map/TokenLayer.tsx components/map/GameCanvas.tsx
git commit -m "feat(vtt): token movement collides and slides along walls"
```

---

## Task 18: Page wiring — vision toggle, scene_dark, wall tool button

**Files:**
- Modify: `app/(vtt)/campaigns/[campaignId]/vtt/page.tsx`

- [ ] **Step 1: Extend the loadedMapItem select**

Find the supabase select that loads the map (around `from("media_items").select(...)`). Add `vision_enabled, scene_dark` to the column list.

- [ ] **Step 2: Import the new components and icons**

```ts
import { Eye as EyeIcon, EyeOff as EyeOffIcon, Moon, Sun } from "lucide-react";
import { VttWallTool } from "@/components/vtt/vtt-wall-tool";
```

(`Eye/EyeOff` are already imported elsewhere — alias if needed.)

- [ ] **Step 3: Add toggles to the DM toolbar group**

Find the DM-only scene controls amber pill (`{isDm && mapId && (<div ...>...</div>)}`). Add inside it, next to the existing buttons:

```tsx
                <ToolButton
                  active={!!loadedMapItem?.vision_enabled}
                  onClick={async () => {
                    if (!mapId) return;
                    const supabase = createClient();
                    await supabase
                      .from('media_items')
                      .update({ vision_enabled: !loadedMapItem?.vision_enabled } as never)
                      .eq('id', mapId);
                    setLoadedMapItem((prev) =>
                      prev ? { ...prev, vision_enabled: !prev.vision_enabled } : prev
                    );
                  }}
                  icon={loadedMapItem?.vision_enabled ? <EyeIcon className="h-4 w-4" /> : <EyeOffIcon className="h-4 w-4" />}
                  label="Vision system"
                />
                <ToolButton
                  active={!!loadedMapItem?.scene_dark}
                  onClick={async () => {
                    if (!mapId) return;
                    const supabase = createClient();
                    await supabase
                      .from('media_items')
                      .update({ scene_dark: !loadedMapItem?.scene_dark } as never)
                      .eq('id', mapId);
                    setLoadedMapItem((prev) =>
                      prev ? { ...prev, scene_dark: !prev.scene_dark } : prev
                    );
                  }}
                  icon={loadedMapItem?.scene_dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  label="Scene darkness"
                />
                <VttWallTool />
```

- [ ] **Step 4: Make `loadedMapItem` reflect `vision_enabled` and `scene_dark`**

If `MediaItem` type doesn't include these, extend it. Find the `MediaItem` declaration (in `hooks/useCampaignContent.ts` or similar) and add:

```ts
  vision_enabled?: boolean;
  scene_dark?: boolean;
```

Run: `grep -n "MediaItem" hooks/useCampaignContent.ts` to confirm the location.

- [ ] **Step 5: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/\(vtt\)/campaigns/\[campaignId\]/vtt/page.tsx hooks/useCampaignContent.ts
git commit -m "feat(vtt): vision-enabled + scene_dark + wall tool toolbar buttons"
```

---

## Task 19: Pass `vision_enabled` / `scene_dark` from page to GameCanvas

**Files:**
- Modify: `app/(vtt)/campaigns/[campaignId]/vtt/page.tsx`
- Modify: `components/map/GameCanvas.tsx`

- [ ] **Step 1: Page passes flags as props**

In `page.tsx`, where GameCanvas is mounted, replace with:

```tsx
              <GameCanvas
                isDm={!!isDm}
                campaignId={campaignId}
                visionEnabled={!!loadedMapItem?.vision_enabled}
                sceneDark={!!loadedMapItem?.scene_dark}
              />
```

- [ ] **Step 2: GameCanvasProps accept the flags**

In `components/map/GameCanvas.tsx`:

```ts
interface GameCanvasProps {
  isDm?: boolean;
  campaignId: string;
  visionEnabled?: boolean;
  sceneDark?: boolean;
}

export const GameCanvas = ({
  isDm = false,
  campaignId,
  visionEnabled = false,
  sceneDark = false,
}: GameCanvasProps) => {
```

Replace the lines in Task 14 that read from `loadedMapItem`:

```ts
  // Replace:
  // const visionEnabled = !!loadedMapItem?.vision_enabled;
  // const sceneDark = !!loadedMapItem?.scene_dark;
  // with the prop reads — remove the local declarations.
```

(The variables `visionEnabled` and `sceneDark` are already named as expected.)

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(vtt\)/campaigns/\[campaignId\]/vtt/page.tsx components/map/GameCanvas.tsx
git commit -m "feat(vtt): pass vision flags from page to GameCanvas"
```

---

## Task 20: Light radius clipping on dark scenes

**Files:**
- Modify: `components/map/GameCanvas.tsx`

- [ ] **Step 1: Build a light coverage circle per token (regardless of ownership)**

Replace the visibility computation block from Task 14 step 4 with a version that intersects with light circles when `sceneDark`:

```ts
  const sightSegs = sightBlockingSegments(walls);

  // Build a list of light circles from every token (not just owned), in stage coords.
  const lightCircles: Array<{ cx: number; cy: number; r: number }> = sceneDark
    ? tokens
        .filter((t) => (t.light_radius_ft ?? 0) > 0)
        .map((t) => ({
          cx: t.x + gridSize / 2,
          cy: t.y + gridSize / 2,
          r: ((t.light_radius_ft ?? 0) / feetPerSquare) * gridSize,
        }))
    : [];

  function clipPolygonToLights(poly: Point[]): Point[][] {
    if (!sceneDark) return [poly];
    if (lightCircles.length === 0) return [];
    // Approximate each circle as a 32-vertex polygon and clip via polygon-clipping.
    const polyRing: number[][] = poly.map((p) => [p.x, p.y]);
    if (polyRing.length === 0) return [];
    polyRing.push(polyRing[0]);
    // Build a single union of light circles.
    const circlePolys = lightCircles.map(({ cx, cy, r }) => {
      const ring: number[][] = [];
      const N = 32;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      ring.push(ring[0]);
      return [ring];
    });
    // Use polygon-clipping for intersection; lightUnion = union of circles
    const polygonClipping = require('polygon-clipping');
    const lightUnion = polygonClipping.union(...circlePolys);
    const intersection = polygonClipping.intersection([polyRing], lightUnion);
    // Return outer rings of each polygon piece.
    return intersection.map((mp: number[][][]) =>
      mp[0].map(([x, y]: number[]) => ({ x, y }))
    );
  }

  const visiblePolygons: number[][] = ownedTokens.flatMap((t) => {
    const center: Point = { x: t.x + gridSize / 2, y: t.y + gridSize / 2 };
    const losPoly = computeVisibilityPolygon(center, sightSegs);
    const clipped = clipPolygonToLights(losPoly);
    return clipped.map((c) => polygonToFlatPoints(c));
  });
```

(Convert `require('polygon-clipping')` to `import polygonClipping from 'polygon-clipping'` at the top of the file; the `require` form was inline only for clarity here.)

- [ ] **Step 2: Update memory accumulation to use the same clipped polygon**

Replace the memory effect to use the clipped polygons:

```ts
  useEffect(() => {
    if (!visionEnabled || isDm) return;
    for (const t of ownedTokens) {
      const center: Point = { x: t.x + gridSize / 2, y: t.y + gridSize / 2 };
      const losPoly = computeVisibilityPolygon(center, sightSegs);
      const clipped = clipPolygonToLights(losPoly);
      for (const c of clipped) accumulateVisibility(c);
    }
  }, [
    visionEnabled,
    isDm,
    sceneDark,
    ownedTokens.map((t) => `${t.id}:${t.x}:${t.y}:${t.light_radius_ft ?? 0}`).join('|'),
    accumulateVisibility,
    sightSegs.length,
    lightCircles.length,
  ]);
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/map/GameCanvas.tsx
git commit -m "feat(vtt): clip LOS by light radii in dark scenes"
```

---

## Task 21: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Single-player smoke**

As DM in one window:
- Open a scene. Toggle vision-enabled (eye icon) → ON. Verify nothing breaks for the DM (DM still sees everything).
- Open the wall tool, pick **Pen**, draw a 4-vertex room around part of the map (Esc/Enter to finish, double-click also OK).
- Pick **Door segment**, draw a 2-point door across one of the walls. The door renders orange-amber.
- Toggle the door (click it without the wall tool active). It dashes/translucent.
- Toggle scene-dark (moon icon). Visible state on DM unchanged.
- Place a player token (e.g. via assets panel). Edit its **Light radius** in inspector to 20.
- Drag the token across a wall → token slides along the wall, doesn't pass through.

- [ ] **Step 3: Two-window LOS smoke**

Open the same scene in a second window logged in as a campaign member (player) whose character is linked to a token on this map.
- Player window: with vision enabled and walls drawn, player sees only what their token can see.
- DM moves a wall (delete + redraw). Player's LOS updates next render.
- DM toggles scene-dark. Player sees only their token's torch radius.
- Player walks around. Memory polygons accumulate; areas left behind dim to gray.
- Reload the player window. The memory polygon is restored.
- DM toggles a door open. Player's LOS updates immediately (broadcast).
- Player toggles a door. DM and other players see it update.

- [ ] **Step 4: Vision off — current behavior**

Toggle vision-enabled to OFF. Verify all the existing fog/grid/weather/movement behavior is unchanged for both DM and player. Walls still block movement (drag a token into one — it slides).

- [ ] **Step 5: Edge cases**

- Empty walls + vision enabled: player sees the whole map (no occluders).
- Token light radius = 0 in dark scene: player sees nothing currently visible (only memory).
- Two owned tokens: player sees the union of both LOS polygons.
- Door clicked while in wall tool with a wall selected: should not toggle (wall-tool clicks only select, not toggle).

If any pass produces issues, fix and recommit. No final commit needed if everything passed.

---

## Self-Review Notes

**Spec coverage:**
- New schema (vtt_walls, vtt_player_visibility, media_items columns, tokens.light_radius_ft): Task 1. ✅
- Wall types: Task 2. ✅
- Token type + API for light_radius_ft: Task 3. ✅
- Visibility polygon: Task 4. ✅
- Movement collision/slide: Task 5. ✅
- Polygon union helper: Task 6. ✅
- Walls hook (CRUD + realtime + door broadcast): Task 7. ✅
- Player-visibility hook (memory): Task 8. ✅
- Store wall tool/mode: Task 9. ✅
- WallLayer (DM render + door click + editor): Tasks 10 + 15. ✅
- Wall tool popover: Task 11. ✅
- LosMaskLayer: Task 12. ✅
- Inspector light radius field: Task 13. ✅
- GameCanvas mounts + visibility computation: Task 14. ✅
- Wall editor input wiring: Task 15. ✅
- TokenLayer visibleTokenIds: Task 16. ✅
- Token slide-against-walls: Task 17. ✅
- Toolbar (vision toggle, scene-dark, wall tool): Task 18. ✅
- Flags from page → GameCanvas: Task 19. ✅
- Light radius clipping in dark scenes: Task 20. ✅
- Manual verification: Task 21. ✅

**Type consistency:**
- `Wall`/`WallSegment`/`Point` defined in Task 2; consumed in Tasks 4, 5, 6, 7, 10, 12, 14, 15, 17, 20.
- `useVttWalls` exposes `{walls, createWall, deleteWall, toggleDoor}` — referenced consistently by GameCanvas.
- `useVttPlayerVisibility` exposes `{memoryPolys, accumulate}` — referenced consistently by GameCanvas.
- `VttStore.activeTool` extension to include `'wall'` (Task 9) is used by Tasks 10, 11, 14, 15.

**Open implementation details locked:**
- Memory write debounce: single 250 ms trailing per user (Task 8).
- Pen-tool snap: snap to grid intersection by default, Alt to disable (Task 15).
- Fog clip integration: deferred — for v1 the LosMaskLayer renders independently of fog; the existing fog renders above on its own layer. The composite "outside fog = pitch black" remains because fog's own black overlay covers everything outside the revealed regions. This works because both layers are additive. If a follow-up requires precise compositing, switch to a shared Konva.Group with clipping; not needed for v1.

**Out-of-scope reminders (per spec):**
- No vision modes (darkvision/blindsight) — only torch lighting.
- No locked doors.
- No per-vertex polyline editing.
- No party-shared memory.
- No worker thread.
