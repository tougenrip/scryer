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
