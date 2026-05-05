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

  useEffect(() => {
    if (!mapId || !isDm) return;
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = mapLoading;
    if (wasLoading && !mapLoading) {
      baselineRef.current = gridSignature(gridSize, gridType, feetPerSquare, showGrid);
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
