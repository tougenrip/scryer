"use client";

import { useCallback } from "react";
import { useVttStore } from "@/lib/store/vtt-store";
import type { Token } from "@/types/vtt";

export function useUpdateVttToken(campaignId: string) {
  const updateTokenStore = useVttStore((s) => s.updateToken);

  const updateToken = useCallback(
    async (id: string, updates: Partial<Token>) => {
      const dbUpdates = Object.fromEntries(
        Object.entries(updates as Record<string, unknown>).filter(
          ([k, v]) => k !== "character" && v !== undefined
        )
      );

      updateTokenStore(id, updates);

      const response = await fetch("/api/vtt/tokens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          tokenId: id,
          updates: dbUpdates,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.error("updateToken", payload);
      }
    },
    [campaignId, updateTokenStore]
  );

  return { updateToken };
}
