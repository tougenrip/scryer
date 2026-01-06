"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/shared/navbar";
import { useCampaign, useInvitePlayer } from "@/hooks/useCampaigns";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle2, XCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export default function JoinCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { invitePlayer, loading: joining } = useInvitePlayer();
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setUserId(user.id);
      } else {
        router.push(`/auth/login?redirect=/campaigns/${campaignId}/join`);
      }
    }
    getUser();
  }, [campaignId, router]);

  const handleJoin = async () => {
    if (!userId) {
      router.push(`/auth/login?redirect=/campaigns/${campaignId}/join`);
      return;
    }

    const result = await invitePlayer(campaignId, userId);
    if (result.success) {
      setJoined(true);
      toast.success("Successfully joined campaign!");
      setTimeout(() => {
        router.push(`/campaigns/${campaignId}`);
      }, 2000);
    } else {
      if (result.error?.message.includes("already a member")) {
        setJoined(true);
        toast.info("You are already a member of this campaign");
        setTimeout(() => {
          router.push(`/campaigns/${campaignId}`);
        }, 2000);
      } else {
        toast.error(result.error?.message || "Failed to join campaign");
      }
    }
  };

  if (campaignLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 container py-8 px-4 md:px-6 max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar user={user} />
        <main className="flex-1 container py-8 px-4 md:px-6 max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="font-serif text-xl font-semibold mb-2">Campaign Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  This campaign doesn&apos;t exist or the invite link is invalid.
                </p>
                <Button onClick={() => router.push("/campaigns")}>
                  Go to My Campaigns
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 container py-8 px-4 md:px-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">{campaign.name}</CardTitle>
            <CardDescription>
              {campaign.description || "Join this D&D campaign"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {joined ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold mb-2">Successfully Joined!</h3>
                <p className="text-muted-foreground mb-6">
                  You&apos;ve been added to the campaign. Redirecting...
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold">Campaign Details</h3>
                  <p className="text-sm text-muted-foreground">
                    You&apos;ve been invited to join this campaign. Click the button below to accept the invitation.
                  </p>
                </div>
                <Button
                  onClick={handleJoin}
                  disabled={joining || !userId}
                  className="w-full"
                  size="lg"
                >
                  {joining ? "Joining..." : "Join Campaign"}
                </Button>
                {!userId && (
                  <p className="text-sm text-muted-foreground text-center">
                    You need to be logged in to join a campaign.
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

