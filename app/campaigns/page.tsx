"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/shared/navbar";
import { createClient } from "@/lib/supabase/client";
import { Plus, Users } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignCard } from "@/components/campaign/campaign-card";
import { CampaignForm } from "@/components/campaign/campaign-form";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function CampaignsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { campaigns, loading, error } = useCampaigns(userId);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        setUserId(user.id);
      } else {
        router.push("/auth/login");
      }
    }
    getUser();
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-1 container py-8 px-4 md:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">My Campaigns</h1>
            <p className="text-muted-foreground mt-1">Manage your D&D campaigns</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-full">
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading campaigns: {error.message}</p>
            </CardContent>
          </Card>
        ) : campaigns.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-serif text-xl font-semibold mb-2">No Campaigns Yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first campaign to start your adventure, or join an existing one with an invite link.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
                <Button variant="outline">Join Campaign</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        )}
      </main>

      {userId && (
        <CampaignForm
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          userId={userId}
        />
      )}
    </div>
  );
}

