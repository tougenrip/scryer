"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Settings, Plus, X, GripVertical } from "lucide-react";
import { CampaignCalendar } from "@/hooks/useForgeContent";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface CalendarMonthSettingsProps {
  calendar: CampaignCalendar;
  onUpdate: (
    monthNames: string[],
    seasonMonths?: Record<"spring" | "summer" | "autumn" | "winter", number[]>,
  ) => Promise<void>;
  isDm: boolean;
}

const DEFAULT_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DEFAULT_SEASON_MONTHS: Record<
  "spring" | "summer" | "autumn" | "winter",
  number[]
> = {
  spring: [4, 5, 6],
  summer: [7, 8, 9],
  autumn: [10, 11, 12],
  winter: [1, 2, 3],
};

const SEASON_KEYS = ["spring", "summer", "autumn", "winter"] as const;

/** @dnd-kit/utilities — `to` is index in the array *after* removing `from`. */
function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(
    to < 0 ? newArray.length + to : to,
    0,
    newArray.splice(from, 1)[0] as T,
  );
  return newArray;
}

/** Gap index 0..n for insertion line / drop target (before row k, or n = after last). */
function pointerYToLineIndex(
  clientY: number,
  rowElements: (HTMLElement | null)[],
): number {
  const rects = rowElements
    .map((el) => el?.getBoundingClientRect())
    .filter((r): r is DOMRect => r != null);
  const n = rects.length;
  if (n === 0) return 0;
  let raw = 0;
  for (let i = 0; i < n; i++) {
    const mid = rects[i].top + rects[i].height / 2;
    if (clientY >= mid) raw = i + 1;
  }
  return Math.min(raw, n);
}

/** Convert gap index (0..n) to `to` for `arrayMove` (index in list after removing `from`). */
function lineToArrayMoveIndex(from: number, line: number, n: number): number {
  let to = line;
  if (from < line) to -= 1;
  return Math.max(0, Math.min(to, n - 1));
}

export function CalendarMonthSettings({
  calendar,
  onUpdate,
  isDm,
}: CalendarMonthSettingsProps) {
  const [open, setOpen] = useState(false);
  const [monthNames, setMonthNames] = useState<string[]>([]);
  const [seasonMonths, setSeasonMonths] = useState<
    Record<"spring" | "summer" | "autumn" | "winter", number[]>
  >(DEFAULT_SEASON_MONTHS);
  /** Pointer-drag reorder (full-row preview + insertion line) */
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [insertLineAt, setInsertLineAt] = useState<number | null>(null);
  const [floatPos, setFloatPos] = useState({ x: 0, y: 0 });
  const [floatSize, setFloatSize] = useState({ w: 320, h: 40 });
  const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 });
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const draggingIndexRef = useRef<number | null>(null);
  const lineAtRef = useRef(0);

  useEffect(() => {
    if (calendar.custom_month_names && calendar.custom_month_names.length > 0) {
      setMonthNames([...calendar.custom_month_names]);
    } else {
      setMonthNames([...DEFAULT_MONTH_NAMES]);
    }

    if (calendar.custom_season_months) {
      setSeasonMonths({ ...calendar.custom_season_months });
    } else {
      setSeasonMonths({ ...DEFAULT_SEASON_MONTHS });
    }
  }, [calendar]);

  const handleSave = async () => {
    if (monthNames.length < 1) {
      toast.error("At least one month is required");
      return;
    }

    const allAssignedMonths = new Set<number>();
    Object.values(seasonMonths).forEach((months) => {
      months.forEach((month) => allAssignedMonths.add(month));
    });

    const totalMonths = monthNames.length;
    const missingMonths: number[] = [];
    for (let i = 1; i <= totalMonths; i++) {
      if (!allAssignedMonths.has(i)) {
        missingMonths.push(i);
      }
    }

    if (missingMonths.length > 0) {
      toast.error(
        `Months ${missingMonths.join(", ")} are not assigned to any season`,
      );
      return;
    }

    await onUpdate(monthNames, seasonMonths);
    setOpen(false);
    toast.success("Month and season settings updated");
  };

  const handleAddMonth = () => {
    setMonthNames([...monthNames, `Month ${monthNames.length + 1}`]);
  };

  const handleRemoveMonth = (index: number) => {
    if (monthNames.length <= 1) {
      toast.error("At least one month is required");
      return;
    }
    setMonthNames(monthNames.filter((_, i) => i !== index));
  };

  const handleMonthNameChange = (index: number, value: string) => {
    const newNames = [...monthNames];
    newNames[index] = value;
    setMonthNames(newNames);
  };

  const getMonthSeason = (
    monthNum: number,
  ): "spring" | "summer" | "autumn" | "winter" | null => {
    for (const [season, months] of Object.entries(seasonMonths)) {
      if (months.includes(monthNum)) {
        return season as "spring" | "summer" | "autumn" | "winter";
      }
    }
    return null;
  };

  const handleMonthSeasonChange = (
    monthNum: number,
    season: "spring" | "summer" | "autumn" | "winter",
  ) => {
    const newSeasonMonths = { ...seasonMonths };

    Object.keys(newSeasonMonths).forEach((s) => {
      newSeasonMonths[s as keyof typeof newSeasonMonths] = newSeasonMonths[
        s as keyof typeof newSeasonMonths
      ].filter((m) => m !== monthNum);
    });

    newSeasonMonths[season] = [...newSeasonMonths[season], monthNum].sort(
      (a, b) => a - b,
    );

    setSeasonMonths(newSeasonMonths);
  };

  useEffect(() => {
    if (draggingIndex === null) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      setFloatPos({ x: e.clientX, y: e.clientY });
      const line = pointerYToLineIndex(e.clientY, rowRefs.current);
      lineAtRef.current = line;
      setInsertLineAt(line);
    };

    const endDrag = () => {
      const from = draggingIndexRef.current;
      draggingIndexRef.current = null;
      setDraggingIndex(null);
      setInsertLineAt(null);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";

      if (from !== null) {
        setMonthNames((prev) => {
          const n = prev.length;
          const to = lineToArrayMoveIndex(from, lineAtRef.current, n);
          if (from === to) return prev;
          return arrayMove(prev, from, to);
        });
      }
    };

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", endDrag, { once: true });
    window.addEventListener("pointercancel", endDrag, { once: true });

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [draggingIndex]);

  const onGripPointerDown = (
    e: React.PointerEvent,
    index: number,
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const row = rowRefs.current[index];
    if (!row) return;
    const rect = row.getBoundingClientRect();
    draggingIndexRef.current = index;
    const line = pointerYToLineIndex(e.clientY, rowRefs.current);
    lineAtRef.current = line;
    setInsertLineAt(line);
    setDraggingIndex(index);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    setFloatSize({ w: rect.width, h: rect.height });
    setGrabOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setFloatPos({ x: e.clientX, y: e.clientY });
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  if (!isDm) return null;

  const seasonLabels: Record<
    "spring" | "summer" | "autumn" | "winter",
    string
  > = {
    spring: "Spring",
    summer: "Summer",
    autumn: "Autumn",
    winter: "Winter",
  };

  const seasonColors: Record<
    "spring" | "summer" | "autumn" | "winter",
    string
  > = {
    spring: "bg-green-500/15 border-green-500/40 text-green-700 dark:text-green-300",
    summer: "bg-yellow-500/15 border-yellow-500/40 text-yellow-700 dark:text-yellow-300",
    autumn: "bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300",
    winter: "bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-300",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Month Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl w-[95vw] overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Customize Months & Seasons</DialogTitle>
          <DialogDescription>
            Drag months to reorder. Seasons use month position numbers (1–
            {monthNames.length}).
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="months" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="months">Months</TabsTrigger>
            <TabsTrigger value="seasons">Seasons</TabsTrigger>
          </TabsList>

          <TabsContent value="months" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Use the grip to drag rows. Order is calendar order (top = first
              month of the year).
            </p>
            <div className="max-h-[min(52vh,420px)] space-y-0 overflow-y-auto rounded-md border border-border p-1">
              {monthNames.map((name, index) => (
                <Fragment key={`month-row-${index}`}>
                  {draggingIndex !== null &&
                    insertLineAt === index && (
                      <div
                        className="my-0.5 h-0.5 w-full rounded-full bg-primary"
                        aria-hidden
                      />
                    )}
                  <div
                    ref={(el) => {
                      rowRefs.current[index] = el;
                    }}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors",
                      draggingIndex === index && "bg-muted/20",
                    )}
                  >
                    <button
                      type="button"
                      className="touch-none cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                      aria-label={`Drag to reorder month ${index + 1}`}
                      onPointerDown={(e) => onGripPointerDown(e, index)}
                    >
                      <GripVertical className="h-4 w-4 shrink-0" />
                    </button>
                    <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {index + 1}.
                    </span>
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 items-center",
                        draggingIndex === index && "pointer-events-none opacity-0",
                      )}
                    >
                      <Input
                        value={name}
                        onChange={(e) =>
                          handleMonthNameChange(index, e.target.value)
                        }
                        placeholder={`Month ${index + 1}`}
                        className="h-8 w-full text-sm"
                      />
                    </div>
                    {monthNames.length > 1 && (
                      <div
                        className={cn(
                          "flex shrink-0",
                          draggingIndex === index &&
                            "pointer-events-none opacity-0",
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMonth(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </Fragment>
              ))}
              {draggingIndex !== null &&
                insertLineAt === monthNames.length && (
                  <div
                    className="my-0.5 h-0.5 w-full rounded-full bg-primary"
                    aria-hidden
                  />
                )}
            </div>
            <Button
              variant="outline"
              onClick={handleAddMonth}
              className="flex w-full items-center gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Month
            </Button>
          </TabsContent>

          <TabsContent value="seasons" className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Pick one season per month. Summary below updates live.
            </p>
            <div className="max-h-[min(40vh,320px)] space-y-1 overflow-y-auto pr-0.5">
              {monthNames.map((name, monthIndex) => {
                const monthNum = monthIndex + 1;
                const currentSeason = getMonthSeason(monthNum);

                return (
                  <div
                    key={`season-row-${monthIndex}`}
                    className="flex items-center gap-2 rounded-md border border-border/80 bg-card/50 px-2 py-1"
                  >
                    <span className="w-5 shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground">
                      {monthNum}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">
                      {name || `Month ${monthNum}`}
                    </span>
                    <Select
                      value={currentSeason ?? undefined}
                      onValueChange={(v) =>
                        handleMonthSeasonChange(
                          monthNum,
                          v as "spring" | "summer" | "autumn" | "winter",
                        )
                      }
                    >
                      <SelectTrigger size="sm" className="h-7 w-[118px] text-xs">
                        <SelectValue placeholder="Season" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEASON_KEYS.map((season) => (
                          <SelectItem key={season} value={season}>
                            {seasonLabels[season]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            <div className="space-y-1.5 border-t pt-2">
              <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Season summary
              </Label>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {SEASON_KEYS.map((season) => (
                  <div
                    key={season}
                    className={cn(
                      "rounded border px-2 py-1.5 text-[11px] leading-snug",
                      seasonColors[season],
                    )}
                  >
                    <div className="font-semibold">{seasonLabels[season]}</div>
                    <div className="mt-0.5 break-words text-muted-foreground">
                      {seasonMonths[season].length > 0 ? (
                        seasonMonths[season]
                          .map((m) => monthNames[m - 1] || `M${m}`)
                          .join(", ")
                      ) : (
                        <span className="italic opacity-80">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
      {typeof document !== "undefined" &&
        draggingIndex !== null &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] flex items-center gap-2 rounded-md border border-border bg-background px-1 py-0.5 shadow-lg"
            style={{
              left: floatPos.x - grabOffset.x,
              top: floatPos.y - grabOffset.y,
              width: floatSize.w,
              minHeight: floatSize.h,
            }}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {draggingIndex + 1}.
            </span>
            <div className="flex h-8 min-w-0 flex-1 items-center truncate rounded-md border border-input bg-background px-3 text-sm">
              {monthNames[draggingIndex] || `Month ${draggingIndex + 1}`}
            </div>
            {monthNames.length > 1 && (
              <div className="h-8 w-8 shrink-0" aria-hidden />
            )}
          </div>,
          document.body,
        )}
    </Dialog>
  );
}
