"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ChevronRight, Clock, Cloud } from "lucide-react";
import {
  useCampaignCalendar,
  useCreateCampaignCalendar,
  useUpdateCampaignCalendar,
  CampaignCalendar,
} from "@/hooks/useForgeContent";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarDisplay } from "./calendar-display";
import { CalendarMonthSettings } from "./calendar-month-settings";
import { CalendarDatePicker } from "./calendar-date-picker";
import { CalendarEventFormDialog } from "./calendar-event-form-dialog";
import { CalendarEventListDialog } from "./calendar-event-list-dialog";
import { CalendarWeatherManager } from "./calendar-weather-manager";
import { useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent, useDeleteCalendarEvent } from "@/hooks/useCalendarEvents";
import { createClient } from "@/lib/supabase/client";
import { CalendarEvent } from "@/hooks/useForgeContent";

interface CalendarTabProps {
  campaignId: string;
  isDm: boolean;
}

const DAYS_PER_MONTH = 30;
const DAYS_PER_WEEK = 7;
const MOON_CYCLE_DAYS = 28;

// Moon phase progression
const MOON_PHASES: CampaignCalendar['moon_phase'][] = [
  'new',
  'waxing_crescent',
  'first_quarter',
  'waxing_gibbous',
  'full',
  'waning_gibbous',
  'last_quarter',
  'waning_crescent',
];

export function CalendarTab({ campaignId, isDm }: CalendarTabProps) {
  const { calendar, loading, refetch } = useCampaignCalendar(campaignId);
  const { createCalendar } = useCreateCampaignCalendar();
  const { updateCalendar, loading: updating } = useUpdateCampaignCalendar();
  const [viewingMonth, setViewingMonth] = useState<number | undefined>(undefined);
  const [viewingYear, setViewingYear] = useState<number | undefined>(undefined);
  
  // Calendar events
  const { events, refetch: refetchEvents } = useCalendarEvents(campaignId);
  const { createEvent } = useCreateCalendarEvent();
  const { updateEvent } = useUpdateCalendarEvent();
  const { deleteEvent } = useDeleteCalendarEvent();
  
  // Event dialog state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventListDialogOpen, setEventListDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Weather and season display toggles
  const [showWeather, setShowWeather] = useState(false);
  const [showSeasons, setShowSeasons] = useState(false);
  const [weatherManagerOpen, setWeatherManagerOpen] = useState(false);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, []);

  const DEFAULT_MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handleInitialize = async () => {
    if (!calendar) {
      const result = await createCalendar({
        campaign_id: campaignId,
        custom_month_names: DEFAULT_MONTH_NAMES,
      });
      if (result.success) {
        toast.success("Calendar initialized");
        refetch();
      } else {
        toast.error("Failed to initialize calendar");
      }
    }
  };

  const handleMonthNamesUpdate = async (monthNames: string[], seasonMonths?: Record<'spring' | 'summer' | 'autumn' | 'winter', number[]>) => {
    if (!calendar) return;
    const updates: any = {
      custom_month_names: monthNames,
    };
    if (seasonMonths) {
      updates.custom_season_months = seasonMonths;
    }
    const result = await updateCalendar(calendar.id, updates);
    if (result.success) {
      refetch();
    } else {
      toast.error("Failed to update month settings");
    }
  };

  const handleMonthChange = (month: number, year: number) => {
    setViewingMonth(month);
    setViewingYear(year);
  };

  const handleGoToCurrentDate = () => {
    if (!calendar) return;
    setViewingMonth(calendar.current_month);
    setViewingYear(calendar.current_year);
  };

  const handleYearChange = async (year: number) => {
    if (!calendar || !isDm) return;
    const result = await updateCalendar(calendar.id, {
      current_year: year,
    });
    if (result.success) {
      toast.success(`Year updated to ${year}`);
      refetch();
      // Also update viewing year
      setViewingYear(year);
    } else {
      toast.error("Failed to update year");
    }
  };

  // Helper function to calculate days between two dates (simplified version)
  const calculateDaysBetween = (year1: number, month1: number, day1: number, year2: number, month2: number, day2: number): number => {
    const DAYS_PER_MONTH = 30;
    const days1 = (year1 - 1) * 360 + (month1 - 1) * DAYS_PER_MONTH + (day1 - 1);
    const days2 = (year2 - 1) * 360 + (month2 - 1) * DAYS_PER_MONTH + (day2 - 1);
    return days2 - days1;
  };

  const handleDayClick = (day: number) => {
    const month = viewingMonth ?? calendar?.current_month ?? 1;
    const year = viewingYear ?? calendar?.current_year ?? 1;
    setSelectedDay({ year, month, day });
    
    // Get events for this day (matching logic from calendar-display)
    const dayEvents = events.filter(event => {
      if (!event.is_repeatable) {
        return event.event_year === year && event.event_month === month && event.event_day === day;
      }
      
      const daysFromEvent = calculateDaysBetween(event.event_year, event.event_month, event.event_day, year, month, day);
      if (daysFromEvent < 0) return false;
      
      if (event.repeat_end_year && event.repeat_end_month && event.repeat_end_day) {
        const daysFromEnd = calculateDaysBetween(event.repeat_end_year, event.repeat_end_month, event.repeat_end_day, year, month, day);
        if (daysFromEnd < 0) return false;
      }
      
      if (event.repeat_type === 'yearly') {
        const yearDiff = year - event.event_year;
        return event.event_month === month && event.event_day === day && yearDiff >= 0 && yearDiff % event.repeat_interval === 0;
      } else if (event.repeat_type === 'monthly') {
        const monthDiff = (year - event.event_year) * 12 + (month - event.event_month);
        return event.event_day === day && monthDiff >= 0 && monthDiff % event.repeat_interval === 0;
      } else if (event.repeat_type === 'weekly') {
        return daysFromEvent % (7 * event.repeat_interval) === 0;
      } else if (event.repeat_type === 'daily') {
        return daysFromEvent % event.repeat_interval === 0;
      }
      
      return false;
    });
    
    if (dayEvents.length > 0) {
      // Show event list dialog if there are events
      setEventListDialogOpen(true);
    } else {
      // Show form dialog to create new event
      setSelectedEvent(null);
      setEventDialogOpen(true);
    }
  };

  const handleEventSave = async (eventData: {
    title: string;
    description: string | null;
    event_year: number;
    event_month: number;
    event_day: number;
    is_repeatable: boolean;
    repeat_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    repeat_interval: number;
    repeat_end_year: number | null;
    repeat_end_month: number | null;
    repeat_end_day: number | null;
    color: string;
  }) => {
    if (!calendar || !userId) return;
    
    if (selectedEvent) {
      const result = await updateEvent(selectedEvent.id, eventData);
      if (result.success) {
        toast.success("Event updated");
        refetchEvents();
        setEventDialogOpen(false);
        setSelectedEvent(null);
      } else {
        toast.error("Failed to update event");
      }
    } else {
      const result = await createEvent({
        campaign_id: campaignId,
        created_by: userId,
        ...eventData,
      });
      if (result.success) {
        toast.success("Event created");
        refetchEvents();
        setEventDialogOpen(false);
      } else {
        toast.error("Failed to create event");
      }
    }
  };
  
  const handleEditEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };
  
  const handleAddNewEvent = () => {
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const handleEventDelete = async (eventId: string) => {
    const result = await deleteEvent(eventId);
    if (result.success) {
      toast.success("Event deleted");
      refetchEvents();
    } else {
      toast.error("Failed to delete event");
    }
  };

  const advanceTime = async (days: number) => {
    if (!calendar || !isDm) return;

    let newDay = calendar.current_day + days;
    let newMonth = calendar.current_month;
    let newYear = calendar.current_year;
    let newDayOfWeek = calendar.day_of_week;

    // Handle day overflow
    while (newDay > DAYS_PER_MONTH) {
      newDay -= DAYS_PER_MONTH;
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }

    // Update day of week (1-7)
    newDayOfWeek = ((newDayOfWeek - 1 + days) % DAYS_PER_WEEK) + 1;

    // Calculate moon phase - advance by the number of days
    let newMoonPhaseDay = calendar.moon_phase_day;
    if (newMoonPhaseDay === null) {
      newMoonPhaseDay = 1;
    }
    newMoonPhaseDay = ((newMoonPhaseDay - 1 + days) % MOON_CYCLE_DAYS) + 1;
    
    // Calculate the moon phase for the new day
    let phaseIndex: number;
    if (newMoonPhaseDay <= 4) phaseIndex = 0; // new
    else if (newMoonPhaseDay <= 7) phaseIndex = 1; // waxing_crescent
    else if (newMoonPhaseDay <= 11) phaseIndex = 2; // first_quarter
    else if (newMoonPhaseDay <= 14) phaseIndex = 3; // waxing_gibbous
    else if (newMoonPhaseDay <= 18) phaseIndex = 4; // full
    else if (newMoonPhaseDay <= 21) phaseIndex = 5; // waning_gibbous
    else if (newMoonPhaseDay <= 25) phaseIndex = 6; // last_quarter
    else phaseIndex = 7; // waning_crescent
    
    const newMoonPhase = MOON_PHASES[phaseIndex];

    // Calculate season based on month using custom season months if available
    let newSeason: CampaignCalendar['season'] = null;
    if (calendar.custom_season_months) {
      for (const [season, months] of Object.entries(calendar.custom_season_months)) {
        if (months.includes(newMonth)) {
          newSeason = season as CampaignCalendar['season'];
          break;
        }
      }
    } else {
      // Default fallback (12 months, 3 months per season)
      if (newMonth >= 1 && newMonth <= 3) newSeason = 'winter';
      else if (newMonth >= 4 && newMonth <= 6) newSeason = 'spring';
      else if (newMonth >= 7 && newMonth <= 9) newSeason = 'summer';
      else newSeason = 'autumn';
    }

    const result = await updateCalendar(calendar.id, {
      current_day: newDay,
      current_month: newMonth,
      current_year: newYear,
      day_of_week: newDayOfWeek,
      moon_phase: newMoonPhase,
      moon_phase_day: newMoonPhaseDay,
      season: newSeason,
    });

    if (result.success) {
      toast.success(`Advanced ${days} day${days > 1 ? 's' : ''}`);
      refetch();
    } else {
      toast.error("Failed to advance time");
    }
  };

  const handleAdvanceDay = () => advanceTime(1);
  const handleAdvanceWeek = () => advanceTime(DAYS_PER_WEEK);
  const handleAdvanceMonth = () => advanceTime(DAYS_PER_MONTH);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Campaign Calendar</h2>
          <p className="text-muted-foreground text-sm">
            Track time, weather, and moon phases
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              Calendar not initialized yet.
            </p>
            {isDm && (
              <Button onClick={handleInitialize}>
                Initialize Calendar
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Campaign Calendar</h2>
          <p className="text-muted-foreground text-sm">
            Track time, weather, and moon phases
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Go to Current Date Button - Show when not viewing current month/year */}
          {calendar && (() => {
            const displayMonth = viewingMonth ?? calendar.current_month;
            const displayYear = viewingYear ?? calendar.current_year;
            const isViewingCurrent = displayMonth === calendar.current_month && displayYear === calendar.current_year;
            return !isViewingCurrent;
          })() && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToCurrentDate}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Go to Current Date
            </Button>
          )}
          
          {/* DM-only actions */}
          {isDm && calendar && (
            <>
              <CalendarMonthSettings
                calendar={calendar}
                onUpdate={handleMonthNamesUpdate}
                isDm={isDm}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvanceDay}
                disabled={updating}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4" />
                Advance Day
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvanceWeek}
                disabled={updating}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4" />
                Advance Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvanceMonth}
                disabled={updating}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4" />
                Advance Month
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Display Options */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Switch
            id="show-weather"
            checked={showWeather}
            onCheckedChange={setShowWeather}
          />
          <Label htmlFor="show-weather" className="text-sm cursor-pointer">
            Show Weather
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-seasons"
            checked={showSeasons}
            onCheckedChange={setShowSeasons}
          />
          <Label htmlFor="show-seasons" className="text-sm cursor-pointer">
            Show Seasons
          </Label>
        </div>
        {isDm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeatherManagerOpen(true)}
            className="ml-auto"
          >
            <Cloud className="h-4 w-4 mr-2" />
            Generate Weather
          </Button>
        )}
      </div>

      {/* Calendar Grid Display */}
      <CalendarDisplay
        calendar={calendar}
        viewingMonth={viewingMonth}
        viewingYear={viewingYear}
        onMonthChange={handleMonthChange}
        onYearChange={isDm ? handleYearChange : undefined}
        onDayClick={handleDayClick}
        events={events}
        isDm={isDm}
        showWeather={showWeather}
        showSeasons={showSeasons}
      />

      {/* Weather Manager Dialog */}
      {calendar && (
        <CalendarWeatherManager
          open={weatherManagerOpen}
          onOpenChange={setWeatherManagerOpen}
          calendar={calendar}
          onConfirm={async (weatherData) => {
            const result = await updateCalendar(calendar.id, {
              weather: weatherData,
            });
            if (result.success) {
              refetch();
            } else {
              toast.error("Failed to update weather");
            }
          }}
        />
      )}

      {/* Event Dialogs */}
      {calendar && selectedDay && (
        <>
          <CalendarEventListDialog
            open={eventListDialogOpen}
            onOpenChange={setEventListDialogOpen}
            events={events.filter(event => {
              const year = selectedDay.year;
              const month = selectedDay.month;
              const day = selectedDay.day;
              
              if (!event.is_repeatable) {
                return event.event_year === year && event.event_month === month && event.event_day === day;
              }
              
              const daysFromEvent = calculateDaysBetween(event.event_year, event.event_month, event.event_day, year, month, day);
              if (daysFromEvent < 0) return false;
              
              if (event.repeat_end_year && event.repeat_end_month && event.repeat_end_day) {
                const daysFromEnd = calculateDaysBetween(event.repeat_end_year, event.repeat_end_month, event.repeat_end_day, year, month, day);
                if (daysFromEnd < 0) return false;
              }
              
              if (event.repeat_type === 'yearly') {
                const yearDiff = year - event.event_year;
                return event.event_month === month && event.event_day === day && yearDiff >= 0 && yearDiff % event.repeat_interval === 0;
              } else if (event.repeat_type === 'monthly') {
                const monthDiff = (year - event.event_year) * 12 + (month - event.event_month);
                return event.event_day === day && monthDiff >= 0 && monthDiff % event.repeat_interval === 0;
              } else if (event.repeat_type === 'weekly') {
                return daysFromEvent % (7 * event.repeat_interval) === 0;
              } else if (event.repeat_type === 'daily') {
                return daysFromEvent % event.repeat_interval === 0;
              }
              
              return false;
            })}
            calendar={calendar}
            day={selectedDay.day}
            month={selectedDay.month}
            year={selectedDay.year}
            onEdit={handleEditEvent}
            onDelete={handleEventDelete}
            onAddNew={handleAddNewEvent}
          />
          <CalendarEventFormDialog
            open={eventDialogOpen}
            onOpenChange={setEventDialogOpen}
            event={selectedEvent}
            calendar={calendar}
            initialYear={selectedDay.year}
            initialMonth={selectedDay.month}
            initialDay={selectedDay.day}
            onSave={handleEventSave}
            onDelete={selectedEvent ? () => handleEventDelete(selectedEvent.id) : undefined}
          />
        </>
      )}
    </div>
  );
}

