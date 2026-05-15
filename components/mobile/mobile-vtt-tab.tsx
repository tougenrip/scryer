"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, ExternalLink } from "lucide-react";

interface Props {
  campaignId: string;
}

/**
 * Mobile VTT tab — embeds the full desktop VTT canvas in an iframe so
 * mobile players can see the live map (lights, fog, weather, tokens)
 * in either orientation. The desktop chrome reads our `embed=mobile`
 * query param and hides toolbars + sidebars + the "open companion"
 * suggestion toast (which would otherwise re-loop).
 *
 * Resolves the campaign's currently-active map from `campaign_state`
 * so players land on whatever scene the DM is running.
 */
export function MobileVttTab({ campaignId }: Props) {
  const [activeMapId, setActiveMapId] = useState<string | null | undefined>(
    undefined
  );
  const [bust, setBust] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("campaign_state")
        .select("active_map_id")
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (cancelled) return;
      setActiveMapId((data?.active_map_id as string | null) ?? null);
    };
    void load();

    // Re-fetch when the active map changes so a DM scene swap shows
    // up here without a manual reload.
    const supabase = createClient();
    const channel = supabase
      .channel(`mobile-vtt-active-map:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaign_state",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          const next =
            (payload.new as { active_map_id?: string | null }).active_map_id ??
            null;
          setActiveMapId(next);
          // Force the iframe to remount so the desktop page reloads
          // with the new map id in its query string.
          setBust((b) => b + 1);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  if (activeMapId === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (activeMapId === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-neutral-400">
          The DM hasn't picked an active scene yet.
        </p>
        <p className="text-xs text-neutral-500">
          Once a scene is active on the desktop, it will appear here.
        </p>
      </div>
    );
  }

  const src = `/campaigns/${campaignId}/vtt?map=${activeMapId}&embed=mobile&v=${bust}`;

  return (
    <div className="relative h-full w-full bg-neutral-950">
      <iframe
        key={`${activeMapId}:${bust}`}
        src={src}
        title="VTT"
        className="absolute inset-0 h-full w-full border-0"
        // Allow gestures, fullscreen, and same-origin scripts (we own
        // the iframed page so cross-origin sandboxing is a non-issue).
        allow="fullscreen; clipboard-write"
      />
      {/* Tiny floating toolbar — refresh + open in new tab. */}
      <div className="pointer-events-none absolute right-2 top-2 flex gap-1.5">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto h-8 w-8 bg-neutral-950/85 backdrop-blur"
          onClick={() => setBust((b) => b + 1)}
          title="Reload"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="pointer-events-auto h-8 w-8 bg-neutral-950/85 backdrop-blur"
          onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
