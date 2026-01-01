"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Map, Swords, Scroll } from "lucide-react";
import Link from "next/link";
import { useCampaign } from "@/hooks/useCampaigns";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignDashboard() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { characters, loading: charactersLoading } = useCampaignCharacters(campaignId);

  if (campaignLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold">{campaign.name}</h1>
        <p className="text-muted-foreground mt-1">
          {campaign.description || "Welcome to your campaign dashboard"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStatCard
          href={`/campaigns/${campaignId}/characters`}
          icon={Users}
          title="Characters"
          value={charactersLoading ? "..." : characters.length.toString()}
          description="Party members"
        />
        <QuickStatCard
          href={`/campaigns/${campaignId}/maps`}
          icon={Map}
          title="Maps"
          value="0"
          description="Battle maps"
        />
        <QuickStatCard
          href={`/campaigns/${campaignId}/combat`}
          icon={Swords}
          title="Encounters"
          value="0"
          description="Combat encounters"
        />
        <QuickStatCard
          href={`/campaigns/${campaignId}/spells`}
          icon={Scroll}
          title="Homebrew"
          value="0"
          description="Custom content"
        />
      </div>

      {/* Recent Activity - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Recent Activity</CardTitle>
          <CardDescription>Latest updates from your campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p>No recent activity yet.</p>
            <p className="text-sm mt-1">Start by adding characters or uploading a map!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickStatCard({
  href,
  icon: Icon,
  title,
  value,
  description,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="hover:border-primary/30 transition-colors cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

