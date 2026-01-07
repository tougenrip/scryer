"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCharacter } from "@/hooks/useDndContent";
import { CharacterSheet } from "@/components/character/character-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/shared/navbar";
import { RollHistory } from "@/components/dice/roll-history";
import Link from "next/link";

export default function CharacterPage() {
  const params = useParams();
  const router = useRouter();
  const characterId = params.characterId as string;
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const { character, loading, error, updateCharacter } = useCharacter(characterId);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
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
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 container py-8 px-4 md:px-6">
          <div className="space-y-6">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 container py-8 px-4 md:px-6">
          <div className="space-y-4">
            <p className="text-destructive">Character not found</p>
            <Link href="/campaigns">
              <Button variant="outline">Back to Campaigns</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 container py-8 px-4 md:px-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/campaigns">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            {character.campaign_id && (
              <Link href={`/campaigns/${character.campaign_id}/characters`}>
                <Button variant="outline">View in Campaign</Button>
              </Link>
            )}
            <div className="flex-1" />
          </div>

          {!character.campaign_id && (
            <div className="bg-muted/50 border border-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                This character is not assigned to a campaign. You can assign it to a campaign from the campaign settings.
              </p>
            </div>
          )}

          <CharacterSheet
            character={character}
            onUpdate={handleUpdate}
            editable={isOwner}
          />
        </div>
      </main>
      <RollHistory />
    </div>
  );
}

