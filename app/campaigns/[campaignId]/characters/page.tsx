"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function CharactersPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const [userId, setUserId] = useState<string | null>(null);

  const { characters, loading, error } = useCampaignCharacters(campaignId);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getUser();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">Error loading characters</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-serif">Characters</h1>
          <p className="text-muted-foreground mt-1">
            Manage characters in this campaign
          </p>
        </div>
        <Link href={`/character-creator?campaignId=${campaignId}`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Character
          </Button>
        </Link>
      </div>

      {characters.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No characters yet. Create your first character!
            </p>
            <Link href={`/character-creator?campaignId=${campaignId}`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Character
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((character) => (
            <Link
              key={character.id}
              href={`/campaigns/${campaignId}/characters/${character.id}`}
            >
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-lg overflow-hidden border border-border bg-muted flex-shrink-0">
                      {character.image_url ? (
                        <img
                          src={character.image_url}
                          alt={character.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                          <span className="text-lg font-bold text-primary/60">
                            {character.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle>{character.name}</CardTitle>
                      <CardDescription>
                        Level {character.level} • {character.race_source === "srd" ? character.race_index : "Custom Race"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">HP:</span>{" "}
                      {character.hp_current} / {character.hp_max}
                    </div>
                    <div>
                      <span className="text-muted-foreground">AC:</span>{" "}
                      {character.armor_class}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

