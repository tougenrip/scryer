"use client";

import {
  useCharacterCardsStore,
  type CharacterCard,
} from "@/lib/store/character-cards-store";
import { FloatingCardShell } from "../floating-card-shell";
import { useCharacter } from "@/hooks/useDndContent";
import { CharacterSheet } from "@/components/character/character-sheet";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  card: CharacterCard;
  currentUserId: string | null;
}

export function CharacterFloatingCard({ card, currentUserId }: Props) {
  const close = useCharacterCardsStore((s) => s.close);
  const move = useCharacterCardsStore((s) => s.move);
  const resize = useCharacterCardsStore((s) => s.resize);
  const focus = useCharacterCardsStore((s) => s.focus);

  return (
    <FloatingCardShell
      cardId={card.id}
      x={card.x}
      y={card.y}
      width={card.width}
      height={card.height}
      label="Character"
      onMove={move}
      onResize={resize}
      onClose={close}
      onFocus={focus}
    >
      <Body characterId={card.characterId} currentUserId={currentUserId} />
    </FloatingCardShell>
  );
}

function Body({
  characterId,
  currentUserId,
}: {
  characterId: string;
  currentUserId: string | null;
}) {
  const { character, loading, error, updateCharacter } = useCharacter(characterId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading sheet…
      </div>
    );
  }
  if (error || !character) {
    return (
      <p className="py-6 text-center text-sm italic text-amber-400">
        Character not found.
      </p>
    );
  }
  const isOwner = character.user_id === currentUserId;
  return (
    <CharacterSheet
      character={character}
      editable={isOwner}
      onUpdate={async (updates) => {
        if (!isOwner) return;
        const result = await updateCharacter(updates);
        if (!result.success) toast.error("Couldn't save");
      }}
    />
  );
}
