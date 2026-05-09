"use client";

import { useEffect, useState } from "react";
import { ChevronRight, MoreVertical, Skull, SkipBack, SkipForward, Trash2, X } from "lucide-react";
import { useCombat, type CombatParticipant } from "@/hooks/useCombat";
import { useVttTokens } from "@/hooks/useVttTokens";
import { useVttStore } from "@/lib/store/vtt-store";
import { cleanVttDisplayName } from "@/lib/vtt/display-name";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  campaignId: string;
  mapId: string | null;
  isDm: boolean;
  onOpenEditor?: () => void;
};

type MenuState = {
  participant: CombatParticipant;
  x: number;
  y: number;
};

export function VttCombatRail({ campaignId, mapId, isDm, onOpenEditor }: Props) {
  const setSelectedTokenId = useVttStore((s) => s.setSelectedTokenId);
  const selectedTokenId = useVttStore((s) => s.selectedTokenId);
  const setHoveredTokenId = useVttStore((s) => s.setHoveredTokenId);
  const { deleteToken } = useVttTokens(mapId, campaignId);
  const {
    activeEncounter,
    participants,
    loading,
    nextTurn,
    prevTurn,
    removeParticipant,
  } = useCombat(campaignId, mapId ?? undefined, !!mapId);
  const [menu, setMenu] = useState<MenuState | null>(null);

  useEffect(() => {
    if (!menu) return;

    const close = () => setMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("click", close);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menu]);

  if (!mapId || loading || !activeEncounter || participants.length === 0) return null;

  const sorted = [...participants].sort((a, b) => a.turn_order - b.turn_order);
  const currentIndex = activeEncounter.current_turn_index ?? 0;

  const openMenu = (event: React.MouseEvent, participant: CombatParticipant) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      participant,
      x: Math.max(64, Math.min(event.clientX, window.innerWidth - 210)),
      y: Math.max(72, Math.min(event.clientY, window.innerHeight - 190)),
    });
  };

  const inspectToken = (participant: CombatParticipant) => {
    if (participant.token_id) setSelectedTokenId(participant.token_id);
    setMenu(null);
  };

  const removeFromEncounter = async (participant: CombatParticipant) => {
    await removeParticipant(participant.id);
    setMenu(null);
  };

  const deleteParticipantToken = async (participant: CombatParticipant) => {
    const tokenName = cleanVttDisplayName(participant.token?.name || participant.token?.monster?.name);
    const ok = await deleteToken(participant.token_id);
    if (ok) {
      setMenu(null);
      toast.success(`${tokenName} deleted.`);
    } else {
      toast.error(`Could not delete ${tokenName}.`);
    }
  };

  return (
    <div
      data-vtt-floating-panel
      className="pointer-events-auto absolute left-[70px] top-6 z-[23] flex w-[92px] flex-col gap-[3px]"
    >
      <div className="flex items-center gap-1 px-[3px] pb-0.5 text-[9px] text-white/50">
        <span className="rounded-sm border border-white/10 bg-black/35 px-1.5 py-0.5">R{activeEncounter.round_number}</span>
        {isDm && (
          <>
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-sm border border-white/10 bg-black/35 text-white/65 hover:bg-white/10 hover:text-white"
              onClick={() => prevTurn()}
              title="Previous turn"
            >
              <SkipBack className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-sm border border-amber-300/30 bg-black/35 text-amber-200 hover:bg-amber-300/15 hover:text-amber-100"
              onClick={() => nextTurn()}
              title="Next turn"
            >
              <SkipForward className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="flex h-5 w-5 items-center justify-center rounded-sm border border-white/10 bg-black/35 text-white/65 hover:bg-white/10 hover:text-white"
              onClick={onOpenEditor}
              title="Manage encounter"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      <div className="max-h-[520px] space-y-[3px] overflow-y-auto pr-1 custom-scrollbar">
        {sorted.map((participant, index) => {
          const token = participant.token;
          const name = cleanVttDisplayName(token?.name || token?.character?.name || token?.monster?.name);
          const imageUrl = token?.image_url || token?.character?.image_url;
          const hp = token?.hp_current ?? 0;
          const maxHp = token?.hp_max ?? 0;
          const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 0;
          const downed = maxHp > 0 && hp <= 0;
          const isTurn = index === currentIndex;
          const isSelected = selectedTokenId === participant.token_id;
          const conditions = participant.conditions ?? [];

          return (
            <button
              key={participant.id}
              type="button"
              title={`${name} | HP ${hp}/${maxHp || "-"}${conditions.length ? ` | ${conditions.join(", ")}` : ""}`}
              onClick={() => setSelectedTokenId(participant.token_id)}
              onMouseEnter={() =>
                participant.token_id &&
                setHoveredTokenId(participant.token_id)
              }
              onMouseLeave={() => setHoveredTokenId(null)}
              onFocus={() =>
                participant.token_id &&
                setHoveredTokenId(participant.token_id)
              }
              onBlur={() => setHoveredTokenId(null)}
              onContextMenu={(event) => openMenu(event, participant)}
              className={cn(
                "group relative flex h-[43px] w-[86px] items-center overflow-hidden rounded-[3px] border bg-black/30 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_2px_8px_rgba(0,0,0,0.35)] backdrop-blur-[2px] transition-all hover:bg-black/45",
                isTurn
                  ? "border-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16),0_0_12px_rgba(255,255,255,0.28)]"
                  : isSelected
                    ? "border-cyan-300/70"
                    : "border-white/20",
                downed && "opacity-45 grayscale"
              )}
            >
              {isTurn && (
                <>
                  <ChevronRight className="absolute -left-[7px] top-1/2 z-20 h-4 w-4 -translate-y-1/2 fill-white text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.75)]" />
                  <span className="absolute left-0 top-0 z-10 h-full w-[2px] bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
                </>
              )}
              <div className="relative h-full w-[64px] shrink-0 overflow-hidden bg-neutral-900">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-xs font-semibold text-white/80">
                    {name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/45" />
                <div className="absolute bottom-0 left-0 h-[3px] w-full bg-black/65">
                  <div
                    className={cn(
                      "h-full transition-all",
                      hpPct > 60 ? "bg-cyan-300" : hpPct > 25 ? "bg-amber-300" : "bg-red-500"
                    )}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
                {downed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Skull className="h-4 w-4 text-red-300" />
                  </div>
                )}
              </div>
              <div className="absolute right-[3px] top-1/2 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center rounded-[2px] border border-white/20 bg-black/70 px-1 text-[10px] font-bold text-white shadow-sm">
                {participant.initiative_roll}
              </div>
            </button>
          );
        })}
      </div>

      {menu && (
        <div
          className="fixed z-[90] w-48 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-2xl"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-xs font-semibold">
              {cleanVttDisplayName(menu.participant.token?.name || menu.participant.token?.monster?.name)}
            </p>
            <p className="text-[10px] text-muted-foreground">Initiative {menu.participant.initiative_roll}</p>
          </div>
          <button type="button" className="flex w-full px-3 py-2 text-left text-xs hover:bg-muted" onClick={() => inspectToken(menu.participant)}>
            Inspect
          </button>
          {isDm && (
            <>
              <button type="button" className="flex w-full px-3 py-2 text-left text-xs hover:bg-muted" onClick={() => removeFromEncounter(menu.participant)}>
                Remove From Encounter
              </button>
              <button type="button" className="flex w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10" onClick={() => deleteParticipantToken(menu.participant)}>
                <Trash2 className="mr-2 h-3 w-3" />
                Delete Token
              </button>
            </>
          )}
          <button type="button" className="flex w-full px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted" onClick={() => setMenu(null)}>
            <X className="mr-2 h-3 w-3" />
            Close
          </button>
        </div>
      )}
    </div>
  );
}
