"use client";

import { CloudFog, Eye, EyeOff, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useVttStore } from "@/lib/store/vtt-store";
import { useVttFog } from "@/hooks/useVttFog";
import { cn } from "@/lib/utils";

type Props = {
  mapId: string | null;
  isDm: boolean;
  mapLoading: boolean;
};

import { useState, useEffect } from "react";

export function VttFogControls({ mapId, isDm, mapLoading }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { updateFogData } = useVttFog(mapId);
  const { 
    activeTool, 
    setActiveTool, 
    fogToolType, 
    setFogToolType, 
    fogToolShape, 
    setFogToolShape,
    fogBrushSize,
    setFogBrushSize,
    fogBrushSmoothness,
    setFogBrushSmoothness,
    dmHideFog,
    setDmHideFog
  } = useVttStore();

  // Open menu when tool is selected from outside, close when another tool is selected
  useEffect(() => {
    if (activeTool === "fog") {
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  }, [activeTool]);

  if (!isDm || !mapId) return null;

  return (
    <Popover 
      open={menuOpen} 
      onOpenChange={(open) => {
        setMenuOpen(open);
        if (open && activeTool !== "fog") {
          setActiveTool("fog");
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-muted-foreground",
            activeTool === "fog" && "bg-accent text-accent-foreground"
          )}
          onClick={(e) => {
            // If it's already the active tool, we just let the Popover toggle handle the menu
            // But Radix handles the click automatically. We just need to make sure we don't interfere.
            // Actually, clicking the trigger when it's open will close it (onOpenChange(false)).
            // Clicking when closed will open it (onOpenChange(true)).
            // So we don't strictly need an onClick here.
          }}
          disabled={mapLoading}
          title="Fog of War"
          aria-label="Fog of War tools"
        >
          <CloudFog className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="center" sideOffset={8}>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium leading-none">Fog of War</p>
                <div className="flex items-center gap-2">
                  <Label htmlFor="vtt-dm-hide-fog" className="text-xs text-muted-foreground whitespace-nowrap">DM Hide</Label>
                  <Switch
                    id="vtt-dm-hide-fog"
                    checked={dmHideFog}
                    onCheckedChange={setDmHideFog}
                    className="scale-75 data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mask areas from players or reveal the map.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={fogToolType === "reveal" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFogToolType("reveal")}
              >
                <Eye className="h-4 w-4 mr-2" />
                Reveal
              </Button>
              <Button
                variant={fogToolType === "hide" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFogToolType("hide")}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Hide
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Shape</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant={fogToolShape === "brush" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFogToolShape("brush")}
                >
                  <MousePointer2 className="h-4 w-4 mr-2" />
                  Brush
                </Button>
                <Button
                  variant={fogToolShape === "rect" ? "secondary" : "ghost"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFogToolShape("rect")}
                >
                  <div className="w-3 h-3 border border-current rounded-sm mr-2" />
                  Rectangle
                </Button>
              </div>
            </div>

            {fogToolShape === "brush" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="vtt-fog-size" className="text-xs text-muted-foreground">Brush Size (px)</Label>
                  <Input
                    id="vtt-fog-size"
                    type="number"
                    min={1}
                    max={500}
                    step={1}
                    value={fogBrushSize || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setFogBrushSize(0);
                      } else {
                        const n = parseInt(val, 10);
                        if (Number.isFinite(n)) setFogBrushSize(n);
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vtt-fog-smooth" className="text-xs text-muted-foreground">Smoothness (Distance)</Label>
                  <Input
                    id="vtt-fog-smooth"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={fogBrushSmoothness === 0 ? "0" : (fogBrushSmoothness || "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setFogBrushSmoothness(0);
                      } else {
                        const n = parseInt(val, 10);
                        if (Number.isFinite(n)) setFogBrushSmoothness(n);
                      }
                    }}
                  />
                </div>
              </>
            )}

            <div className="border-t pt-4 space-y-2">
              <Label className="text-xs text-muted-foreground">Global Actions</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => updateFogData({ shapes: [], revealed: false })}
                >
                  Fog All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => updateFogData({ shapes: [], revealed: true })}
                >
                  Unfog All
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
    </Popover>
  );
}
