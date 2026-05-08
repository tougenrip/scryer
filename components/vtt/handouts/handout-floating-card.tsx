"use client";

import { useEffect } from "react";
import { useHandoutsStore, type HandoutCard } from "@/lib/store/handouts-store";
import { useVttHandouts } from "@/hooks/useVttHandouts";
import { FloatingCardShell } from "../floating-card-shell";
import { HandoutDetail } from "./handout-detail";

interface Props {
  campaignId: string | null;
  userId: string | null;
  card: HandoutCard;
}

export function HandoutFloatingCard({ campaignId, userId, card }: Props) {
  const closeCard = useHandoutsStore((s) => s.closeCard);
  const moveCard = useHandoutsStore((s) => s.moveCard);
  const resizeCard = useHandoutsStore((s) => s.resizeCard);
  const focusCard = useHandoutsStore((s) => s.focusCard);

  const { handouts, markRead, markDismissed } = useVttHandouts(campaignId, userId);
  const handout = handouts.find((h) => h.id === card.id);

  // Mark read when the card mounts.
  useEffect(() => {
    if (!handout) return;
    void markRead(handout.id);
  }, [handout, markRead]);

  return (
    <FloatingCardShell
      cardId={card.id}
      x={card.x}
      y={card.y}
      width={card.width}
      height={card.height}
      label="Handout"
      onMove={moveCard}
      onResize={resizeCard}
      onClose={(id) => {
        closeCard(id);
        if (handout) void markDismissed(handout.id);
      }}
      onFocus={focusCard}
    >
      {handout ? (
        <HandoutDetail handout={handout} />
      ) : (
        <p className="text-sm italic text-[#7a1f1f]">Handout no longer available.</p>
      )}
    </FloatingCardShell>
  );
}
