"use client";

import { useMemo } from "react";
import { Layer, Shape } from "react-konva";
import { useVttStore } from "@/lib/store/vtt-store";
import {
  computeVisibilityPolygon,
  sightBlockingSegments,
  type Point,
} from "@/lib/vtt/visibility";
import type { LightSource } from "@/types/vtt-light";
import type { Wall } from "@/types/vtt-walls";

interface Props {
  lights: LightSource[];
  walls: Wall[];
  sceneDark: boolean;
}

interface RenderLight {
  x: number;
  y: number;
  radiusPx: number;
  color: string;
  intensity: number;
}

/**
 * Parse a #RRGGBB hex color into r/g/b ints. Returns warm torch
 * fallback for any malformed input so a bad row doesn't blank a light.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex.trim());
  if (!m) return { r: 255, g: 192, b: 128 };
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/**
 * Renders visible warm light from every light source on the map —
 * standalone lights from the `lights` prop plus token-attached lights
 * (tokens with `light_radius_ft > 0`). Each light:
 *   • computes its visibility polygon against the wall segments via
 *     the same ray-sweep used by the LOS system, so light is blocked
 *     by walls (and by closed doors)
 *   • clips the canvas to that polygon and paints a soft warm radial
 *     gradient inside it
 *   • blends additively (`globalCompositeOperation: 'lighter'`) so two
 *     lights overlapping brighten each other instead of stacking
 *     opaquely
 *
 * Only renders when the scene is dark — when the room is fully lit
 * there's nothing to brighten.
 */
export function LightLayer({ lights, walls, sceneDark }: Props) {
  const tokens = useVttStore((s) => s.tokens);
  const gridSize = useVttStore((s) => s.gridSize);
  const feetPerSquare = useVttStore((s) => s.feetPerSquare);

  // Combine standalone lights + token-attached lights into one
  // homogenous render list. Token lights default to a warm torch hue
  // since the token row doesn't carry per-light color (yet).
  const renderLights = useMemo<RenderLight[]>(() => {
    const out: RenderLight[] = [];
    for (const l of lights) {
      out.push({
        x: l.x,
        y: l.y,
        radiusPx: (l.radius_ft / feetPerSquare) * gridSize,
        color: l.color,
        intensity: l.intensity,
      });
    }
    for (const t of tokens) {
      const ft = t.light_radius_ft ?? 0;
      if (ft <= 0) continue;
      out.push({
        x: t.x + gridSize / 2,
        y: t.y + gridSize / 2,
        radiusPx: (ft / feetPerSquare) * gridSize,
        color: "#FFC080",
        intensity: 1,
      });
    }
    return out;
  }, [lights, tokens, gridSize, feetPerSquare]);

  const sightSegs = useMemo(() => sightBlockingSegments(walls), [walls]);

  // Precompute each light's visibility polygon ONCE per change to
  // walls / lights / tokens. `sceneFunc` re-runs on every Konva
  // batchDraw (pan, zoom, weather animation tick), so doing the
  // O(walls × rays) ray-sweep inside it makes pan stutter badly.
  const lightPolygons = useMemo(() => {
    return renderLights.map((light) => ({
      light,
      poly: computeVisibilityPolygon({ x: light.x, y: light.y }, sightSegs),
    }));
  }, [renderLights, sightSegs]);

  if (!sceneDark || renderLights.length === 0) return null;

  return (
    <Layer listening={false}>
      <Shape
        sceneFunc={(context) => {
          context.save();
          context.globalCompositeOperation = "lighter";

          for (const { light, poly } of lightPolygons) {
            if (poly.length < 3) continue;

            const { r, g, b } = hexToRgb(light.color);
            const a = Math.min(1.5, light.intensity);
            // Bright warm core that softens to transparent at the
            // light's outer radius. The gradient itself does the
            // radial falloff; the polygon clip handles wall shadows.
            const grad = context.createRadialGradient(
              light.x,
              light.y,
              0,
              light.x,
              light.y,
              light.radiusPx
            );
            grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.85 * a})`);
            grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${0.5 * a})`);
            grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${0.18 * a})`);
            grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

            context.save();
            context.beginPath();
            context.moveTo(poly[0].x, poly[0].y);
            for (let i = 1; i < poly.length; i++) {
              context.lineTo(poly[i].x, poly[i].y);
            }
            context.closePath();
            context.clip();

            context.fillStyle = grad;
            // Fill a square around the light (clip to polygon does the
            // work). Using a square is faster than another arc fill.
            context.fillRect(
              light.x - light.radiusPx,
              light.y - light.radiusPx,
              light.radiusPx * 2,
              light.radiusPx * 2
            );
            context.restore();
          }

          context.restore();
        }}
      />
    </Layer>
  );
}
