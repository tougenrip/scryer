"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignCalendar, CalendarEvent } from "@/hooks/useForgeContent";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_DAYS_PER_MONTH,
  getEventsOccurringOnDay,
} from "@/lib/calendar-campaign-dates";

interface CalendarDisplayProps {
  calendar: CampaignCalendar;
  viewingMonth?: number;
  viewingYear?: number;
  onMonthChange?: (month: number, year: number) => void;
  onYearChange?: (year: number) => void;
  onDayClick?: (day: number) => void;
  events?: CalendarEvent[];
  isDm?: boolean;
  showWeather?: boolean;
  showSeasons?: boolean;
}

type MoonPhase = 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' | 'full' | 'waning_gibbous' | 'last_quarter' | 'waning_crescent';

const MOON_CYCLE_DAYS = 28;
/** 10-column “tenday” grid: 3 rows × 10 = 30-day campaign months */
const GRID_COLUMNS = 10;
const COLUMN_HEADERS = [
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
  "SUN",
  "MOON",
  "STAR",
  "VOID",
] as const;

// Calculate moon phase for a specific day
// Each phase lasts approximately 3.5 days in a 28-day cycle
function calculateMoonPhase(
  baseMoonPhaseDay: number | null,
  baseMoonPhase: MoonPhase | null,
  daysFromBase: number
): MoonPhase {
  // Calculate the day in the moon cycle (0-27)
  let cycleDay: number;
  
  if (baseMoonPhaseDay === null || baseMoonPhase === null) {
    // Default: start from day 0 (new moon) if no base phase
    cycleDay = (daysFromBase % MOON_CYCLE_DAYS + MOON_CYCLE_DAYS) % MOON_CYCLE_DAYS;
  } else {
    // Calculate from the base moon phase day
    // baseMoonPhaseDay is 1-28, convert to 0-27
    const baseDay = baseMoonPhaseDay - 1;
    cycleDay = (baseDay + daysFromBase) % MOON_CYCLE_DAYS;
    if (cycleDay < 0) cycleDay += MOON_CYCLE_DAYS;
  }

  // Map cycle day (0-27) to phase
  // Each phase is approximately 3.5 days
  // 0-3: new, 4-7: waxing_crescent, 8-10: first_quarter, 11-13: waxing_gibbous
  // 14-17: full, 18-20: waning_gibbous, 21-23: last_quarter, 24-27: waning_crescent
  if (cycleDay <= 3) return 'new';
  if (cycleDay <= 7) return 'waxing_crescent';
  if (cycleDay <= 10) return 'first_quarter';
  if (cycleDay <= 13) return 'waxing_gibbous';
  if (cycleDay <= 17) return 'full';
  if (cycleDay <= 20) return 'waning_gibbous';
  if (cycleDay <= 23) return 'last_quarter';
  return 'waning_crescent';
}

// Moon phase emoji/icons
const MOON_PHASE_EMOJI: Record<MoonPhase, string> = {
  new: '🌑',
  waxing_crescent: '🌒',
  first_quarter: '🌓',
  waxing_gibbous: '🌔',
  full: '🌕',
  waning_gibbous: '🌖',
  last_quarter: '🌗',
  waning_crescent: '🌘',
};

const MOON_PHASE_LABELS: Record<MoonPhase, string> = {
  new: 'New',
  waxing_crescent: 'Waxing Crescent',
  first_quarter: 'First Quarter',
  waxing_gibbous: 'Waxing Gibbous',
  full: 'Full',
  waning_gibbous: 'Waning Gibbous',
  last_quarter: 'Last Quarter',
  waning_crescent: 'Waning Crescent',
};

// Default month names
const DEFAULT_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Calculate season from month using custom season months if available
function getSeasonFromMonth(
  month: number,
  customSeasonMonths?: Record<'spring' | 'summer' | 'autumn' | 'winter', number[]>
): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (customSeasonMonths) {
    for (const [season, months] of Object.entries(customSeasonMonths)) {
      if (months.includes(month)) {
        return season as 'spring' | 'summer' | 'autumn' | 'winter';
      }
    }
  }
  
  // Default fallback (12 months, 3 months per season)
  if (month >= 1 && month <= 3) return 'winter';
  if (month >= 4 && month <= 6) return 'spring';
  if (month >= 7 && month <= 9) return 'summer';
  return 'autumn';
}

const SEASON_LABELS: Record<'spring' | 'summer' | 'autumn' | 'winter', string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

const WEATHER_EMOJI: Record<string, string> = {
  clear: '☀️',
  partly_cloudy: '⛅',
  cloudy: '☁️',
  rainy: '🌧️',
  stormy: '⛈️',
  snowy: '❄️',
  foggy: '🌫️',
  windy: '💨',
};

export function CalendarDisplay({
  calendar,
  viewingMonth,
  viewingYear,
  onMonthChange,
  onYearChange,
  onDayClick,
  events = [],
  isDm = false,
  showWeather = false,
  showSeasons = false,
}: CalendarDisplayProps) {
  // Use viewing month/year or current calendar month/year
  const displayMonth = viewingMonth ?? calendar.current_month;
  const displayYear = viewingYear ?? calendar.current_year;
  
  // State for editing year
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [editYearValue, setEditYearValue] = useState(displayYear.toString());
  
  // Sync edit value when displayYear changes
  useEffect(() => {
    if (!isEditingYear) {
      setEditYearValue(displayYear.toString());
    }
  }, [displayYear, isEditingYear]);

  const currentDay = calendar.current_day;
  const currentMonth = calendar.current_month;
  const currentYear = calendar.current_year;

  // Get month name (use custom names if available, otherwise use default real month names)
  const monthName = calendar.custom_month_names && calendar.custom_month_names.length > 0
    ? calendar.custom_month_names[displayMonth - 1] || DEFAULT_MONTH_NAMES[displayMonth - 1] || `Month ${displayMonth}`
    : DEFAULT_MONTH_NAMES[displayMonth - 1] || `Month ${displayMonth}`;

  // Calculate days from current date to first day of viewing month
  const daysToFirstOfMonth = useMemo(() => {
    if (currentYear === displayYear && currentMonth === displayMonth) {
      return -(currentDay - 1);
    }
    if (displayYear > currentYear) {
      const yearsDiff = displayYear - currentYear;
      const monthsDiff = displayMonth - currentMonth + yearsDiff * 12;
      return monthsDiff * CAMPAIGN_DAYS_PER_MONTH - (currentDay - 1);
    }
    if (displayYear < currentYear) {
      const yearsDiff = currentYear - displayYear;
      const monthsDiff = currentMonth - displayMonth + yearsDiff * 12;
      return -(monthsDiff * CAMPAIGN_DAYS_PER_MONTH + (currentDay - 1));
    }
    const monthsDiff = displayMonth - currentMonth;
    return monthsDiff * CAMPAIGN_DAYS_PER_MONTH - (currentDay - 1);
  }, [currentYear, currentMonth, currentDay, displayYear, displayMonth]);

  // Generate all days for the month (30-day months in a 10×3 tenday grid)
  const days = useMemo(() => {
    const daysList: {
      day: number;
      isCurrentDay: boolean;
      isPastDay: boolean;
      moonPhase: MoonPhase;
      daysFromCurrent: number;
      events: CalendarEvent[];
    }[] = [];
    for (let day = 1; day <= CAMPAIGN_DAYS_PER_MONTH; day++) {
      const isCurrentDay =
        displayMonth === currentMonth &&
        displayYear === currentYear &&
        day === currentDay;
      const isPastDay =
        displayMonth === currentMonth &&
        displayYear === currentYear &&
        day < currentDay;

      const daysFromCurrent = daysToFirstOfMonth + (day - 1);

      const moonPhase = calculateMoonPhase(
        calendar.moon_phase_day,
        calendar.moon_phase,
        daysFromCurrent,
      );

      const dayEvents = getEventsOccurringOnDay(
        events,
        displayYear,
        displayMonth,
        day,
      );

      daysList.push({
        day,
        isCurrentDay,
        isPastDay,
        moonPhase,
        daysFromCurrent,
        events: dayEvents,
      });
    }
    return daysList;
  }, [
    displayMonth,
    displayYear,
    currentMonth,
    currentYear,
    currentDay,
    daysToFirstOfMonth,
    calendar.moon_phase_day,
    calendar.moon_phase,
    events,
  ]);

  const gridRows = useMemo(() => {
    const rows: (typeof days[0])[][] = [];
    for (let i = 0; i < days.length; i += GRID_COLUMNS) {
      rows.push(days.slice(i, i + GRID_COLUMNS));
    }
    return rows;
  }, [days]);

  // Handle month navigation
  const handlePreviousMonth = () => {
    let newMonth = displayMonth - 1;
    let newYear = displayYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    onMonthChange?.(newMonth, newYear);
  };

  const handleNextMonth = () => {
    let newMonth = displayMonth + 1;
    let newYear = displayYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    onMonthChange?.(newMonth, newYear);
  };

  const handleYearEdit = () => {
    if (isDm) {
      setIsEditingYear(true);
    }
  };

  const handleYearBlur = () => {
    const newYear = parseInt(editYearValue) || displayYear;
    if (newYear !== displayYear && newYear > 0) {
      // If onYearChange is provided, use it (for changing actual calendar year)
      // Otherwise use onMonthChange (for changing viewing year)
      if (onYearChange) {
        onYearChange(newYear);
      } else {
        onMonthChange?.(displayMonth, newYear);
      }
    } else {
      setEditYearValue(displayYear.toString());
    }
    setIsEditingYear(false);
  };

  const handleYearKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleYearBlur();
    } else if (e.key === "Escape") {
      setEditYearValue(displayYear.toString());
      setIsEditingYear(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Month/Year Header with Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePreviousMonth}
          disabled={!onMonthChange}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h3 className="text-2xl font-serif font-semibold">{monthName}</h3>
          {isEditingYear ? (
            <Input
              type="number"
              value={editYearValue}
              onChange={(e) => setEditYearValue(e.target.value)}
              onBlur={handleYearBlur}
              onKeyDown={handleYearKeyDown}
              autoFocus
              className="w-20 h-6 text-center text-sm mx-auto mt-1"
              min="1"
            />
          ) : (
            <p
              className={cn(
                "text-sm text-muted-foreground mt-1",
                isDm && "cursor-pointer hover:text-foreground transition-colors"
              )}
              onClick={handleYearEdit}
              title={isDm ? "Click to edit year" : undefined}
            >
              Year {displayYear}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleNextMonth}
          disabled={!onMonthChange}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* 10 × 3 tenday grid */}
      <div className="sc-card overflow-hidden" style={{ padding: 12 }}>
        <div
          className="mb-2 grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
          }}
        >
          {COLUMN_HEADERS.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground py-1.5"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          {gridRows.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
              }}
            >
              {row.map((dayData) => {
                const dateKey = `${displayYear}-${displayMonth}-${dayData.day}`;
                const dayWeather = calendar.weather?.[dateKey] || null;
                const daySeason = showSeasons
                  ? getSeasonFromMonth(displayMonth, calendar.custom_season_months)
                  : null;

                return (
                  <DayCard
                    key={dayData.day}
                    day={dayData.day}
                    moonPhase={dayData.moonPhase}
                    isCurrentDay={dayData.isCurrentDay}
                    isPastDay={dayData.isPastDay}
                    events={dayData.events || []}
                    onClick={() => onDayClick?.(dayData.day)}
                    weather={dayWeather}
                    season={daySeason}
                    showWeather={showWeather}
                    showSeasons={showSeasons}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DayCardProps {
  day: number;
  moonPhase: MoonPhase;
  isCurrentDay: boolean;
  isPastDay: boolean;
  events?: CalendarEvent[];
  onClick?: () => void;
  weather?: { type: string; temperature?: number; description?: string } | null;
  season?: "spring" | "summer" | "autumn" | "winter" | null;
  showWeather?: boolean;
  showSeasons?: boolean;
}

function DayCard({
  day,
  moonPhase,
  isCurrentDay,
  isPastDay,
  events = [],
  onClick,
  weather,
  season,
  showWeather = false,
  showSeasons = false,
}: DayCardProps) {
  return (
    <button
      type="button"
      className={cn(
        "sc-card sc-card-hover flex min-h-[100px] flex-col rounded-md p-1.5 text-left transition-colors",
        isCurrentDay && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isPastDay && !isCurrentDay && "bg-destructive/10",
      )}
      onClick={onClick}
    >
      <div className="mb-1 flex shrink-0 items-start justify-between gap-1">
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            isCurrentDay ? "text-primary" : "text-foreground",
          )}
        >
          {day}
        </span>
        <span
          className="text-sm leading-none opacity-90"
          title={MOON_PHASE_LABELS[moonPhase]}
        >
          {MOON_PHASE_EMOJI[moonPhase]}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {events.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {events.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className={cn(
                  "line-clamp-2 text-[9px] leading-tight",
                  /session/i.test(event.title)
                    ? "font-medium text-primary"
                    : "text-foreground/90",
                )}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {events.length > 2 && (
              <div className="text-[9px] text-muted-foreground">
                +{events.length - 2}
              </div>
            )}
          </div>
        ) : (
          showSeasons &&
          season && (
            <div className="text-[9px] text-muted-foreground opacity-80">
              {SEASON_LABELS[season]}
            </div>
          )
        )}
      </div>

      {showWeather && weather && (
        <div
          className="mt-auto shrink-0 text-center text-[11px]"
          title={weather.type
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())}
        >
          {WEATHER_EMOJI[weather.type] || "🌤️"}
        </div>
      )}
    </button>
  );
}

