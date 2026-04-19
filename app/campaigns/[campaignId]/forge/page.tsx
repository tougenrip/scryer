"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaign } from "@/hooks/useCampaigns";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin,
  Sparkles,
  Calendar,
  Clock,
  Users,
  User,
  Swords,
  ScrollText,
  Network,
  Target,
  Dices,
  Clapperboard,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
import { RandomTablesTab } from "@/components/forge/random-tables/random-tables-tab";

type TabDef = {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
};

const TABS: TabDef[] = [
  { id: "scenes", label: "Scenes", icon: Clapperboard },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "pantheon", label: "Pantheon", icon: Sparkles },
  { id: "tracker", label: "Timeline", icon: Clock },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "factions", label: "Factions", icon: Users },
  { id: "npcs", label: "NPCs", icon: User },
  { id: "encounters", label: "Encounters", icon: Swords },
  { id: "quests", label: "Quests", icon: ScrollText },
  { id: "bounties", label: "Bounties", icon: Target },
  { id: "relationships", label: "Relationships", icon: Network, badge: "new" },
  { id: "random-tables", label: "Random tables", icon: Dices },
];

export default function ForgePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const [isDm, setIsDm] = useState(false);

  const defaultTab = searchParams.get("tab") || "scenes";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    router.push(`/campaigns/${campaignId}/forge?tab=${value}`, {
      scroll: false,
    });
  };

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && campaign) {
        setIsDm(campaign.dm_user_id === user.id);
      }
    }
    getUser();
  }, [campaign]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const activeTabDef = useMemo(
    () => TABS.find((t) => t.id === activeTab) || TABS[0],
    [activeTab],
  );

  if (campaignLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6">
        <div className="sc-card p-6">
          <p style={{ color: "var(--destructive)" }}>Campaign not found</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="sc-fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "18px 24px 10px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <h1
          className="font-serif"
          style={{
            fontSize: 26,
            margin: 0,
            letterSpacing: "0.02em",
          }}
        >
          The Forge
        </h1>
        <p
          style={{
            margin: "2px 0 0",
            fontSize: 12.5,
            color: "var(--muted-foreground)",
          }}
        >
          World-building tools and campaign management · {activeTabDef.label}
        </p>
      </div>

      {/* Horizontal tab bar */}
      <div
        className="sc-tabs"
        style={{
          padding: "0 20px",
          background: "var(--background)",
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn("sc-tab", active && "active")}
            >
              <Icon size={13} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className="sc-badge"
                  style={{
                    padding: "0 5px",
                    fontSize: 9,
                    marginLeft: 4,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active tab body */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
        }}
      >
        {activeTab === "scenes" && (
          <ScenesTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "locations" && (
          <LocationsTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "pantheon" && (
          <PantheonTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "tracker" && (
          <CampaignTrackerTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "calendar" && (
          <CalendarTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "factions" && (
          <FactionsTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "npcs" && (
          <NPCsTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "encounters" && (
          <EncountersTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "quests" && (
          <QuestBoardTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "bounties" && (
          <BountiesTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "relationships" && (
          <RelationshipWebTab campaignId={campaignId} isDm={isDm} />
        )}
        {activeTab === "random-tables" && (
          <RandomTablesTab campaignId={campaignId} isDm={isDm} />
        )}
      </div>
    </div>
  );
}
