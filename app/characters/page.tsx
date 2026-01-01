"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUserCharacters } from "@/hooks/useDndContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, User } from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/shared/navbar";
import { Badge } from "@/components/ui/badge";

export default function CharactersPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const { characters, loading, error } = useUserCharacters(userId);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient(); 
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setUserId(user.id);
      } else {
        router.push("/auth/login?redirect=/characters");
      }
    }
    getUser();
  }, [router]);

  // Group characters by campaign
  const charactersByCampaign = characters.reduce((acc, char) => {
    const key = char.campaign_id || "standalone";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(char);
    return acc;
  }, {} as Record<string, typeof characters>);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 container py-8 px-4 md:px-6 max-w-6xl mx-auto">
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
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 container py-8 px-4 md:px-6 max-w-6xl mx-auto">
          <div className="space-y-4">
            <p className="text-destructive">Error loading characters: {error.message}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 container py-8 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-serif">My Characters</h1>
              <p className="text-muted-foreground mt-1">
                Manage all your characters
              </p>
            </div>
            <Link href="/character-creator">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Character
              </Button>
            </Link>
          </div>

          {characters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <User className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4 text-center">
                  No characters yet. Create your first character to get started!
                </p>
                <Link href="/character-creator">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Character
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Standalone Characters */}
              {charactersByCampaign.standalone && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">Standalone Characters</h2>
                    <Badge variant="secondary">{charactersByCampaign.standalone.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {charactersByCampaign.standalone.map((character) => (
                      <Link
                        key={character.id}
                        href={`/characters/${character.id}`}
                      >
                        <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
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
                                  Level {character.level} {character.class_index && `• ${character.class_index}`}
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Race:</span>{" "}
                                {character.race_index || "Unknown"}
                              </div>
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
                </div>
              )}

              {/* Campaign Characters - grouped by campaign */}
              {Object.entries(charactersByCampaign)
                .filter(([campaignId]) => campaignId !== "standalone")
                .map(([campaignId, chars]) => (
                  <div key={campaignId}>
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <h2 className="text-xl font-semibold">Campaign Characters</h2>
                      <Badge variant="secondary">{chars.length}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {chars.map((character) => (
                        <Link
                          key={character.id}
                          href={`/campaigns/${campaignId}/characters/${character.id}`}
                        >
                          <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
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
                                    Level {character.level} {character.class_index && `• ${character.class_index}`}
                                  </CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Race:</span>{" "}
                                  {character.race_index || "Unknown"}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">HP:</span>{" "}
                                  {character.hp_current} / {character.hp_max}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">AC:</span>{" "}
                                  {character.armor_class}
                                </div>
                                <div className="pt-2">
                                  <Link
                                    href={`/campaigns/${campaignId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-primary hover:underline"
                                  >
                                    View Campaign →
                                  </Link>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

