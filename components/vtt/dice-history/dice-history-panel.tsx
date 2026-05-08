"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { Input } from "@/components/ui/input";
import { Search, Dices } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string | null;
}

interface DiceRollRow {
  id: string;
  campaign_id: string;
  user_id: string;
  character_id: string | null;
  expression: string;
  result: number;
  breakdown: { rolls: number[]; modifier: number; total?: number };
  label: string | null;
  advantage: boolean;
  disadvantage: boolean;
  created_at: string;
}

interface UserMin {
  id: string;
  display_name: string | null;
  email?: string | null;
}

export function DiceHistoryPanel({ campaignId }: Props) {
  const [rolls, setRolls] = useState<DiceRollRow[]>([]);
  const [users, setUsers] = useState<Record<string, UserMin>>({});
  const [query, setQuery] = useState("");
  const [userFilter, setUserFilter] = useState<string>("all");

  useEffect(() => {
    if (!campaignId) {
      setRolls([]);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("dice_rolls")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (!error && data) setRolls(data as unknown as DiceRollRow[]);

      // Fetch user display names for the filter dropdown.
      const { data: members } = await supabase
        .from("campaign_members")
        .select("user_id, profiles(id, display_name)")
        .eq("campaign_id", campaignId);
      if (cancelled) return;
      if (members) {
        const map: Record<string, UserMin> = {};
        for (const m of members as unknown as Array<{
          user_id: string;
          profiles?: { id: string; display_name: string | null } | null;
        }>) {
          if (m.profiles) {
            map[m.user_id] = {
              id: m.user_id,
              display_name: m.profiles.display_name,
            };
          }
        }
        setUsers(map);
      }
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`dice_rolls:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dice_rolls",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (cancelled) return;
          const row = payload.new as unknown as DiceRollRow;
          setRolls((prev) =>
            prev.some((r) => r.id === row.id) ? prev : [row, ...prev]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rolls.filter((r) => {
      if (userFilter !== "all" && r.user_id !== userFilter) return false;
      if (!q) return true;
      return (
        r.expression.toLowerCase().includes(q) ||
        (r.label ?? "").toLowerCase().includes(q)
      );
    });
  }, [rolls, query, userFilter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="shrink-0 border-b border-border p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Dices className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold flex-1">Dice history</h2>
          <span className="text-[10px] text-muted-foreground">
            {filtered.length}/{rolls.length}
          </span>
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search expression or label…"
            className="h-8 pl-7 text-xs"
          />
        </div>
        {Object.keys(users).length > 0 && (
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="w-full h-7 rounded border bg-background px-2 text-xs"
          >
            <option value="all">All players</option>
            {Object.values(users).map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name ?? "Unknown"}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            No rolls match.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => {
              const u = users[r.user_id];
              const isCrit20 =
                r.expression.toLowerCase().includes("d20") &&
                r.breakdown.rolls.length === 1 &&
                r.breakdown.rolls[0] === 20;
              const isCrit1 =
                r.expression.toLowerCase().includes("d20") &&
                r.breakdown.rolls.length === 1 &&
                r.breakdown.rolls[0] === 1;
              return (
                <li key={r.id} className="px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-xl font-bold tabular-nums leading-none",
                        isCrit20 && "text-emerald-400",
                        isCrit1 && "text-rose-400",
                        !isCrit20 && !isCrit1 && "text-amber-400"
                      )}
                    >
                      {r.result}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                      {r.expression}
                    </span>
                    {r.advantage && (
                      <span className="text-[9px] uppercase rounded bg-emerald-500/15 text-emerald-300 px-1.5 py-px">
                        Adv
                      </span>
                    )}
                    {r.disadvantage && (
                      <span className="text-[9px] uppercase rounded bg-rose-500/15 text-rose-300 px-1.5 py-px">
                        Dis
                      </span>
                    )}
                  </div>
                  {r.label && (
                    <p className="text-xs text-foreground truncate mt-0.5">
                      {r.label}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {u?.display_name ?? "Player"} · {relativeTime(r.created_at)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}
