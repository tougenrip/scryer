"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, X } from "lucide-react";
import type { LightSource } from "@/types/vtt-light";

interface Props {
  light: LightSource;
  /** Screen-space anchor of the light marker. */
  screenX: number;
  screenY: number;
  onUpdate: (
    id: string,
    updates: Partial<
      Pick<LightSource, "radius_ft" | "color" | "intensity" | "name">
    >
  ) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const PRESET_COLORS: Array<{ value: string; label: string }> = [
  { value: "#FFC080", label: "Torch" },
  { value: "#FFD27A", label: "Lantern" },
  { value: "#FFFFFF", label: "Daylight" },
  { value: "#A0FFB0", label: "Faerie" },
  { value: "#9CC8FF", label: "Moonlight" },
  { value: "#D080FF", label: "Arcane" },
  { value: "#FF6060", label: "Hearth" },
];

/**
 * Floating editor for a placed light source. DM-only (gated by
 * GameCanvas). Anchored in screen coords so it follows the marker.
 */
export function LightEditorPopover({
  light,
  screenX,
  screenY,
  onUpdate,
  onDelete,
  onClose,
}: Props) {
  const [radius, setRadius] = useState<number>(light.radius_ft);
  const [color, setColor] = useState<string>(light.color);
  const [intensity, setIntensity] = useState<number>(light.intensity);
  const [name, setName] = useState<string>(light.name ?? "");

  useEffect(() => {
    setRadius(light.radius_ft);
    setColor(light.color);
    setIntensity(light.intensity);
    setName(light.name ?? "");
  }, [light.id, light.radius_ft, light.color, light.intensity, light.name]);

  const commit = (updates: Partial<LightSource>) => {
    onUpdate(light.id, updates);
  };

  return (
    <div
      className="fixed z-[80] w-64 rounded-md border border-border bg-popover text-popover-foreground shadow-2xl p-3 space-y-3"
      style={{
        // Anchor a bit above + right of the marker so the popover doesn't
        // sit under the cursor.
        left: Math.max(8, Math.min(screenX + 16, window.innerWidth - 268)),
        top: Math.max(8, Math.min(screenY - 12, window.innerHeight - 280)),
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-400" style={{ fontVariant: "small-caps" }}>
          Light source
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            const next = name.trim() || null;
            if (next !== (light.name ?? null)) commit({ name: next });
          }}
          placeholder="Torch, sconce, brazier…"
          className="h-7 text-xs"
        />
      </div>

      {/* Radius */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Radius
          </label>
          <span className="text-[10px] tabular-nums text-foreground">
            {radius} ft
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={120}
          step={5}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          onMouseUp={() => {
            if (radius !== light.radius_ft) commit({ radius_ft: radius });
          }}
          onTouchEnd={() => {
            if (radius !== light.radius_ft) commit({ radius_ft: radius });
          }}
          className="w-full"
        />
      </div>

      {/* Intensity */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Intensity
          </label>
          <span className="text-[10px] tabular-nums text-foreground">
            {intensity.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={0.2}
          max={1.6}
          step={0.05}
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          onMouseUp={() => {
            if (intensity !== light.intensity) commit({ intensity });
          }}
          onTouchEnd={() => {
            if (intensity !== light.intensity) commit({ intensity });
          }}
          className="w-full"
        />
      </div>

      {/* Color */}
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Color
        </label>
        <div className="flex flex-wrap gap-1">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => {
                setColor(preset.value);
                commit({ color: preset.value });
              }}
              title={preset.label}
              className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
              style={{
                backgroundColor: preset.value,
                outline:
                  color.toLowerCase() === preset.value.toLowerCase()
                    ? "2px solid rgb(245, 195, 110)"
                    : "none",
                outlineOffset: 2,
              }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              commit({ color: e.target.value });
            }}
            className="h-6 w-6 rounded border border-border cursor-pointer p-0"
            title="Custom color"
          />
        </div>
      </div>

      <div className="border-t border-border pt-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => {
            onDelete(light.id);
            onClose();
          }}
        >
          <Trash2 className="h-3 w-3 mr-1" /> Delete
        </Button>
      </div>
    </div>
  );
}
