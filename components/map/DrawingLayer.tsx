"use client";

import { Layer, Group, Line, Circle, Text } from "react-konva";
import type { Drawing, DrawingPoint, EphemeralDrawing } from "@/types/vtt-aoe";

interface LiveStroke {
  points: DrawingPoint[];
  color: string;
  strokeWidth: number;
}

interface Props {
  persistent: Drawing[];
  myStroke: LiveStroke | null;
  peerDrawings: Map<string, EphemeralDrawing>;
  selectedDrawingId: string | null;
  onSelectDrawing: (id: string | null) => void;
  onDeleteDrawing: (id: string) => void;
  eraseMode: boolean;
  /** True when Select tool is active. Drawings only respond to clicks then or in eraseMode. */
  selectMode: boolean;
}

function flattenPoints(points: DrawingPoint[]): number[] {
  const out: number[] = [];
  for (const p of points) {
    out.push(p.x, p.y);
  }
  return out;
}

export function DrawingLayer({
  persistent,
  myStroke,
  peerDrawings,
  selectedDrawingId,
  onSelectDrawing,
  onDeleteDrawing,
  eraseMode,
  selectMode,
}: Props) {
  return (
    <Layer>
      {persistent.map((d) => (
        <PersistentStroke
          key={d.id}
          drawing={d}
          selected={selectedDrawingId === d.id}
          eraseMode={eraseMode}
          selectMode={selectMode}
          onSelect={() => onSelectDrawing(d.id)}
          onDelete={() => onDeleteDrawing(d.id)}
        />
      ))}
      {[...peerDrawings.values()].map((d) => (
        <Line
          key={`peer-${d.userId}`}
          points={flattenPoints(d.points)}
          stroke={d.color}
          strokeWidth={d.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
          listening={false}
        />
      ))}
      {myStroke && (
        <Line
          points={flattenPoints(myStroke.points)}
          stroke={myStroke.color}
          strokeWidth={myStroke.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.3}
          listening={false}
        />
      )}
    </Layer>
  );
}

function PersistentStroke({
  drawing,
  selected,
  eraseMode,
  selectMode,
  onSelect,
  onDelete,
}: {
  drawing: Drawing;
  selected: boolean;
  eraseMode: boolean;
  selectMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const points = flattenPoints(drawing.points);
  const first = drawing.points[0];
  const btnRadius = 12;
  return (
    <Group opacity={drawing.is_private ? 0.6 : 1}>
      <Line
        points={points}
        stroke={drawing.color}
        strokeWidth={selected ? drawing.stroke_width + 2 : drawing.stroke_width}
        lineCap="round"
        lineJoin="round"
        tension={0.3}
        dash={drawing.is_private ? [10, 6] : undefined}
        hitStrokeWidth={Math.max(12, drawing.stroke_width + 8)}
        onMouseDown={(e) => {
          if (eraseMode) {
            e.cancelBubble = true;
            onDelete();
            return;
          }
          // Inert outside Select tool so clicks pass through to other tools.
          if (!selectMode) return;
          e.cancelBubble = true;
          onSelect();
        }}
      />
      {selected && !eraseMode && first && (
        <Group
          x={first.x}
          y={first.y}
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
