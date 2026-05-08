"use client";

import { useEffect } from "react";
import { useCharacterCardsStore } from "@/lib/store/character-cards-store";
import { CharacterFloatingCard } from "./character-floating-card";

interface Props {
  campaignId: string | null;
  userId: string | null;
}

export function CharacterCardsLayer({ campaignId, userId }: Props) {
  const cards = useCharacterCardsStore((s) => s.cards);
  const bind = useCharacterCardsStore((s) => s.bind);

  useEffect(() => {
    bind(userId, campaignId);
  }, [bind, userId, campaignId]);

  if (cards.length === 0) return null;
  return (
    <>
      {cards.map((c) => (
        <CharacterFloatingCard key={c.id} card={c} currentUserId={userId} />
      ))}
    </>
  );
}
