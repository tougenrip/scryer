"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { subscribeRest } from "@/lib/realtime/vtt-rest-channel";

interface Props {
  campaignId: string | null;
}

const DURATION_MS = 4200;

interface Firefly {
  id: number;
  // Resting position as % of viewport.
  baseLeft: number; // 0..100 vw
  baseTop: number;  // 0..100 vh
  // Wander offsets at three keyframe stops, in vw / vh.
  w: [number, number, number];
  h: [number, number, number];
  // Per-mote randomization for organic feel.
  size: number; // px (core dot)
  bloom: number; // px (radial halo)
  wanderDuration: number; // s
  wanderDelay: number; // s
  glowDuration: number; // s
  glowDelay: number; // s
  // Warm-only palette: mostly embers, some gold, occasional dim ash.
  hue: "ember" | "gold" | "ash";
}

function pickHue(): Firefly["hue"] {
  const r = Math.random();
  if (r < 0.6) return "ember";
  if (r < 0.9) return "gold";
  return "ash";
}

function spawnFireflies(count: number): Firefly[] {
  const flies: Firefly[] = [];
  for (let i = 0; i < count; i++) {
    // Tighter size band — embers should read as small consistent
    // sparks, not a mix of dots and big magical orbs.
    const size = 1.8 + Math.random() * 2;
    flies.push({
      id: i,
      baseLeft: Math.random() * 100,
      baseTop: 6 + Math.random() * 88,
      w: [
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 14,
      ],
      h: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
      ],
      size,
      // Smaller, tighter bloom — enough to glow, not enough to read
      // as a magical bubble. Roughly 4–6× the core dot.
      bloom: size * 4 + Math.random() * 6,
      wanderDuration: 4 + Math.random() * 3,
      wanderDelay: -Math.random() * 4, // start mid-cycle
      glowDuration: 1.5 + Math.random() * 1.8,
      glowDelay: -Math.random() * 2.5,
      hue: pickHue(),
    });
  }
  return flies;
}

/**
 * DOM overlay for the Short Rest animation. Subscribed to the rest
 * broadcast — when the DM fires `short_rest` we mount for ~4.2s and
 * render:
 *   • a near-black warm vignette so the canvas reads as deep firelight
 *   • a center-screen Lottie campfire (no extra adornment — the
 *     animation carries the focal beat on its own)
 *   • drifting motes that wander like fireflies, each with a soft
 *     bloom halo around a bright core (ember / gold / moon palette)
 *
 * Lives in GameCanvas above the stage but below floating UI panels,
 * with `pointer-events: none` so it never interferes with input.
 */
export function ShortRestOverlay({ campaignId }: Props) {
  const [active, setActive] = useState(false);
  const flies = useMemo(() => (active ? spawnFireflies(30) : []), [active]);

  useEffect(() => {
    if (!campaignId) return;
    return subscribeRest(campaignId, (event) => {
      if (event !== "short_rest") return;
      setActive(true);
      window.setTimeout(() => setActive(false), DURATION_MS);
    });
  }, [campaignId]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[18] short-rest-root overflow-hidden"
    >
      {/* Soft blur over whatever is behind us (the map + weather). On
          its own layer because mix-blend-mode on the vignette would
          neutralize backdrop-filter. */}
      <div className="short-rest-blur" />

      {/* Deep near-black vignette with a faint warm rim. */}
      <div className="absolute inset-0 short-rest-vignette" />

      {/* Drifting fireflies. Each is wrapped in a wander layer (slow 2D
          drift) and inside a glow layer (flickering opacity + scale)
          containing a bloom halo and a bright pinpoint core. */}
      {flies.map((m) => (
        <span
          key={m.id}
          className="short-rest-firefly"
          style={{
            left: `${m.baseLeft}%`,
            top: `${m.baseTop}%`,
            animationDuration: `${m.wanderDuration}s`,
            animationDelay: `${m.wanderDelay}s`,
            ["--w1" as never]: `${m.w[0]}vw`,
            ["--h1" as never]: `${m.h[0]}vh`,
            ["--w2" as never]: `${m.w[1]}vw`,
            ["--h2" as never]: `${m.h[1]}vh`,
            ["--w3" as never]: `${m.w[2]}vw`,
            ["--h3" as never]: `${m.h[2]}vh`,
          }}
        >
          <span
            className={`short-rest-firefly-glow short-rest-firefly-${m.hue}`}
            style={{
              width: m.bloom,
              height: m.bloom,
              animationDuration: `${m.glowDuration}s`,
              animationDelay: `${m.glowDelay}s`,
            }}
          >
            <span
              className="short-rest-firefly-core"
              style={{ width: m.size, height: m.size }}
            />
          </span>
        </span>
      ))}

      {/* Center hourglass emblem — bronze art with a slow scale pulse
          and a warm halo behind it. No rotation: the medallion has fine
          detail (gems, fleur-de-lis arms) that should stay upright. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="short-rest-hourglass relative">
          <div className="short-rest-hourglass-halo" aria-hidden />
          <Image
            src="/emblem-hourglass.png"
            alt=""
            width={256}
            height={256}
            priority
            className="relative"
            style={{
              filter:
                "drop-shadow(0 0 14px rgba(245, 170, 80, 0.6)) drop-shadow(0 8px 24px rgba(0,0,0,0.55))",
            }}
          />
        </div>
      </div>

      <style jsx>{`
        .short-rest-root {
          animation: short-rest-fade ${DURATION_MS}ms ease-in-out 1 forwards;
        }
        @keyframes short-rest-fade {
          0% { opacity: 0; }
          10%, 82% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* Near-black vignette — much heavier than before. The map
           still peeks through a soft center cone but the edges go
           almost full black so the campfire and fireflies pop. */
        .short-rest-vignette {
          background:
            radial-gradient(
              ellipse at center,
              rgba(20, 8, 0, 0.35) 0%,
              rgba(12, 5, 0, 0.7) 28%,
              rgba(4, 2, 0, 0.93) 65%,
              rgba(0, 0, 0, 0.98) 100%
            ),
            radial-gradient(
              ellipse at center,
              rgba(255, 150, 60, 0.1) 0%,
              rgba(120, 40, 5, 0.05) 45%,
              rgba(0, 0, 0, 0) 100%
            );
          mix-blend-mode: multiply;
        }

        /* Soft blur on whatever is below this overlay (the map +
           weather). Sits on its own layer because mix-blend-mode on
           the vignette would cancel the backdrop-filter. */
        :global(.short-rest-blur) {
          position: absolute;
          inset: 0;
          backdrop-filter: blur(3.5px);
          -webkit-backdrop-filter: blur(3.5px);
        }

        /* Wander wrapper — drifts 2D over a 3-stop random keyframe
           path then returns to base. */
        .short-rest-firefly {
          position: absolute;
          will-change: transform;
          animation-name: short-rest-firefly-wander;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
        }
        @keyframes short-rest-firefly-wander {
          0%   { transform: translate(0, 0); }
          25%  { transform: translate(var(--w1, 0), var(--h1, 0)); }
          50%  { transform: translate(var(--w2, 0), var(--h2, 0)); }
          75%  { transform: translate(var(--w3, 0), var(--h3, 0)); }
          100% { transform: translate(0, 0); }
        }

        /* Bloom halo — large, soft, additively bright. The core dot
           sits inside it for the pinpoint sparkle. */
        .short-rest-firefly-glow {
          position: relative;
          display: block;
          border-radius: 50%;
          will-change: opacity, transform, filter;
          animation-name: short-rest-firefly-flicker;
          animation-iteration-count: infinite;
          animation-timing-function: ease-in-out;
          mix-blend-mode: screen;
          /* Re-anchor so width/height grow from the centre (the
             outer wander span owns the position). */
          transform-origin: 50% 50%;
          translate: -50% -50%;
        }
        @keyframes short-rest-firefly-flicker {
          0%, 100% {
            opacity: 0.18;
            transform: scale(0.7);
            filter: blur(2.5px);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
            filter: blur(0.5px);
          }
        }

        /* Warm core — no cool whites. Reads as a glowing ember tip,
           not a magical pinpoint. */
        .short-rest-firefly-core {
          position: absolute;
          left: 50%;
          top: 50%;
          translate: -50% -50%;
          border-radius: 50%;
          background: rgba(255, 220, 160, 1);
          box-shadow:
            0 0 4px rgba(255, 200, 130, 0.9),
            0 0 9px rgba(255, 160, 80, 0.6);
        }

        .short-rest-firefly-ember {
          background: radial-gradient(
            circle,
            rgba(255, 220, 140, 0.9) 0%,
            rgba(255, 140, 50, 0.5) 40%,
            rgba(200, 80, 15, 0.16) 70%,
            rgba(120, 40, 0, 0) 100%
          );
        }
        .short-rest-firefly-gold {
          background: radial-gradient(
            circle,
            rgba(255, 210, 130, 0.85) 0%,
            rgba(245, 170, 70, 0.4) 45%,
            rgba(180, 110, 30, 0.12) 75%,
            rgba(100, 60, 10, 0) 100%
          );
        }
        /* Dim desaturated ash — looks like a faint dying ember. Pale,
           low alpha, no blue. */
        .short-rest-firefly-ash {
          background: radial-gradient(
            circle,
            rgba(230, 215, 190, 0.55) 0%,
            rgba(180, 165, 140, 0.22) 50%,
            rgba(120, 105, 85, 0.06) 80%,
            rgba(60, 50, 40, 0) 100%
          );
        }

        .short-rest-hourglass {
          animation: short-rest-pulse 1.9s ease-in-out infinite;
          transform-origin: 50% 50%;
        }
        @keyframes short-rest-pulse {
          0%, 100% { transform: scale(0.96); }
          50%      { transform: scale(1.06); }
        }

        /* Pulsing warm halo behind the medallion — radial that breathes
           in alpha + scale, perfectly co-centred with the emblem. */
        .short-rest-hourglass-halo {
          position: absolute;
          inset: -55%;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 210, 130, 0.55) 0%,
            rgba(255, 160, 70, 0.35) 30%,
            rgba(180, 80, 20, 0.18) 55%,
            rgba(0, 0, 0, 0) 75%
          );
          filter: blur(6px);
          mix-blend-mode: screen;
          animation: short-rest-halo 1.9s ease-in-out infinite;
          will-change: opacity, transform;
        }
        @keyframes short-rest-halo {
          0%, 100% { opacity: 0.55; transform: scale(0.9); }
          50%      { opacity: 1;    transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
