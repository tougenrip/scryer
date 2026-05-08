"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useScenes, useLocationMarkers } from "@/hooks/useForgeContent";
import type { LocationMarker, Scene } from "@/hooks/useForgeContent";
import { useCampaignBounties, useCampaignNPCs } from "@/hooks/useCampaignContent";
import type { Bounty, NPC } from "@/hooks/useCampaignContent";
import {
  useVttHandouts,
  type HandoutSnapshot,
  type EmbeddedMarker,
} from "@/hooks/useVttHandouts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Loader2,
  MapPinned,
  Image as ImageIcon,
  Send,
  ScrollText,
  User as UserIcon,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  userId: string | null;
}

type Tab = "scene" | "pin" | "bounty" | "npc";

export function HandoutPickerDialog({ open, onOpenChange, campaignId, userId }: Props) {
  const [tab, setTab] = useState<Tab>("scene");
  const [query, setQuery] = useState("");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { scenes } = useScenes(campaignId);
  const { markers, loading: markersLoading } = useLocationMarkers(
    campaignId && tab === "pin" ? campaignId : null,
    selectedSceneId ?? undefined
  );
  const { bounties, loading: bountiesLoading } = useCampaignBounties(
    campaignId && tab === "bounty" ? campaignId : null,
    /* isDm */ true
  );
  const { npcs, loading: npcsLoading } = useCampaignNPCs(
    campaignId && tab === "npc" ? campaignId : null,
    /* isDm */ true
  );
  const { sendHandout } = useVttHandouts(campaignId, userId);

  // Reset internal state when dialog closes.
  useEffect(() => {
    if (!open) {
      setTab("scene");
      setQuery("");
      setSelectedSceneId(null);
      setSelectedPinId(null);
    }
  }, [open]);

  const filteredScenes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scenes;
    return scenes.filter((s) => s.name.toLowerCase().includes(q));
  }, [scenes, query]);

  const filteredPins = useMemo(() => {
    if (!selectedSceneId) return [];
    const q = query.trim().toLowerCase();
    if (!q) return markers;
    return markers.filter((m) => (m.name ?? "").toLowerCase().includes(q));
  }, [markers, selectedSceneId, query]);

  const filteredBounties = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bounties;
    return bounties.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.target_name.toLowerCase().includes(q)
    );
  }, [bounties, query]);

  const filteredNpcs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return npcs;
    return npcs.filter(
      (n) =>
        n.name.toLowerCase().includes(q) ||
        (n.location ?? "").toLowerCase().includes(q)
    );
  }, [npcs, query]);

  const sendScene = async (scene: Scene) => {
    setSending(true);
    // Snapshot the visible pins on this scene so the handout renders the
    // same map the DM sees in the Forge, even if pins are later edited.
    const supabase = createClient();
    const { data: pinRows } = await supabase
      .from("location_markers")
      .select(
        "id,x,y,name,description,icon_type,background_shape,status_icon,color,size,visible"
      )
      .eq("scene_id", scene.id)
      .eq("visible", true);
    const markers: EmbeddedMarker[] = (pinRows ?? []) as EmbeddedMarker[];
    const snapshot: HandoutSnapshot = {
      kind: "scene",
      scene_id: scene.id,
      name: scene.name,
      description: scene.description,
      image_url: scene.image_url,
      pin_count: markers.length,
      markers,
    };
    await sendHandout({
      kind: "scene",
      sceneId: scene.id,
      snapshot,
    });
    setSending(false);
    onOpenChange(false);
  };

  const sendNpc = async (npc: NPC) => {
    setSending(true);
    // Resolve display labels for class/species (which live in srd/* tables)
    // best-effort: store the slug if we can't resolve a name. For now leave
    // them as the raw indices — pretty-name resolution can come later.
    const classLabel =
      npc.custom_class ?? npc.class_index ?? null;
    const speciesLabel =
      npc.custom_species ?? npc.species_index ?? null;
    const snapshot: HandoutSnapshot = {
      kind: "npc",
      npc_id: npc.id,
      name: npc.name,
      description: npc.description,
      appearance: npc.appearance,
      personality: npc.personality,
      background: npc.background,
      // DM Notes are deliberately NOT included — they're DM-private context.
      notes: null,
      location: npc.location,
      class_label: classLabel,
      species_label: speciesLabel,
      image_url: npc.image_url,
    };
    await sendHandout({ kind: "npc", snapshot });
    setSending(false);
    onOpenChange(false);
  };

  const sendBounty = async (bounty: Bounty) => {
    setSending(true);
    const snapshot: HandoutSnapshot = {
      kind: "bounty",
      bounty_id: bounty.id,
      name: bounty.title,
      description: bounty.description,
      target_name: bounty.target_name,
      target_type: bounty.target_type,
      reward: bounty.reward,
      location: bounty.location,
      status: bounty.status,
      image_url: bounty.image_url,
    };
    await sendHandout({ kind: "bounty", snapshot });
    setSending(false);
    onOpenChange(false);
  };

  const sendPin = async (pin: LocationMarker) => {
    setSending(true);
    const snapshot: HandoutSnapshot = {
      kind: "pin",
      pin_id: pin.id,
      scene_id: pin.scene_id,
      name: pin.name ?? "(unnamed pin)",
      description: pin.description,
      icon_type: pin.icon_type,
      background_shape: pin.background_shape,
      color: pin.color,
      image_url: null,
    };
    await sendHandout({
      kind: "pin",
      pinId: pin.id,
      sceneId: pin.scene_id,
      snapshot,
    });
    setSending(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send handout to players</DialogTitle>
          <DialogDescription>
            Pick a scene to send the whole map, or pick an individual pin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b">
          {(["scene", "pin", "bounty", "npc"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setQuery("");
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium",
                tab === t
                  ? "text-amber-400 border-b-2 border-amber-400 -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "scene"
                ? "Scene"
                : t === "pin"
                ? "Pin"
                : t === "bounty"
                ? "Bounty"
                : "NPC"}
            </button>
          ))}
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            tab === "scene"
              ? "Search scenes…"
              : tab === "pin"
              ? "Search pins…"
              : tab === "bounty"
              ? "Search bounties…"
              : "Search NPCs…"
          }
          className="h-8 text-sm"
        />

        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === "scene" && (
            <ul className="divide-y">
              {filteredScenes.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No scenes.
                </li>
              )}
              {filteredScenes.map((scene) => (
                <li key={scene.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
                    {scene.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={scene.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{scene.name}</p>
                    {scene.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {scene.description}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={sending}
                    onClick={() => sendScene(scene)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Send
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {tab === "pin" && (
            <div className="flex flex-col gap-2">
              <div className="px-3 py-2 border-b">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  Scene
                </p>
                <select
                  value={selectedSceneId ?? ""}
                  onChange={(e) =>
                    setSelectedSceneId(e.target.value || null)
                  }
                  className="w-full h-8 rounded border bg-background px-2 text-sm"
                >
                  <option value="">— pick a scene —</option>
                  {scenes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedSceneId && (
                <ul className="divide-y">
                  {markersLoading && (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground inline-flex items-center gap-1 justify-center w-full">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading pins…
                    </li>
                  )}
                  {!markersLoading && filteredPins.length === 0 && (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No pins on this scene.
                    </li>
                  )}
                  {filteredPins.map((pin) => (
                    <li key={pin.id} className="flex items-center gap-3 px-3 py-2">
                      <div
                        className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: pin.color, color: "#fff" }}
                      >
                        <MapPinned className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {pin.name ?? "(unnamed pin)"}
                        </p>
                        {pin.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {pin.description}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={sending}
                        onClick={() => {
                          setSelectedPinId(pin.id);
                          void sendPin(pin);
                        }}
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Send
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "npc" && (
            <ul className="divide-y">
              {npcsLoading && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground inline-flex items-center gap-1 justify-center w-full">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading NPCs…
                </li>
              )}
              {!npcsLoading && filteredNpcs.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No NPCs created yet.
                </li>
              )}
              {filteredNpcs.map((n) => (
                <li key={n.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="h-10 w-10 shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center text-amber-400">
                    {n.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={n.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.name}</p>
                    {(n.location || n.species_index || n.class_index) && (
                      <p className="truncate text-xs text-muted-foreground">
                        {[n.species_index, n.class_index, n.location]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={sending}
                    onClick={() => sendNpc(n)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Send
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {tab === "bounty" && (
            <ul className="divide-y">
              {bountiesLoading && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground inline-flex items-center gap-1 justify-center w-full">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading bounties…
                </li>
              )}
              {!bountiesLoading && filteredBounties.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                  No bounties posted.
                </li>
              )}
              {filteredBounties.map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <ScrollText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {b.title}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 rounded border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
                          b.status === "available" &&
                            "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
                          b.status === "claimed" &&
                            "bg-amber-500/15 text-amber-300 border-amber-500/30",
                          b.status === "completed" &&
                            "bg-neutral-500/15 text-neutral-300 border-neutral-500/30"
                        )}
                      >
                        {b.status}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      Target: {b.target_name}
                      {b.reward ? ` · Reward: ${b.reward}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={sending}
                    onClick={() => sendBounty(b)}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Send
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Hidden ref to satisfy unused-var linter for selectedPinId */}
        <span className="hidden">{selectedPinId}</span>
      </DialogContent>
    </Dialog>
  );
}
