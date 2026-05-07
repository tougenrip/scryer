"use client";

import { Layer, Group, Line, Circle, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { Point, Wall } from "@/types/vtt-walls";

interface Props {
  walls: Wall[];
  isDm: boolean;
  /** Active wall-tool sub-mode; null when wall tool isn't active. */
  editorMode: "pen" | "segment" | "door" | null;
  /** True when the Select tool is active. Walls only respond to clicks then. */
  selectMode: boolean;
  selectedWallId: string | null;
  onSelectWall: (id: string | null) => void;
  onDeleteWall: (id: string) => void;
  onCreateWall: (points: Point[], isDoor: boolean) => void;
  onToggleDoor: (id: string) => void;
  gridSize: number;
  /** In-progress editor vertices (parent-owned). */
  editorPoints: Point[];
  /** Live preview cursor position (parent-owned). */
  editorHover: Point | null;
  onClearEditorPoints: () => void;
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
  selectMode,
  selectedWallId,
  onSelectWall,
  onDeleteWall,
  onToggleDoor,
  editorPoints,
  editorHover,
}: Props) {
  // DM and players need the layer mounted (door clicks). Players see only doors.
  const visibleWalls = isDm ? walls : walls.filter((w) => w.is_door);

  return (
    <Layer>
      {visibleWalls.map((w) => (
        <WallShape
          key={w.id}
          wall={w}
          isDm={isDm}
          selected={selectedWallId === w.id && isDm && selectMode}
          selectMode={selectMode}
          onSelect={() => onSelectWall(w.id)}
          onDelete={() => onDeleteWall(w.id)}
          onToggleDoor={() => onToggleDoor(w.id)}
        />
      ))}
      {isDm && editorMode && (
        <EditorPreview
          mode={editorMode}
          points={editorPoints}
          hover={editorHover}
        />
      )}
    </Layer>
  );
}

function WallShape({
  wall,
  isDm,
  selected,
  selectMode,
  onSelect,
  onDelete,
  onToggleDoor,
}: {
  wall: Wall;
  isDm: boolean;
  selected: boolean;
  selectMode: boolean;
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
          // Walls are inert outside the Select tool: this lets the wall
          // tool place vertices that land on existing walls, the eraser
          // delete via stage hit-test, etc.
          if (!selectMode) return;
          e.cancelBubble = true;
          if (wall.is_door) {
            onToggleDoor();
          } else {
            onSelect();
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

function EditorPreview({
  mode,
  points,
  hover,
}: {
  mode: "pen" | "segment" | "door";
  points: Point[];
  hover: Point | null;
}) {
  const livePts: Point[] = [];
  for (const p of points) livePts.push(p);
  if (hover && points.length > 0) livePts.push(hover);

  if (livePts.length < 2) {
    // Just render the placed vertices as small dots so the user sees them.
    return (
      <Group listening={false}>
        {points.map((p, i) => (
          <Circle
            key={i}
            x={p.x}
            y={p.y}
            radius={4}
            fill={mode === "door" ? "#f59e0b" : "#06b6d4"}
          />
        ))}
      </Group>
    );
  }

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
        />
      ))}
    </Group>
  );
}

export const wallEditorSnap = snapToGridIntersection;
export const WALL_SNAP_THRESHOLD_PX = SNAP_THRESHOLD_PX;
