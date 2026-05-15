"use client";

import { useEffect } from "react";
import { subscribeSfx } from "@/lib/realtime/vtt-sfx-channel";

interface Props {
  campaignId: string | null;
}

/**
 * Always-mounted SFX listener. Subscribes to the soundboard
 * broadcast channel for the active campaign and plays incoming
 * sounds through a transient HTMLAudio element. Lives at page
 * scope so a player who never opens the music sidebar still hears
 * the DM's soundboard hits.
 */
export function SfxAudioBridge({ campaignId }: Props) {
  useEffect(() => {
    if (!campaignId) return;
    return subscribeSfx(campaignId, (payload) => {
      try {
        const audio = new Audio(payload.audio_url);
        audio.volume =
          typeof payload.volume === "number"
            ? Math.max(0, Math.min(1, payload.volume))
            : 1;
        void audio.play().catch((err) => {
          // Browser autoplay gates first-touch playback. We swallow
          // the error here; the next user interaction unlocks audio.
          console.warn("[soundboard] play() blocked:", err);
        });
      } catch (err) {
        console.warn("[soundboard] failed to play:", err);
      }
    });
  }, [campaignId]);

  return null;
}
