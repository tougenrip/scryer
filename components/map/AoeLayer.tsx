"use client";

import { useState } from "react";
import { Layer, Group, Circle, Line, Rect, Ring, Text, Label, Tag } from "react-konva";
import type { AoeArea, AoeShape, EphemeralAoe } from "@/types/vtt-aoe";
import type { Token } from "@/types/vtt";
import {
  aoeLabelText,
  computeConePolygon,
  computeLineRect,
  computeRingRadii,
  computeSquareRect,
  dragAngleRad,
  effectiveOriginForShape,
  feetToPx,
  lineWidthFt,
  pointInAoe,
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
  onDeleteArea: (id: string) => void;
  onUpdateArea: (
    id: string,
    updates: Partial<Pick<AoeArea, "origin_x" | "origin_y" | "rotation_deg" | "length_ft">>
  ) => void;
  eraseMode: boolean;
  tokens: Token[];
  gridSize: number;
  feetPerSquare: number;
}

export function AoeLayer({
  persistent,
  myDrag,
  peerEphemerals,
  selectedAreaId,
  onSelectArea,
  onDeleteArea,
  onUpdateArea,
  eraseMode,
  tokens,
  gridSize,
  feetPerSquare,
}: Props) {
  const selectedArea = selectedAreaId
    ? persistent.find((a) => a.id === selectedAreaId) ?? null
    : null;

  // Tokens whose centers fall inside the selected AOE (for highlight)
  const highlightedTokenIds = (() => {
    if (!selectedArea || eraseMode) return new Set<string>();
    const lengthPx = feetToPx(selectedArea.length_ft, gridSize, feetPerSquare);
    const ringPx = feetToPx(ringThicknessFt(), gridSize, feetPerSquare);
    const linePx = feetToPx(lineWidthFt(), gridSize, feetPerSquare);
    const rotRad = (selectedArea.rotation_deg * Math.PI) / 180;
    const ids = new Set<string>();
    for (const t of tokens) {
      const cx = t.x + gridSize / 2;
      const cy = t.y + gridSize / 2;
      if (
        pointInAoe(
          cx,
          cy,
          selectedArea.shape,
          selectedArea.origin_x,
          selectedArea.origin_y,
          lengthPx,
          rotRad,
          ringPx,
          linePx
        )
      ) {
        ids.add(t.id);
      }
    }
    return ids;
  })();

  return (
    <Layer>
      {persistent.map((a) => (
        <PersistentShape
          key={a.id}
          area={a}
          gridSize={gridSize}
          feetPerSquare={feetPerSquare}
          selected={selectedAreaId === a.id}
          eraseMode={eraseMode}
          onSelect={() => onSelectArea(a.id)}
          onDelete={() => onDeleteArea(a.id)}
          onUpdate={(updates) => onUpdateArea(a.id, updates)}
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
      {/* Tokens-inside highlight rings */}
      {[...highlightedTokenIds].map((id) => {
        const t = tokens.find((tt) => tt.id === id);
        if (!t) return null;
        return (
          <Circle
            key={`hi-${id}`}
            x={t.x + gridSize / 2}
            y={t.y + gridSize / 2}
            radius={gridSize / 2 + 4}
            stroke="#facc15"
            strokeWidth={3}
            dash={[6, 4]}
            listening={false}
          />
        );
      })}
    </Layer>
  );
}

function shapePropsFromDrag(
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
    drag.startX,
    drag.startY,
    drag.endX,
    drag.endY,
    gridSize,
    feetPerSquare
  );
  const origin = effectiveOriginForShape(
    drag.shape,
    drag.startX,
    drag.startY,
    lengthPx,
    angle,
    gridSize
  );
  return (
    <Group listening={false}>
      <RenderShape
        shape={drag.shape}
        originX={origin.x}
        originY={origin.y}
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

function handlePosForShape(
  shape: AoeShape,
  lengthPx: number,
  angleRad: number
): { x: number; y: number } {
  switch (shape) {
    case "circle":
    case "ring":
      return { x: lengthPx, y: 0 };
    case "cone":
    case "line":
      return { x: Math.cos(angleRad) * lengthPx, y: Math.sin(angleRad) * lengthPx };
    case "square":
      return { x: lengthPx / 2, y: lengthPx / 2 };
  }
}

/**
 * Where to place the delete button on the visible shape body. Circle, ring,
 * and square are centered on the origin so (0,0) works. Cone and line emanate
 * from the origin, so anchoring × there leaves it on a tiny apex off the
 * visible mass — put it midway along the axis instead.
 */
function deleteButtonPosForShape(
  shape: AoeShape,
  lengthPx: number,
  angleRad: number
): { x: number; y: number } {
  switch (shape) {
    case "circle":
    case "ring":
    case "square":
      return { x: 0, y: 0 };
    case "cone":
    case "line":
      return {
        x: (Math.cos(angleRad) * lengthPx) / 2,
        y: (Math.sin(angleRad) * lengthPx) / 2,
      };
  }
}

function PersistentShape({
  area,
  gridSize,
  feetPerSquare,
  selected,
  eraseMode,
  onSelect,
  onDelete,
  onUpdate,
}: {
  area: AoeArea;
  gridSize: number;
  feetPerSquare: number;
  selected: boolean;
  eraseMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdate: (
    updates: Partial<Pick<AoeArea, "origin_x" | "origin_y" | "rotation_deg" | "length_ft">>
  ) => void;
}) {
  // Local override applied during a live resize/rotate drag so the shape
  // updates in real time without writing to the DB on every frame.
  const [liveTransform, setLiveTransform] = useState<{
    length_ft: number;
    rotation_deg: number;
  } | null>(null);

  const effectiveLengthFt = liveTransform?.length_ft ?? area.length_ft;
  const effectiveRotationDeg = liveTransform?.rotation_deg ?? area.rotation_deg;
  const lengthPx = feetToPx(effectiveLengthFt, gridSize, feetPerSquare);
  const angleRad = (effectiveRotationDeg * Math.PI) / 180;
  const btnRadius = 12;
  const handlePos = handlePosForShape(area.shape, lengthPx, angleRad);
  const deletePos = deleteButtonPosForShape(area.shape, lengthPx, angleRad);

  const computeUpdatesFromHandle = (
    hx: number,
    hy: number
  ): { length_ft: number; rotation_deg: number } => {
    let newLengthPx = lengthPx;
    let newRotationDeg = effectiveRotationDeg;
    if (area.shape === "cone" || area.shape === "line") {
      newLengthPx = Math.hypot(hx, hy);
      newRotationDeg = (Math.atan2(hy, hx) * 180) / Math.PI;
    } else if (area.shape === "square") {
      newLengthPx = Math.max(Math.abs(hx), Math.abs(hy)) * 2;
    } else {
      newLengthPx = Math.hypot(hx, hy);
    }
    const { feet } = snapDistanceToFeet(newLengthPx, gridSize, feetPerSquare);
    return { length_ft: feet, rotation_deg: newRotationDeg };
  };

  return (
    <>
      {/* Body group (draggable for move) */}
      <Group
        x={area.origin_x}
        y={area.origin_y}
        draggable={selected && !eraseMode}
        onMouseDown={(e) => {
          e.cancelBubble = true;
          if (eraseMode) onDelete();
          else onSelect();
        }}
        onDragEnd={(e) => {
          if (eraseMode) return;
          // Snap to the same grid rule we used at creation time so the
          // shape's edges keep aligning with grid lines after a move.
          const snapped = effectiveOriginForShape(
            area.shape,
            e.target.x(),
            e.target.y(),
            lengthPx,
            angleRad,
            gridSize
          );
          // Reflect the snap on the Konva node immediately to avoid a brief
          // visual jump between dragend and the optimistic state update.
          e.target.x(snapped.x);
          e.target.y(snapped.y);
          onUpdate({ origin_x: snapped.x, origin_y: snapped.y });
        }}
        opacity={area.is_private ? 0.6 : 1}
      >
        <RenderShape
          shape={area.shape}
          originX={0}
          originY={0}
          angleRad={angleRad}
          lengthPx={lengthPx}
          color={area.color}
          gridSize={gridSize}
          feetPerSquare={feetPerSquare}
          dashed={area.is_private}
          selected={selected}
        />
        {selected && !eraseMode && (
          <Group
            onMouseDown={(e) => {
              e.cancelBubble = true;
              onDelete();
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onDelete();
            }}
          >
            <Circle
              radius={btnRadius}
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth={2}
              shadowColor="#000"
              shadowBlur={6}
              shadowOpacity={0.5}
            />
            <Text
              text="×"
              fontSize={20}
              fill="#ffffff"
              width={btnRadius * 2}
              height={btnRadius * 2}
              offsetX={btnRadius}
              offsetY={btnRadius}
              align="center"
              verticalAlign="middle"
            />
          </Group>
        )}
      </Group>

      {/* Resize/rotate handle: a sibling group at world coords. */}
      {selected && !eraseMode && (
        <Group
          x={area.origin_x + handlePos.x}
          y={area.origin_y + handlePos.y}
          draggable
          onMouseDown={(e) => {
            e.cancelBubble = true;
          }}
          onDragMove={(e) => {
            const hx = e.target.x() - area.origin_x;
            const hy = e.target.y() - area.origin_y;
            setLiveTransform(computeUpdatesFromHandle(hx, hy));
          }}
          onDragEnd={(e) => {
            const hx = e.target.x() - area.origin_x;
            const hy = e.target.y() - area.origin_y;
            const finalUpdates = computeUpdatesFromHandle(hx, hy);
            setLiveTransform(null);
            onUpdate(finalUpdates);
          }}
        >
          <Circle
            radius={9}
            fill="#06b6d4"
            stroke="#000000"
            strokeWidth={2}
            shadowColor="#000"
            shadowBlur={4}
            shadowOpacity={0.5}
          />
        </Group>
      )}
      {/* Live size tooltip while resizing */}
      {selected && !eraseMode && liveTransform && (
        <Label
          x={area.origin_x + handlePos.x + 14}
          y={area.origin_y + handlePos.y + 14}
          listening={false}
        >
          <Tag fill="rgba(0,0,0,0.8)" cornerRadius={4} />
          <Text
            text={aoeLabelText(area.shape, liveTransform.length_ft)}
            fontSize={12}
            fill="#ffffff"
            padding={6}
          />
        </Label>
      )}
    </>
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
          offsetX={r.offsetX}
          offsetY={r.offsetY}
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
          offsetX={r.offsetX}
          offsetY={r.offsetY}
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
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(59,130,246,${alpha})`;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}
