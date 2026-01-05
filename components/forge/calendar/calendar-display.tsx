"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CampaignCalendar, CalendarEvent } from "@/hooks/useForgeContent";
import { cn } from "@/lib/utils";

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

const MOON_PHASE_CYCLE: MoonPhase[] = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

const DAYS_PER_MONTH = 30;
const DAYS_PER_WEEK = 7;
const MOON_CYCLE_DAYS = 28;

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

// Get ordinal suffix for day numbers (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}

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

const SEASON_EMOJI: Record<'spring' | 'summer' | 'autumn' | 'winter', string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍂',
  winter: '❄️',
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

  // Calculate which weekday the first day of the month falls on
  // We need to calculate from the calendar's current date
  const currentDayOfWeek = calendar.day_of_week;
  const currentDay = calendar.current_day;
  const currentMonth = calendar.current_month;
  const currentYear = calendar.current_year;

  // Get month name (use custom names if available, otherwise use default real month names)
  const monthName = calendar.custom_month_names && calendar.custom_month_names.length > 0
    ? calendar.custom_month_names[displayMonth - 1] || DEFAULT_MONTH_NAMES[displayMonth - 1] || `Month ${displayMonth}`
    : DEFAULT_MONTH_NAMES[displayMonth - 1] || `Month ${displayMonth}`;

  // Get current month name for display
  const currentMonthName = calendar.custom_month_names && calendar.custom_month_names.length > 0
    ? calendar.custom_month_names[currentMonth - 1] || DEFAULT_MONTH_NAMES[currentMonth - 1] || `Month ${currentMonth}`
    : DEFAULT_MONTH_NAMES[currentMonth - 1] || `Month ${currentMonth}`;

  // Get weekday names
  const weekdayNames = calendar.custom_weekday_names && calendar.custom_weekday_names.length >= 7
    ? calendar.custom_weekday_names
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get current weekday name
  const currentWeekdayName = calendar.custom_weekday_names && calendar.custom_weekday_names.length > 0
    ? calendar.custom_weekday_names[calendar.day_of_week - 1] || `Day ${calendar.day_of_week}`
    : `Day ${calendar.day_of_week}`;

  // Calculate days from current date to first day of viewing month
  const daysToFirstOfMonth = useMemo(() => {
    if (currentYear === displayYear && currentMonth === displayMonth) {
      // Same month - first day is at position (currentDay - 1) days before current day
      return -(currentDay - 1);
    } else {
      // Different month - need to calculate
      // For simplicity, assume 30 days per month
      if (displayYear > currentYear) {
        const yearsDiff = displayYear - currentYear;
        const monthsDiff = displayMonth - currentMonth + (yearsDiff * 12);
        const totalDays = monthsDiff * DAYS_PER_MONTH - (currentDay - 1);
        return totalDays;
      } else if (displayYear < currentYear) {
        const yearsDiff = currentYear - displayYear;
        const monthsDiff = currentMonth - displayMonth + (yearsDiff * 12);
        const totalDays = -(monthsDiff * DAYS_PER_MONTH + (currentDay - 1));
        return totalDays;
      } else {
        // Same year
        const monthsDiff = displayMonth - currentMonth;
        const totalDays = monthsDiff * DAYS_PER_MONTH - (currentDay - 1);
        return totalDays;
      }
    }
  }, [currentYear, currentMonth, currentDay, displayYear, displayMonth]);

  const firstDayOfWeek = ((currentDayOfWeek - 1 + daysToFirstOfMonth) % DAYS_PER_WEEK + DAYS_PER_WEEK) % DAYS_PER_WEEK;

  // Helper function to calculate days between two dates in the calendar system
  const calculateDaysBetween = useCallback((year1: number, month1: number, day1: number, year2: number, month2: number, day2: number): number => {
    // Convert to total days from a base date (year 1, month 1, day 1)
    // Assuming 12 months per year, 30 days per month
    const days1 = (year1 - 1) * 360 + (month1 - 1) * DAYS_PER_MONTH + (day1 - 1);
    const days2 = (year2 - 1) * 360 + (month2 - 1) * DAYS_PER_MONTH + (day2 - 1);
    return days2 - days1;
  }, []);

  // Helper function to get events for a specific day
  const getEventsForDay = useCallback((year: number, month: number, day: number): CalendarEvent[] => {
    return events.filter(event => {
      // Check if event matches this exact date
      if (!event.is_repeatable) {
        return event.event_year === year && event.event_month === month && event.event_day === day;
      }
      
      // Check if we're before the event start date
      const daysFromEvent = calculateDaysBetween(event.event_year, event.event_month, event.event_day, year, month, day);
      if (daysFromEvent < 0) return false;
      
      // Check if we're past the end date (if set)
      if (event.repeat_end_year && event.repeat_end_month && event.repeat_end_day) {
        const daysFromEnd = calculateDaysBetween(event.repeat_end_year, event.repeat_end_month, event.repeat_end_day, year, month, day);
        if (daysFromEnd < 0) return false;
      }
      
      // For repeatable events, check if this day matches the pattern
      if (event.repeat_type === 'yearly') {
        // Yearly: same month and day, and days difference is a multiple of (360 * interval)
        const yearDiff = year - event.event_year;
        return event.event_month === month && event.event_day === day && yearDiff >= 0 && yearDiff % event.repeat_interval === 0;
      } else if (event.repeat_type === 'monthly') {
        // Monthly: same day of month, and months difference is a multiple of interval
        const monthDiff = (year - event.event_year) * 12 + (month - event.event_month);
        return event.event_day === day && monthDiff >= 0 && monthDiff % event.repeat_interval === 0;
      } else if (event.repeat_type === 'weekly') {
        // Weekly: days difference is a multiple of (7 * interval)
        return daysFromEvent % (7 * event.repeat_interval) === 0;
      } else if (event.repeat_type === 'daily') {
        // Daily: days difference is a multiple of interval
        return daysFromEvent % event.repeat_interval === 0;
      }
      
      return false;
    });
  }, [events, calculateDaysBetween]);

  // Generate all days for the month
  const days = useMemo(() => {
    const daysList = [];
    for (let day = 1; day <= DAYS_PER_MONTH; day++) {
      const weekday = (firstDayOfWeek + day - 1) % DAYS_PER_WEEK;
      const isCurrentDay = displayMonth === currentMonth && displayYear === currentYear && day === currentDay;
      
      // Calculate days from calendar's current date
      const daysFromCurrent = daysToFirstOfMonth + (day - 1);
      
      // Calculate moon phase for this day
      const moonPhase = calculateMoonPhase(
        calendar.moon_phase_day,
        calendar.moon_phase,
        daysFromCurrent
      );

      // Get events for this day
      const dayEvents = getEventsForDay(displayYear, displayMonth, day);

      daysList.push({
        day,
        weekday,
        isCurrentDay,
        moonPhase,
        daysFromCurrent,
        events: dayEvents,
      });
    }
    return daysList;
  }, [firstDayOfWeek, displayMonth, displayYear, currentMonth, currentYear, currentDay, daysToFirstOfMonth, calendar.moon_phase_day, calendar.moon_phase, getEventsForDay]);

  // Create grid rows with proper padding
  const gridRows = useMemo(() => {
    const rows: (typeof days[0] | null)[][] = [];
    let currentRow: (typeof days[0] | null)[] = [];
    
    // Add empty cells for the first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentRow.push(null);
    }
    
    // Add all days
    days.forEach(day => {
      currentRow.push(day);
      if (currentRow.length === DAYS_PER_WEEK) {
        rows.push(currentRow);
        currentRow = [];
      }
    });
    
    // Fill last row with empty cells if needed
    if (currentRow.length > 0) {
      while (currentRow.length < DAYS_PER_WEEK) {
        currentRow.push(null);
      }
      rows.push(currentRow);
    }
    
    return rows;
  }, [days, firstDayOfWeek]);

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
      {/* Current Date Display */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Current Date: {calendar.current_day}{getOrdinalSuffix(calendar.current_day)} of {currentMonthName}, Year {calendar.current_year}
        </p>
      </div>

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

      {/* Calendar Grid */}
      <Card>
        <div className="p-4">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekdayNames.map((weekday, index) => (
              <div
                key={index}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {weekday}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="space-y-2">
            {gridRows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-7 gap-2">
                {row.map((dayData, colIndex) => {
                  if (dayData === null) {
                    return <div key={`empty-${rowIndex}-${colIndex}`} className="aspect-[4/5]" />;
                  }
                  // Get weather for this day
                  const dateKey = `${displayYear}-${displayMonth}-${dayData.day}`;
                  const dayWeather = calendar.weather?.[dateKey] || null;
                  const daySeason = showSeasons ? getSeasonFromMonth(displayMonth, calendar.custom_season_months) : null;

                  return (
                    <DayCard
                      key={dayData.day}
                      day={dayData.day}
                      weekday={weekdayNames[dayData.weekday]}
                      moonPhase={dayData.moonPhase}
                      isCurrentDay={dayData.isCurrentDay}
                      events={dayData.events || []}
                      onClick={() => onDayClick?.(dayData.day)}
                      weather={dayWeather}
                      season={daySeason}
                      showWeather={showWeather}
                      showSeasons={showSeasons}
                      year={displayYear}
                      month={displayMonth}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

interface DayCardProps {
  day: number;
  weekday: string;
  moonPhase: MoonPhase;
  isCurrentDay: boolean;
  events?: CalendarEvent[];
  onClick?: () => void;
  weather?: { type: string; temperature?: number; description?: string } | null;
  season?: 'spring' | 'summer' | 'autumn' | 'winter' | null;
  showWeather?: boolean;
  showSeasons?: boolean;
  year: number;
  month: number;
}

function DayCard({ 
  day, 
  weekday, 
  moonPhase, 
  isCurrentDay, 
  events = [], 
  onClick,
  weather,
  season,
  showWeather = false,
  showSeasons = false,
}: DayCardProps) {
  return (
    <Card
      className={cn(
        "aspect-[4/5] p-2 cursor-pointer transition-all hover:shadow-md",
        isCurrentDay && "ring-2 ring-primary shadow-lg"
      )}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {/* Day Number and Season */}
        <div className="flex items-start justify-between mb-1">
          <div className={cn(
            "text-sm font-semibold",
            isCurrentDay ? "text-primary" : "text-foreground"
          )}>
            {day}
          </div>
          {/* Season Name (top right) */}
          {showSeasons && season && (
            <div className="text-xs text-muted-foreground">
              {SEASON_LABELS[season]}
            </div>
          )}
        </div>

        {/* Moon Phase */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-2xl" title={MOON_PHASE_LABELS[moonPhase]}>
            {MOON_PHASE_EMOJI[moonPhase]}
          </div>
        </div>

        {/* Events */}
        {events.length > 0 && (
          <div className="flex flex-col gap-0.5 mb-1 min-h-0 overflow-hidden">
            {events.slice(0, 2).map((event) => (
              <div
                key={event.id}
                className="text-[10px] leading-tight px-1 py-0.5 rounded truncate"
                style={{ 
                  backgroundColor: event.color + '40',
                  color: event.color,
                  borderLeft: `2px solid ${event.color}`
                }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {events.length > 2 && (
              <div className="text-[10px] text-muted-foreground px-1">
                +{events.length - 2} more
              </div>
            )}
          </div>
        )}

        {/* Weather Icon and Weekday */}
        <div className="flex items-center justify-center gap-1.5 mt-auto flex-col">
          {/* Weather Icon (if enabled and available) */}
          {showWeather && weather && (
            <div className="text-sm" title={weather.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}>
              {WEATHER_EMOJI[weather.type] || '🌤️'}
            </div>
          )}
          
          {/* Weekday (below) */}
          <div className="text-xs text-muted-foreground text-center">
            {weekday}
          </div>
        </div>
      </div>
    </Card>
  );
}

