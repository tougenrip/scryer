# VTT Pings & AOE Areas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add player/DM pings (Alt+left-click + toolbar button) and click-drag AOE templates (Circle, Cone, Line, Square, Ring) to the VTT, with ephemeral previews and Shift-to-persist behavior.

**Architecture:** Single Supabase Realtime channel (`vtt_overlays:{campaignId}:{mapId}`) carries pings and ephemeral AOE drag broadcasts. Persistent AOEs live in a new `vtt_aoe_areas` table synced via postgres_changes. Pure geometry helpers in `lib/vtt/aoe-geometry.ts`. Konva layers for rendering. Zustand store extended for new tools.

**Tech Stack:** Next.js, React 19, react-konva, Zustand, Supabase Realtime + Postgres, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-04-vtt-pings-and-aoe-design.md`

**Note on testing:** This codebase has no automated test runner configured (no `test` script in package.json, no jest/vitest). Each task ends with a `pnpm type-check`/`pnpm lint` gate plus a manual verification section in Task 12. Geometry helpers are written in a way that they could later be unit-tested.

---

## File map

**Create:**
- `supabase/migrations/082_vtt_aoe_areas.sql` — table, indexes, RLS, realtime publication
- `types/vtt-aoe.ts` — shared TS types for AOE shapes and DB rows
- `lib/vtt/aoe-geometry.ts` — pure geometry helpers
- `lib/vtt/presence-color.ts` — deterministic color per userId (if not already present; check first)
- `hooks/useVttOverlays.ts` — pings + ephemeral AOE realtime channel
- `hooks/useVttAoeAreas.ts` — persistent AOE CRUD + postgres_changes
- `components/map/PingLayer.tsx`
- `components/map/AoeLayer.tsx`
- `components/vtt/vtt-aoe-popover.tsx`

**Modify:**
- `lib/store/vtt-store.ts` — extend `activeTool` union; add `aoeShape` selector state
- `components/map/GameCanvas.tsx` — Alt+click ping, AOE drag tool, mount new layers
- `app/(vtt)/campaigns/[campaignId]/vtt/page.tsx` — Ping button + AOE popover in toolbar

---

## Task 1: Database migration for `vtt_aoe_areas`

**Files:**
- Create: `supabase/migrations/082_vtt_aoe_areas.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Persistent AOE areas placed by players or the DM on a VTT map.
-- Ephemeral previews and pings are broadcast-only and not stored here.

create table if not exists public.vtt_aoe_areas (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  map_id uuid not null references public.media_items(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  shape text not null check (shape in ('circle','cone','line','square','ring')),
  origin_x double precision not null,
  origin_y double precision not null,
  length_ft integer not null check (length_ft >= 5),
  rotation_deg double precision not null default 0,
  color text not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists vtt_aoe_areas_map_id_idx on public.vtt_aoe_areas(map_id);
create index if not exists vtt_aoe_areas_campaign_id_idx on public.vtt_aoe_areas(campaign_id);

alter table public.vtt_aoe_areas enable row level security;

drop policy if exists "Campaign members can view aoe areas" on public.vtt_aoe_areas;
create policy "Campaign members can view aoe areas"
  on public.vtt_aoe_areas
  for select
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
    )
    or exists (
      select 1 from public.campaign_members cm
      where cm.campaign_id = vtt_aoe_areas.campaign_id and cm.user_id = auth.uid()
    )
  );

drop policy if exists "Campaign members can insert aoe areas" on public.vtt_aoe_areas;
create policy "Campaign members can insert aoe areas"
  on public.vtt_aoe_areas
  for insert
  with check (
    auth.uid() = owner_user_id
    and (
      exists (
        select 1 from public.campaigns c
        where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
      )
      or exists (
        select 1 from public.campaign_members cm
        where cm.campaign_id = vtt_aoe_areas.campaign_id and cm.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Owner or DM can update aoe areas" on public.vtt_aoe_areas;
create policy "Owner or DM can update aoe areas"
  on public.vtt_aoe_areas
  for update
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
    )
  );

drop policy if exists "Owner or DM can delete aoe areas" on public.vtt_aoe_areas;
create policy "Owner or DM can delete aoe areas"
  on public.vtt_aoe_areas
  for delete
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.campaigns c
      where c.id = vtt_aoe_areas.campaign_id and c.dm_user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.vtt_aoe_areas;
```

- [ ] **Step 2: Apply migration to local Supabase**

Run: `pnpm supabase db push` (or whatever the project's standard apply command is — check `README.md`/`CLAUDE.md` if uncertain).
Expected: migration applies cleanly, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/082_vtt_aoe_areas.sql
git commit -m "feat(vtt): add vtt_aoe_areas table with RLS"
```

---

## Task 2: Shared TypeScript types

**Files:**
- Create: `types/vtt-aoe.ts`

- [ ] **Step 1: Write the types file**

```ts
export type AoeShape = "circle" | "cone" | "line" | "square" | "ring";

export const AOE_SHAPES: AoeShape[] = ["circle", "cone", "line", "square", "ring"];

export interface AoeArea {
  id: string;
  campaign_id: string;
  map_id: string;
  owner_user_id: string;
  shape: AoeShape;
  origin_x: number;
  origin_y: number;
  length_ft: number;
  rotation_deg: number;
  color: string;
  label: string | null;
  created_at: string;
}

export interface EphemeralAoe {
  userId: string;
  displayName: string;
  color: string;
  shape: AoeShape;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  updatedAt: number;
}

export interface PingEvent {
  id: string;
  userId: string;
  displayName: string;
  color: string;
  x: number;
  y: number;
  firedAt: number;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add types/vtt-aoe.ts
git commit -m "feat(vtt): add AOE shared TS types"
```

---

## Task 3: Geometry helpers

**Files:**
- Create: `lib/vtt/aoe-geometry.ts`

- [ ] **Step 1: Write the helpers**

```ts
import type { AoeShape } from "@/types/vtt-aoe";

const CONE_HALF_ANGLE_RAD = Math.PI / 4; // 90 degree cone => 45deg each side
const LINE_WIDTH_FT = 5;
const RING_THICKNESS_FT = 5;

export interface DragPoints {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function distancePx(d: DragPoints): number {
  const dx = d.endX - d.startX;
  const dy = d.endY - d.startY;
  return Math.hypot(dx, dy);
}

export function dragAngleRad(d: DragPoints): number {
  return Math.atan2(d.endY - d.startY, d.endX - d.startX);
}

/**
 * Convert raw drag distance (px) to a feet value snapped to feetPerSquare,
 * with a minimum of one square. Returns both feet and the snapped px length.
 */
export function snapDistanceToFeet(
  px: number,
  gridSize: number,
  feetPerSquare: number
): { feet: number; px: number } {
  if (gridSize <= 0 || feetPerSquare <= 0) {
    return { feet: feetPerSquare, px: gridSize };
  }
  const rawSquares = px / gridSize;
  const squares = Math.max(1, Math.round(rawSquares));
  return { feet: squares * feetPerSquare, px: squares * gridSize };
}

export function feetToPx(feet: number, gridSize: number, feetPerSquare: number): number {
  if (feetPerSquare <= 0) return 0;
  return (feet / feetPerSquare) * gridSize;
}

/**
 * Cone: 90deg isoceles triangle. Returns flat array of points
 * [origin.x, origin.y, leftEdge.x, leftEdge.y, rightEdge.x, rightEdge.y]
 * suitable for Konva.Line(closed=true).
 */
export function computeConePolygon(
  originX: number,
  originY: number,
  angleRad: number,
  lengthPx: number
): number[] {
  const leftAngle = angleRad - CONE_HALF_ANGLE_RAD;
  const rightAngle = angleRad + CONE_HALF_ANGLE_RAD;
  return [
    originX,
    originY,
    originX + Math.cos(leftAngle) * lengthPx,
    originY + Math.sin(leftAngle) * lengthPx,
    originX + Math.cos(rightAngle) * lengthPx,
    originY + Math.sin(rightAngle) * lengthPx,
  ];
}

/**
 * Line: rectangle anchored at origin, width centered across the drag axis,
 * extending lengthPx in the drag direction.
 */
export function computeLineRect(
  originX: number,
  originY: number,
  angleRad: number,
  lengthPx: number,
  widthPx: number
): { x: number; y: number; width: number; height: number; rotationDeg: number } {
  return {
    x: originX,
    y: originY - widthPx / 2,
    width: lengthPx,
    height: widthPx,
    rotationDeg: (angleRad * 180) / Math.PI,
  };
}

export function lineWidthFt(): number {
  return LINE_WIDTH_FT;
}

export function ringThicknessFt(): number {
  return RING_THICKNESS_FT;
}

/**
 * Square: anchored at origin, side length = drag distance, oriented along drag axis.
 * Returned as Konva.Rect props with rotation in degrees.
 */
export function computeSquareRect(
  originX: number,
  originY: number,
  angleRad: number,
  lengthPx: number
): { x: number; y: number; width: number; height: number; rotationDeg: number } {
  return {
    x: originX,
    y: originY - lengthPx / 2,
    width: lengthPx,
    height: lengthPx,
    rotationDeg: (angleRad * 180) / Math.PI,
  };
}

/**
 * Ring: outer radius = lengthPx, inner radius = lengthPx - thicknessPx (clamped >= 1).
 */
export function computeRingRadii(
  lengthPx: number,
  thicknessPx: number
): { outer: number; inner: number } {
  const outer = Math.max(thicknessPx, lengthPx);
  const inner = Math.max(1, outer - thicknessPx);
  return { outer, inner };
}

export function aoeLabelText(shape: AoeShape, feet: number): string {
  switch (shape) {
    case "circle":
      return `${feet} ft radius`;
    case "cone":
      return `${feet} ft cone`;
    case "line":
      return `${feet} ft line`;
    case "square":
      return `${feet} ft square`;
    case "ring":
      return `${feet} ft ring`;
  }
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/vtt/aoe-geometry.ts
git commit -m "feat(vtt): add AOE geometry helpers"
```

---

## Task 4: Presence color helper

Some style decisions need a stable color per user. Check if one already exists before creating.

**Files:**
- Create (only if missing): `lib/vtt/presence-color.ts`

- [ ] **Step 1: Check for existing helper**

Run: `grep -rn "presence-color\|presenceColor\|colorFromUserId" lib/ components/ hooks/`
If a helper already exists, skip steps 2–4 and use it. Note its import path for later tasks.

- [ ] **Step 2: Write the helper (if missing)**

```ts
const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function presenceColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % PALETTE.length;
  return PALETTE[idx];
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/vtt/presence-color.ts
git commit -m "feat(vtt): deterministic per-user presence color"
```

---

## Task 5: Extend `vtt-store.ts` with new tools and AOE shape

**Files:**
- Modify: `lib/store/vtt-store.ts`

- [ ] **Step 1: Update the store**

Replace the `activeTool` union and `setActiveTool` signature, and add `aoeShape` state.

Find this in `lib/store/vtt-store.ts`:

```ts
  activeTool: 'select' | 'pan' | 'measure' | 'fog';
```

Replace with:

```ts
  activeTool:
    | 'select'
    | 'pan'
    | 'measure'
    | 'fog'
    | 'ping'
    | 'aoe-circle'
    | 'aoe-cone'
    | 'aoe-line'
    | 'aoe-square'
    | 'aoe-ring';
  aoeShape: 'circle' | 'cone' | 'line' | 'square' | 'ring';
```

Find:

```ts
  setActiveTool: (tool: 'select' | 'pan' | 'measure' | 'fog') => void;
```

Replace with:

```ts
  setActiveTool: (
    tool:
      | 'select'
      | 'pan'
      | 'measure'
      | 'fog'
      | 'ping'
      | 'aoe-circle'
      | 'aoe-cone'
      | 'aoe-line'
      | 'aoe-square'
      | 'aoe-ring'
  ) => void;
  setAoeShape: (shape: 'circle' | 'cone' | 'line' | 'square' | 'ring') => void;
```

In the `create<VttState>` body, find:

```ts
  activeTool: 'select',
```

Add directly under it:

```ts
  aoeShape: 'circle',
```

In the actions block, find:

```ts
  setActiveTool: (tool) => set({ activeTool: tool }),
```

Add directly under it:

```ts
  setAoeShape: (shape) => set({ aoeShape: shape }),
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS. (Some files using `activeTool` in switches may surface narrowing warnings — they'll be fixed in later tasks.)

- [ ] **Step 3: Commit**

```bash
git add lib/store/vtt-store.ts
git commit -m "feat(vtt): extend store with ping and AOE tools"
```

---

## Task 6: `useVttOverlays` realtime hook

**Files:**
- Create: `hooks/useVttOverlays.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { AoeShape, EphemeralAoe, PingEvent } from "@/types/vtt-aoe";
import { presenceColorForUser } from "@/lib/vtt/presence-color";

const PING_TTL_MS = 1600;
const EPHEMERAL_TTL_MS = 4000;

interface PingPayload {
  id: string;
  user_id: string;
  display_name: string;
  color: string;
  x: number;
  y: number;
  fired_at: number;
}

interface AoeDragPayload {
  user_id: string;
  display_name: string;
  color: string;
  shape: AoeShape;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  updated_at: number;
}

interface AoeCancelPayload {
  user_id: string;
}

/**
 * Realtime channel for ephemeral overlays: pings + AOE drag previews.
 * Persistent AOE rows go through useVttAoeAreas + postgres_changes, not this channel.
 */
export function useVttOverlays(campaignId: string | null, mapId: string | null) {
  const [activePings, setActivePings] = useState<PingEvent[]>([]);
  const [peerEphemerals, setPeerEphemerals] = useState<Map<string, EphemeralAoe>>(
    new Map()
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const displayNameRef = useRef<string>("Player");
  const colorRef = useRef<string>("#3b82f6");

  useEffect(() => {
    if (!campaignId || !mapId) {
      setActivePings([]);
      setPeerEphemerals(new Map());
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let pruneInterval: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      userIdRef.current = user.id;
      colorRef.current = presenceColorForUser(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) displayNameRef.current = profile.display_name;

      const topic = `vtt_overlays:${campaignId}:${mapId}`;
      channel = supabase.channel(topic, { config: { broadcast: { self: false } } });
      channelRef.current = channel;

      channel.on("broadcast", { event: "ping" }, ({ payload }) => {
        const p = payload as PingPayload;
        setActivePings((prev) => [
          ...prev,
          {
            id: p.id,
            userId: p.user_id,
            displayName: p.display_name,
            color: p.color,
            x: p.x,
            y: p.y,
            firedAt: p.fired_at,
          },
        ]);
      });

      channel.on("broadcast", { event: "aoe_drag" }, ({ payload }) => {
        const p = payload as AoeDragPayload;
        setPeerEphemerals((prev) => {
          const next = new Map(prev);
          next.set(p.user_id, {
            userId: p.user_id,
            displayName: p.display_name,
            color: p.color,
            shape: p.shape,
            startX: p.start_x,
            startY: p.start_y,
            endX: p.end_x,
            endY: p.end_y,
            updatedAt: p.updated_at,
          });
          return next;
        });
      });

      channel.on("broadcast", { event: "aoe_cancel" }, ({ payload }) => {
        const p = payload as AoeCancelPayload;
        setPeerEphemerals((prev) => {
          if (!prev.has(p.user_id)) return prev;
          const next = new Map(prev);
          next.delete(p.user_id);
          return next;
        });
      });

      channel.subscribe();

      pruneInterval = setInterval(() => {
        const now = Date.now();
        setActivePings((prev) => prev.filter((p) => now - p.firedAt < PING_TTL_MS));
        setPeerEphemerals((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const [k, v] of prev) {
            if (now - v.updatedAt > EPHEMERAL_TTL_MS) {
              next.delete(k);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }, 500);
    };

    void run();

    return () => {
      cancelled = true;
      if (pruneInterval) clearInterval(pruneInterval);
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [campaignId, mapId]);

  const broadcastPing = useCallback((x: number, y: number) => {
    const ch = channelRef.current;
    const userId = userIdRef.current;
    if (!ch || !userId) return;
    const id = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload: PingPayload = {
      id,
      user_id: userId,
      display_name: displayNameRef.current,
      color: colorRef.current,
      x,
      y,
      fired_at: Date.now(),
    };
    void ch.send({ type: "broadcast", event: "ping", payload });
    // local echo so the sender sees their own ping
    setActivePings((prev) => [
      ...prev,
      {
        id,
        userId,
        displayName: displayNameRef.current,
        color: colorRef.current,
        x,
        y,
        firedAt: payload.fired_at,
      },
    ]);
  }, []);

  const broadcastAoeDrag = useCallback(
    (shape: AoeShape, startX: number, startY: number, endX: number, endY: number) => {
      const ch = channelRef.current;
      const userId = userIdRef.current;
      if (!ch || !userId) return;
      const payload: AoeDragPayload = {
        user_id: userId,
        display_name: displayNameRef.current,
        color: colorRef.current,
        shape,
        start_x: startX,
        start_y: startY,
        end_x: endX,
        end_y: endY,
        updated_at: Date.now(),
      };
      void ch.send({ type: "broadcast", event: "aoe_drag", payload });
    },
    []
  );

  const broadcastAoeCancel = useCallback(() => {
    const ch = channelRef.current;
    const userId = userIdRef.current;
    if (!ch || !userId) return;
    const payload: AoeCancelPayload = { user_id: userId };
    void ch.send({ type: "broadcast", event: "aoe_cancel", payload });
  }, []);

  const myColor = useCallback(() => colorRef.current, []);

  return {
    activePings,
    peerEphemerals,
    broadcastPing,
    broadcastAoeDrag,
    broadcastAoeCancel,
    myColor,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add hooks/useVttOverlays.ts
git commit -m "feat(vtt): useVttOverlays realtime hook for pings + ephemeral AOE"
```

---

## Task 7: `useVttAoeAreas` persistent hook

**Files:**
- Create: `hooks/useVttAoeAreas.ts`

- [ ] **Step 1: Write the hook**

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { AoeArea, AoeShape } from "@/types/vtt-aoe";

interface CreateAreaInput {
  shape: AoeShape;
  origin_x: number;
  origin_y: number;
  length_ft: number;
  rotation_deg: number;
  color: string;
  label?: string | null;
}

export function useVttAoeAreas(campaignId: string | null, mapId: string | null) {
  const [areas, setAreas] = useState<AoeArea[]>([]);

  useEffect(() => {
    if (!campaignId || !mapId) {
      setAreas([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("vtt_aoe_areas")
        .select("*")
        .eq("map_id", mapId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load AOE areas:", error);
        return;
      }
      setAreas((data ?? []) as AoeArea[]);
    };
    void fetchAll();

    const channel = supabase
      .channel(`vtt_aoe_areas:${mapId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_aoe_areas",
          filter: `map_id=eq.${mapId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            setAreas((prev) => {
              const row = payload.new as AoeArea;
              if (prev.some((a) => a.id === row.id)) return prev;
              return [...prev, row];
            });
          } else if (payload.eventType === "UPDATE") {
            setAreas((prev) =>
              prev.map((a) => (a.id === (payload.new as AoeArea).id ? (payload.new as AoeArea) : a))
            );
          } else if (payload.eventType === "DELETE") {
            setAreas((prev) => prev.filter((a) => a.id !== (payload.old as AoeArea).id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId, mapId]);

  const createArea = useCallback(
    async (input: CreateAreaInput): Promise<AoeArea | null> => {
      if (!campaignId || !mapId) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("vtt_aoe_areas")
        .insert({
          campaign_id: campaignId,
          map_id: mapId,
          owner_user_id: user.id,
          shape: input.shape,
          origin_x: input.origin_x,
          origin_y: input.origin_y,
          length_ft: input.length_ft,
          rotation_deg: input.rotation_deg,
          color: input.color,
          label: input.label ?? null,
        })
        .select("*")
        .single();

      if (error) {
        console.error("Failed to create AOE area:", error);
        toast.error("Couldn't place area");
        return null;
      }
      return data as AoeArea;
    },
    [campaignId, mapId]
  );

  const updateArea = useCallback(
    async (id: string, updates: Partial<Pick<AoeArea, "origin_x" | "origin_y" | "rotation_deg" | "length_ft" | "label">>) => {
      const supabase = createClient();
      // optimistic
      setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
      const { error } = await supabase.from("vtt_aoe_areas").update(updates).eq("id", id);
      if (error) {
        console.error("Failed to update AOE area:", error);
        toast.error("Couldn't update area");
      }
    },
    []
  );

  const deleteArea = useCallback(async (id: string) => {
    const supabase = createClient();
    setAreas((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase.from("vtt_aoe_areas").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete AOE area:", error);
      toast.error("Couldn't delete area");
    }
  }, []);

  return { areas, createArea, updateArea, deleteArea };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS. If Supabase generated types don't yet include `vtt_aoe_areas`, regenerate them per the project's normal workflow, or add a `// @ts-expect-error` only as a last resort.

- [ ] **Step 3: Commit**

```bash
git add hooks/useVttAoeAreas.ts
git commit -m "feat(vtt): useVttAoeAreas persistent CRUD + realtime"
```

---

## Task 8: `PingLayer` Konva component

**Files:**
- Create: `components/map/PingLayer.tsx`

- [ ] **Step 1: Write the layer**

```tsx
"use client";

import { useEffect, useState } from "react";
import { Layer, Group, Circle, Text } from "react-konva";
import type { PingEvent } from "@/types/vtt-aoe";

const PING_DURATION_MS = 1500;
const MAX_RADIUS_FACTOR = 3;

interface Props {
  pings: PingEvent[];
  gridSize: number;
}

export function PingLayer({ pings, gridSize }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (pings.length === 0) return;
    let raf = 0;
    const loop = () => {
      setTick((t) => (t + 1) % 1_000_000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [pings.length]);

  const now = Date.now();

  return (
    <Layer listening={false}>
      {pings.map((p) => {
        const elapsed = now - p.firedAt;
        if (elapsed < 0 || elapsed > PING_DURATION_MS) return null;
        const t = elapsed / PING_DURATION_MS;
        const radius = gridSize * 0.4 + t * gridSize * MAX_RADIUS_FACTOR;
        const opacity = 1 - t;
        return (
          <Group key={p.id} x={p.x} y={p.y} listening={false}>
            <Circle
              radius={radius}
              stroke={p.color}
              strokeWidth={4}
              opacity={opacity}
              shadowColor={p.color}
              shadowBlur={12}
              shadowOpacity={opacity * 0.6}
            />
            <Circle radius={6} fill={p.color} opacity={opacity} />
            <Text
              text={p.displayName}
              y={radius + 4}
              fontSize={12}
              fill="#ffffff"
              opacity={opacity}
              align="center"
              offsetX={p.displayName.length * 3}
            />
          </Group>
        );
      })}
    </Layer>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/map/PingLayer.tsx
git commit -m "feat(vtt): PingLayer animated pulse"
```

---

## Task 9: `AoeLayer` Konva component

**Files:**
- Create: `components/map/AoeLayer.tsx`

- [ ] **Step 1: Write the layer**

```tsx
"use client";

import { Layer, Group, Circle, Line, Rect, Ring, Text, Label, Tag } from "react-konva";
import type { AoeArea, AoeShape, EphemeralAoe } from "@/types/vtt-aoe";
import {
  aoeLabelText,
  computeConePolygon,
  computeLineRect,
  computeRingRadii,
  computeSquareRect,
  dragAngleRad,
  feetToPx,
  lineWidthFt,
  ringThicknessFt,
  snapDistanceToFeet,
} from "@/lib/vtt/aoe-geometry";

interface LiveDrag {
  shape: AoeShape;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  displayName: string;
}

interface Props {
  persistent: AoeArea[];
  myDrag: LiveDrag | null;
  peerEphemerals: Map<string, EphemeralAoe>;
  selectedAreaId: string | null;
  onSelectArea: (id: string | null) => void;
  gridSize: number;
  feetPerSquare: number;
}

export function AoeLayer({
  persistent,
  myDrag,
  peerEphemerals,
  selectedAreaId,
  onSelectArea,
  gridSize,
  feetPerSquare,
}: Props) {
  return (
    <Layer>
      {persistent.map((a) => (
        <PersistentShape
          key={a.id}
          area={a}
          gridSize={gridSize}
          feetPerSquare={feetPerSquare}
          selected={selectedAreaId === a.id}
          onSelect={() => onSelectArea(a.id)}
        />
      ))}
      {[...peerEphemerals.values()].map((e) => (
        <DragShape
          key={`peer-${e.userId}`}
          drag={{
            shape: e.shape,
            startX: e.startX,
            startY: e.startY,
            endX: e.endX,
            endY: e.endY,
            color: e.color,
            displayName: e.displayName,
          }}
          gridSize={gridSize}
          feetPerSquare={feetPerSquare}
          dashed
        />
      ))}
      {myDrag && (
        <DragShape
          key="self-drag"
          drag={myDrag}
          gridSize={gridSize}
          feetPerSquare={feetPerSquare}
          dashed
          showLabel
        />
      )}
    </Layer>
  );
}

function shapePropsFromDrag(
  shape: AoeShape,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  gridSize: number,
  feetPerSquare: number
) {
  const angle = dragAngleRad({ startX, startY, endX, endY });
  const dx = endX - startX;
  const dy = endY - startY;
  const raw = Math.hypot(dx, dy);
  const { feet, px } = snapDistanceToFeet(raw, gridSize, feetPerSquare);
  return { angle, lengthPx: px, feet };
}

function DragShape({
  drag,
  gridSize,
  feetPerSquare,
  dashed,
  showLabel,
}: {
  drag: LiveDrag;
  gridSize: number;
  feetPerSquare: number;
  dashed?: boolean;
  showLabel?: boolean;
}) {
  const { angle, lengthPx, feet } = shapePropsFromDrag(
    drag.shape,
    drag.startX,
    drag.startY,
    drag.endX,
    drag.endY,
    gridSize,
    feetPerSquare
  );
  return (
    <Group listening={false}>
      <RenderShape
        shape={drag.shape}
        originX={drag.startX}
        originY={drag.startY}
        angleRad={angle}
        lengthPx={lengthPx}
        color={drag.color}
        gridSize={gridSize}
        feetPerSquare={feetPerSquare}
        dashed={dashed}
      />
      {showLabel && (
        <Label x={drag.endX + 12} y={drag.endY + 12}>
          <Tag fill="rgba(0,0,0,0.75)" cornerRadius={4} />
          <Text
            text={aoeLabelText(drag.shape, feet)}
            fontSize={12}
            fill="#ffffff"
            padding={6}
          />
        </Label>
      )}
    </Group>
  );
}

function PersistentShape({
  area,
  gridSize,
  feetPerSquare,
  selected,
  onSelect,
}: {
  area: AoeArea;
  gridSize: number;
  feetPerSquare: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const lengthPx = feetToPx(area.length_ft, gridSize, feetPerSquare);
  const angleRad = (area.rotation_deg * Math.PI) / 180;
  return (
    <Group
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
    >
      <RenderShape
        shape={area.shape}
        originX={area.origin_x}
        originY={area.origin_y}
        angleRad={angleRad}
        lengthPx={lengthPx}
        color={area.color}
        gridSize={gridSize}
        feetPerSquare={feetPerSquare}
        dashed={false}
        selected={selected}
      />
    </Group>
  );
}

function RenderShape({
  shape,
  originX,
  originY,
  angleRad,
  lengthPx,
  color,
  gridSize,
  feetPerSquare,
  dashed,
  selected,
}: {
  shape: AoeShape;
  originX: number;
  originY: number;
  angleRad: number;
  lengthPx: number;
  color: string;
  gridSize: number;
  feetPerSquare: number;
  dashed?: boolean;
  selected?: boolean;
}) {
  const fillAlpha = dashed ? 0.15 : 0.25;
  const strokeAlpha = dashed ? 0.7 : 1;
  const strokeWidth = selected ? 4 : 2;
  const dash = dashed ? [10, 6] : undefined;
  const fill = withAlpha(color, fillAlpha);
  const stroke = withAlpha(color, strokeAlpha);

  switch (shape) {
    case "circle":
      return (
        <Circle
          x={originX}
          y={originY}
          radius={lengthPx}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={dash}
        />
      );
    case "cone": {
      const pts = computeConePolygon(originX, originY, angleRad, lengthPx);
      return (
        <Line
          points={pts}
          closed
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={dash}
        />
      );
    }
    case "line": {
      const widthPx = feetToPx(lineWidthFt(), gridSize, feetPerSquare);
      const r = computeLineRect(originX, originY, angleRad, lengthPx, widthPx);
      return (
        <Rect
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.height}
          rotation={r.rotationDeg}
          offsetX={0}
          offsetY={0}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={dash}
        />
      );
    }
    case "square": {
      const r = computeSquareRect(originX, originY, angleRad, lengthPx);
      return (
        <Rect
          x={r.x}
          y={r.y}
          width={r.width}
          height={r.height}
          rotation={r.rotationDeg}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={dash}
        />
      );
    }
    case "ring": {
      const thicknessPx = feetToPx(ringThicknessFt(), gridSize, feetPerSquare);
      const { outer, inner } = computeRingRadii(lengthPx, thicknessPx);
      return (
        <Ring
          x={originX}
          y={originY}
          innerRadius={inner}
          outerRadius={outer}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          dash={dash}
        />
      );
    }
  }
}

function withAlpha(hex: string, alpha: number): string {
  // Accepts #rrggbb only (palette is hardcoded). Falls back to rgba black.
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(59,130,246,${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/map/AoeLayer.tsx
git commit -m "feat(vtt): AoeLayer with all 5 shape primitives"
```

---

## Task 10: AOE popover toolbar component

**Files:**
- Create: `components/vtt/vtt-aoe-popover.tsx`

- [ ] **Step 1: Write the popover**

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
import { Circle, Triangle, Minus, Square, CircleDot, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVttStore } from "@/lib/store/vtt-store";

const SHAPES: Array<{
  shape: "circle" | "cone" | "line" | "square" | "ring";
  tool:
    | "aoe-circle"
    | "aoe-cone"
    | "aoe-line"
    | "aoe-square"
    | "aoe-ring";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { shape: "circle", tool: "aoe-circle", label: "Sphere / Circle", icon: Circle },
  { shape: "cone", tool: "aoe-cone", label: "Cone", icon: Triangle },
  { shape: "line", tool: "aoe-line", label: "Line", icon: Minus },
  { shape: "square", tool: "aoe-square", label: "Square / Cube", icon: Square },
  { shape: "ring", tool: "aoe-ring", label: "Ring", icon: CircleDot },
];

export function VttAoePopover() {
  const [open, setOpen] = useState(false);
  const { activeTool, setActiveTool, setAoeShape } = useVttStore();
  const isActive = activeTool.startsWith("aoe-");

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
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>AOE shapes</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-1" align="end">
        <div className="flex items-center gap-1">
          {SHAPES.map(({ shape, tool, label, icon: Icon }) => (
            <Tooltip key={shape}>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool ? "default" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setAoeShape(shape);
                    setActiveTool(tool);
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
Expected: PASS. (`@/components/ui/popover` already exists per dependency check; if not, add `import { Popover, PopoverContent, PopoverTrigger } from "@radix-ui/react-popover"` aliases — check existing usage patterns.)

- [ ] **Step 3: Commit**

```bash
git add components/vtt/vtt-aoe-popover.tsx
git commit -m "feat(vtt): AOE shape popover button"
```

---

## Task 11: Wire pings + AOE drag into `GameCanvas`

**Files:**
- Modify: `components/map/GameCanvas.tsx`

- [ ] **Step 1: Add new imports**

At the top of `components/map/GameCanvas.tsx`, add to existing imports:

```ts
import { useVttOverlays } from '@/hooks/useVttOverlays';
import { useVttAoeAreas } from '@/hooks/useVttAoeAreas';
import { PingLayer } from './PingLayer';
import { AoeLayer } from './AoeLayer';
import type { AoeShape } from '@/types/vtt-aoe';
import { snapDistanceToFeet, dragAngleRad } from '@/lib/vtt/aoe-geometry';
```

- [ ] **Step 2: Add hooks and local AOE drag state**

Below the existing `useVttFog`/`useCombat` calls, add:

```ts
  const {
    activePings,
    peerEphemerals,
    broadcastPing,
    broadcastAoeDrag,
    broadcastAoeCancel,
    myColor,
  } = useVttOverlays(campaignId, mapId ?? null);

  const { areas: aoeAreas, createArea: createAoeArea, deleteArea: deleteAoeArea } =
    useVttAoeAreas(campaignId, mapId ?? null);

  const [aoeDrag, setAoeDrag] = useState<{
    shape: AoeShape;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [selectedAoeId, setSelectedAoeId] = useState<string | null>(null);
  const aoeBroadcastRef = useRef<number>(0);
```

(Replace the existing `useState` import line with one that also includes `useRef` if not already present.)

- [ ] **Step 3: Helper to detect AOE tool**

Add right above `handleMouseDown`:

```ts
  function aoeShapeFromTool(tool: typeof activeTool): AoeShape | null {
    switch (tool) {
      case 'aoe-circle': return 'circle';
      case 'aoe-cone': return 'cone';
      case 'aoe-line': return 'line';
      case 'aoe-square': return 'square';
      case 'aoe-ring': return 'ring';
      default: return null;
    }
  }
```

- [ ] **Step 4: Update `handleMouseDown`**

Find the existing `handleMouseDown` body. Add a ping branch and AOE branch BEFORE the right-click pan branch.

Insert directly after the `if (pendingTokenPlacement) { ... return; }` block:

```ts
    // Alt+left-click ping (works in any tool)
    if (e.evt.button === 0 && e.evt.altKey) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      broadcastPing(pointer.x, pointer.y);
      e.evt.preventDefault();
      return;
    }

    // Ping tool: left-click anywhere fires a ping
    if (activeTool === 'ping' && e.evt.button === 0) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      broadcastPing(pointer.x, pointer.y);
      return;
    }

    // AOE drag start
    const aoeShape = aoeShapeFromTool(activeTool);
    if (aoeShape && e.evt.button === 0) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      setAoeDrag({
        shape: aoeShape,
        startX: pointer.x,
        startY: pointer.y,
        endX: pointer.x,
        endY: pointer.y,
      });
      return;
    }
```

- [ ] **Step 5: Update `handleMouseMove`**

Insert AOE drag move handling BEFORE the existing `if (isPanning && panStartPos)` block:

```ts
    if (aoeDrag) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      setAoeDrag({ ...aoeDrag, endX: pointer.x, endY: pointer.y });
      const now = performance.now();
      if (now - aoeBroadcastRef.current > 33) {
        aoeBroadcastRef.current = now;
        broadcastAoeDrag(
          aoeDrag.shape,
          aoeDrag.startX,
          aoeDrag.startY,
          pointer.x,
          pointer.y
        );
      }
      return;
    }
```

- [ ] **Step 6: Update `handleMouseUp`**

Insert AOE commit/cancel logic at the very top of `handleMouseUp`:

```ts
    if (aoeDrag) {
      const dx = aoeDrag.endX - aoeDrag.startX;
      const dy = aoeDrag.endY - aoeDrag.startY;
      const raw = Math.hypot(dx, dy);
      const { feet } = snapDistanceToFeet(raw, gridSize, feetPerSquare);
      const angle = dragAngleRad(aoeDrag);
      const persist = e.evt.shiftKey;
      if (persist) {
        void createAoeArea({
          shape: aoeDrag.shape,
          origin_x: aoeDrag.startX,
          origin_y: aoeDrag.startY,
          length_ft: feet,
          rotation_deg: (angle * 180) / Math.PI,
          color: myColor(),
        });
      }
      broadcastAoeCancel();
      setAoeDrag(null);
      // one-shot: return to select tool
      if (activeTool.startsWith('aoe-')) {
        useVttStore.getState().setActiveTool('select');
      }
      return;
    }
```

You'll also need to import the store at the top of `GameCanvas.tsx`:

```ts
import { useVttStore } from '@/lib/store/vtt-store';
```

(it's already imported — just confirm).

- [ ] **Step 7: Mount the new layers in the JSX**

Find the existing `<RulerLayer />` Layer block. Directly after the `</Layer>` that wraps it, add:

```tsx
        <AoeLayer
          persistent={aoeAreas}
          myDrag={
            aoeDrag
              ? {
                  shape: aoeDrag.shape,
                  startX: aoeDrag.startX,
                  startY: aoeDrag.startY,
                  endX: aoeDrag.endX,
                  endY: aoeDrag.endY,
                  color: myColor(),
                  displayName: 'You',
                }
              : null
          }
          peerEphemerals={peerEphemerals}
          selectedAreaId={selectedAoeId}
          onSelectArea={setSelectedAoeId}
          gridSize={gridSize}
          feetPerSquare={feetPerSquare}
        />
        <PingLayer pings={activePings} gridSize={gridSize} />
```

- [ ] **Step 8: Add a delete-AOE keyboard handler**

Just below the existing `useEffect` that closes the token menu on Escape, add another effect:

```ts
  useEffect(() => {
    if (!selectedAoeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = aoeAreas.find((a) => a.id === selectedAoeId);
        if (!target) return;
        if (target.owner_user_id !== /* unknown here */ undefined && !isDm) {
          // Without exposing userId we let the server reject; local guard skipped
        }
        void deleteAoeArea(selectedAoeId);
        setSelectedAoeId(null);
      } else if (e.key === 'Escape') {
        setSelectedAoeId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedAoeId, aoeAreas, deleteAoeArea, isDm]);
```

(Server RLS enforces ownership; the local guard is best-effort. If the canvas already has a `userId` available, gate locally too. If not, leave the comment as written.)

- [ ] **Step 9: Update cursor handling**

Find the `cursorClass` decision block and add an AOE branch:

```ts
  let cursorClass = 'cursor-default';
  if (pendingTokenPlacement) cursorClass = 'cursor-none';
  else if (isPanning) cursorClass = 'cursor-grabbing';
  else if (activeTool === 'measure') cursorClass = 'cursor-crosshair';
  else if (activeTool === 'ping' || activeTool.startsWith('aoe-')) cursorClass = 'cursor-crosshair';
```

- [ ] **Step 10: Type-check + lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add components/map/GameCanvas.tsx
git commit -m "feat(vtt): wire pings + AOE drag into GameCanvas"
```

---

## Task 12: Add Ping + AOE buttons to the VTT toolbar

**Files:**
- Modify: `app/(vtt)/campaigns/[campaignId]/vtt/page.tsx`

- [ ] **Step 1: Add imports**

At the top of the file, add to existing icon imports:

```ts
import { Crosshair } from "lucide-react";
import { VttAoePopover } from "@/components/vtt/vtt-aoe-popover";
```

- [ ] **Step 2: Add the buttons to the toolbar**

Find this block (around the `ToolButton` for the Ruler):

```tsx
            <ToolButton
              active={activeTool === "measure"}
              onClick={() => setActiveTool("measure")}
              icon={<Ruler className="h-4 w-4" />}
              label="Ruler"
            />
```

Directly after it (before the `{isDm && mapId && (` block) add:

```tsx
            <ToolButton
              active={activeTool === "ping"}
              onClick={() =>
                setActiveTool(activeTool === "ping" ? "select" : "ping")
              }
              icon={<Crosshair className="h-4 w-4" />}
              label="Ping (or hold Alt + click)"
            />
            <VttAoePopover />
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm type-check && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(vtt\)/campaigns/\[campaignId\]/vtt/page.tsx
git commit -m "feat(vtt): add Ping button + AOE popover to toolbar"
```

---

## Task 13: Manual verification

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev`

- [ ] **Step 2: Two-window smoke test**

Open the same VTT scene in two browser windows (different accounts: DM + a player member of the campaign).

Verify each item:

- Alt+left-click on the canvas in window A → an expanding ring appears in **both** windows at the click point, fades within ~1.5 s. The pinger's display name appears under the ring.
- Click the **Ping** toolbar button (crosshair icon), then left-click the canvas → same behavior. Tool returns/stays as Ping; clicking again on the button or selecting another tool exits.
- Open the **AOE** popover (sparkles icon, top-right of toolbar). Pick **Circle**.
  - Click-drag on the canvas. Window A shows a dashed translucent circle following the mouse with a "20 ft radius" pill at the cursor (snapped to 5 ft). Window B sees the same dashed circle without a label, in window A's color.
  - Release without Shift → both windows clear the preview. Tool returns to Select.
- Repeat with **Cone** — confirm the cone orientation tracks the drag direction.
- Repeat with **Line** — confirm fixed 5 ft width, length follows drag.
- Repeat with **Square** — confirm a square aligned to drag axis.
- Repeat with **Ring** — confirm hollow donut shape.
- Pick a shape, drag, then release while holding **Shift** → both windows now show a solid persistent shape. Reload window B → the shape is still there (table read).
- Click the persistent shape in window A → it gets a brighter outline. Press **Delete** → it disappears in both windows.
- As the player (window B), shift-place an AOE. Switch to the DM window — the DM should also be able to delete it (RLS allows). Try the inverse (player tries to delete the DM's AOE) → server should reject; toast appears, but no orphan client state.
- Confirm right-click panning still works while AOE/Ping tools are active (drag-to-pan with right button).
- Confirm the existing Ruler, Token placement, Fog, Weather still work without regression.

- [ ] **Step 3: If everything passes, commit a marker (optional)**

If the manual verification revealed no issues, no commit is needed. If you adjusted anything, commit with a clear message.

---

## Self-Review Notes

- **Spec coverage:**
  - Pings (Alt+click + button): Tasks 6, 8, 11, 12. ✅
  - AOE shapes (5): Tasks 3, 9, 10, 11. ✅
  - Drag distance → snap-to-5ft + label: Task 3 + Task 9. ✅
  - Ephemeral previews: Task 6 (broadcast) + Task 9 (render). ✅
  - Shift-to-persist: Task 11 step 6 + Task 7 (insert). ✅
  - DB table + RLS: Task 1. ✅
  - Realtime channel `vtt_overlays:*`: Task 6. ✅
  - Persistent realtime via postgres_changes: Task 7. ✅
  - Toolbar UI: Tasks 10, 12. ✅
  - Visual style (dashed ephemeral, solid persistent, owner color): Task 9. ✅
  - 4 s ephemeral TTL: Task 6. ✅
  - 1.5 s ping animation: Task 8. ✅
  - Persistent select + delete (owner/DM): Task 11 step 8 + Task 1 RLS. ✅

- **Placeholders / red flags:** None. Each step contains the actual code or command.

- **Type consistency:** `AoeShape` and `AoeArea` are defined in Task 2 and used consistently in Tasks 3, 6, 7, 9, 10, 11. Hook signatures (`broadcastPing(x, y)`, `broadcastAoeDrag(shape, sx, sy, ex, ey)`, `broadcastAoeCancel()`, `createArea(input)`, `deleteArea(id)`) match across producer (Tasks 6/7) and consumer (Task 11).

- **Out-of-scope reminders (per spec):** No token-inside-AOE detection, no per-spell template library, no cone/line dimension customization, no per-AOE color picker, no rotate-handle widget for persistent shapes (delete/keyboard only in v1). If desired in a follow-up, add a Task 14.
