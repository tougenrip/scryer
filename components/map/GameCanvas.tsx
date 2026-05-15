'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Group, Circle, Image as KonvaImage, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Vector2d } from 'konva/lib/types';
import { useVttStore } from '@/lib/store/vtt-store';
import { MapLayer } from './MapLayer';
import { GridLayer } from './GridLayer';
import { TokenLayer } from './TokenLayer';
import { FogLayer } from './FogLayer';
import { WeatherOverlay } from './WeatherOverlay';
import { TimeOfDayTint } from './TimeOfDayTint';
import { ShortRestOverlay } from './ShortRestOverlay';
import { RulerLayer } from './RulerLayer';
import { useVttTokens } from '@/hooks/useVttTokens';
import { useVttFog } from '@/hooks/useVttFog';
import { useVttOverlays } from '@/hooks/useVttOverlays';
import { useVttAoeAreas } from '@/hooks/useVttAoeAreas';
import { useVttDrawings } from '@/hooks/useVttDrawings';
import { useCombat } from '@/hooks/useCombat';
import { useVttWalls } from '@/hooks/useVttWalls';
import { useVttLightSources } from '@/hooks/useVttLightSources';
import { LightLayer } from './LightLayer';
import { LightMarkersLayer } from './LightMarkersLayer';
import { LightEditorPopover } from './LightEditorPopover';
import { useVttPlayerVisibility } from '@/hooks/useVttPlayerVisibility';
import { WallLayer, wallEditorSnap } from './WallLayer';
import { LosMaskLayer } from './LosMaskLayer';
import type { Token as VttToken } from '@/types/vtt';
import type { AoeArea, AoeShape, Drawing, DrawingPoint } from '@/types/vtt-aoe';
import type { Point } from '@/types/vtt-walls';
import {
  snapDistanceToFeet,
  dragAngleRad,
  effectiveOriginForShape,
  feetToPx,
  lineWidthFt,
  ringThicknessFt,
  pointInAoe,
  pointNearPolyline,
} from '@/lib/vtt/aoe-geometry';
import {
  computeVisibilityPolygon,
  sightBlockingSegments,
  polygonToFlatPoints,
  pointInPolygon,
  movementBlockingSegments,
} from '@/lib/vtt/visibility';
import polygonClipping from 'polygon-clipping';
import { PingLayer } from './PingLayer';
import { AoeLayer } from './AoeLayer';
import { DrawingLayer } from './DrawingLayer';
import { VttTokenDamageHud } from '@/components/vtt/vtt-token-damage-hud';
import { toast } from 'sonner';
import { cleanVttDisplayName } from '@/lib/vtt/display-name';
import { createClient } from '@/lib/supabase/client';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rulerStart, setRulerStart] = useState<Vector2d | null>(null);
  const [rulerEnd, setRulerEnd] = useState<Vector2d | null>(null);
  const [placementPointer, setPlacementPointer] = useState<Vector2d | null>(null);
  const [tokenMenu, setTokenMenu] = useState<{ tokenId: string; x: number; y: number } | null>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  // Pan-start anchor lives in a ref — pan deltas update it on every
  // mousemove. Putting it in React state means every native mousemove
  // event triggers a GameCanvas re-render (60-200Hz on trackpads),
  // which then re-runs the expensive visibility / light polygon
  // computations below. A ref keeps the math out of the render loop.
  // The Konva stage's x/y are mutated imperatively during pan; we
  // commit back to the store once on mouseup.
  const panStartPosRef = useRef<Vector2d | null>(null);

  // Individual selectors — `useVttStore()` with no selector subscribes
  // to the entire store, so an unrelated mutation (hover token,
  // weather intensity, selection, etc.) re-renders GameCanvas every
  // time. With per-field selectors only writes to that exact field
  // trigger a re-render.
  const stageScale = useVttStore((s) => s.stageScale);
  const stagePos = useVttStore((s) => s.stagePos);
  const setStageScale = useVttStore((s) => s.setStageScale);
  const setStagePos = useVttStore((s) => s.setStagePos);
  const mapUrl = useVttStore((s) => s.mapUrl);
  const mapId = useVttStore((s) => s.mapId);
  const mapDimensions = useVttStore((s) => s.mapDimensions);
  const activeTool = useVttStore((s) => s.activeTool);
  const gridSize = useVttStore((s) => s.gridSize);
  const showGrid = useVttStore((s) => s.showGrid);
  const feetPerSquare = useVttStore((s) => s.feetPerSquare);
  const tokens = useVttStore((s) => s.tokens);
  const selectedTokenId = useVttStore((s) => s.selectedTokenId);
  const selectedTokenIds = useVttStore((s) => s.selectedTokenIds);
  const setSelectedTokenId = useVttStore((s) => s.setSelectedTokenId);
  const setSelectedTokenIds = useVttStore((s) => s.setSelectedTokenIds);
  const addToken = useVttStore((s) => s.addToken);
  const pendingTokenPlacement = useVttStore((s) => s.pendingTokenPlacement);
  const setPendingTokenPlacement = useVttStore((s) => s.setPendingTokenPlacement);
  // Stable `{ x, y }` for the Stage's scale prop so react-konva
  // doesn't see a fresh object each render and re-apply the same
  // value to the Konva node.
  const scaleVec = useMemo(
    () => ({ x: stageScale, y: stageScale }),
    [stageScale]
  );

  const { updateTokenPosition, deleteToken } = useVttTokens(mapId ?? null, campaignId);
  const { updateFogShapes } = useVttFog(mapId ?? null);
  const { activeEncounter, participants, addParticipant } = useCombat(
    campaignId,
    mapId ?? undefined,
    isDm && !!mapId
  );

  const {
    activePings,
    peerEphemerals,
    peerDrawings,
    broadcastPing,
    broadcastAoeDrag,
    broadcastAoeCancel,
    broadcastDrawingStroke,
    broadcastDrawingCancel,
    myColor,
    myUserId,
  } = useVttOverlays(campaignId, mapId ?? null);

  const {
    areas: aoeAreas,
    createArea: createAoeArea,
    updateArea: updateAoeArea,
    deleteArea: deleteAoeArea,
    clearAreas: clearAoeAreas,
  } = useVttAoeAreas(campaignId, mapId ?? null);

  const {
    drawings,
    createDrawing,
    deleteDrawing,
    clearDrawings,
  } = useVttDrawings(campaignId, mapId ?? null);

  const { lights, createLight, updateLight, deleteLight } = useVttLightSources(
    campaignId,
    mapId ?? null
  );
  const { walls, createWall, deleteWall, toggleDoor } = useVttWalls(
    campaignId,
    mapId ?? null
  );

  const { memoryPolys, accumulate: accumulateVisibility } =
    useVttPlayerVisibility(campaignId, mapId ?? null, visionEnabled && !isDm);

  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [wallEditorPoints, setWallEditorPoints] = useState<Point[]>([]);
  const [wallEditorHover, setWallEditorHover] = useState<Point | null>(null);

  const wallEditorMode = useVttStore((s) =>
    s.activeTool === 'wall' ? s.wallEditorMode : null
  );

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const dmPrivateMode = useVttStore((s) => s.dmPrivateMode);
  const previewAsUserId = useVttStore((s) => s.previewAsUserId);

  // The DM "previewing as a player" temporarily applies that player's LOS.
  // Effective for visibility math: pretend the DM is that user.
  const previewMode = isDm && !!previewAsUserId;
  const effectiveUserId = previewMode ? previewAsUserId : currentUserId;
  // For visibility gating, treat the DM as a player while in preview.
  const isDmForVision = isDm && !previewMode;

  // Owned tokens for whoever's POV we're rendering. DM (no preview) bypasses.
  // Memoized so pan ticks (which only change stagePos) don't rebuild the
  // filter result and invalidate the visibility-polygon memo below.
  const ownedTokens = useMemo(
    () =>
      !visionEnabled || isDmForVision
        ? []
        : tokens.filter((t) => {
            const characterUserId = (
              t as unknown as { character?: { user_id?: string | null } }
            ).character?.user_id;
            return (
              !!characterUserId &&
              !!effectiveUserId &&
              characterUserId === effectiveUserId
            );
          }),
    [visionEnabled, isDmForVision, tokens, effectiveUserId]
  );

  // Memoized so pan/zoom ticks (which only mutate stagePos/stageScale)
  // don't re-run the ray-sweep over every wall segment.
  const sightSegs = useMemo(() => sightBlockingSegments(walls), [walls]);

  // Light coverage circles in stage coords. Every token with a
  // positive light_radius_ft contributes a circle, AND every standalone
  // light source on this map. Used only when sceneDark — a torch on
  // the floor lets nearby players see, even if their own token has no
  // light. Wall-blocking is handled implicitly: each viewer's LOS
  // polygon is wall-aware, and we intersect with the light union, so
  // a torch behind a wall illuminates only the parts the player can
  // actually see line-of-sight from their own position.
  const lightCircles = useMemo<
    Array<{ cx: number; cy: number; r: number }>
  >(
    () =>
      sceneDark
        ? [
            ...tokens
              .filter((t) => (t.light_radius_ft ?? 0) > 0)
              .map((t) => ({
                cx: t.x + gridSize / 2,
                cy: t.y + gridSize / 2,
                r: ((t.light_radius_ft ?? 0) / feetPerSquare) * gridSize,
              })),
            ...lights.map((l) => ({
              cx: l.x,
              cy: l.y,
              r: (l.radius_ft / feetPerSquare) * gridSize,
            })),
          ]
        : [],
    [sceneDark, tokens, lights, gridSize, feetPerSquare]
  );

  function clipPolygonToLights(
    poly: Point[],
    ownVisionCircle?: { cx: number; cy: number; r: number } | null
  ): Point[][] {
    if (!sceneDark) return [poly];
    const allCircles = [...lightCircles];
    if (ownVisionCircle && ownVisionCircle.r > 0) allCircles.push(ownVisionCircle);
    if (allCircles.length === 0) return [];
    if (poly.length < 3) return [];
    const polyRing: number[][] = poly.map((p) => [p.x, p.y]);
    polyRing.push(polyRing[0]);
    const circlePolys = allCircles.map(({ cx, cy, r }) => {
      const ring: number[][] = [];
      const N = 32;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      ring.push(ring[0]);
      return [ring];
    });
    // Union of all light circles plus this token's vision circle
    const lightUnion = polygonClipping.union(...(circlePolys as never));
    if (!lightUnion || lightUnion.length === 0) return [];
    const intersection = polygonClipping.intersection([polyRing] as never, lightUnion as never);
    return (intersection as number[][][][])
      .map((mp) => (mp[0] ?? []).map(([x, y]) => ({ x, y })));
  }

  // Heavy ray-sweep + polygon-clipping union/intersection per owned
  // token. Memoized aggressively — only re-runs when something that
  // *actually* changes the result changes (token positions / vision
  // ranges, walls, light coverage, scene-dark toggle). Pan/zoom does
  // not touch any of those, so this stays warm during navigation.
  const visiblePolygons = useMemo<number[][]>(() => {
    return ownedTokens.flatMap((t) => {
      const center: Point = { x: t.x + gridSize / 2, y: t.y + gridSize / 2 };
      const losPoly = computeVisibilityPolygon(center, sightSegs);
      const visionFt = t.vision_range_ft ?? 0;
      const ownVisionCircle =
        visionFt > 0
          ? {
              cx: center.x,
              cy: center.y,
              r: (visionFt / feetPerSquare) * gridSize,
            }
          : null;
      const clipped = clipPolygonToLights(losPoly, ownVisionCircle);
      return clipped.map((c) => polygonToFlatPoints(c));
    });
    // clipPolygonToLights is a closure over sceneDark + lightCircles;
    // we list those in the deps so the inline fn reference change
    // doesn't sabotage the memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedTokens, sightSegs, lightCircles, sceneDark, gridSize, feetPerSquare]);

  // Accumulate memory whenever any owned token's position changes.
  // The DM never accumulates — even in preview mode, we don't want to write
  // to a player's memory row from the DM's session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!visionEnabled || isDm) return;
    for (const t of ownedTokens) {
      const center: Point = { x: t.x + gridSize / 2, y: t.y + gridSize / 2 };
      const losPoly = computeVisibilityPolygon(center, sightSegs);
      const visionFt = t.vision_range_ft ?? 0;
      const ownVisionCircle =
        visionFt > 0
          ? { cx: center.x, cy: center.y, r: (visionFt / feetPerSquare) * gridSize }
          : null;
      const clipped = clipPolygonToLights(losPoly, ownVisionCircle);
      for (const c of clipped) accumulateVisibility(c);
    }
  }, [
    visionEnabled,
    isDm,
    sceneDark,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ownedTokens.map((t) => `${t.id}:${t.x}:${t.y}:${t.light_radius_ft ?? 0}:${t.vision_range_ft ?? 0}`).join('|'),
    accumulateVisibility,
    sightSegs.length,
    lightCircles.length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    lights.map((l) => `${l.id}:${l.x}:${l.y}:${l.radius_ft}`).join('|'),
  ]);

  // Visible token ids for player view: any token whose center falls inside ANY visible polygon.
  // DM (no preview) or vision off: null = render all.
  // Tokens that are inside any visible polygon. Memoized alongside
  // visiblePolygons — the inner `pointInPolygon` × tokens scan is
  // O(tokens × polygons × polyPoints), worth keeping out of the pan
  // path entirely.
  const visibleTokenIds = useMemo<Set<string> | null>(() => {
    if (isDmForVision || !visionEnabled) return null;
    const ids = new Set<string>();
    // Decode each flat polygon ONCE per memo, not once per token.
    const decoded = visiblePolygons.map((flat) => {
      const poly: Point[] = [];
      for (let i = 0; i < flat.length; i += 2) {
        poly.push({ x: flat[i], y: flat[i + 1] });
      }
      return poly;
    });
    for (const t of tokens) {
      const center: Point = { x: t.x + gridSize / 2, y: t.y + gridSize / 2 };
      for (const poly of decoded) {
        if (pointInPolygon(center, poly)) {
          ids.add(t.id);
          break;
        }
      }
    }
    for (const t of ownedTokens) ids.add(t.id);
    return ids;
  }, [
    isDmForVision,
    visionEnabled,
    tokens,
    ownedTokens,
    visiblePolygons,
    gridSize,
  ]);

  // Listen for "clear marks" events dispatched from the toolbar.
  useEffect(() => {
    const onClearMine = async () => {
      const uid = myUserId();
      if (!uid) return;
      await Promise.all([clearAoeAreas(uid), clearDrawings(uid)]);
    };
    const onClearAll = async () => {
      if (!isDm) return;
      await Promise.all([clearAoeAreas(), clearDrawings()]);
    };
    window.addEventListener('vtt:clear-mine', onClearMine);
    window.addEventListener('vtt:clear-all', onClearAll);
    return () => {
      window.removeEventListener('vtt:clear-mine', onClearMine);
      window.removeEventListener('vtt:clear-all', onClearAll);
    };
  }, [clearAoeAreas, clearDrawings, isDm, myUserId]);

  const DRAW_STROKE_WIDTH = 4;
  const DRAW_MIN_DISTANCE_PX = 3;
  const [drawStroke, setDrawStroke] = useState<DrawingPoint[] | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const drawBroadcastRef = useRef<number>(0);
  const [isErasing, setIsErasing] = useState(false);
  const [groupDrag, setGroupDrag] = useState<{
    leadId: string;
    dx: number;
    dy: number;
  } | null>(null);

  // Wrapped in useCallback so pan/zoom re-renders of GameCanvas don't
  // create new handler references and invalidate Token's memo for
  // every token on every mouse-move event. Deps only fire on actual
  // selection / token list changes.
  const handleTokenDragMove = useCallback(
    (id: string, x: number, y: number) => {
      if (selectedTokenIds.length > 1 && selectedTokenIds.includes(id)) {
        const dragged = tokens.find((t) => t.id === id);
        if (dragged) {
          setGroupDrag({ leadId: id, dx: x - dragged.x, dy: y - dragged.y });
        }
      }
    },
    [selectedTokenIds, tokens]
  );

  const handleTokenDragEnd = useCallback(() => {
    setGroupDrag(null);
  }, []);

  const handleTokenUpdate = useCallback(
    (id: string, updates: Partial<VttToken>) => {
      if (
        selectedTokenIds.length > 1 &&
        selectedTokenIds.includes(id) &&
        (updates.x !== undefined || updates.y !== undefined)
      ) {
        const dragged = tokens.find((t) => t.id === id);
        if (dragged) {
          const dx = (updates.x ?? dragged.x) - dragged.x;
          const dy = (updates.y ?? dragged.y) - dragged.y;
          if (dx !== 0 || dy !== 0) {
            for (const tid of selectedTokenIds) {
              const t = tokens.find((tt) => tt.id === tid);
              if (!t) continue;
              void updateTokenPosition(tid, { x: t.x + dx, y: t.y + dy });
            }
            return;
          }
        }
      }
      void updateTokenPosition(id, updates);
    },
    [selectedTokenIds, tokens, updateTokenPosition]
  );

  // ---- Undo stack (per-session) ----
  type UndoOp =
    | { kind: 'create-aoe'; id: string }
    | { kind: 'create-drawing'; id: string }
    | { kind: 'delete-aoe'; row: AoeArea }
    | { kind: 'delete-drawing'; row: Drawing };
  const undoStackRef = useRef<UndoOp[]>([]);
  const pushUndo = (op: UndoOp) => {
    undoStackRef.current.push(op);
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
  };

  const eraseAoeWithUndo = useCallback(
    (id: string) => {
      const row = aoeAreas.find((a) => a.id === id);
      if (row) pushUndo({ kind: 'delete-aoe', row });
      void deleteAoeArea(id);
    },
    [aoeAreas, deleteAoeArea]
  );

  const eraseDrawingWithUndo = useCallback(
    (id: string) => {
      const row = drawings.find((d) => d.id === id);
      if (row) pushUndo({ kind: 'delete-drawing', row });
      void deleteDrawing(id);
    },
    [drawings, deleteDrawing]
  );

  const handleUndo = useCallback(async () => {
    const op = undoStackRef.current.pop();
    if (!op) return;
    switch (op.kind) {
      case 'create-aoe':
        await deleteAoeArea(op.id);
        break;
      case 'create-drawing':
        await deleteDrawing(op.id);
        break;
      case 'delete-aoe':
        await createAoeArea({
          id: op.row.id,
          shape: op.row.shape,
          origin_x: op.row.origin_x,
          origin_y: op.row.origin_y,
          length_ft: op.row.length_ft,
          rotation_deg: op.row.rotation_deg,
          color: op.row.color,
          label: op.row.label,
          is_private: op.row.is_private,
        });
        break;
      case 'delete-drawing':
        await createDrawing({
          id: op.row.id,
          points: op.row.points,
          color: op.row.color,
          stroke_width: op.row.stroke_width,
          is_private: op.row.is_private,
        });
        break;
    }
  }, [createAoeArea, createDrawing, deleteAoeArea, deleteDrawing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (editable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        void handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleUndo]);

  // Close the token HUD whenever the user clicks anything that isn't the HUD
  // itself. Only runs while exactly one token is selected — multi-selection
  // hides the HUD entirely and is preserved across clicks so the user can
  // just click-and-drag any of the selected tokens to move the group.
  useEffect(() => {
    if (selectedTokenIds.length !== 1) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (e.shiftKey) return;
      const target = e.target as Element | null;
      if (!target) return;
      if (target.closest('[data-vtt-floating-panel]')) return;
      if (target.closest('[data-vtt-sidebar]')) return;
      // Radix popovers/dropdowns/dialogs render in a portal outside our DOM
      // tree; clicks in them shouldn't deselect the token.
      if (target.closest('[data-radix-popper-content-wrapper]')) return;
      if (target.closest('[data-slot="select-content"]')) return;
      if (target.closest('[data-radix-select-viewport]')) return;
      if (target.closest('[role="dialog"]')) return;
      if (target.closest('[role="alertdialog"]')) return;
      setSelectedTokenId(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [selectedTokenIds, setSelectedTokenId]);

  // Eraser tool only deletes drawings now. AOE shapes have their own × button
  // when selected; the eraser deliberately leaves them alone so it isn't easy
  // to nuke a Wall of Fire by mistake.
  const eraseAtPoint = (px: number, py: number) => {
    for (const d of drawings) {
      const threshold = Math.max(8, d.stroke_width / 2 + 6);
      if (pointNearPolyline(px, py, d.points, threshold)) {
        eraseDrawingWithUndo(d.id);
      }
    }
  };

  const [aoeDrag, setAoeDrag] = useState<{
    shape: AoeShape;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [selectedAoeId, setSelectedAoeId] = useState<string | null>(null);
  const [selectedLightId, setSelectedLightId] = useState<string | null>(null);
  const aoeBroadcastRef = useRef<number>(0);

  const aoeShapeFromTool = (tool: typeof activeTool): AoeShape | null => {
    switch (tool) {
      case 'aoe-circle': return 'circle';
      case 'aoe-cone': return 'cone';
      case 'aoe-line': return 'line';
      case 'aoe-square': return 'square';
      case 'aoe-ring': return 'ring';
      default: return null;
    }
  };
  const contextToken = tokenMenu ? tokens.find((token) => token.id === tokenMenu.tokenId) ?? null : null;
  const contextTokenInEncounter = tokenMenu
    ? participants.some((participant) => participant.token_id === tokenMenu.tokenId)
    : false;

  // Handle Resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const closeMenu = () => setTokenMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!selectedAoeId) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (editable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        eraseAoeWithUndo(selectedAoeId);
        setSelectedAoeId(null);
      } else if (e.key === 'Escape') {
        setSelectedAoeId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedAoeId, eraseAoeWithUndo]);

  useEffect(() => {
    if (!selectedDrawingId) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (editable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        eraseDrawingWithUndo(selectedDrawingId);
        setSelectedDrawingId(null);
      } else if (e.key === 'Escape') {
        setSelectedDrawingId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDrawingId, eraseDrawingWithUndo]);

  useEffect(() => {
    if (!selectedWallId) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const editable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (editable) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        void deleteWall(selectedWallId);
        setSelectedWallId(null);
      } else if (e.key === 'Escape') {
        setSelectedWallId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedWallId, deleteWall]);

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

  // Pending zoom write — coalesces a burst of wheel events into one
  // store mutation per animation frame, same trick as pan.
  const pendingZoomRef = useRef<{ scale: number; pos: Vector2d } | null>(null);
  const zoomRafRef = useRef<number | null>(null);

  // Handle Zoom
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    setTokenMenu(null);
    const stage = e.target.getStage();
    if (!stage) return;

    const scaleBy = 1.1;
    // Build off the most-recent target so successive wheel ticks
    // compound correctly while we're still coalescing.
    const pending = pendingZoomRef.current;
    const oldScale = pending?.scale ?? stage.scaleX();
    const oldPos = pending?.pos ?? { x: stage.x(), y: stage.y() };
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - oldPos.x) / oldScale,
      y: (pointer.y - oldPos.y) / oldScale,
    };

    const newScale =
      e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    // Limit zoom
    if (newScale < 0.1 || newScale > 10) return;

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    pendingZoomRef.current = { scale: newScale, pos: newPos };
    if (zoomRafRef.current === null) {
      zoomRafRef.current = requestAnimationFrame(() => {
        zoomRafRef.current = null;
        const next = pendingZoomRef.current;
        if (!next) return;
        pendingZoomRef.current = null;
        setStageScale(next.scale);
        setStagePos(next.pos);
      });
    }
  };

  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (tokenMenu && e.evt.button !== 2) {
      setTokenMenu(null);
    }

    if (pendingTokenPlacement) {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      if (!stage || !mapId) return;

      if (e.evt.button === 2) {
        setPendingTokenPlacement(null);
        setPlacementPointer(null);
        return;
      }

      if (e.evt.button !== 0) return;

      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      const position = getPlacementPosition(pointer, gridSize, showGrid);

      void placeTokenFromPointer({
        campaignId,
        mapId,
        placement: pendingTokenPlacement,
        position,
      }).then((token) => {
        if (token) {
          addToken(token);
          window.dispatchEvent(new CustomEvent('vtt:tokens-changed', { detail: { mapId } }));
        }
      });
      return;
    }

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

    // Eraser tool: click or drag to delete shapes/drawings under the cursor
    if (activeTool === 'erase' && e.evt.button === 0) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      setIsErasing(true);
      eraseAtPoint(pointer.x, pointer.y);
      return;
    }

    // Wall editor (DM only)
    if (activeTool === 'wall' && isDm && e.evt.button === 0) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      const useSnap = !e.evt.altKey;
      const placed = useSnap ? wallEditorSnap(pointer, gridSize) : pointer;
      const mode = useVttStore.getState().wallEditorMode;
      if (mode === 'segment' || mode === 'door') {
        // IMPORTANT: never trigger side effects (DB writes) from inside a
        // setState updater — React 18 / StrictMode runs updater functions
        // twice to detect impurity, which would create the wall twice.
        if (wallEditorPoints.length === 0) {
          setWallEditorPoints([placed]);
        } else {
          const start = wallEditorPoints[0];
          setWallEditorPoints([]);
          void createWall({ points: [start, placed], is_door: mode === 'door' });
        }
        return;
      }
      // Pen mode: append vertex; double-click finishes.
      setWallEditorPoints((prev) => [...prev, placed]);
      return;
    }

    // Draw tool: start a freehand stroke
    if (activeTool === 'draw' && e.evt.button === 0) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      setSelectedDrawingId(null);
      setDrawStroke([{ x: pointer.x, y: pointer.y }]);
      return;
    }

    // Light source — single click to place. DM-only by RLS; for UX we
    // also gate the tool button on isDm so non-DMs don't see it.
    if (activeTool === 'light' && e.evt.button === 0) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      void createLight({
        x: pointer.x,
        y: pointer.y,
        radius_ft: 20,
        color: '#FFC080',
        intensity: 1,
      });
      return;
    }

    // AOE drag start
    const aoeShape = aoeShapeFromTool(activeTool);
    if (aoeShape && e.evt.button === 0) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      setSelectedAoeId(null);
      setAoeDrag({
        shape: aoeShape,
        startX: pointer.x,
        startY: pointer.y,
        endX: pointer.x,
        endY: pointer.y,
      });
      return;
    }


    if (e.evt.button === 2) { // Right click
      const stage = e.target.getStage();
      if (!stage) return;
      setIsPanning(true);
      panStartPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      return;
    }

    const isMeasuring = activeTool === 'measure' || e.evt.ctrlKey;

    // If we got here in select mode without Shift held, the click must not have
    // landed on any interactive shape (Token, AOE area, drawing — all of which
    // cancel-bubble on mousedown). Treat it as "click empty space" and clear
    // every selection. Shift-click is reserved for additive multi-selection.
    if (activeTool === 'select' && !isMeasuring && !e.evt.shiftKey && e.evt.button === 0) {
      setSelectedTokenId(null);
      setSelectedAoeId(null);
      setSelectedDrawingId(null);
      setSelectedWallId(null);
      setSelectedLightId(null);
    }

    if (!isMeasuring) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    setRulerStart(pointer);
    setRulerEnd(pointer);
  };

  const handleTokenContextMenu = useCallback(
    (tokenId: string, position: { x: number; y: number }) => {
      if (!isDm) return;
      setTokenMenu({
        tokenId,
        x: Math.max(8, Math.min(position.x, window.innerWidth - 210)),
        y: Math.max(8, Math.min(position.y, window.innerHeight - 190)),
      });
    },
    [isDm]
  );

  const handleDeleteContextToken = async () => {
    if (!contextToken) return;
    const tokenName = cleanVttDisplayName(contextToken.name);
    setTokenMenu(null);
    const ok = await deleteToken(contextToken.id);
    if (ok) {
      setSelectedTokenId(null);
      toast.success(`${tokenName} deleted.`);
    } else {
      toast.error(`Could not delete ${tokenName}.`);
    }
  };

  const handleAddContextTokenToEncounter = async () => {
    if (!contextToken) return;
    if (!activeEncounter) {
      toast.error("Start combat before adding tokens to the encounter.");
      return;
    }
    if (contextTokenInEncounter) {
      toast.message("That token is already in the encounter.");
      setTokenMenu(null);
      return;
    }

    try {
      await addParticipant(contextToken.id, Math.floor(Math.random() * 20) + 1);
      toast.success(`${cleanVttDisplayName(contextToken.name)} added to encounter.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add token to encounter.";
      toast.error(message);
    } finally {
      setTokenMenu(null);
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (pendingTokenPlacement) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (pointer) setPlacementPointer(pointer);
      return;
    }

    if (isErasing && activeTool === 'erase') {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      eraseAtPoint(pointer.x, pointer.y);
      return;
    }

    if (drawStroke) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      const last = drawStroke[drawStroke.length - 1];
      const dx = pointer.x - last.x;
      const dy = pointer.y - last.y;
      if (Math.hypot(dx, dy) < DRAW_MIN_DISTANCE_PX) return;
      const next = [...drawStroke, { x: pointer.x, y: pointer.y }];
      setDrawStroke(next);
      const now = performance.now();
      if (now - drawBroadcastRef.current > 50 && !(isDm && dmPrivateMode)) {
        drawBroadcastRef.current = now;
        broadcastDrawingStroke(next, DRAW_STROKE_WIDTH);
      }
      return;
    }

    if (aoeDrag) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointer = stage.getRelativePointerPosition();
      if (!pointer) return;
      setAoeDrag({ ...aoeDrag, endX: pointer.x, endY: pointer.y });
      const now = performance.now();
      if (now - aoeBroadcastRef.current > 33 && !(isDm && dmPrivateMode)) {
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

    if (isPanning && panStartPosRef.current) {
      const stage = e.target.getStage();
      if (!stage) return;
      const dx = e.evt.clientX - panStartPosRef.current.x;
      const dy = e.evt.clientY - panStartPosRef.current.y;
      panStartPosRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      // Fully imperative — bypass React. Set position directly on
      // the Konva stage and batchDraw. This is a zero-cost path
      // (no React render, no zustand subscribers wake up) so pan
      // can run at native event rate without stuttering. We commit
      // the final position to the store once, in handleMouseUp.
      stage.x(stage.x() + dx);
      stage.y(stage.y() + dy);
      stage.batchDraw();
      return;
    }

    if (!rulerStart) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    setRulerEnd(pointer);
  };

  const handleMouseUp = (e: KonvaEventObject<MouseEvent>) => {
    if (pendingTokenPlacement) return;

    if (isErasing) {
      setIsErasing(false);
      return;
    }

    if (drawStroke) {
      const persist = e.evt.shiftKey;
      if (persist && drawStroke.length >= 2) {
        void createDrawing({
          points: drawStroke,
          color: myColor(),
          stroke_width: DRAW_STROKE_WIDTH,
          is_private: isDm && dmPrivateMode,
        }).then((row) => {
          if (row) pushUndo({ kind: 'create-drawing', id: row.id });
        });
      }
      broadcastDrawingCancel();
      setDrawStroke(null);
      return;
    }

    if (aoeDrag) {
      const dx = aoeDrag.endX - aoeDrag.startX;
      const dy = aoeDrag.endY - aoeDrag.startY;
      const raw = Math.hypot(dx, dy);
      const { feet, px: snappedLengthPx } = snapDistanceToFeet(raw, gridSize, feetPerSquare);
      const angle = dragAngleRad(aoeDrag);
      const persist = e.evt.shiftKey;
      if (persist) {
        const origin = effectiveOriginForShape(
          aoeDrag.shape,
          aoeDrag.startX,
          aoeDrag.startY,
          snappedLengthPx,
          angle,
          gridSize
        );
        void createAoeArea({
          shape: aoeDrag.shape,
          origin_x: origin.x,
          origin_y: origin.y,
          length_ft: feet,
          rotation_deg: (angle * 180) / Math.PI,
          color: myColor(),
          is_private: isDm && dmPrivateMode,
        }).then((row) => {
          if (row) pushUndo({ kind: 'create-aoe', id: row.id });
        });
      }
      broadcastAoeCancel();
      setAoeDrag(null);
      if (activeTool.startsWith('aoe-')) {
        useVttStore.getState().setActiveTool('select');
      }
      return;
    }

    if (e.evt.button === 2) {
      setIsPanning(false);
      panStartPosRef.current = null;
      // The pan was applied imperatively to the Konva stage during
      // mousemove. Commit the final position to the store now so
      // React-aware consumers (HUD positions, persistence) catch
      // up — exactly one render per pan gesture, at the end.
      const stage = e.target.getStage();
      if (stage) {
        const finalX = stage.x();
        const finalY = stage.y();
        if (finalX !== stagePos.x || finalY !== stagePos.y) {
          setStagePos({ x: finalX, y: finalY });
        }
      }
    }

    if (rulerStart) {
      setRulerStart(null);
      setRulerEnd(null);
    }
  };

  let cursorClass = 'cursor-default';
  if (pendingTokenPlacement) cursorClass = 'cursor-none';
  else if (isPanning) cursorClass = 'cursor-grabbing';
  else if (activeTool === 'measure') cursorClass = 'cursor-crosshair';
  else if (activeTool === 'ping' || activeTool.startsWith('aoe-')) cursorClass = 'cursor-crosshair';
  else if (activeTool === 'draw') cursorClass = 'cursor-crosshair';
  else if (activeTool === 'erase') cursorClass = 'cursor-cell';
  else if (activeTool === 'wall') cursorClass = 'cursor-crosshair';

  if (!mapId) {
    return (
      <div
        className="relative w-full h-full bg-neutral-950 flex flex-col items-center justify-center px-6 text-center"
        ref={containerRef}
      >
        <p className="font-serif text-lg font-semibold text-foreground">
          No scene loaded
        </p>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm">
          Use the <span className="font-medium text-foreground">Scenes</span> bookmark on the
          left edge of the scene (library icon in the toolbar works too), then pick a scene.
          If the DM has pushed a scene, you may be moved there automatically.
        </p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-full bg-neutral-900 overflow-hidden" 
      ref={containerRef}
    >
      <Stage
        width={size.width}
        height={size.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => {
          e.evt.preventDefault();
        }}
        onDblClick={() => {
          if (activeTool !== 'wall' || !isDm) return;
          if (useVttStore.getState().wallEditorMode !== 'pen') return;
          if (wallEditorPoints.length >= 2) {
            void createWall({ points: wallEditorPoints, is_door: false });
          }
          setWallEditorPoints([]);
        }}
        scale={scaleVec}
        x={stagePos.x}
        y={stagePos.y}
        draggable={false}
        className={cursorClass}
      >
        <Layer>
          <MapLayer url={mapUrl} />
          <GridLayer />
        </Layer>
        <TokenLayer
          onTokenUpdate={handleTokenUpdate}
          onTokenContextMenu={handleTokenContextMenu}
          onTokenDragMove={handleTokenDragMove}
          onTokenDragEnd={handleTokenDragEnd}
          groupDrag={groupDrag}
          visibleTokenIds={visibleTokenIds}
          blockingSegments={sightSegs}
        />
        <FogLayer onFogUpdate={updateFogShapes} isDm={isDm} />
        {!isDmForVision && visionEnabled && mapDimensions && (
          <LosMaskLayer
            mapWidth={mapDimensions.width}
            mapHeight={mapDimensions.height}
            visiblePolygons={visiblePolygons}
            // While the DM previews as a player, we don't have that player's
            // accumulated memory loaded; show pure live LOS so the DM sees
            // exactly what the player sees right now.
            memoryPolygons={previewMode ? [] : memoryPolys}
            hidden={false}
          />
        )}
        {/* Warm light bloom from standalone + token-attached lights.
            Sits above the LOS mask so it brightens the dark scene
            (additive blend), and respects walls via the same ray-sweep
            visibility polygon used by LOS. */}
        <LightLayer lights={lights} walls={walls} sceneDark={sceneDark} />
        {/* DM-only markers + drag handles for placed lights. Players
            never see these — only the warm bloom they emit. */}
        {isDm && (
          <LightMarkersLayer
            lights={lights}
            selectedLightId={selectedLightId}
            onSelect={setSelectedLightId}
            onDragEnd={(id, x, y) => void updateLight(id, { x, y })}
          />
        )}
        <WallLayer
          walls={walls}
          isDm={!!isDm}
          editorMode={wallEditorMode}
          selectMode={activeTool === 'select'}
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
        <Layer>
          <RulerLayer
            start={rulerStart}
            end={rulerEnd}
            gridSize={gridSize}
            feetPerSquare={feetPerSquare}
            scale={stageScale}
          />
        </Layer>
        {pendingTokenPlacement && placementPointer && (
          <Layer listening={false}>
            <PendingPlacementPreview
              placement={pendingTokenPlacement}
              position={getPlacementPosition(placementPointer, gridSize, showGrid)}
              gridSize={gridSize}
            />
          </Layer>
        )}
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
          onDeleteArea={(id) => {
            eraseAoeWithUndo(id);
            setSelectedAoeId(null);
          }}
          onUpdateArea={(id, updates) => {
            void updateAoeArea(id, updates);
          }}
          // Eraser intentionally doesn't touch AOE shapes anymore.
          eraseMode={false}
          selectMode={activeTool === 'select'}
          tokens={tokens}
          gridSize={gridSize}
          feetPerSquare={feetPerSquare}
        />
        <DrawingLayer
          persistent={drawings}
          myStroke={
            drawStroke
              ? { points: drawStroke, color: myColor(), strokeWidth: DRAW_STROKE_WIDTH }
              : null
          }
          peerDrawings={peerDrawings}
          selectedDrawingId={selectedDrawingId}
          onSelectDrawing={setSelectedDrawingId}
          onDeleteDrawing={(id) => {
            eraseDrawingWithUndo(id);
            setSelectedDrawingId(null);
          }}
          eraseMode={activeTool === 'erase'}
          selectMode={activeTool === 'select'}
        />
        <PingLayer pings={activePings} gridSize={gridSize} />
        <WeatherOverlay />
      </Stage>
      <TimeOfDayTint campaignId={campaignId} />
      <ShortRestOverlay campaignId={campaignId} />
      {isDm && tokenMenu && contextToken && (
        <div
          className="fixed z-[80] w-48 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-2xl"
          style={{ left: tokenMenu.x, top: tokenMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-xs font-semibold">{cleanVttDisplayName(contextToken.name)}</p>
            <p className="text-[10px] text-muted-foreground">
              HP {contextToken.hp_current ?? "-"} / {contextToken.hp_max ?? "-"}
            </p>
          </div>
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!activeEncounter || contextTokenInEncounter}
            onClick={handleAddContextTokenToEncounter}
          >
            {contextTokenInEncounter ? "Already In Encounter" : "Add To Encounter"}
          </button>
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-xs hover:bg-muted"
            onClick={() => {
              setSelectedTokenId(contextToken.id);
              setTokenMenu(null);
            }}
          >
            Inspect
          </button>
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
            onClick={handleDeleteContextToken}
          >
            Delete
          </button>
        </div>
      )}
      {isDm && selectedTokenIds.length === 1 && !pendingTokenPlacement && (() => {
        const t = tokens.find((tt) => tt.id === selectedTokenIds[0]);
        if (!t) return null;
        const screenX = (t.x + gridSize / 2) * stageScale + stagePos.x;
        const screenY = t.y * stageScale + stagePos.y;
        return (
          <VttTokenDamageHud
            token={t}
            screenX={screenX}
            screenY={screenY}
            campaignId={campaignId}
            mapId={mapId}
            onApplyDelta={(delta) => {
              const cur = t.hp_current ?? 0;
              const max = t.hp_max ?? Number.POSITIVE_INFINITY;
              const next = Math.max(0, Math.min(max, cur + delta));
              void updateTokenPosition(t.id, { hp_current: next });
            }}
          />
        );
      })()}
      {/* DM light editor — DOM popover anchored to the selected light's
          screen position. Stage state may move the light underneath
          while editing; we recompute coords each render. */}
      {isDm && selectedLightId && (() => {
        const light = lights.find((l) => l.id === selectedLightId);
        if (!light) return null;
        const screenX = light.x * stageScale + stagePos.x;
        const screenY = light.y * stageScale + stagePos.y;
        return (
          <LightEditorPopover
            light={light}
            screenX={screenX}
            screenY={screenY}
            onUpdate={(id, updates) => void updateLight(id, updates)}
            onDelete={(id) => {
              void deleteLight(id);
              setSelectedLightId(null);
            }}
            onClose={() => setSelectedLightId(null)}
          />
        );
      })()}
    </div>
  );
};

function getPlacementPosition(pointer: Vector2d, gridSize: number, snapToGrid: boolean): Vector2d {
  if (snapToGrid) {
    return {
      x: Math.round(pointer.x / gridSize) * gridSize,
      y: Math.round(pointer.y / gridSize) * gridSize,
    };
  }
  return {
    x: pointer.x - gridSize / 2,
    y: pointer.y - gridSize / 2,
  };
}

async function placeTokenFromPointer({
  campaignId,
  mapId,
  placement,
  position,
}: {
  campaignId: string;
  mapId: string;
  placement: {
    name: string;
    image_url: string | null;
    type: "token" | "prop";
    character_id?: string | null;
    monster_source?: "srd" | "homebrew" | null;
    monster_index?: string | null;
    srd_monster_id?: string | null;
  };
  position: Vector2d;
}): Promise<VttToken | null> {
  const response = await fetch("/api/vtt/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaignId,
      mapId,
      token: {
        name: placement.name,
        image_url: placement.image_url,
        type: placement.type,
        character_id: placement.character_id ?? null,
        monster_source: placement.monster_source,
        monster_index: placement.monster_index,
        srd_monster_id: placement.srd_monster_id,
        x: position.x,
        y: position.y,
      },
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    token?: VttToken;
    error?: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;

  if (response.ok) {
    return payload?.token ?? null;
  }

  const message = payload?.error || "Could not place token";
  console.error("Error placing token:", {
    message,
    details: payload?.details,
    hint: payload?.hint,
    code: payload?.code,
  });
  toast.error(message);
  return null;
}

function PendingPlacementPreview({
  placement,
  position,
  gridSize,
}: {
  placement: { name: string; image_url: string | null; type: "token" | "prop" };
  position: Vector2d;
  gridSize: number;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!placement.image_url) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = placement.image_url;
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
  }, [placement.image_url]);

  const radius = gridSize / 2;

  return (
    <Group x={position.x} y={position.y} opacity={0.72}>
      <Circle
        x={radius}
        y={radius}
        radius={radius}
        fill={placement.type === "prop" ? "#6b7280" : "#c9b882"}
        stroke="#fbbf24"
        strokeWidth={3}
        shadowColor="#f59e0b"
        shadowBlur={14}
        shadowOpacity={0.45}
      />
      {image ? (
        <KonvaImage image={image} width={gridSize} height={gridSize} cornerRadius={radius} />
      ) : (
        <Text
          text={placement.name.substring(0, 2).toUpperCase()}
          fontSize={gridSize / 2}
          fill="white"
          width={gridSize}
          height={gridSize}
          align="center"
          verticalAlign="middle"
        />
      )}
      <Circle
        x={radius}
        y={radius}
        radius={radius}
        stroke="white"
        strokeWidth={1}
        opacity={0.8}
      />
    </Group>
  );
}
