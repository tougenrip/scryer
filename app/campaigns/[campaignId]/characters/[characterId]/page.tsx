"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCharacter } from "@/hooks/useDndContent";
import { CharacterSheet } from "@/components/character/character-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { RollHistory } from "@/components/dice/roll-history";

export default function CharacterPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const characterId = params.characterId as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const { character, loading, error, updateCharacter } = useCharacter(characterId);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        if (character) {
          setIsOwner(character.user_id === user.id);
        }
      }
    }
    getUser();
  }, [character]);

  const handleUpdate = async (updates: Partial<typeof character>) => {
    const result = await updateCharacter(updates);
    if (result.success) {
      toast.success("Character updated");
    } else {
      toast.error("Failed to update character");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Character not found</p>
        <Link href={`/campaigns/${campaignId}/characters`}>
          <Button variant="outline">Back to Characters</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
    <CharacterSheet
      character={character}
      onUpdate={handleUpdate}
      editable={isOwner}
    />
      <RollHistory />
    </>
  );
}

