import type { CalendarEvent } from "@/hooks/useForgeContent";

export const CAMPAIGN_DAYS_PER_MONTH = 30;

export function calculateDaysBetween(
  year1: number,
  month1: number,
  day1: number,
  year2: number,
  month2: number,
  day2: number,
): number {
  const days1 =
    (year1 - 1) * 360 +
    (month1 - 1) * CAMPAIGN_DAYS_PER_MONTH +
    (day1 - 1);
  const days2 =
    (year2 - 1) * 360 +
    (month2 - 1) * CAMPAIGN_DAYS_PER_MONTH +
    (day2 - 1);
  return days2 - days1;
}

/** Monotonic campaign date for sorting (day 1 of year 1 = 0). */
export function absCampaignDate(
  year: number,
  month: number,
  day: number,
): number {
  return (
    (year - 1) * 360 +
    (month - 1) * CAMPAIGN_DAYS_PER_MONTH +
    (day - 1)
  );
}

/** Events that occur on this campaign calendar day (matches grid + dialogs). */
export function getEventsOccurringOnDay(
  events: CalendarEvent[],
  year: number,
  month: number,
  day: number,
): CalendarEvent[] {
  return events.filter((event) => {
    if (!event.is_repeatable) {
      return (
        event.event_year === year &&
        event.event_month === month &&
        event.event_day === day
      );
    }

    const daysFromEvent = calculateDaysBetween(
      event.event_year,
      event.event_month,
      event.event_day,
      year,
      month,
      day,
    );
    if (daysFromEvent < 0) return false;

    if (
      event.repeat_end_year &&
      event.repeat_end_month &&
      event.repeat_end_day
    ) {
      const daysFromEnd = calculateDaysBetween(
        event.repeat_end_year,
        event.repeat_end_month,
        event.repeat_end_day,
        year,
        month,
        day,
      );
      if (daysFromEnd < 0) return false;
    }

    if (event.repeat_type === "yearly") {
      const yearDiff = year - event.event_year;
      return (
        event.event_month === month &&
        event.event_day === day &&
        yearDiff >= 0 &&
        yearDiff % event.repeat_interval === 0
      );
    }
    if (event.repeat_type === "monthly") {
      const monthDiff =
        (year - event.event_year) * 12 + (month - event.event_month);
      return (
        event.event_day === day &&
        monthDiff >= 0 &&
        monthDiff % event.repeat_interval === 0
      );
    }
    if (event.repeat_type === "weekly") {
      return daysFromEvent % (7 * event.repeat_interval) === 0;
    }
    if (event.repeat_type === "daily") {
      return daysFromEvent % event.repeat_interval === 0;
    }

    return false;
  });
}
