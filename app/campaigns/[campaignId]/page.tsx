"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { 
  useCampaignCharacters, 
  useUnassignedCharacters, 
  useRaces, 
  useClasses
} from "@/hooks/useDndContent";
import { CharacterCard } from "@/components/campaign/character-card";
import { DmNotes } from "@/components/campaign/dm-notes";
import { PartyToolsPanel } from "@/components/tools/PartyToolsPanel";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { Map } from "lucide-react";

export default function CampaignDashboard() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { updateCampaign, loading: updatingCampaign } = useUpdateCampaign();
  const { characters: activeCharacters, loading: activeLoading, refetch: refetchActive } = useCampaignCharacters(campaignId);
  const { characters: unassignedCharacters, loading: unassignedLoading, refetch: refetchUnassigned } = useUnassignedCharacters(userId);
  const { races, loading: racesLoading } = useRaces(campaignId);
  const { classes, loading: classesLoading } = useClasses(campaignId);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        if (campaign) {
          setIsDm(campaign.dm_user_id === user.id);
        }
      }
    }
    getUser();
  }, [campaign]);

  // Get updateCharacter function for a specific character (will create instance per character)
  const handleAssignCharacter = async (characterId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('characters')
        .update({ campaign_id: campaignId })
        .eq('id', characterId);

      if (error) throw error;
      
      // Immediately refetch both lists to update UI
      await Promise.all([
        refetchActive(),
        refetchUnassigned()
      ]);
      
      toast.success("Character added to campaign");
    } catch (error) {
      console.error("Error assigning character:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to assign character to campaign";
      toast.error(errorMessage);
    }
  };

  const handleUnassignCharacter = async (characterId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('characters')
        .update({ campaign_id: null })
        .eq('id', characterId);

      if (error) throw error;
      
      // Immediately refetch both lists to update UI
      await Promise.all([
        refetchActive(),
        refetchUnassigned()
      ]);
      
      toast.success("Character removed from campaign");
    } catch (error) {
      console.error("Error unassigning character:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to remove character from campaign";
      toast.error(errorMessage);
    }
  };

  const handleUpdateNotes = async (publicNotes: string | null, privateNotes: string | null) => {
    if (!campaign) return;
    
    const result = await updateCampaign(campaignId, {
      public_notes: publicNotes,
      private_notes: privateNotes,
    });

    if (!result.success) {
      throw result.error || new Error("Failed to update notes");
    }
  };

  if (campaignLoading || racesLoading || classesLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-64">
              <CardContent className="p-0">
                <Skeleton className="h-full w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Campaign not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = activeLoading || unassignedLoading || racesLoading || classesLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="font-serif text-3xl font-bold">{campaign.name}</h1>
          <p className="text-muted-foreground mt-1">
            {campaign.description || "Manage your campaign characters"}
          </p>
        </div>
        <Link href={`/campaigns/${campaignId}/vtt`}>
          <Button className="gap-2">
            <Map className="h-4 w-4" />
            Launch VTT
          </Button>
        </Link>
      </div>

      {/* Active Characters Section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Active Characters</h2>
          <p className="text-sm text-muted-foreground">
            Characters currently assigned to this campaign
          </p>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64">
                <CardContent className="p-0">
                  <Skeleton className="h-full w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : activeCharacters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                No active characters yet. Assign characters below or create a new one.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCharacters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                campaignId={campaignId}
                currentUserId={userId || ""}
                races={races}
                classes={classes}
                isUnassigned={false}
                onUnassign={handleUnassignCharacter}
              />
            ))}
          </div>
        )}
      </div>

      {/* Unassigned Characters Section */}
      {userId && (
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Unassigned Characters</h2>
            <p className="text-sm text-muted-foreground">
              Your characters not currently assigned to any campaign
            </p>
          </div>
          
          {unassignedLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="h-64">
                  <CardContent className="p-0">
                    <Skeleton className="h-full w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : unassignedCharacters.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                You don&apos;t have any unassigned characters. Create a character to get started.
              </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {unassignedCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  campaignId={campaignId}
                  currentUserId={userId}
                  races={races}
                  classes={classes}
                  isUnassigned={true}
                  onAssign={handleAssignCharacter}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Party Tools Section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Party Tools</h2>
          <p className="text-sm text-muted-foreground">
            Quick access to campaign objectives, party inventory, and notes
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <PartyToolsPanel campaignId={campaignId} isDm={isDm} />
          </CardContent>
        </Card>
      </div>

      {/* DM Notes Section */}
      {isDm && campaign && (
        <div className="space-y-4">
          <DmNotes
            campaignId={campaignId}
            publicNotes={campaign.public_notes || null}
            privateNotes={campaign.private_notes || null}
            onUpdate={handleUpdateNotes}
            loading={updatingCampaign}
          />
        </div>
      )}
    </div>
  );
}
