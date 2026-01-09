"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign } from "@/hooks/useCampaigns";
import { createClient } from "@/lib/supabase/client";
import { 
  Map, 
  MapPin, 
  Sparkles, 
  Calendar, 
  Clock, 
  Users, 
  User, 
  Swords, 
  ScrollText,
  Network,
  Target
} from "lucide-react";

// Import tab components (to be created)
import { ScenesTab } from "@/components/forge/scenes/scenes-tab";
import { LocationsTab } from "@/components/forge/locations/locations-tab";
import { PantheonTab } from "@/components/forge/pantheon/pantheon-tab";
import { CampaignTrackerTab } from "@/components/forge/tracker/tracker-tab";
import { CalendarTab } from "@/components/forge/calendar/calendar-tab";
import { FactionsTab } from "@/components/forge/factions/factions-tab";
import { NPCsTab } from "@/components/forge/npcs/npcs-tab";
import { EncountersTab } from "@/components/forge/encounters/encounters-tab";
import { QuestBoardTab } from "@/components/forge/quests/quests-tab";
import { RelationshipWebTab } from "@/components/forge/relationships/relationship-web-tab";
import { BountiesTab } from "@/components/forge/bounties/bounties-tab";

export default function ForgePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  // const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  
  // Get initial tab from URL params or default to 'scenes'
  const defaultTab = searchParams.get('tab') || 'scenes';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/campaigns/${campaignId}/forge?tab=${value}`, { scroll: false });
  };

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // setUserId(user.id);
        if (campaign) {
          setIsDm(campaign.dm_user_id === user.id);
        }
      }
    }
    getUser();
  }, [campaign]);

  // Update active tab when URL param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  if (campaignLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold">The Forge</h1>
        <p className="text-muted-foreground mt-1">
          World-building tools and campaign management
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-full min-w-max h-auto flex-wrap gap-1 p-1 md:flex-nowrap md:grid md:grid-cols-11">
            <TabsTrigger value="scenes" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-accent hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Scenes</span>
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Locations</span>
            </TabsTrigger>
            <TabsTrigger value="pantheon" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Pantheon</span>
            </TabsTrigger>
            <TabsTrigger value="tracker" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="factions" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Factions</span>
            </TabsTrigger>
            <TabsTrigger value="npcs" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">NPCs</span>
            </TabsTrigger>
            <TabsTrigger value="encounters" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <Swords className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Encounters</span>
            </TabsTrigger>
            <TabsTrigger value="quests" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <ScrollText className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Quests</span>
            </TabsTrigger>
            <TabsTrigger value="bounties" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Bounties</span>
            </TabsTrigger>
            <TabsTrigger value="relationships" className="flex items-center gap-1.5 flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap hover:bg-card hover:text-accent-foreground hover:border-border transition-colors duration-200 hover:scale-105 active:scale-95 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110">
              <Network className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Relationships</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="mt-6">
          <TabsContent value="scenes" className="mt-0">
            <ScenesTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="locations" className="mt-0">
            <LocationsTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="pantheon" className="mt-0">
            <PantheonTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="tracker" className="mt-0">
            <CampaignTrackerTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CalendarTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="factions" className="mt-0">
            <FactionsTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="npcs" className="mt-0">
            <NPCsTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="encounters" className="mt-0">
            <EncountersTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="quests" className="mt-0">
            <QuestBoardTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="bounties" className="mt-0">
            <BountiesTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>

          <TabsContent value="relationships" className="mt-0">
            <RelationshipWebTab campaignId={campaignId} isDm={isDm} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

