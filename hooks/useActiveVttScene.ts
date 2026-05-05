"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * When DM sets campaigns.active_vtt_map_id, all VTT clients (including DM on another tab)
 * navigate to that map via Realtime.
 */
export function useActiveVttScene(
  campaignId: string | null,
  currentMapId: string | null
) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!campaignId) return;

    const channel = supabase
      .channel(`campaign-vtt-scene:${campaignId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaignId}`,
        },
        (payload) => {
          const next = (payload.new as { active_vtt_map_id?: string | null })
            .active_vtt_map_id;
          if (next && next !== currentMapId) {
            router.replace(`/campaigns/${campaignId}/vtt?map=${next}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, currentMapId, router, supabase]);
}

export async function pushVttScene(
  campaignId: string,
  mediaItemId: string
): Promise<{ error: Error | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ active_vtt_map_id: mediaItemId })
    .eq("id", campaignId);
  return { error: error as Error | null };
}
