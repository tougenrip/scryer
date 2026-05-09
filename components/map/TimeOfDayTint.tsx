"use client";

import { useMemo } from "react";
import { useCampaignCalendarLive } from "@/hooks/useCampaignCalendarLive";
import { useVttStore } from "@/lib/store/vtt-store";

interface Props {
  campaignId: string | null;
}

type Stop = { t: number; r: number; g: number; b: number; a: number };

/**
 * Color stops keyed by hour-of-day (0..24, with the wrap stop at 24).
 * Linear interpolation between adjacent stops drives the tint, so the
 * scene fades smoothly through dawn → day → dusk → night.
 *
 * Daytime hours (~9:00–15:00) carry alpha 0 so the map renders true.
 */
const STOPS: Stop[] = [
  { t: 0,    r: 8,   g: 14,  b: 38,  a: 0.5  }, // deep night
  { t: 4,    r: 16,  g: 22,  b: 52,  a: 0.46 }, // pre-dawn
  { t: 5,    r: 90,  g: 60,  b: 90,  a: 0.36 }, // first light
  { t: 6.5,  r: 255, g: 140, b: 90,  a: 0.3  }, // sunrise peak
  { t: 8,    r: 255, g: 220, b: 180, a: 0.1  }, // golden hour
  { t: 9,    r: 255, g: 240, b: 220, a: 0    }, // morning
  { t: 15,   r: 255, g: 240, b: 220, a: 0    }, // afternoon
  { t: 16.5, r: 255, g: 220, b: 170, a: 0.08 }, // late afternoon
  { t: 17.5, r: 255, g: 150, b: 80,  a: 0.26 }, // sunset start
  { t: 19,   r: 220, g: 90,  b: 70,  a: 0.34 }, // sunset peak
  { t: 20.5, r: 70,  g: 55,  b: 110, a: 0.42 }, // dusk / twilight
  { t: 22,   r: 12,  g: 18,  b: 44,  a: 0.5  }, // night
  { t: 24,   r: 8,   g: 14,  b: 38,  a: 0.5  }, // wrap to 0:00
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function tintForHour(hour: number, minute: number) {
  const h = (hour + minute / 60) % 24;
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (h >= a.t && h <= b.t) {
      const span = b.t - a.t;
      const f = span === 0 ? 0 : (h - a.t) / span;
      return {
        r: Math.round(lerp(a.r, b.r, f)),
        g: Math.round(lerp(a.g, b.g, f)),
        b: Math.round(lerp(a.b, b.b, f)),
        a: lerp(a.a, b.a, f),
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 0 };
}

/**
 * Full-canvas DOM overlay that paints a color/alpha based on the
 * current in-world hour. Sits above the Konva stage but below floating
 * UI panels, with `pointer-events: none` so it never intercepts clicks.
 *
 * Lives outside the Stage (no Konva redraw cost) and only re-renders
 * when the calendar's hour/minute change via the shared realtime cache.
 */
export function TimeOfDayTint({ campaignId }: Props) {
  const { calendar } = useCampaignCalendarLive(campaignId);
  const enabled = useVttStore((s) => s.timeTintEnabled);

  const tint = useMemo(() => {
    if (!calendar) return null;
    return tintForHour(calendar.current_hour ?? 12, calendar.current_minute ?? 0);
  }, [calendar?.current_hour, calendar?.current_minute]);

  if (!enabled || !tint || tint.a <= 0.005) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[5] transition-[background-color] duration-700"
      style={{
        backgroundColor: `rgba(${tint.r}, ${tint.g}, ${tint.b}, ${tint.a})`,
        mixBlendMode: "multiply",
      }}
    />
  );
}
