"use client";

import { Layer, Group, Circle, Path } from "react-konva";
import type Konva from "konva";
import type { LightSource } from "@/types/vtt-light";

interface Props {
  lights: LightSource[];
  selectedLightId: string | null;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}

/**
 * Small DM-only flame markers for every standalone light source on
 * the map. Players never see these — they only see the warm bloom
 * rendered by `LightLayer`. The DM uses these handles to:
 *   • click a light to open its edit popover
 *   • drag a light to reposition it
 */
export function LightMarkersLayer({
  lights,
  selectedLightId,
  onSelect,
  onDragEnd,
}: Props) {
  if (lights.length === 0) return null;

  return (
    <Layer>
      {lights.map((light) => {
        const isSelected = light.id === selectedLightId;
        return (
          <Group
            key={light.id}
            x={light.x}
            y={light.y}
            draggable
            // Cancel mousedown bubbling so the Stage's placement /
            // deselect handlers don't fire when clicking a marker.
            onMouseDown={(e) => {
              e.cancelBubble = true;
            }}
            onTouchStart={(e) => {
              e.cancelBubble = true;
            }}
            onClick={(e) => {
              e.cancelBubble = true;
              onSelect(light.id);
            }}
            onTap={(e) => {
              e.cancelBubble = true;
              onSelect(light.id);
            }}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
              const node = e.target;
              onDragEnd(light.id, node.x(), node.y());
            }}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = "pointer";
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = "";
            }}
          >
            {/* Halo ring — selection-aware. */}
            <Circle
              radius={isSelected ? 14 : 11}
              fill={isSelected ? "rgba(255, 215, 130, 0.35)" : "rgba(0,0,0,0.45)"}
              stroke={isSelected ? "#FFD27A" : "rgba(255, 200, 130, 0.7)"}
              strokeWidth={isSelected ? 2 : 1.2}
            />
            {/* Tiny flame glyph drawn from a path — keeps the marker
                feeling like a light source without bringing in lucide
                inside Konva. */}
            <Path
              data="M0,-7 C3,-3 4,0 2,3 C1,1 0,2 -1,3 C-3,1 -4,-2 -1,-4 C0,-5 0,-6 0,-7 Z"
              fill={light.color}
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={0.8}
              y={1}
            />
          </Group>
        );
      })}
    </Layer>
  );
}
