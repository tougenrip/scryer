"use client";

import { useMemo, useState } from "react";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import { useLootDuels } from "@/hooks/useLootDuels";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Swords } from "lucide-react";

interface Props {
  campaignId: string | null;
  userId: string | null;
  isDm: boolean;
}

/**
 * Casual duels — challenge another player to RPS or coin flip with no
 * loot at stake. Useful for "who pays for the next round?" / "who saves
 * the kobold?" / etc. Result is announced in chat by the resolution
 * trigger.
 */
export function CasualDuelsTab({ campaignId, userId, isDm }: Props) {
  const { characters } = useCampaignCharacters(campaignId ?? "");
  const { duels } = useLootDuels(campaignId);
  const [myCharId, setMyCharId] = useState<string>("");
  const [oppCharId, setOppCharId] = useState<string>("");
  const [game, setGame] = useState<"rps" | "coin">("rps");
  const [submitting, setSubmitting] = useState(false);

  // DM can challenge anyone with anyone; players can only challenge with
  // their own characters.
  const myChars = useMemo(
    () =>
      isDm
        ? characters
        : characters.filter((c) => c.user_id === userId),
    [characters, userId, isDm]
  );
  const opponentChars = useMemo(
    () => characters.filter((c) => c.id !== myCharId),
    [characters, myCharId]
  );

  // Recent activity feed (last 10 duels, finished or not).
  const recent = duels.slice(0, 10);

  const startDuel = async () => {
    if (!campaignId || !userId || !myCharId || !oppCharId) {
      toast.error("Pick both characters first.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    // We need the opponent's user_id for the duel row.
    const opp = characters.find((c) => c.id === oppCharId);
    if (!opp || !opp.user_id) {
      toast.error("Opponent has no user assigned.");
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("loot_duels").insert({
      campaign_id: campaignId,
      loot_id: null,
      game,
      // The challenger is the current user; the defender is the opponent.
      defender_character_id: oppCharId,
      defender_user_id: opp.user_id,
      challenger_character_id: myCharId,
      challenger_user_id: userId,
    } as never);
    if (error) {
      console.error("Failed to start duel:", error);
      toast.error("Couldn't start duel.");
    } else {
      toast.success("Challenge sent.");
      setMyCharId("");
      setOppCharId("");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
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
                Your character
              </label>
              <Select value={myCharId} onValueChange={setMyCharId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pick your character…" />
                </SelectTrigger>
                <SelectContent>
                  {myChars.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Opponent
              </label>
              <Select
                value={oppCharId}
                onValueChange={setOppCharId}
                disabled={!myCharId}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Pick an opponent…" />
                </SelectTrigger>
                <SelectContent>
                  {opponentChars.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name}
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
              disabled={submitting || !myCharId || !oppCharId}
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
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
