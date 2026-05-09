"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCampaignCalendarLive } from "@/hooks/useCampaignCalendarLive";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, Sun, Moon, Sunrise, Sunset, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string | null;
  isDm: boolean;
}

const DEFAULT_MONTHS = [
  "First-Month",
  "Second-Month",
  "Third-Month",
  "Fourth-Month",
  "Fifth-Month",
  "Sixth-Month",
  "Seventh-Month",
  "Eighth-Month",
  "Ninth-Month",
  "Tenth-Month",
  "Eleventh-Month",
  "Twelfth-Month",
];

const DEFAULT_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Pick an icon based on the in-world clock so the HUD reads at a glance. */
function timeIcon(hour: number) {
  if (hour < 5 || hour >= 21) return Moon;
  if (hour < 7) return Sunrise;
  if (hour < 18) return Sun;
  return Sunset;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * Date / time HUD for the VTT — small floating widget that shows the
 * current in-world date + clock to all players, with DM-only quick
 * advance buttons (1h / 8h / 1d / 1w). Subscribes to realtime so all
 * clients see the same time.
 */
export function VttTimeHud({ campaignId, isDm }: Props) {
  const { calendar, setCalendar } = useCampaignCalendarLive(campaignId);

  const monthName = useMemo(() => {
    if (!calendar) return "";
    const names =
      calendar.custom_month_names.length > 0
        ? calendar.custom_month_names
        : DEFAULT_MONTHS;
    return names[(calendar.current_month - 1 + names.length) % names.length];
  }, [calendar]);
  const weekdayName = useMemo(() => {
    if (!calendar) return "";
    const names =
      calendar.custom_weekday_names.length > 0
        ? calendar.custom_weekday_names
        : DEFAULT_WEEKDAYS;
    return names[(calendar.day_of_week - 1 + names.length) % names.length];
  }, [calendar]);

  if (!campaignId) return null;
  if (!calendar) {
    if (!isDm) return null;
    return (
      <div
        className="rounded-md border border-border bg-card/95 px-2 py-1 text-[10px] text-muted-foreground shadow-lg backdrop-blur"
      >
        No calendar set — open the Forge → Calendar tab to create one.
      </div>
    );
  }

  const Icon = timeIcon(calendar.current_hour);
  const monthCount =
    calendar.custom_month_names.length > 0
      ? calendar.custom_month_names.length
      : 12;
  const weekdayCount =
    calendar.custom_weekday_names.length > 0
      ? calendar.custom_weekday_names.length
      : 7;

  const advance = async (hours: number) => {
    const supabase = createClient();
    let h = calendar.current_hour + hours;
    let day = calendar.current_day;
    let month = calendar.current_month;
    let year = calendar.current_year;
    let weekday = calendar.day_of_week;
    const minutesNow = calendar.current_minute;
    while (h >= 24) {
      h -= 24;
      day += 1;
      weekday = ((weekday - 1 + 1) % weekdayCount) + 1;
      // Days-per-month is approximated as 30 since we don't have a per-month
      // length config. The Forge calendar tab uses the same approximation
      // for its day advance.
      if (day > 30) {
        day = 1;
        month += 1;
        if (month > monthCount) {
          month = 1;
          year += 1;
        }
      }
    }
    while (h < 0) {
      h += 24;
      day -= 1;
      weekday = ((weekday - 1 - 1 + weekdayCount) % weekdayCount) + 1;
      if (day < 1) {
        month -= 1;
        if (month < 1) {
          month = monthCount;
          year -= 1;
        }
        day = 30;
      }
    }
    // Optimistic update so other consumers (day-cycle emblem, etc.) flip
    // immediately without waiting for the realtime round-trip.
    setCalendar({
      ...calendar,
      current_hour: h,
      current_minute: minutesNow,
      current_day: day,
      current_month: month,
      current_year: year,
      day_of_week: weekday,
    });

    const { error } = await supabase
      .from("campaign_calendar")
      .update({
        current_hour: h,
        current_minute: minutesNow,
        current_day: day,
        current_month: month,
        current_year: year,
        day_of_week: weekday,
      } as never)
      .eq("id", calendar.id);
    if (error) {
      console.error("Failed to advance time:", error);
      toast.error("Couldn't advance time");
      setCalendar(calendar);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-amber-500/30",
            "bg-card/90 backdrop-blur px-2 py-1 text-xs shadow-lg hover:bg-amber-500/10",
            "transition-colors"
          )}
          title="In-world time — click for advance controls"
        >
          <Icon className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-mono tabular-nums text-foreground">
            {pad2(calendar.current_hour)}:{pad2(calendar.current_minute)}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-foreground capitalize">{weekdayName}</span>
          <span className="text-muted-foreground">
            {calendar.current_day}{" "}
            {monthName}{" "}
            <span className="text-amber-400">{calendar.current_year}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-72 border-amber-500/30 bg-popover"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            <p
              className="text-xs font-bold text-amber-400"
              style={{ fontVariant: "small-caps" }}
            >
              In-world time
            </p>
          </div>
          <div className="rounded border border-border bg-muted/30 p-3 text-center font-serif">
            <p className="text-2xl font-bold text-amber-300 tabular-nums">
              {pad2(calendar.current_hour)}:{pad2(calendar.current_minute)}
            </p>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {weekdayName}, {calendar.current_day} {monthName} {calendar.current_year}
            </p>
            {calendar.season && (
              <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                {calendar.season}
              </p>
            )}
          </div>
          {isDm ? (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Advance
              </p>
              <div className="grid grid-cols-2 gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void advance(1)}
                >
                  <Plus className="h-3 w-3 mr-1" />1 hour
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void advance(8)}
                >
                  <Plus className="h-3 w-3 mr-1" />8 hours
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void advance(24)}
                >
                  <Plus className="h-3 w-3 mr-1" />1 day
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void advance(24 * 7)}
                >
                  <Plus className="h-3 w-3 mr-1" />1 week
                </Button>
              </div>
              <p className="text-[10px] italic text-muted-foreground">
                Date math approximates 30 days/month. Use the Forge calendar
                tab for fine-grained edits.
              </p>
            </div>
          ) : (
            <p className="text-[10px] italic text-muted-foreground text-center">
              Only the DM can change the time.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
