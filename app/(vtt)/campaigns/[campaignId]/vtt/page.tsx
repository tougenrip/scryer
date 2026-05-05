"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import nextDynamic from "next/dynamic";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { GameCanvas } from "@/components/map/GameCanvas";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  MousePointer2,
  Ruler,
  CloudRain,
  Crown,
  SkipForward,
  ScrollText,
  Crosshair,
  Pencil,
  Eraser,
} from "lucide-react";
import { VttAoePopover } from "@/components/vtt/vtt-aoe-popover";
import { useVttStore } from "@/lib/store/vtt-store";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/useCampaigns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useVttMediaItems } from "@/hooks/useCampaignContent";
import type { MediaItem } from "@/hooks/useCampaignContent";
import { useScenes } from "@/hooks/useForgeContent";
import { parseGridConfig } from "@/lib/vtt/grid-config";
import { VttLeftSidebar, type VttLeftTab } from "@/components/vtt/vtt-left-sidebar";
import { VttRightSidebar, type VttRightTabState } from "@/components/vtt/vtt-right-sidebar";
import { VttQuestHud } from "@/components/vtt/vtt-quest-hud";
import { useVttChat } from "@/hooks/useVttChat";
import { useActiveVttScene } from "@/hooks/useActiveVttScene";
import { useVttPresence } from "@/hooks/useVttPresence";
import { VttPresenceStrip } from "@/components/vtt/vtt-presence-strip";
import { VttGridControls } from "@/components/vtt/vtt-grid-controls";
import { VttFogControls } from "@/components/vtt/vtt-fog-controls";
import { useCombat } from "@/hooks/useCombat";
import type { RollResult } from "@/contexts/dice-roller-context";

export const dynamic = "force-dynamic";

const LazyMusicPlayer = nextDynamic(
  () => import("@/components/tools/MusicPlayer").then((mod) => mod.MusicPlayer),
  { ssr: false, loading: () => <PanelLoading label="Loading music" /> }
);
const LazyObjectiveTracker = nextDynamic(
  () => import("@/components/tools/ObjectiveTracker").then((mod) => mod.ObjectiveTracker),
  { ssr: false, loading: () => <PanelLoading label="Loading objectives" /> }
);
const LazyVttTokenInspector = nextDynamic(
  () => import("@/components/vtt/vtt-token-inspector").then((mod) => mod.VttTokenInspector),
  { ssr: false, loading: () => <PanelLoading label="Loading inspector" /> }
);
const LazyVttDiceQuickBar = nextDynamic(
  () => import("@/components/vtt/vtt-dice-quick-bar").then((mod) => mod.VttDiceQuickBar),
  { ssr: false }
);
const LazyVttChat = nextDynamic(
  () => import("@/components/vtt/vtt-chat").then((mod) => mod.VttChat),
  { ssr: false, loading: () => <PanelLoading label="Loading chat" /> }
);
const LazyVttAssetsPanel = nextDynamic(
  () => import("@/components/vtt/vtt-assets-panel").then((mod) => mod.VttAssetsPanel),
  { ssr: false, loading: () => <PanelLoading label="Loading assets" /> }
);
const LazyVttHandoutsPanel = nextDynamic(
  () => import("@/components/vtt/vtt-handouts-panel").then((mod) => mod.VttHandoutsPanel),
  { ssr: false, loading: () => <PanelLoading label="Loading handouts" /> }
);
const LazyVttCombatPanel = nextDynamic(
  () => import("@/components/vtt/vtt-combat-panel").then((mod) => mod.VttCombatPanel),
  { ssr: false, loading: () => <PanelLoading label="Loading combat" /> }
);
const LazyVttCombatRail = nextDynamic(
  () => import("@/components/vtt/vtt-combat-rail").then((mod) => mod.VttCombatRail),
  { ssr: false }
);

export default function VttPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const mapId = searchParams.get("map");

  const {
    setMapId,
    setMapUrl,
    setMapDimensions,
    setGridSize,
    setGridType,
    setFeetPerSquare,
    setSelectedTokenId,
    setFogData,
    activeTool,
    setActiveTool,
    selectedTokenId,
    mapUrl,
    weatherType,
    setWeatherType,
    setShowGrid,
    pendingTokenPlacement,
  } = useVttStore();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sceneTitle, setSceneTitle] = useState<string>("");
  const [loadedMapItem, setLoadedMapItem] = useState<MediaItem | null>(null);
  const [leftDock, setLeftDock] = useState<VttLeftTab>(null);
  const [rightDock, setRightDock] = useState<VttRightTabState>({ inspector: false, chat: false });
  const [diceDockOpen, setDiceDockOpen] = useState(true);
  const [localMessagesCleared, setLocalMessagesCleared] = useState(false);

  const { campaign } = useCampaign(campaignId);
  const isDm = campaign?.dm_user_id === userId;
  const shouldLoadAssets = leftDock === "assets" && isDm;
  const shouldLoadHandouts = leftDock === "assets" && !isDm;
  const shouldLoadChat = rightDock.chat || rightDock.inspector;
  const mapTypes = useMemo<Array<NonNullable<MediaItem["type"]>>>(() => ["map"], []);
  const assetTypes = useMemo<Array<NonNullable<MediaItem["type"]>>>(
    () => ["token", "prop", "sound"],
    []
  );
  const { items: mapItems, refetch: refetchMapMedia } = useVttMediaItems(
    campaignId,
    mapTypes,
    shouldLoadAssets || shouldLoadHandouts
  );
  const { scenes: forgeScenes } = useScenes(
    campaignId,
    shouldLoadAssets || shouldLoadHandouts
  );
  const { items: assetMedia, refetch: refetchAssetMedia } = useVttMediaItems(
    campaignId,
    assetTypes,
    shouldLoadAssets
  );
  const sharedAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicPlayerKey = useRef(`music-player-${campaignId}`);

  const tokenMedia = useMemo(
    () => assetMedia.filter((item) => item.type === "token"),
    [assetMedia]
  );
  const propMedia = useMemo(
    () => assetMedia.filter((item) => item.type === "prop"),
    [assetMedia]
  );
  const soundMedia = useMemo(
    () => assetMedia.filter((item) => item.type === "sound"),
    [assetMedia]
  );

  const {
    messages: chatMessages,
    loading: chatLoading,
    sendMessage,
    sendRollToChat,
  } = useVttChat(campaignId, mapId, shouldLoadChat);

  const { activeEncounter, participants, nextTurn, loading: combatLoading } = useCombat(
    campaignId,
    mapId || undefined,
    !!mapId
  );

  useActiveVttScene(campaignId, mapId);

  const { peers: vttPeers } = useVttPresence(campaignId, mapId);

  const displayMessages = localMessagesCleared ? [] : chatMessages;

  const wrapSendRoll = async (roll: RollResult) => {
    await sendRollToChat(roll);
  };

  useEffect(() => {
    if (!selectedTokenId || pendingTokenPlacement) return;
    setRightDock((prev) => ({ ...prev, inspector: true }));
  }, [selectedTokenId, pendingTokenPlacement]);

  useEffect(() => {
    if (activeEncounter && leftDock === "objectives") {
      setLeftDock(null);
    }
  }, [activeEncounter, leftDock]);

  useEffect(() => {
    const hasOpenSidebar = leftDock !== null || rightDock.inspector || rightDock.chat;
    if (!hasOpenSidebar) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-vtt-sidebar]")) return;
      if (target.closest("[data-vtt-floating-panel]")) return;

      setLeftDock(null);
      setRightDock({ inspector: false, chat: false });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [leftDock, rightDock.chat, rightDock.inspector]);

  useEffect(() => {
    if (mapId || !campaignId || userId === null) return;
    if (!campaign) return;
    if (campaign.dm_user_id === userId) return;

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("campaigns")
        .select("active_vtt_map_id")
        .eq("id", campaignId)
        .maybeSingle();
      if (cancelled || !data?.active_vtt_map_id) return;
      router.replace(`/campaigns/${campaignId}/vtt?map=${data.active_vtt_map_id}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, mapId, userId, campaign, router]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      if (!mapId) {
        setMapId(null);
        setMapUrl(null);
        setMapDimensions(null);
        setGridSize(50);
        setGridType("square");
        setFeetPerSquare(5);
        setSelectedTokenId(null);
        setFogData({ shapes: [], revealed: false });
        setSceneTitle("");
        setLoadedMapItem(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("media_items")
        .select("id, campaign_id, name, image_url, audio_url, type, created_at, grid_config, fog_data")
        .eq("id", mapId)
        .single();

      if (error) {
        toast.error("Failed to load map");
        console.error(error);
        setLoading(false);
        return;
      }

      setMapId(data.id);
      setMapUrl(data.image_url);
      const gc = parseGridConfig(data.grid_config);
      setGridSize(gc.pixelSize);
      setGridType(gc.gridType);
      setFeetPerSquare(gc.feetPerSquare);
      setShowGrid(gc.showGrid);
      setSceneTitle(data.name || "");
      setLoadedMapItem(data as MediaItem);
      setLoading(false);
    }

    init();
  }, [
    mapId,
    setMapId,
    setMapUrl,
    setMapDimensions,
    setGridSize,
    setGridType,
    setFeetPerSquare,
    setShowGrid,
    setSelectedTokenId,
    setFogData,
    router,
  ]);

  const sorted = [...participants].sort((a, b) => a.turn_order - b.turn_order);
  const turnName =
    sorted[activeEncounter?.current_turn_index ?? 0]?.token?.name || "—";

  const bookmarkOpen =
    !pendingTokenPlacement && (leftDock !== null || rightDock.inspector || rightDock.chat);
  const activeMapItem = mapId
    ? mapItems.find((item) => item.id === mapId) ?? loadedMapItem
    : null;

  return (
    <TooltipProvider>
      <div
        data-vtt-shell="full"
        className="relative h-screen w-screen flex flex-col bg-neutral-950 text-foreground overflow-hidden"
      >
        <audio ref={sharedAudioRef} className="hidden" />

        {/* Top bar */}
        <header className="shrink-0 z-30 flex items-center justify-between gap-3 px-3 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 h-8"
              onClick={() => router.push(`/campaigns/${campaignId}/maps`)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Exit
            </Button>
            <div className="h-4 w-px bg-border shrink-0 hidden sm:block ml-2" />
            <div className="min-w-0 hidden sm:block">
              <div className="text-xs font-medium truncate">
                {campaign?.name || "Campaign"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {sceneTitle || (mapId ? "Scene" : "Choose a scene")}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center">
            <VttPresenceStrip
              peers={vttPeers}
              currentUserId={userId}
              dmUserId={campaign?.dm_user_id}
            />
            {activeEncounter && !combatLoading && (
              <>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted font-medium">
                  Round {activeEncounter.round_number}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/15 text-primary font-medium max-w-[120px] truncate">
                  {turnName}
                </span>
              </>
            )}
            {isDm && (
              <span className="text-[10px] px-2 py-0.5 rounded-md border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                DM
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ToolButton
              active={activeTool === "select"}
              onClick={() => setActiveTool("select")}
              icon={<MousePointer2 className="h-4 w-4" />}
              label="Select"
            />
            <ToolButton
              active={activeTool === "measure"}
              onClick={() => setActiveTool("measure")}
              icon={<Ruler className="h-4 w-4" />}
              label="Ruler"
            />
            <ToolButton
              active={activeTool === "ping"}
              onClick={() =>
                setActiveTool(activeTool === "ping" ? "select" : "ping")
              }
              icon={<Crosshair className="h-4 w-4" />}
              label="Ping (or Alt + click)"
            />
            <ToolButton
              active={activeTool === "draw"}
              onClick={() =>
                setActiveTool(activeTool === "draw" ? "select" : "draw")
              }
              icon={<Pencil className="h-4 w-4" />}
              label="Draw (Shift + release to keep)"
            />
            <ToolButton
              active={activeTool === "erase"}
              onClick={() =>
                setActiveTool(activeTool === "erase" ? "select" : "erase")
              }
              icon={<Eraser className="h-4 w-4" />}
              label="Eraser (click or drag to delete)"
            />
            <VttAoePopover />
            {isDm && mapId && (
              <>
                <VttGridControls mapId={mapId} isDm={!!isDm} mapLoading={loading} />
                <VttFogControls mapId={mapId} isDm={!!isDm} mapLoading={loading} />
                <ToolButton
                  active={weatherType !== "none"}
                  onClick={() =>
                    setWeatherType(weatherType === "none" ? "rain" : "none")
                  }
                  icon={<CloudRain className="h-4 w-4" />}
                  label="Rain"
                />
              </>
            )}

            {isDm && activeEncounter && sorted.length > 0 && (
              <Button size="sm" className="h-8 text-xs ml-1" onClick={() => nextTurn()}>
                End turn
                <SkipForward className="h-3.5 w-3.5 ml-1" />
              </Button>
            )}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col relative">
          <div className="relative min-h-0 min-w-0 flex-1">
            {loading ? (
              <div className="flex h-full items-center justify-center text-white">
                Loading VTT…
              </div>
            ) : (
              <GameCanvas isDm={!!isDm} campaignId={campaignId} />
            )}
            {bookmarkOpen && (
              <div className="pointer-events-none absolute inset-0 z-20 animate-in fade-in bg-black/30 duration-200" />
            )}
            {activeEncounter ? (
              <LazyVttCombatRail
                campaignId={campaignId}
                mapId={mapId}
                isDm={!!isDm}
                onOpenEditor={() => setLeftDock("combat")}
              />
            ) : (
              <VttQuestHud campaignId={campaignId} isDm={!!isDm} />
            )}
            <VttLeftSidebar
              activeTab={leftDock}
              onActiveTabChange={setLeftDock}
              showCombat={!!isDm}
              showObjectives={!activeEncounter}
              assetsLabel={isDm ? "Assets" : "Handouts"}
              assetsIcon={isDm ? undefined : ScrollText}
              assetsPanel={
                isDm ? (
                  <LazyVttAssetsPanel
                    campaignId={campaignId}
                    currentMapId={mapId}
                    maps={mapItems}
                    forgeScenes={forgeScenes}
                    tokenItems={tokenMedia}
                    propItems={propMedia}
                    soundItems={soundMedia}
                    isDm={!!isDm}
                    onMediaChanged={() => {
                      void refetchMapMedia();
                      void refetchAssetMedia();
                    }}
                    onStartPlacement={() => {
                      setLeftDock(null);
                      setRightDock({ inspector: false, chat: false });
                    }}
                  />
                ) : (
                  <LazyVttHandoutsPanel
                    campaignId={campaignId}
                    currentMapId={mapId}
                    currentMap={activeMapItem}
                    forgeScenes={forgeScenes}
                    fallbackName={sceneTitle}
                    fallbackImageUrl={mapUrl}
                  />
                )
              }
              musicPanel={
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 bg-card">
                  <LazyMusicPlayer
                    key={musicPlayerKey.current}
                    campaignId={campaignId}
                    isDm={!!isDm}
                    isVisible
                    audioRef={sharedAudioRef}
                  />
                </div>
              }
              objectivesPanel={
                <div className="min-h-0 flex-1 overflow-hidden p-3 bg-card">
                  <LazyObjectiveTracker campaignId={campaignId} isDm={!!isDm} />
                </div>
              }
              combatPanel={
                <div className="min-h-0 flex-1 overflow-hidden bg-card">
                  <LazyVttCombatPanel campaignId={campaignId} mapId={mapId} isDm={!!isDm} />
                </div>
              }
            />
            <VttRightSidebar
              openState={rightDock}
              onToggleTab={(tab) => setRightDock(prev => ({ ...prev, [tab]: !prev[tab] }))}
              floatingPanel={
                <div
                  data-vtt-floating-panel
                  className="flex items-start gap-2"
                >
                  {diceDockOpen && (
                    <LazyVttDiceQuickBar
                      campaignId={campaignId}
                      sendRollToChat={wrapSendRoll}
                      compact
                    />
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    title={diceDockOpen ? "Hide dice" : "Show dice"}
                    aria-label={diceDockOpen ? "Hide dice" : "Show dice"}
                    className="h-9 w-9 shrink-0 border border-neutral-800 bg-card/95 shadow-2xl backdrop-blur hover:bg-muted"
                    onClick={() => setDiceDockOpen((open) => !open)}
                  >
                    {diceDockOpen ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              }
              inspectorPanel={
                <div className="flex flex-col h-full bg-card p-3">
                  <LazyVttTokenInspector
                    campaignId={campaignId}
                    mapId={mapId}
                    isDm={!!isDm}
                    sendRollToChat={wrapSendRoll}
                  />
                </div>
              }
              chatPanel={
                <div className="flex flex-col h-full bg-card">
                  <LazyVttChat
                    campaignId={campaignId}
                    messages={displayMessages}
                    loading={chatLoading}
                    sendMessage={sendMessage}
                    sendRollToChat={wrapSendRoll}
                    localClear={() => setLocalMessagesCleared(true)}
                    onRestoreView={() => setLocalMessagesCleared(false)}
                    messagesHidden={localMessagesCleared}
                  />
                </div>
              }
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ToolButton({
  active,
  onClick,
  icon,
  label,
  small = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  small?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={active ? "default" : "ghost"}
          size="icon"
          className={cn(
            active ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            small ? "h-7 w-7" : "h-8 w-8"
          )}
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function PanelLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 flex-1 items-center justify-center text-xs text-muted-foreground">
      {label}...
    </div>
  );
}
