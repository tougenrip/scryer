"use client";

import { useEffect, useRef } from "react";
import { Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVttStore } from "@/lib/store/vtt-store";
import { patchGridConfig } from "@/lib/vtt/grid-config";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  mapId: string | null;
  isDm: boolean;
  mapLoading: boolean;
};

function gridSignature(
  px: number,
  type: "square" | "hex",
  ft: number,
  show: boolean
): string {
  return `${px}|${type}|${ft}|${show}`;
}

export function VttGridControls({ mapId, isDm, mapLoading }: Props) {
  const gridSize = useVttStore((s) => s.gridSize);
  const gridType = useVttStore((s) => s.gridType);
  const feetPerSquare = useVttStore((s) => s.feetPerSquare);
  const showGrid = useVttStore((s) => s.showGrid);
  
  const setGridSize = useVttStore((s) => s.setGridSize);
  const setGridType = useVttStore((s) => s.setGridType);
  const setFeetPerSquare = useVttStore((s) => s.setFeetPerSquare);
  const setShowGrid = useVttStore((s) => s.setShowGrid);

  const baselineRef = useRef<string>("");
  const prevLoadingRef = useRef(mapLoading);
  // Track the last-saved pixelSize so we can rescale walls/AOEs when it changes.
  const lastPxRef = useRef<number>(0);

  useEffect(() => {
    if (!mapId || !isDm) return;
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = mapLoading;
    if (wasLoading && !mapLoading) {
      baselineRef.current = gridSignature(gridSize, gridType, feetPerSquare, showGrid);
      lastPxRef.current = gridSize;
    }
  }, [mapId, mapLoading, isDm, gridSize, gridType, feetPerSquare, showGrid]);

  useEffect(() => {
    if (!mapId || mapLoading || !isDm) return;

    const next = gridSignature(gridSize, gridType, feetPerSquare, showGrid);
    if (next === baselineRef.current) return;

    const t = window.setTimeout(async () => {
      const supabase = createClient();
      const { data, error: fetchErr } = await supabase
        .from("media_items")
        .select("grid_config")
        .eq("id", mapId)
        .single();
      if (fetchErr) {
        toast.error("Could not load grid settings");
        return;
      }
      const merged = patchGridConfig(data?.grid_config ?? null, {
        pixelSize: gridSize,
        gridType,
        feetPerSquare,
        showGrid,
      });
      const { error: upErr } = await supabase
        .from("media_items")
        .update({ grid_config: merged })
        .eq("id", mapId);
      if (upErr) {
        toast.error(upErr.message || "Failed to save grid");
        return;
      }

      // If pixels-per-cell changed, rescale every coord-bearing record on this
      // map by the ratio so walls / AOEs / drawings / tokens / fog stay
      // anchored to the same grid cells. Without this they keep their old
      // pixel coords while the grid shifts under them.
      const oldPx = lastPxRef.current;
      const newPx = gridSize;
      if (oldPx > 0 && newPx > 0 && oldPx !== newPx) {
        const ratio = newPx / oldPx;

        // Walls: points[] in pixel coords
        const { data: walls } = await supabase
          .from("vtt_walls")
          .select("id, points")
          .eq("map_id", mapId);
        const wallUpdates = (walls ?? []).map(
          (w: { id: string; points: { x: number; y: number }[] }) =>
            supabase
              .from("vtt_walls")
              .update({
                points: (w.points ?? []).map((p) => ({
                  x: p.x * ratio,
                  y: p.y * ratio,
                })),
              } as never)
              .eq("id", w.id)
        );

        // AOE areas: origin_x / origin_y in pixels (length_ft stays in feet)
        const { data: aoes } = await supabase
          .from("vtt_aoe_areas")
          .select("id, origin_x, origin_y")
          .eq("map_id", mapId);
        const aoeUpdates = (aoes ?? []).map(
          (a: { id: string; origin_x: number; origin_y: number }) =>
            supabase
              .from("vtt_aoe_areas")
              .update({
                origin_x: a.origin_x * ratio,
                origin_y: a.origin_y * ratio,
              } as never)
              .eq("id", a.id)
        );

        // Drawings: points[] {x,y} + stroke_width in pixels
        const { data: drawings } = await supabase
          .from("vtt_drawings")
          .select("id, points, stroke_width")
          .eq("map_id", mapId);
        const drawingUpdates = (drawings ?? []).map(
          (d: {
            id: string;
            points: { x: number; y: number }[];
            stroke_width: number;
          }) =>
            supabase
              .from("vtt_drawings")
              .update({
                points: (d.points ?? []).map((p) => ({
                  x: p.x * ratio,
                  y: p.y * ratio,
                })),
                stroke_width: d.stroke_width * ratio,
              } as never)
              .eq("id", d.id)
        );

        // Tokens: x / y in pixels
        const { data: tokens } = await supabase
          .from("tokens")
          .select("id, x, y")
          .eq("map_id", mapId);
        const tokenUpdates = (tokens ?? []).map(
          (t: { id: string; x: number; y: number }) =>
            supabase
              .from("tokens")
              .update({ x: t.x * ratio, y: t.y * ratio } as never)
              .eq("id", t.id)
        );

        // Fog: rescale all per-shape pixel fields inside fog_data on the map.
        const { data: mapRow } = await supabase
          .from("media_items")
          .select("fog_data")
          .eq("id", mapId)
          .single();
        const fogData = mapRow?.fog_data as
          | {
              shapes?: Array<{
                points?: number[];
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                radius?: number;
                strokeWidth?: number;
              }>;
              revealed?: boolean;
            }
          | null;
        let fogUpdate: Promise<unknown> | null = null;
        if (fogData?.shapes && fogData.shapes.length > 0) {
          const scaledShapes = fogData.shapes.map((s) => ({
            ...s,
            points: s.points
              ? s.points.map((v: number) => v * ratio)
              : s.points,
            x: typeof s.x === "number" ? s.x * ratio : s.x,
            y: typeof s.y === "number" ? s.y * ratio : s.y,
            width:
              typeof s.width === "number" ? s.width * ratio : s.width,
            height:
              typeof s.height === "number" ? s.height * ratio : s.height,
            radius:
              typeof s.radius === "number" ? s.radius * ratio : s.radius,
            strokeWidth:
              typeof s.strokeWidth === "number"
                ? s.strokeWidth * ratio
                : s.strokeWidth,
          }));
          fogUpdate = supabase
            .from("media_items")
            .update({
              fog_data: { ...fogData, shapes: scaledShapes },
            } as never)
            .eq("id", mapId);
        }

        await Promise.all([
          ...wallUpdates,
          ...aoeUpdates,
          ...drawingUpdates,
          ...tokenUpdates,
          ...(fogUpdate ? [fogUpdate] : []),
        ]);
      }
      lastPxRef.current = newPx;
      baselineRef.current = next;
    }, 500);

    return () => window.clearTimeout(t);
  }, [
    mapId,
    mapLoading,
    isDm,
    gridSize,
    gridType,
    feetPerSquare,
    showGrid
  ]);

  if (!isDm || !mapId) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 text-muted-foreground")}
          disabled={mapLoading}
          title="Scene grid"
          aria-label="Scene grid: pixels per cell, shape, feet per cell"
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end" sideOffset={8}>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium leading-none">Scene grid</p>
            <p className="text-xs text-muted-foreground mt-1">
              Adjusts this scene only. Saves automatically after you stop typing.
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="vtt-grid-show">Show Grid</Label>
            <Switch
              id="vtt-grid-show"
              checked={showGrid}
              onCheckedChange={setShowGrid}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vtt-grid-px">Pixels per cell</Label>
            <Input
              id="vtt-grid-px"
              type="number"
              min={1}
              step={1}
              value={gridSize || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setGridSize(0); // Temporary 0 so the input stays empty
                } else {
                  const n = parseInt(val, 10);
                  if (Number.isFinite(n)) setGridSize(n);
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cell shape</Label>
            <Select
              value={gridType}
              onValueChange={(v) => setGridType(v as "square" | "hex")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">Square</SelectItem>
                <SelectItem value="hex">Hex</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vtt-grid-ft">Feet per cell</Label>
            <Input
              id="vtt-grid-ft"
              type="number"
              min={1}
              step={1}
              value={feetPerSquare || ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                  setFeetPerSquare(0);
                } else {
                  const n = parseInt(val, 10);
                  if (Number.isFinite(n)) setFeetPerSquare(n);
                }
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
