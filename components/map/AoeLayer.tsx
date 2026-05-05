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
  effectiveOriginForShape,
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
  onDeleteArea: (id: string) => void;
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
          onDelete={() => onDeleteArea(a.id)}
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

function PersistentShape({
  area,
  gridSize,
  feetPerSquare,
  selected,
  onSelect,
  onDelete,
}: {
  area: AoeArea;
  gridSize: number;
  feetPerSquare: number;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const lengthPx = feetToPx(area.length_ft, gridSize, feetPerSquare);
  const angleRad = (area.rotation_deg * Math.PI) / 180;
  const btnRadius = 12;
  return (
    <Group>
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
      {selected && (
        <Group
          x={area.origin_x}
          y={area.origin_y}
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
