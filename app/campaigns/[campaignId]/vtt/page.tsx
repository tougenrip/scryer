"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { GameCanvas } from "@/components/map/GameCanvas";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  Sword, 
  Music, 
  CheckCircle2, 
  MousePointer2, 
  Hand, 
  Ruler, 
  CloudFog,
  CloudRain,
  Eye,
  EyeOff
} from "lucide-react";
import { useVttStore } from "@/lib/store/vtt-store";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/useCampaigns";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InitiativeTracker } from "@/components/combat/InitiativeTracker";
import { MusicPlayer } from "@/components/tools/MusicPlayer";
import { ObjectiveTracker } from "@/components/tools/ObjectiveTracker";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RollHistory } from "@/components/dice/roll-history";

export default function VttPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const mapId = searchParams.get("map");

  const { 
    setMapId, 
    setMapUrl, 
    activeTool, 
    setActiveTool,
    fogToolType,
    setFogToolType,
    weatherType,
    setWeatherType
  } = useVttStore();
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { campaign } = useCampaign(campaignId);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("combat");

  const isDm = campaign?.dm_user_id === userId;

  // Authenticate & Load Map
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      if (!mapId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('id', mapId)
        .single();

      if (error) {
        toast.error("Failed to load map");
        console.error(error);
        setLoading(false);
        return;
      }

      setMapId(data.id);
      setMapUrl(data.image_url);
      setLoading(false);
    }

    init();
  }, [mapId, campaignId, setMapId, setMapUrl, router]);

  if (!mapId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-neutral-950 text-white">
        <p>No map selected</p>
        <Button 
            variant="link" 
            onClick={() => router.push(`/campaigns/${campaignId}/maps`)}
            className="text-primary"
        >
            Back to Maps
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-neutral-950 overflow-hidden text-foreground">
      {/* 1. Game Canvas (Background) */}
      <div className="absolute inset-0 z-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-white">
              Loading VTT...
          </div>
        ) : (
          <GameCanvas />
        )}
      </div>

      {/* 2. Top Bar (Navigation) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Button 
            variant="secondary" 
            size="sm"
            className="bg-background/80 backdrop-blur hover:bg-background/90 shadow-md border border-white/10"
            onClick={() => router.push(`/campaigns/${campaignId}/maps`)}
        >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Exit
        </Button>
        <div className="bg-background/80 backdrop-blur px-3 py-1 rounded-md border border-white/10 shadow-md text-sm font-medium">
            {campaign?.name || "Campaign VTT"}
        </div>
      </div>

      {/* 3. Left Toolbar (Tools) */}
      <TooltipProvider>
        <div className="absolute top-1/2 left-4 -translate-y-1/2 z-10 flex flex-col gap-2 bg-background/80 backdrop-blur p-2 rounded-lg border border-white/10 shadow-lg">
          <ToolButton 
            active={activeTool === 'select'} 
            onClick={() => setActiveTool('select')} 
            icon={<MousePointer2 className="h-5 w-5" />} 
            label="Select & Move" 
          />
          <ToolButton 
            active={activeTool === 'pan'} 
            onClick={() => setActiveTool('pan')} 
            icon={<Hand className="h-5 w-5" />} 
            label="Pan Map" 
          />
          <ToolButton 
            active={activeTool === 'measure'} 
            onClick={() => setActiveTool('measure')} 
            icon={<Ruler className="h-5 w-5" />} 
            label="Measure Distance" 
          />
          
          {isDm && (
            <>
              <div className="h-px bg-white/10 my-1" />
              <ToolButton 
                active={activeTool === 'fog'} 
                onClick={() => setActiveTool('fog')} 
                icon={<CloudFog className="h-5 w-5" />} 
                label="Fog of War" 
              />
              {activeTool === 'fog' && (
                <div className="flex flex-col gap-1 mt-1 pl-2 border-l border-white/10">
                   <ToolButton 
                    active={fogToolType === 'reveal'} 
                    onClick={() => setFogToolType('reveal')} 
                    icon={<Eye className="h-4 w-4" />} 
                    label="Reveal Fog"
                    small 
                  />
                  <ToolButton 
                    active={fogToolType === 'hide'} 
                    onClick={() => setFogToolType('hide')} 
                    icon={<EyeOff className="h-4 w-4" />} 
                    label="Hide Fog"
                    small 
                  />
                </div>
              )}
              
              <div className="h-px bg-white/10 my-1" />
              <ToolButton 
                active={weatherType !== 'none'} 
                onClick={() => setWeatherType(weatherType === 'none' ? 'rain' : 'none')} 
                icon={<CloudRain className="h-5 w-5" />} 
                label="Toggle Rain (Demo)" 
              />
            </>
          )}
        </div>
      </TooltipProvider>

      {/* 4. Right Sidebar (Tabs) */}
      <div className="absolute top-4 right-4 bottom-4 z-10 flex flex-col items-end pointer-events-none">
        {/* Toggle Buttons */}
        <div className="flex flex-col gap-2 pointer-events-auto bg-background/80 backdrop-blur p-2 rounded-lg border border-white/10 shadow-lg mb-2">
          <Button 
            variant={sidebarOpen && activeTab === "combat" ? "default" : "ghost"}
            size="icon"
            onClick={() => { setSidebarOpen(true); setActiveTab("combat"); }}
            title="Combat Tracker"
          >
            <Sword className="h-5 w-5" />
          </Button>
          <Button 
            variant={sidebarOpen && activeTab === "music" ? "default" : "ghost"}
            size="icon"
            onClick={() => { setSidebarOpen(true); setActiveTab("music"); }}
            title="Music Player"
          >
            <Music className="h-5 w-5" />
          </Button>
          <Button 
            variant={sidebarOpen && activeTab === "objectives" ? "default" : "ghost"}
            size="icon"
            onClick={() => { setSidebarOpen(true); setActiveTab("objectives"); }}
            title="Objectives"
          >
            <CheckCircle2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar Content */}
        {sidebarOpen && (
          <div className="pointer-events-auto w-80 h-[calc(100vh-8rem)] bg-background/95 backdrop-blur border border-white/10 shadow-2xl rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <h3 className="font-semibold text-sm">
                {activeTab === "combat" && "Combat Tracker"}
                {activeTab === "music" && "Music Player"}
                {activeTab === "objectives" && "Objectives"}
              </h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSidebarOpen(false)}>
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-hidden relative p-2">
              {activeTab === "combat" && (
                <InitiativeTracker campaignId={campaignId} mapId={mapId} isDm={isDm} />
              )}
              {activeTab === "music" && (
                <MusicPlayer campaignId={campaignId} isDm={isDm} />
              )}
              {activeTab === "objectives" && (
                <ObjectiveTracker campaignId={campaignId} isDm={isDm} />
              )}
            </div>
          </div>
        )}
      </div>
      <RollHistory />
    </div>
  );
}

function ToolButton({ active, onClick, icon, label, small = false }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, small?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "default" : "ghost"}
          size="icon"
          className={cn(
            active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            small ? "h-8 w-8" : "h-10 w-10"
          )}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
