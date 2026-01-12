"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, Download } from "lucide-react";
import { createDungeon, renderDungeonToCanvas, type DungeonOptions, type Dungeon, type MultiFloorDungeon } from "@/lib/utils/dungeon-generator";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TestDungeonPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dungeon, setDungeon] = useState<Dungeon | MultiFloorDungeon | null>(null);
  const [currentFloor, setCurrentFloor] = useState(0);
  const [options, setOptions] = useState<DungeonOptions>({
    seed: Date.now(),
    n_rows: 39,
    n_cols: 39,
    dungeon_layout: 'None',
    room_min: 3,
    room_max: 9,
    room_layout: 'Packed',
    corridor_layout: 'Bent',
    remove_deadends: 50,
    add_stairs: 2,
    cell_size: 18,
    floors: 1,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const generateDungeon = () => {
    setIsGenerating(true);
    const newSeed = Date.now();
    const newOptions = {
      ...options,
      seed: newSeed,
    };
    setOptions(newOptions);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const newDungeon = createDungeon(newOptions);
      setDungeon(newDungeon);
      setIsGenerating(false);
    }, 10);
  };

  useEffect(() => {
    if (dungeon && canvasRef.current) {
      // Handle multi-floor dungeon
      if ('floors' in dungeon) {
        const floor = dungeon.floors[currentFloor];
        if (floor) {
          renderDungeonToCanvas(floor, canvasRef.current);
        }
      } else {
        // Single floor dungeon
        renderDungeonToCanvas(dungeon, canvasRef.current);
      }
    }
  }, [dungeon, currentFloor]);

  useEffect(() => {
    // Generate initial dungeon
    generateDungeon();
  }, []);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const seed = 'floors' in (dungeon || {}) ? dungeon.seed : dungeon?.seed || Date.now();
    const floorSuffix = 'floors' in (dungeon || {}) ? `-floor-${currentFloor + 1}` : '';
    const link = document.createElement('a');
    link.download = `dungeon-${seed}${floorSuffix}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  const isMultiFloor = dungeon && 'floors' in dungeon;
  const numFloors = isMultiFloor ? dungeon.floors.length : 1;
  const currentDungeon = isMultiFloor ? dungeon.floors[currentFloor] : (dungeon as Dungeon | null);
  
  const handlePrevFloor = () => {
    if (currentFloor > 0) {
      setCurrentFloor(currentFloor - 1);
    }
  };
  
  const handleNextFloor = () => {
    if (isMultiFloor && currentFloor < dungeon.floors.length - 1) {
      setCurrentFloor(currentFloor + 1);
    }
  };


  return (
    <div className="container mx-auto p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dungeon Generator</h1>
          <p className="text-muted-foreground text-sm">
            Random dungeon generator
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Controls Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="space-y-1.5">
                <Label htmlFor="seed" className="text-sm">Seed</Label>
                <Input
                  id="seed"
                  type="number"
                  className="h-8 text-sm"
                  value={options.seed || ''}
                  onChange={(e) => setOptions({ ...options, seed: parseInt(e.target.value) || undefined })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="layout" className="text-sm">Dungeon Layout</Label>
                <Select
                  value={options.dungeon_layout || 'None'}
                  onValueChange={(value: 'None' | 'Box' | 'Cross' | 'Round') =>
                    setOptions({ ...options, dungeon_layout: value })
                  }
                >
                  <SelectTrigger id="layout" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Cross">Cross</SelectItem>
                    <SelectItem value="Round">Round</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="room-layout" className="text-sm">Room Layout</Label>
                <Select
                  value={options.room_layout || 'Packed'}
                  onValueChange={(value: 'Packed' | 'Scattered') =>
                    setOptions({ ...options, room_layout: value })
                  }
                >
                  <SelectTrigger id="room-layout" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Packed">Packed</SelectItem>
                    <SelectItem value="Scattered">Scattered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="corridor-layout" className="text-sm">Corridor Layout</Label>
                <Select
                  value={options.corridor_layout || 'Bent'}
                  onValueChange={(value: 'Labyrinth' | 'Bent' | 'Straight') =>
                    setOptions({ ...options, corridor_layout: value })
                  }
                >
                  <SelectTrigger id="corridor-layout" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Labyrinth">Labyrinth</SelectItem>
                    <SelectItem value="Bent">Bent</SelectItem>
                    <SelectItem value="Straight">Straight</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="size" className="text-sm">Size: {options.n_rows}x{options.n_cols}</Label>
                <Input
                  id="size"
                  type="number"
                  className="h-8 text-sm"
                  min="21"
                  max="99"
                  step="2"
                  value={options.n_rows || 39}
                  onChange={(e) => {
                    const size = Math.max(21, Math.min(99, parseInt(e.target.value) || 39));
                    // Ensure odd
                    const oddSize = size % 2 === 0 ? size + 1 : size;
                    setOptions({ ...options, n_rows: oddSize, n_cols: oddSize });
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="room-min" className="text-sm">Min Room: {options.room_min}</Label>
                </div>
                <Slider
                  id="room-min"
                  min={2}
                  max={6}
                  step={1}
                  value={[options.room_min || 3]}
                  onValueChange={([value]) => setOptions({ ...options, room_min: value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="room-max" className="text-sm">Max Room: {options.room_max}</Label>
                </div>
                <Slider
                  id="room-max"
                  min={5}
                  max={15}
                  step={1}
                  value={[options.room_max || 9]}
                  onValueChange={([value]) => setOptions({ ...options, room_max: value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="deadends" className="text-sm">Deadends: {options.remove_deadends}%</Label>
                </div>
                <Slider
                  id="deadends"
                  min={0}
                  max={100}
                  step={10}
                  value={[options.remove_deadends || 50]}
                  onValueChange={([value]) => setOptions({ ...options, remove_deadends: value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="stairs" className="text-sm">Stairs: {options.add_stairs}</Label>
                </div>
                <Slider
                  id="stairs"
                  min={0}
                  max={5}
                  step={1}
                  value={[options.add_stairs || 2]}
                  onValueChange={([value]) => setOptions({ ...options, add_stairs: value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="cell-size" className="text-sm">Cell Size: {options.cell_size}px</Label>
                </div>
                <Slider
                  id="cell-size"
                  min={10}
                  max={30}
                  step={2}
                  value={[options.cell_size || 18]}
                  onValueChange={([value]) => setOptions({ ...options, cell_size: value })}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <Label htmlFor="floors" className="text-sm">Floors: {options.floors || 1}</Label>
                </div>
                <Slider
                  id="floors"
                  min={1}
                  max={5}
                  step={1}
                  value={[options.floors || 1]}
                  onValueChange={([value]) => {
                    setOptions({ ...options, floors: value });
                    setCurrentFloor(0); // Reset to first floor
                  }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  onClick={generateDungeon}
                  disabled={isGenerating}
                  className="flex-1 h-8 text-sm"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-3 w-3" />
                      Generate
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownload}
                  disabled={!dungeon}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Canvas Display */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {isMultiFloor ? `Floor ${currentFloor + 1} of ${numFloors}` : 'Generated Dungeon'}
                </CardTitle>
                {isMultiFloor && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevFloor}
                      disabled={currentFloor === 0}
                      className="h-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                      {currentFloor + 1} / {numFloors}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextFloor}
                      disabled={currentFloor >= numFloors - 1}
                      className="h-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg bg-white p-2 overflow-auto max-h-[calc(100vh-150px)]">
                <canvas
                  ref={canvasRef}
                  className="mx-auto"
                  style={{ display: 'block' }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

