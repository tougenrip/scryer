"use client";

import { cn } from "@/lib/utils";

export type RpsChoice = "rock" | "paper" | "scissors";

const EMOJI: Record<RpsChoice, string> = {
  rock: "👊",
  paper: "✋",
  scissors: "✌️",
};

interface Props {
  /** What this hand is locked to during reveal. While shaking, draws as a fist. */
  choice: RpsChoice | null;
  /** Render mirrored so the right-side hand faces left. */
  mirrored?: boolean;
  /** "shaking" runs the shake-shake-shake-throw cycle. "revealed" pops. */
  phase: "idle" | "shaking" | "revealed";
  size?: number;
  className?: string;
}

/**
 * One animated hand for the RPS duel. We use OS-rendered emoji as the art
 * — they look great at any size, identical to what players already see
 * across every device, and don't require shipping or maintaining custom
 * SVGs. The animation is pure CSS transforms applied to a wrapper.
 */
export function RpsHand({
  choice,
  mirrored,
  phase,
  size = 160,
  className,
}: Props) {
  const display: RpsChoice = phase === "revealed" && choice ? choice : "rock";

  return (
    <div
      className={cn("relative inline-block select-none", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          "origin-bottom",
          phase === "shaking" && "rps-hand-shake",
          phase === "revealed" && "rps-hand-reveal"
        )}
        style={{
          transform: mirrored ? "scaleX(-1)" : undefined,
          fontSize: size * 0.78,
          lineHeight: 1,
          // Crisper drop-shadow that matches the parchment / amber palette.
          filter: "drop-shadow(0 0 18px rgba(251,191,36,0.4))",
        }}
      >
        {EMOJI[display]}
      </div>

      <style jsx>{`
        @keyframes rps-shake {
          0%   { transform: rotate(0deg) translateY(0); }
          15%  { transform: rotate(-30deg) translateY(-12px); }
          30%  { transform: rotate(0deg) translateY(0); }
          45%  { transform: rotate(-30deg) translateY(-12px); }
          60%  { transform: rotate(0deg) translateY(0); }
          75%  { transform: rotate(-30deg) translateY(-12px); }
          100% { transform: rotate(0deg) translateY(0); }
        }
        @keyframes rps-reveal-pop {
          0%   { transform: scale(0.55) rotate(-15deg); opacity: 0; }
          55%  { transform: scale(1.18) rotate(2deg);   opacity: 1; }
          100% { transform: scale(1) rotate(0);         opacity: 1; }
        }
        :global(.rps-hand-shake) {
          animation: rps-shake 1.4s cubic-bezier(0.4, 0, 0.6, 1) 1 forwards;
        }
        :global(.rps-hand-reveal) {
          animation: rps-reveal-pop 0.42s ease-out 1 forwards;
        }
      `}</style>
    </div>
  );
}
