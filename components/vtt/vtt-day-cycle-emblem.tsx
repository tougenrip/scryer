"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useCampaignCalendarLive } from "@/hooks/useCampaignCalendarLive";
import { subscribeRest } from "@/lib/realtime/vtt-rest-channel";
import { toast } from "sonner";
import type { CampaignCalendar } from "@/hooks/useForgeContent";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string | null;
  isDm: boolean;
  /** When true, the right-side drawer is open and the emblem should slide
   *  underneath it. We achieve this with a dynamic z-index. */
  rightDrawerOpen?: boolean;
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

/**
 * Sun/moon corner emblem mounted bottom-right of the VTT. Only the top-
 * left quadrant of the artwork is visible — the rest is intentionally
 * clipped off-screen so the widget feels like a peeking insignia.
 *
 * - Default art is the gold sun (`/emblem-sun.png`).
 * - Center text shows the in-world date, plus "End Day" prompt for the DM.
 * - DM click runs a 2.4s "Witcher meditation" cycle: emblem spins, the art
 *   morphs into the silver moon (`/emblem-moon.png`) at the apex of the
 *   rotation, the calendar advances by 24 in-world hours, then the art
 *   morphs back to the sun.
 * - During the cycle a soft shadow sweeps across the VTT canvas to fake
 *   the sun moving overhead. The sweep is mounted as a fixed gradient
 *   overlay just above the canvas (below sidebars).
 */
export function VttDayCycleEmblem({ campaignId, isDm, rightDrawerOpen }: Props) {
  // Shared realtime subscription — co-tenant with VttTimeHud so both
  // widgets stay in lockstep without doubling up on channels.
  const { calendar, setCalendar } = useCampaignCalendarLive(campaignId);
  const [spinning, setSpinning] = useState(false);
  const advancingRef = useRef(false);
  // Track the last-seen date so we can detect when ANYONE (including
  // another client — i.e. the DM, when we're a player) advances the
  // day. When that happens we trigger the same spin + shadow sweep
  // animation locally so every party member sees the in-world day pass.
  const lastDateRef = useRef<{
    day: number;
    month: number;
    year: number;
  } | null>(null);

  useEffect(() => {
    if (!calendar) return;
    const cur = {
      day: calendar.current_day,
      month: calendar.current_month,
      year: calendar.current_year,
    };
    const prev = lastDateRef.current;
    lastDateRef.current = cur;
    if (!prev) return; // first load — nothing to compare to
    if (
      cur.day === prev.day &&
      cur.month === prev.month &&
      cur.year === prev.year
    ) {
      return; // unrelated update (hour, weather, etc.)
    }
    // Day changed. If we're already animating (the local DM who clicked)
    // skip — they already kicked off the spin. Otherwise play it.
    if (spinning || advancingRef.current) return;
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 2400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    calendar?.current_day,
    calendar?.current_month,
    calendar?.current_year,
  ]);

  // Subscribe to the rest broadcast channel — when the DM triggers a
  // Long Rest from the time HUD, every client (including the sender)
  // runs the same spin + shadow-sweep animation locally WITHOUT
  // changing the calendar date. Short rest is wired for future use.
  useEffect(() => {
    if (!campaignId) return;
    return subscribeRest(campaignId, (event) => {
      if (event !== "long_rest") return;
      if (advancingRef.current) return; // already mid-animation
      setSpinning(true);
      window.setTimeout(() => setSpinning(false), 2400);
    });
  }, [campaignId]);

  const monthName = useMemo(() => {
    if (!calendar) return "";
    const names =
      calendar.custom_month_names.length > 0
        ? calendar.custom_month_names
        : DEFAULT_MONTHS;
    return names[(calendar.current_month - 1 + names.length) % names.length];
  }, [calendar]);

  // Run the animation locally on click; advance the day once we hit the
  // apex of the spin so the day flip lines up with the moon art.
  const onClick = async () => {
    if (!isDm || !calendar || spinning || advancingRef.current) return;
    setSpinning(true);
    advancingRef.current = true;

    // Schedule the day advance for the apex of the rotation (~50%).
    window.setTimeout(() => {
      void advanceOneDay(calendar, setCalendar);
    }, 1100);

    // Reset spin state at the end of the animation.
    window.setTimeout(() => {
      setSpinning(false);
      advancingRef.current = false;
    }, 2400);
  };

  if (!campaignId || !calendar) return null;

  const dayText = `${calendar.current_day}`;
  const dateLine = `${monthName} ${calendar.current_year}`;

  return (
    <>
      {/* Shadow sweep + full-screen night-tint, only mounted during spin. */}
      {spinning && (
        <>
          {/* Full-viewport subtle blue tint that fades in then out — gives
              the whole HUD a moonlight wash for the duration of the
              meditation, then returns to normal. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 day-cycle-night-tint"
            style={{
              zIndex: 14,
              // Deep midnight indigo — darker base hue, dialed back via
              // animation opacity so the wash reads as night without
              // burying the canvas.
              backgroundColor: "rgb(6, 10, 30)",
              willChange: "opacity",
            }}
          />
          {/* Moving shadow sweep on top of the tint. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0"
            style={{ zIndex: 15 }}
          >
            <div
              className="absolute inset-0 day-cycle-shadow-sweep"
              style={{
                // Darker base hue, but middle is more transparent so the
                // canvas underneath still reads through cleanly during
                // the sweep.
                background:
                  "linear-gradient(115deg, rgba(4,8,24,0) 15%, rgba(4,8,24,0.6) 38%, rgba(6,10,30,0.45) 50%, rgba(4,8,24,0.6) 62%, rgba(4,8,24,0) 85%)",
                transform: "translateX(-100%)",
                willChange: "transform",
              }}
            />
          </div>
        </>
      )}

      {/* The emblem. Anchored bottom-right but pushed off-screen so only
          the top-left ~60% (rays + central medallion) is visible.
          z-index 31 (above the right sidebar wrapper at z-30) when the
          drawer is closed so the sun visibly sits in front of the nav
          column. When the drawer is open we drop to z-25 so the panel
          slides over the emblem. */}
      <div
        className="pointer-events-none fixed bottom-0 right-0"
        style={{
          width: 420,
          height: 420,
          transform: "translate(38%, 40%)",
          zIndex: rightDrawerOpen ? 25 : 31,
          transition: "z-index 0s",
        }}
      >
        <button
          type="button"
          onClick={onClick}
          disabled={!isDm || spinning}
          aria-label={isDm ? "End the day" : "Today's date"}
          className={cn(
            "pointer-events-auto relative w-full h-full select-none",
            isDm && !spinning && "cursor-pointer hover:scale-[1.02] transition-transform",
            !isDm && "cursor-default"
          )}
          style={{
            transformOrigin: "50% 50%", // approximate visible centre
          }}
        >
          <div
            className={cn(
              "relative w-full h-full",
              spinning ? "day-cycle-spin" : "day-cycle-wobble"
            )}
            style={{
              transformOrigin: "50% 50%",
              // drop-shadow on the alpha-channel art gives the emblem
              // depth — the rays cast a soft halo + the disc sits on
              // an offset shadow so it looks raised off the canvas.
              filter:
                "drop-shadow(0 10px 18px rgba(0,0,0,0.6)) drop-shadow(0 0 14px rgba(0,0,0,0.45))",
            }}
          >
            {/* Sun art (default). */}
            <Image
              src="/emblem-sun.png"
              alt=""
              fill
              sizes="420px"
              priority
              className={cn(
                "object-contain transition-opacity duration-150",
                spinning && "day-cycle-art-sun"
              )}
            />
            {/* Moon art — fades in mid-rotation. */}
            <Image
              src="/emblem-moon.png"
              alt=""
              fill
              sizes="420px"
              className={cn(
                "object-contain absolute inset-0 opacity-0 transition-opacity duration-150",
                spinning && "day-cycle-art-moon"
              )}
            />
          </div>

          {/* Center text — pinned dead-center on the medallion. */}
          <div
            className="absolute pointer-events-none flex flex-col items-center justify-center text-center"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "44%",
            }}
          >
            {isDm && !spinning && (
              <span
                className="uppercase tracking-[0.2em] font-bold text-white/95 drop-shadow"
                style={{
                  fontSize: 16,
                  lineHeight: 1,
                  fontVariant: "small-caps",
                  textShadow: "0 1px 4px rgba(0,0,0,0.7)",
                }}
              >
                End Day
              </span>
            )}
            <span
              className="font-serif font-bold drop-shadow text-white"
              style={{
                fontSize: 36,
                lineHeight: 0.95,
                textShadow: "0 2px 6px rgba(0,0,0,0.75)",
              }}
            >
              {dayText}
            </span>
            <span
              className="text-white/90 drop-shadow"
              style={{
                fontSize: 16,
                lineHeight: 1,
                textShadow: "0 1px 4px rgba(0,0,0,0.7)",
              }}
            >
              {dateLine}
            </span>
          </div>
        </button>
      </div>

      <style jsx global>{`
        /* Continuous "itching to be pushed" wobble — gentle, constant
           rock back and forth so the emblem always looks alive. */
        @keyframes day-cycle-wobble-kf {
          0%, 100% { transform: rotate(-2deg); }
          50%      { transform: rotate(2deg); }
        }
        .day-cycle-wobble {
          animation: day-cycle-wobble-kf 2.6s ease-in-out infinite;
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        @keyframes day-cycle-spin-kf {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes day-cycle-art-sun-kf {
          0%, 25%   { opacity: 1; }
          45%, 70%  { opacity: 0; }
          90%, 100% { opacity: 1; }
        }
        @keyframes day-cycle-art-moon-kf {
          0%, 25%   { opacity: 0; }
          45%, 70%  { opacity: 1; }
          90%, 100% { opacity: 0; }
        }
        @keyframes day-cycle-shadow-sweep-kf {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        @keyframes day-cycle-night-tint-kf {
          0%, 100% { opacity: 0; }
          35%      { opacity: 0.26; }
          50%      { opacity: 0.34; }
          65%      { opacity: 0.26; }
        }
        .day-cycle-night-tint {
          opacity: 0;
          animation: day-cycle-night-tint-kf 2.2s ease-in-out 1 forwards;
        }
        .day-cycle-spin {
          animation: day-cycle-spin-kf 2.2s cubic-bezier(0.45, 0, 0.55, 1) 1 forwards;
        }
        .day-cycle-art-sun {
          animation: day-cycle-art-sun-kf 2.2s linear 1 forwards;
        }
        .day-cycle-art-moon {
          animation: day-cycle-art-moon-kf 2.2s linear 1 forwards;
        }
        .day-cycle-shadow-sweep {
          animation: day-cycle-shadow-sweep-kf 2.2s linear 1 forwards;
        }
      `}</style>
    </>
  );
}

async function advanceOneDay(
  cal: CampaignCalendar,
  setCalendar: (cal: CampaignCalendar) => void
) {
  const supabase = createClient();
  const monthCount =
    cal.custom_month_names.length > 0 ? cal.custom_month_names.length : 12;
  const weekdayCount =
    cal.custom_weekday_names.length > 0
      ? cal.custom_weekday_names.length
      : 7;

  let day = cal.current_day + 1;
  let month = cal.current_month;
  let year = cal.current_year;
  if (day > 30) {
    day = 1;
    month += 1;
    if (month > monthCount) {
      month = 1;
      year += 1;
    }
  }
  const weekday = ((cal.day_of_week - 1 + 1) % weekdayCount) + 1;

  // Optimistic local update — the realtime subscription may or may not be
  // enabled for this table, so don't depend on it to refresh the UI.
  const next: CampaignCalendar = {
    ...cal,
    current_day: day,
    current_month: month,
    current_year: year,
    day_of_week: weekday,
  };
  setCalendar(next);

  const { error } = await supabase
    .from("campaign_calendar")
    .update({
      current_day: day,
      current_month: month,
      current_year: year,
      day_of_week: weekday,
    } as never)
    .eq("id", cal.id)
    .select()
    .single();
  if (error) {
    console.error("Failed to advance the day:", error);
    toast.error(`Couldn't end the day: ${error.message}`);
    // Revert optimistic update.
    setCalendar(cal);
  }
}
