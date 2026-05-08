"use client";

import { useState, useMemo, useEffect } from "react";
import { usePartyLoot, type PartyLootRow } from "@/hooks/usePartyLoot";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import { TreasuryStrip } from "./treasury-strip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Hand,
  Trash2,
  ChevronDown,
  ChevronRight,
  Swords,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string | null;
  userId: string | null;
  isDm: boolean;
}

const RARITY_COLOR: Record<string, string> = {
  Common: "bg-neutral-500/20 text-neutral-200 border-neutral-500/30",
  Uncommon: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Rare: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  "Very Rare": "bg-violet-500/20 text-violet-300 border-violet-500/30",
  Legendary: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function LootTabPanel({ campaignId, userId, isDm }: Props) {
  const { loot, loading, claim, challenge, removeRow } = usePartyLoot(campaignId);
  const { characters } = useCampaignCharacters(campaignId ?? "");
  const [showClaimed, setShowClaimed] = useState(false);

  // The current user's own characters (for the Claim button); DM can pick
  // any character.
  const myChars = useMemo(
    () => characters.filter((c) => c.user_id === userId),
    [characters, userId]
  );

  const unclaimed = loot.filter((r) => !r.claimed_by_character_id);
  const claimed = loot.filter((r) => r.claimed_by_character_id);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        <TreasuryStrip campaignId={campaignId} isDm={isDm} />

        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
            Unclaimed ({unclaimed.length})
          </h3>
          {loading && (
            <p className="text-xs italic text-muted-foreground">Loading…</p>
          )}
          {!loading && unclaimed.length === 0 && (
            <p className="text-xs italic text-muted-foreground py-3 text-center">
              Nothing to claim. Run an encounter and end with loot.
            </p>
          )}
          <ul className="space-y-1.5">
            {unclaimed.map((row) => (
              <LootRowView
                key={row.id}
                row={row}
                myChars={myChars}
                allChars={characters}
                isDm={isDm}
                userId={userId}
                onClaim={(charId) => void claim(row.id, charId)}
                onChallenge={(charId, game) =>
                  void challenge(row.id, charId, userId ?? "", game)
                }
                onRemove={() => void removeRow(row.id)}
              />
            ))}
          </ul>
        </div>

        {claimed.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowClaimed((s) => !s)}
              className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground mb-1.5"
            >
              {showClaimed ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Claimed ({claimed.length})
            </button>
            {showClaimed && (
              <ul className="space-y-1.5">
                {claimed.map((row) => {
                  const char = characters.find(
                    (c) => c.id === row.claimed_by_character_id
                  );
                  return (
                    <li
                      key={row.id}
                      className="flex items-center gap-2 rounded border border-border bg-background/50 p-2 text-sm"
                    >
                      <span className="flex-1 truncate">{row.item_name}</span>
                      {row.rarity && (
                        <Badge
                          variant="outline"
                          className={cn("text-[9px]", RARITY_COLOR[row.rarity])}
                        >
                          {row.rarity}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        → {char?.name ?? "?"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LootRowView({
  row,
  myChars,
  allChars,
  isDm,
  userId,
  onClaim,
  onChallenge,
  onRemove,
}: {
  row: PartyLootRow;
  myChars: Array<{ id: string; name: string }>;
  allChars: Array<{ id: string; name: string }>;
  isDm: boolean;
  userId: string | null;
  onClaim: (characterId: string) => void;
  onChallenge: (characterId: string, game: "rps" | "coin") => void;
  onRemove: () => void;
}) {
  const [pickingChar, setPickingChar] = useState(false);
  const [challengeMode, setChallengeMode] = useState(false);
  // Re-render every 250ms so the countdown ticks down smoothly.
  const [, force] = useState(0);
  useEffect(() => {
    if (!row.challenge_until) return;
    const t = window.setInterval(() => force((n) => n + 1), 250);
    return () => window.clearInterval(t);
  }, [row.challenge_until]);

  const onClaimClick = () => {
    if (isDm) {
      setPickingChar((p) => !p);
      return;
    }
    if (myChars.length === 1) {
      onClaim(myChars[0].id);
    } else if (myChars.length > 1) {
      setPickingChar((p) => !p);
    }
  };

  const canClaim = isDm || myChars.length > 0;
  const choices = isDm ? allChars : myChars;

  // Pending state: someone clicked Claim but the challenge window is open.
  const pendingUntil = row.challenge_until
    ? new Date(row.challenge_until).getTime()
    : 0;
  const remainingMs = Math.max(0, pendingUntil - Date.now());
  const isPending = !!row.pending_claim_by_character_id && remainingMs > 0;
  const pendingCharName = isPending
    ? allChars.find((c) => c.id === row.pending_claim_by_character_id)?.name ??
      "someone"
    : null;
  // I can challenge if:
  //   - row is pending,
  //   - I'm not the pending claimer,
  //   - I have a character to fight with.
  const myEligibleChars = myChars.filter(
    (c) => c.id !== row.pending_claim_by_character_id
  );
  const canChallenge =
    isPending && !!userId && myEligibleChars.length > 0;

  return (
    <li
      className={cn(
        "rounded border bg-background/50 p-2 text-sm transition-colors",
        isPending
          ? "border-amber-500/60 bg-amber-500/10"
          : "border-border"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate">{row.item_name}</span>
        {row.rarity && (
          <Badge
            variant="outline"
            className={cn("text-[9px]", RARITY_COLOR[row.rarity])}
          >
            {row.rarity}
          </Badge>
        )}
        {isPending ? (
          <>
            <span className="text-[10px] text-amber-300">
              {pendingCharName} claiming · {Math.ceil(remainingMs / 1000)}s
            </span>
            {canChallenge && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setChallengeMode((c) => !c)}
                className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/15"
              >
                <Swords className="h-3 w-3 mr-1" />
                Challenge
              </Button>
            )}
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={onClaimClick}
            disabled={!canClaim}
            className="h-7 text-xs"
          >
            <Hand className="h-3 w-3 mr-1" />
            {isDm ? "Assign" : "Claim"}
          </Button>
        )}
        {isDm && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove from stash"
            className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-rose-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {pickingChar && choices.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {choices.map((c) => (
            <Button
              key={c.id}
              type="button"
              size="sm"
              variant="outline"
              className="h-6 text-[10px]"
              onClick={() => {
                onClaim(c.id);
                setPickingChar(false);
              }}
            >
              {c.name}
            </Button>
          ))}
        </div>
      )}
      {challengeMode && canChallenge && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-muted-foreground mr-1">
            Pick character + game:
          </span>
          {myEligibleChars.flatMap((c) =>
            (["rps", "coin"] as const).map((g) => (
              <Button
                key={`${c.id}-${g}`}
                type="button"
                size="sm"
                variant="outline"
                className="h-6 text-[10px]"
                onClick={() => {
                  onChallenge(c.id, g);
                  setChallengeMode(false);
                }}
              >
                {c.name} · {g === "rps" ? "RPS" : "Coin"}
              </Button>
            ))
          )}
        </div>
      )}
    </li>
  );
}
