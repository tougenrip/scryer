"use client";

import type { CampaignCalendar, CalendarEvent } from "@/hooks/useForgeContent";
import { cn } from "@/lib/utils";

const DEFAULT_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const MOON_PHASE_NAMES: Record<
  NonNullable<CampaignCalendar["moon_phase"]>,
  string
> = {
  new: "New moon",
  waxing_crescent: "Waxing crescent",
  first_quarter: "First quarter",
  waxing_gibbous: "Waxing gibbous",
  full: "Full moon",
  waning_gibbous: "Waning gibbous",
  last_quarter: "Last quarter",
  waning_crescent: "Waning crescent",
};

function monthLabel(calendar: CampaignCalendar): string {
  const m = calendar.current_month;
  if (calendar.custom_month_names?.length) {
    return (
      calendar.custom_month_names[m - 1] ||
      DEFAULT_MONTH_NAMES[m - 1] ||
      `Month ${m}`
    );
  }
  return DEFAULT_MONTH_NAMES[m - 1] || `Month ${m}`;
}

type CalendarSidebarProps = {
  calendar: CampaignCalendar;
  todayEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
};

export function CalendarSidebar({
  calendar,
  todayEvents,
  upcomingEvents,
}: CalendarSidebarProps) {
  const cd = calendar.current_day;
  const primary = todayEvents[0];
  const monthName = monthLabel(calendar);
  const moonLine = calendar.moon_phase
    ? MOON_PHASE_NAMES[calendar.moon_phase]
    : "Moon phase not set";

  const description =
    primary?.description?.trim() ||
    todayEvents.map((e) => e.title).join(" · ") ||
    "Nothing scheduled — mark the day in the grid or add an event.";

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-3 xl:w-[300px] xl:max-w-[320px] xl:shrink-0"
    >
      <div className="sc-card" style={{ padding: 14 }}>
        <div className="sc-label" style={{ marginBottom: 8 }}>
          Today
        </div>
        <div
          className="font-serif leading-tight"
          style={{ fontSize: 20, marginBottom: 6, letterSpacing: "0.02em" }}
        >
          DAY {cd} · {monthName}
        </div>
        <p
          className="text-xs leading-snug"
          style={{ color: "var(--muted-foreground)", marginBottom: 10 }}
        >
          Year {calendar.current_year} · {moonLine}
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {description}
        </p>
      </div>

      <div className="sc-card" style={{ padding: 14 }}>
        <div className="sc-label" style={{ marginBottom: 10 }}>
          Upcoming
        </div>
        {upcomingEvents.length === 0 ? (
          <p
            className="text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No future dated events yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {upcomingEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex items-start gap-2 text-sm"
              >
                <span
                  className="mt-0.5 font-medium tabular-nums"
                  style={{ color: "var(--muted-foreground)", minWidth: "1.25rem" }}
                >
                  {ev.event_day}
                </span>
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: ev.color || "var(--primary)" }}
                  aria-hidden
                />
                <span className="min-w-0 leading-snug">
                  <span
                    className={cn(
                      /session/i.test(ev.title) && "text-primary font-medium",
                    )}
                  >
                    {ev.title}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
