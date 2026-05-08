"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLootDuels, type LootDuel } from "@/hooks/useLootDuels";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import { RpsHand } from "./rps-hands";
import { CoinFlip } from "./coin-flip";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Props {
  campaignId: string | null;
  userId: string | null;
}

/**
 * DuelLayer: watches all active duels in the campaign and pops the modal
 * when the current user is involved (or for spectators on done duels for
 * the brief reveal window). Handles RPS + coin flip in one shared layout.
 */
export function DuelLayer({ campaignId, userId }: Props) {
  const { duels, submitChoice } = useLootDuels(campaignId);
  const { characters } = useCampaignCharacters(campaignId ?? "");

  // Find the most recent unresolved duel involving the current user OR a
  // recently-resolved one that should still show the reveal animation.
  const visible = useMemo<LootDuel | null>(() => {
    if (!userId) return null;
    const myActive = duels.find(
      (d) =>
        d.status !== "done" &&
        (d.defender_user_id === userId || d.challenger_user_id === userId)
    );
    if (myActive) return myActive;
    // Spectator view of a recent resolution (last 8s).
    const recent = duels.find((d) => {
      if (d.status !== "done" || !d.resolved_at) return false;
      const age = Date.now() - new Date(d.resolved_at).getTime();
      return age < 8_000;
    });
    return recent ?? null;
  }, [duels, userId]);

  const charById = useMemo(() => {
    const m = new Map<string, { name: string; image_url: string | null }>();
    for (const c of characters) {
      m.set(c.id, { name: c.name, image_url: c.image_url });
    }
    return m;
  }, [characters]);

  if (!visible || !userId) return null;

  return (
    <DuelModal
      duel={visible}
      asUserId={userId}
      submitChoice={(choice) => submitChoice(visible.id, userId, choice)}
      defenderName={
        charById.get(visible.defender_character_id)?.name ?? "Defender"
      }
      challengerName={
        charById.get(visible.challenger_character_id)?.name ?? "Challenger"
      }
    />
  );
}

function DuelModal({
  duel,
  asUserId,
  submitChoice,
  defenderName,
  challengerName,
}: {
  duel: LootDuel;
  asUserId: string;
  submitChoice: (choice: string) => void | Promise<void>;
  defenderName: string;
  challengerName: string;
}) {
  const isDefender = duel.defender_user_id === asUserId;
  const isChallenger = duel.challenger_user_id === asUserId;
  const isParticipant = isDefender || isChallenger;

  const myChoice = isDefender
    ? duel.defender_choice
    : isChallenger
    ? duel.challenger_choice
    : null;
  const opponentChoice = isDefender
    ? duel.challenger_choice
    : duel.defender_choice;
  const myLocked = isDefender
    ? !!duel.defender_locked_at
    : isChallenger
    ? !!duel.challenger_locked_at
    : true;
  const opponentLocked = isDefender
    ? !!duel.challenger_locked_at
    : !!duel.defender_locked_at;

  const status = duel.status;
  const isRevealing = status === "revealing" || status === "done";
  const isDone = status === "done";

  // Phase per side: while opponent hasn't locked, both stay idle. Once
  // both lock, status flips to revealing, the trigger computes the winner
  // and writes status='done' instantly. We model the reveal animation by
  // staying in 'shaking' for ~1.4s when status === 'done', then 'revealed'.
  const [revealPhase, setRevealPhase] = useState<"idle" | "shaking" | "revealed">(
    "idle"
  );
  useEffect(() => {
    if (!isDone) {
      setRevealPhase("idle");
      return;
    }
    setRevealPhase("shaking");
    const t = window.setTimeout(() => setRevealPhase("revealed"), 1450);
    return () => window.clearTimeout(t);
  }, [isDone, duel.id]);

  // Coin: outcome is encoded by who won + their choice. If winner picked
  // heads, outcome was heads.
  const coinOutcome: "heads" | "tails" | null = useMemo(() => {
    if (duel.game !== "coin" || !duel.winner_character_id) return null;
    const winnerChoice =
      duel.winner_character_id === duel.defender_character_id
        ? duel.defender_choice
        : duel.challenger_choice;
    return winnerChoice === "heads" || winnerChoice === "tails"
      ? winnerChoice
      : null;
  }, [duel]);

  const winnerName =
    duel.winner_character_id === duel.defender_character_id
      ? defenderName
      : duel.winner_character_id === duel.challenger_character_id
      ? challengerName
      : null;

  const myDisplay = isDefender ? defenderName : challengerName;
  const oppDisplay = isDefender ? challengerName : defenderName;

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="max-w-xl border-amber-500/40 bg-popover text-popover-foreground p-0 overflow-hidden"
        // Don't allow esc/click-out to close while a duel is happening.
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="px-4 pt-4 pb-3 border-b border-amber-500/30 bg-amber-500/10">
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold text-center"
            style={{ fontVariant: "small-caps" }}
          >
            Duel · {duel.game === "rps" ? "Rock Paper Scissors" : "Coin Flip"}
          </p>
          <p className="text-center font-serif text-base mt-0.5">
            <span className="text-amber-300">{defenderName}</span>{" "}
            <span className="text-muted-foreground">vs</span>{" "}
            <span className="text-amber-300">{challengerName}</span>
          </p>
        </div>

        <div className="p-6 min-h-[260px] flex flex-col items-center justify-center">
          {duel.game === "rps" ? (
            <div className="w-full">
              <div className="flex items-end justify-around gap-6">
                <div className="text-center">
                  <RpsHand
                    choice={
                      isParticipant && !isDefender
                        ? null
                        : (duel.defender_choice as "rock" | "paper" | "scissors" | null)
                    }
                    phase={
                      isRevealing
                        ? revealPhase === "idle"
                          ? "shaking"
                          : revealPhase
                        : "idle"
                    }
                    size={140}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{defenderName}</p>
                </div>
                <div className="text-center">
                  <RpsHand
                    choice={
                      isParticipant && !isChallenger
                        ? null
                        : (duel.challenger_choice as "rock" | "paper" | "scissors" | null)
                    }
                    phase={
                      isRevealing
                        ? revealPhase === "idle"
                          ? "shaking"
                          : revealPhase
                        : "idle"
                    }
                    size={140}
                    mirrored
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{challengerName}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <CoinFlip
                outcome={coinOutcome}
                phase={
                  isRevealing
                    ? revealPhase === "idle"
                      ? "spinning"
                      : revealPhase === "shaking"
                      ? "spinning"
                      : "revealed"
                    : "idle"
                }
                size={200}
              />
              {!isRevealing && (
                <p className="text-xs text-muted-foreground italic">
                  Both players, lock in your call.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Bottom row — controls or status. */}
        <div className="border-t border-amber-500/30 bg-amber-500/5 px-4 py-3">
          {isDone && winnerName ? (
            <p className="text-center text-sm">
              <span className="text-amber-400 font-bold">{winnerName}</span>{" "}
              <span className="text-muted-foreground">wins!</span>
            </p>
          ) : status === "tie_rematch" ? (
            <p className="text-center text-sm italic text-amber-300">
              Tie. Pick again.
            </p>
          ) : null}

          {/* Choice picker (participant only, not yet locked) */}
          {isParticipant && !myLocked && (status === "choosing" || status === "tie_rematch") && (
            <div className="mt-2 flex justify-center gap-2 flex-wrap">
              {duel.game === "rps"
                ? (["rock", "paper", "scissors"] as const).map((c) => (
                    <Button
                      key={c}
                      type="button"
                      onClick={() => void submitChoice(c)}
                      className="capitalize"
                    >
                      {c === "rock" ? "👊 Rock" : c === "paper" ? "✋ Paper" : "✌️ Scissors"}
                    </Button>
                  ))
                : (["heads", "tails"] as const).map((c) => (
                    <Button
                      key={c}
                      type="button"
                      onClick={() => void submitChoice(c)}
                      className="capitalize"
                    >
                      {c === "heads" ? "★ Heads" : "✕ Tails"}
                    </Button>
                  ))}
            </div>
          )}

          {/* Locked-in status */}
          {isParticipant && myLocked && !isRevealing && (
            <p className="text-center text-xs text-amber-300 mt-2">
              Locked in. {opponentLocked ? "Revealing…" : `Waiting for ${oppDisplay}…`}{" "}
              {opponentLocked && (
                <Loader2 className="inline h-3 w-3 animate-spin" />
              )}
            </p>
          )}

          {/* Spectator status */}
          {!isParticipant && !isDone && (
            <p className="text-center text-xs italic text-muted-foreground">
              {duel.defender_locked_at && duel.challenger_locked_at
                ? "Revealing…"
                : `${[
                    !duel.defender_locked_at ? defenderName : null,
                    !duel.challenger_locked_at ? challengerName : null,
                  ]
                    .filter(Boolean)
                    .join(" + ")} picking…`}
            </p>
          )}

          {/* unused-var silence */}
          <span className="hidden">
            {String(myChoice)}
            {String(opponentChoice)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
