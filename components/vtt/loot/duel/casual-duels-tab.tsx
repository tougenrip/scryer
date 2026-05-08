"use client";

import { useMemo, useState } from "react";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import { useLootDuels } from "@/hooks/useLootDuels";
import { useVttPresence } from "@/hooks/useVttPresence";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Swords, Coins } from "lucide-react";
import { CoinFlip, type CoinSide } from "./coin-flip";
import { useDuelViewStore } from "@/lib/store/duel-view-store";

interface Props {
  campaignId: string | null;
  userId: string | null;
  mapId: string | null;
  isDm: boolean;
}

/**
 * Casual duels — challenge another player to RPS or coin flip with no
 * loot at stake. Plus: a solo "Flip a coin" button that just animates a
 * coin and posts the result to chat (no opponent needed).
 */
export function CasualDuelsTab({ campaignId, userId, mapId, isDm }: Props) {
  const { characters } = useCampaignCharacters(campaignId ?? "");
  const { duels } = useLootDuels(campaignId);
  const { peers } = useVttPresence(campaignId, mapId);
  const openDuelView = useDuelViewStore((s) => s.open);
  // Selections are now USER-IDs from active presence, not character ids.
  // We resolve to a character behind the scenes (the duel schema requires
  // a character_id) by picking the user's first owned character.
  const [oppUserId, setOppUserId] = useState<string>("");
  const [game, setGame] = useState<"rps" | "coin">("rps");
  const [submitting, setSubmitting] = useState(false);
  const [soloFlip, setSoloFlip] = useState<{
    outcome: CoinSide;
    phase: "spinning" | "revealed";
  } | null>(null);

  const myChars = useMemo(
    () =>
      isDm ? characters : characters.filter((c) => c.user_id === userId),
    [characters, userId, isDm]
  );

  // Active opponents: every present peer except yourself, with their
  // first character resolved (so the duel can attach a character_id).
  const opponentOptions = useMemo(() => {
    return peers
      .filter((p) => p.userId !== userId)
      .map((p) => {
        const char = characters.find((c) => c.user_id === p.userId);
        return {
          userId: p.userId,
          displayName: p.displayName,
          characterId: char?.id ?? null,
          characterName: char?.name ?? null,
        };
      });
  }, [peers, characters, userId]);

  const recent = duels.slice(0, 10);

  const startDuel = async () => {
    if (!campaignId || !userId || !oppUserId) {
      toast.error("Pick an opponent first.");
      return;
    }
    const opp = opponentOptions.find((o) => o.userId === oppUserId);
    if (!opp) {
      toast.error("Opponent isn't online.");
      return;
    }
    if (!opp.characterId) {
      toast.error(`${opp.displayName} has no character to duel with yet.`);
      return;
    }
    // Resolve OUR character: first owned character (or first campaign char
    // if DM). Required because loot_duels.character_id columns are NOT NULL.
    const myChar = myChars[0];
    if (!myChar) {
      toast.error("You need a character to duel with.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("loot_duels")
      .insert({
        campaign_id: campaignId,
        loot_id: null,
        game,
        defender_character_id: opp.characterId,
        defender_user_id: opp.userId,
        challenger_character_id: myChar.id,
        challenger_user_id: userId,
      } as never)
      .select("id")
      .single();
    if (error) {
      console.error("Failed to start duel:", error);
      toast.error("Couldn't start duel.");
    } else {
      toast.success("Challenge sent.");
      setOppUserId("");
      if (data?.id) openDuelView((data as { id: string }).id);
    }
    setSubmitting(false);
  };

  const flipSoloCoin = async () => {
    if (!campaignId || !userId) return;
    const outcome: CoinSide = Math.random() < 0.5 ? "heads" : "tails";
    setSoloFlip({ outcome, phase: "spinning" });
    // Mid-spin transition for the reveal, matching the coin animation duration.
    window.setTimeout(() => {
      setSoloFlip({ outcome, phase: "revealed" });
    }, 1500);

    // Post the result to chat. We use the same `duel-result` payload kind
    // so the chat renderer already styles it; defender == challenger when
    // there's no opponent.
    const supabase = createClient();
    // Find the calling character — first owned character if any, fall back to
    // raw user message if none.
    const myChar = myChars[0] ?? null;
    const myName = myChar?.name ?? "Someone";
    // Pick an active map for the message (chat is map-scoped).
    const { data: mapRow } = await supabase
      .from("media_items")
      .select("id")
      .eq("campaign_id", campaignId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    await supabase.from("vtt_messages").insert({
      campaign_id: campaignId,
      map_id: mapRow?.id ?? null,
      user_id: userId,
      body: `${myName} flipped a coin: ${outcome}.`,
      payload: {
        kind: "coin-flip",
        outcome,
        flipped_by_character_id: myChar?.id ?? null,
        flipped_by_name: myName,
      },
    } as never);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
        {/* Solo coin flip — no opponent needed. */}
        <section className="rounded border border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Coins className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs uppercase tracking-wider font-bold text-amber-400 flex-1">
              Flip a Coin
            </h3>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Quick coin flip with no opponent — result is announced in chat.
          </p>
          <Button
            type="button"
            onClick={flipSoloCoin}
            disabled={!campaignId || !userId || !!soloFlip}
            className="w-full"
          >
            <Coins className="h-3.5 w-3.5 mr-1" />
            Flip
          </Button>
        </section>

        <section className="rounded border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs uppercase tracking-wider font-bold text-amber-400">
              Start a Duel
            </h3>
          </div>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Opponent (online players)
              </label>
              <Select
                value={oppUserId}
                onValueChange={setOppUserId}
                disabled={opponentOptions.length === 0}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue
                    placeholder={
                      opponentOptions.length === 0
                        ? "No one else is online…"
                        : "Pick an opponent…"
                    }
                  />
                </SelectTrigger>
                <SelectContent position="popper">
                  {opponentOptions.map((o) => (
                    <SelectItem
                      key={o.userId}
                      value={o.userId}
                      className="text-xs"
                      disabled={!o.characterId}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {o.displayName}
                        {!o.characterId && (
                          <span className="text-[9px] text-muted-foreground italic">
                            (no character)
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Game
              </label>
              <div className="flex gap-1 mt-1">
                <Button
                  type="button"
                  size="sm"
                  variant={game === "rps" ? "default" : "outline"}
                  className="flex-1 h-8 text-xs"
                  onClick={() => setGame("rps")}
                >
                  Rock Paper Scissors
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={game === "coin" ? "default" : "outline"}
                  className="flex-1 h-8 text-xs"
                  onClick={() => setGame("coin")}
                >
                  Coin Flip
                </Button>
              </div>
            </div>
            <Button
              type="button"
              onClick={startDuel}
              disabled={submitting || !oppUserId}
              className="w-full"
            >
              <Swords className="h-3.5 w-3.5 mr-1" />
              {submitting ? "Sending…" : "Send challenge"}
            </Button>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Recent duels
          </h3>
          {recent.length === 0 ? (
            <p className="text-xs italic text-muted-foreground py-3 text-center">
              No duels yet. Start one above.
            </p>
          ) : (
            <ul className="space-y-1">
              {recent.map((d) => {
                const def =
                  characters.find((c) => c.id === d.defender_character_id)?.name ?? "?";
                const cha =
                  characters.find((c) => c.id === d.challenger_character_id)?.name ?? "?";
                const winnerName = d.winner_character_id
                  ? characters.find((c) => c.id === d.winner_character_id)?.name
                  : null;
                const canOpen =
                  d.status !== "done" &&
                  (d.defender_user_id === userId ||
                    d.challenger_user_id === userId);
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-2 rounded border border-border bg-background/50 px-2 py-1.5 text-xs"
                  >
                    <span className="flex-1 truncate">
                      {def} vs {cha}
                      <span className="text-muted-foreground">
                        {" "}
                        · {d.game === "rps" ? "RPS" : "coin"}
                      </span>
                    </span>
                    {d.status === "done" && winnerName ? (
                      <span className="text-amber-400 font-bold text-[10px]">
                        {winnerName} won
                      </span>
                    ) : d.status === "tie_rematch" ? (
                      <span className="text-amber-300 italic text-[10px]">
                        Tie — rematch
                      </span>
                    ) : (
                      <span className="text-amber-300 text-[10px] animate-pulse">
                        Live
                      </span>
                    )}
                    {canOpen && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        onClick={() => openDuelView(d.id)}
                      >
                        Open
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Solo coin flip animation modal. After the spin lands, the user
          can either close it or flip again (no popup churn). */}
      <SoloCoinModal
        flip={soloFlip}
        onClose={() => setSoloFlip(null)}
        onFlipAgain={() => void flipSoloCoin()}
      />
    </div>
  );
}

function SoloCoinModal({
  flip,
  onClose,
  onFlipAgain,
}: {
  flip: { outcome: CoinSide; phase: "spinning" | "revealed" } | null;
  onClose: () => void;
  onFlipAgain: () => void;
}) {
  return (
    <Dialog
      open={!!flip}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-xs border-amber-500/40 bg-popover text-popover-foreground p-0 overflow-hidden">
        <DialogTitle className="sr-only">Coin flip result</DialogTitle>
        <div className="px-4 pt-4 pb-3 border-b border-amber-500/30 bg-amber-500/10 text-center">
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold"
            style={{ fontVariant: "small-caps" }}
          >
            Coin Flip
          </p>
        </div>
        <div className="p-6 flex flex-col items-center gap-3">
          <CoinFlip
            outcome={flip?.outcome ?? null}
            phase={flip?.phase ?? "idle"}
            size={160}
          />
          {flip?.phase === "revealed" && (
            <p
              className="text-2xl font-bold text-amber-300"
              style={{ fontVariant: "small-caps" }}
            >
              {flip.outcome}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 pb-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={flip?.phase !== "revealed"}
          >
            Close
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onFlipAgain}
            disabled={flip?.phase !== "revealed"}
          >
            <Coins className="h-3.5 w-3.5 mr-1" />
            Flip again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
