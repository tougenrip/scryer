"use client";

import { useEffect } from "react";
import { useHandoutsStore } from "@/lib/store/handouts-store";
import { useVttHandouts } from "@/hooks/useVttHandouts";
import { HandoutFloatingCard } from "./handout-floating-card";

interface Props {
  campaignId: string | null;
  userId: string | null;
  isDm: boolean;
}

/**
 * Renders all currently-open handout cards plus auto-pops new handouts the
 * user hasn't seen yet on this device. DM also auto-sees their own sends so
 * they can verify the popup looks right.
 */
export function HandoutsLayer({ campaignId, userId }: Props) {
  const { handouts } = useVttHandouts(campaignId, userId);
  const cards = useHandoutsStore((s) => s.cards);
  const bind = useHandoutsStore((s) => s.bind);
  const open = useHandoutsStore((s) => s.open);
  const hasSeen = useHandoutsStore((s) => s.hasSeen);
  const markSeen = useHandoutsStore((s) => s.markSeen);

  // Bind store to current user/campaign — loads persisted cards + seen set.
  useEffect(() => {
    bind(userId, campaignId);
  }, [bind, userId, campaignId]);

  // Auto-pop newly arrived handouts (only those we haven't seen on this
  // device). The handouts list is newest-first, so iterate that way.
  useEffect(() => {
    for (const h of handouts) {
      if (!hasSeen(h.id)) {
        markSeen(h.id);
        open(h.id);
      }
    }
  }, [handouts, hasSeen, markSeen, open]);

  if (cards.length === 0) return null;
  return (
    <>
      {cards.map((c) => (
        <HandoutFloatingCard
          key={c.id}
          campaignId={campaignId}
          userId={userId}
          card={c}
        />
      ))}
    </>
  );
}
