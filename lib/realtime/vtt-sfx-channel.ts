import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Soundboard one-shot broadcast channel. The DM presses a soundboard
 * button → we broadcast { audio_url, name, volume } and every client
 * (including the DM's own) plays the clip via a transient HTMLAudio.
 *
 * Distinct from useAudio's music sync (which persists state to
 * `campaign_state`). SFX are fire-and-forget — no state, no replay
 * on reconnect; if you missed it, you missed it.
 *
 * One shared channel per campaign cached at module level. Sender +
 * listeners share it so self:true echoes the DM's own click as a
 * proper broadcast and the audio plays via the same code path on
 * every client (no special-cased local trigger).
 */
export interface SfxPayload {
  audio_url: string;
  name?: string;
  /** 0..1 — defaults to 1 if unset. */
  volume?: number;
}

type SfxHandler = (payload: SfxPayload) => void;
type Entry = {
  channel: RealtimeChannel;
  handlers: Set<SfxHandler>;
  subscribed: Promise<void>;
};

const cache = new Map<string, Entry>();

function ensure(campaignId: string): Entry {
  let entry = cache.get(campaignId);
  if (entry) return entry;

  const supabase = createClient();
  const channel = supabase.channel(`vtt-sfx:${campaignId}`, {
    config: { broadcast: { self: true } },
  });
  const handlers = new Set<SfxHandler>();
  channel.on("broadcast", { event: "sfx" }, (payload) => {
    const p = (payload?.payload ?? {}) as SfxPayload;
    if (!p.audio_url) return;
    handlers.forEach((h) => h(p));
  });
  const subscribed = new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });
  entry = { channel, handlers, subscribed };
  cache.set(campaignId, entry);
  return entry;
}

/** Fire a soundboard SFX to every connected client (including self). */
export async function broadcastSfx(
  campaignId: string,
  payload: SfxPayload
): Promise<void> {
  const entry = ensure(campaignId);
  await entry.subscribed;
  await entry.channel.send({ type: "broadcast", event: "sfx", payload });
}

/** Register an SFX handler. Returns the unregister fn. */
export function subscribeSfx(
  campaignId: string,
  handler: SfxHandler
): () => void {
  const entry = ensure(campaignId);
  entry.handlers.add(handler);
  return () => {
    entry.handlers.delete(handler);
  };
}
