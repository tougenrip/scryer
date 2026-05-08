"use client";

import { useEffect } from "react";
import { useQuickSearchStore } from "@/lib/store/quick-search-store";
import { FloatingCard } from "./floating-card";

interface Props {
  campaignId: string | null;
  userId: string | null;
}

export function FloatingCardLayer({ campaignId, userId }: Props) {
  const cards = useQuickSearchStore((s) => s.cards);
  const bind = useQuickSearchStore((s) => s.bind);

  useEffect(() => {
    bind(userId, campaignId);
  }, [bind, userId, campaignId]);

  if (cards.length === 0) return null;
  return (
    <>
      {cards.map((c) => (
        <FloatingCard key={c.id} campaignId={campaignId} card={c} />
      ))}
    </>
  );
}
