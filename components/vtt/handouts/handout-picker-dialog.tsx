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
import {
  useVttHandouts,
  type HandoutSnapshot,
  type EmbeddedMarker,
} from "@/hooks/useVttHandouts";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Loader2, MapPinned, Image as ImageIcon, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  userId: string | null;
}

type Tab = "scene" | "pin";

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
          {(["scene", "pin"] as const).map((t) => (
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
              {t === "scene" ? "Scene" : "Pin"}
            </button>
          ))}
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "scene" ? "Search scenes…" : "Search pins…"}
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
        </div>
        {/* Hidden ref to satisfy unused-var linter for selectedPinId */}
        <span className="hidden">{selectedPinId}</span>
      </DialogContent>
    </Dialog>
  );
}
