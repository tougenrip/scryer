"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { CampaignWithMembers } from "@/hooks/useCampaigns";
import { cn } from "@/lib/utils";

interface CampaignCardProps {
  campaign: CampaignWithMembers;
  className?: string;
}

export function CampaignCard({ campaign, className }: CampaignCardProps) {
  return (
    <Link href={`/campaigns/${campaign.id}`}>
      <Card className={cn(
        "hover:border-primary/30 transition-colors cursor-pointer h-full",
        className
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-serif">{campaign.name}</CardTitle>
            <Badge
              variant={campaign.role === "dm" ? "default" : "secondary"}
              className={cn(
                campaign.role === "dm"
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20"
              )}
            >
              {campaign.role === "dm" ? "DM" : "Player"}
            </Badge>
          </div>
          <CardDescription>
            {campaign.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{campaign.memberCount} {campaign.memberCount === 1 ? "member" : "members"}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

