'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Group, Circle, Image as KonvaImage, Text } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Vector2d } from 'konva/lib/types';
import { useVttStore } from '@/lib/store/vtt-store';
import { MapLayer } from './MapLayer';
import { GridLayer } from './GridLayer';
import { TokenLayer } from './TokenLayer';
import { FogLayer } from './FogLayer';
import { WeatherOverlay } from './WeatherOverlay';
import { RulerLayer } from './RulerLayer';
import { useVttTokens } from '@/hooks/useVttTokens';
import { useVttFog } from '@/hooks/useVttFog';
import { useVttOverlays } from '@/hooks/useVttOverlays';
import { useVttAoeAreas } from '@/hooks/useVttAoeAreas';
import { useVttDrawings } from '@/hooks/useVttDrawings';
import { useCombat } from '@/hooks/useCombat';
import type { Token as VttToken } from '@/types/vtt';
import type { AoeArea, AoeShape, Drawing, DrawingPoint } from '@/types/vtt-aoe';
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
import { PingLayer } from './PingLayer';
import { AoeLayer } from './AoeLayer';
import { DrawingLayer } from './DrawingLayer';
import { VttTokenDamageHud } from '@/components/vtt/vtt-token-damage-hud';
import { toast } from 'sonner';
import { cleanVttDisplayName } from '@/lib/vtt/display-name';

interface GameCanvasProps {
  isDm?: boolean;
  campaignId: string;
}

export const GameCanvas = ({ isDm = false, campaignId }: GameCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [rulerStart, setRulerStart] = useState<Vector2d | null>(null);
  const [rulerEnd, setRulerEnd] = useState<Vector2d | null>(null);
  const [placementPointer, setPlacementPointer] = useState<Vector2d | null>(null);
  const [tokenMenu, setTokenMenu] = useState<{ tokenId: string; x: number; y: number } | null>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState<Vector2d | null>(null);

  const { 
    stageScale, 
    stagePos, 
    setStageScale, 
    setStagePos,
    mapUrl,
    mapId,
    activeTool,
    gridSize,
    showGrid,
    feetPerSquare,
    tokens,
    selectedTokenId,
    selectedTokenIds,
    setSelectedTokenId,
    setSelectedTokenIds,
    addToken,
    pendingTokenPlacement,
    setPendingTokenPlacement
  } = useVttStore();

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

  const dmPrivateMode = useVttStore((s) => s.dmPrivateMode);

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

  const handleTokenDragMove = (id: string, x: number, y: number) => {
    if (selectedTokenIds.length > 1 && selectedTokenIds.includes(id)) {
      const dragged = tokens.find((t) => t.id === id);
      if (dragged) {
        setGroupDrag({ leadId: id, dx: x - dragged.x, dy: y - dragged.y });
      }
    }
  };

  const handleTokenDragEnd = () => {
    setGroupDrag(null);
  };

  const handleTokenUpdate = (id: string, updates: Partial<VttToken>) => {
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
  };

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
      if (target.closest('[role="dialog"]')) return;
      if (target.closest('[role="alertdialog"]')) return;
      setSelectedTokenId(null);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [selectedTokenIds, setSelectedTokenId]);

  const eraseAtPoint = (px: number, py: number) => {
    for (const a of aoeAreas) {
      const lengthPx = feetToPx(a.length_ft, gridSize, feetPerSquare);
      const ringPx = feetToPx(ringThicknessFt(), gridSize, feetPerSquare);
      const linePx = feetToPx(lineWidthFt(), gridSize, feetPerSquare);
      const rotRad = (a.rotation_deg * Math.PI) / 180;
      if (pointInAoe(px, py, a.shape, a.origin_x, a.origin_y, lengthPx, rotRad, ringPx, linePx)) {
        eraseAoeWithUndo(a.id);
      }
    }
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

  // Handle Zoom
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    setTokenMenu(null);
    const stage = e.target.getStage();
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Limit zoom
    if (newScale < 0.1 || newScale > 10) return;

    setStageScale(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    setStagePos(newPos);
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
      setPanStartPos({ x: e.evt.clientX, y: e.evt.clientY });
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
    }

    if (!isMeasuring) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pointer = stage.getRelativePointerPosition();
    if (!pointer) return;

    setRulerStart(pointer);
    setRulerEnd(pointer);
  };

  const handleTokenContextMenu = (tokenId: string, position: { x: number; y: number }) => {
    if (!isDm) return;
    setTokenMenu({
      tokenId,
      x: Math.max(8, Math.min(position.x, window.innerWidth - 210)),
      y: Math.max(8, Math.min(position.y, window.innerHeight - 190)),
    });
  };

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

    if (isPanning && panStartPos) {
      const stage = e.target.getStage();
      if (!stage) return;
      const dx = e.evt.clientX - panStartPos.x;
      const dy = e.evt.clientY - panStartPos.y;
      setStagePos({ x: stagePos.x + dx, y: stagePos.y + dy });
      setPanStartPos({ x: e.evt.clientX, y: e.evt.clientY });
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
      setPanStartPos(null);
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
        scale={{ x: stageScale, y: stageScale }}
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
        />
        <FogLayer onFogUpdate={updateFogShapes} isDm={isDm} />
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
          eraseMode={activeTool === 'erase'}
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
        />
        <PingLayer pings={activePings} gridSize={gridSize} />
        <WeatherOverlay />
      </Stage>
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
            onApplyDelta={(delta) => {
              const cur = t.hp_current ?? 0;
              const max = t.hp_max ?? Number.POSITIVE_INFINITY;
              const next = Math.max(0, Math.min(max, cur + delta));
              void updateTokenPosition(t.id, { hp_current: next });
            }}
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
