"use client";

import { cn } from "@/lib/utils";

export type CoinSide = "heads" | "tails";

interface Props {
  /** When in `revealed` phase, the side it lands on. */
  outcome: CoinSide | null;
  phase: "idle" | "spinning" | "revealed";
  size?: number;
  className?: string;
}

/**
 * 3D coin flip animation. The coin face is drawn with simple inline SVG
 * (a star for heads, a wreath for tails) and spun via `rotateY` with
 * perspective — we drop the coin "down" and flip it during the descent
 * so it feels weighty. Final orientation matches the outcome (0deg for
 * heads, 180deg for tails), with the spin amount tweaked so the coin
 * always lands on the correct side regardless of duration.
 */
export function CoinFlip({ outcome, phase, size = 180, className }: Props) {
  // Start at 0deg. Number of full spins (each = 360°) plus the final tilt.
  const spins = 6;
  const finalDeg = outcome === "tails" ? spins * 360 + 180 : spins * 360;

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{
        width: size,
        height: size,
        perspective: size * 4,
      }}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0",
          phase === "spinning" && "coin-spin",
          phase === "revealed" && "coin-reveal"
        )}
        style={
          phase === "spinning"
            ? ({ "--coin-final": `${finalDeg}deg` } as React.CSSProperties)
            : phase === "revealed"
            ? { transform: `rotateY(${outcome === "tails" ? 180 : 0}deg)` }
            : undefined
        }
      >
        <Face side="heads" size={size} />
        <Face side="tails" size={size} flipped />
      </div>

      <style jsx>{`
        @keyframes coin-spin {
          0%   { transform: rotateY(0deg) translateY(-30px); }
          25%  { transform: rotateY(calc(var(--coin-final) * 0.4)) translateY(-50px); }
          70%  { transform: rotateY(calc(var(--coin-final) * 0.85)) translateY(-30px); }
          100% { transform: rotateY(var(--coin-final)) translateY(0); }
        }
        :global(.coin-spin) {
          transform-style: preserve-3d;
          animation: coin-spin 1.5s cubic-bezier(0.25, 0.6, 0.4, 1) 1 forwards;
        }
        :global(.coin-reveal) {
          transform-style: preserve-3d;
          transition: transform 0.35s cubic-bezier(0.25, 0.6, 0.4, 1);
        }
      `}</style>
    </div>
  );
}

function Face({
  side,
  size,
  flipped,
}: {
  side: CoinSide;
  size: number;
  flipped?: boolean;
}) {
  const r = size / 2;
  return (
    <div
      className="absolute inset-0 rounded-full flex items-center justify-center"
      style={{
        backfaceVisibility: "hidden",
        transform: flipped ? "rotateY(180deg)" : undefined,
        background:
          side === "heads"
            ? "radial-gradient(circle at 35% 30%, #fde68a 0%, #f59e0b 65%, #92400e 100%)"
            : "radial-gradient(circle at 35% 30%, #e7e5e4 0%, #a8a29e 65%, #44403c 100%)",
        boxShadow: "inset 0 0 24px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.45)",
      }}
    >
      <svg
        width={size * 0.65}
        height={size * 0.65}
        viewBox="-50 -50 100 100"
        fill="none"
        stroke={side === "heads" ? "#7c2d12" : "#1c1917"}
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {side === "heads" ? (
          // 5-point star — clean, "lucky".
          <polygon
            points="0,-40 11,-12 40,-12 17,5 26,32 0,16 -26,32 -17,5 -40,-12 -11,-12"
            fill={side === "heads" ? "#fbbf24" : undefined}
            opacity={0.95}
          />
        ) : (
          // Wreath/circle with crossed lines — "tails".
          <>
            <circle cx="0" cy="0" r="32" />
            <path d="M-22,-22 L22,22" />
            <path d="M22,-22 L-22,22" />
            <circle cx="0" cy="0" r="6" fill={side === "tails" ? "#a8a29e" : undefined} />
          </>
        )}
      </svg>
      {/* Subtle rim ring */}
      <div
        className="absolute inset-1.5 rounded-full pointer-events-none"
        style={{
          border: side === "heads"
            ? "2px solid rgba(120,53,15,0.7)"
            : "2px solid rgba(28,25,23,0.6)",
        }}
      />
      <span className="sr-only">{side}</span>
      {/* unused 'r' silenced */}
      <span style={{ display: "none" }}>{r}</span>
    </div>
  );
}
