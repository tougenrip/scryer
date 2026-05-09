import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Supabase broadcast channel for "rest" animations on the VTT.
 * The DM emits a broadcast (long_rest / short_rest) and every connected
 * client — including the sender — runs the matching animation locally.
 *
 * One long-lived channel per campaign is shared by both senders and
 * listeners on the same client. Two channels on the same topic from
 * one client confuses the realtime layer + makes self-broadcast
 * delivery flaky, hence the Set-of-handlers fan-out below.
 */
export type RestEvent = "long_rest" | "short_rest";

type RestHandler = (event: RestEvent) => void;
type Entry = {
  channel: RealtimeChannel;
  handlers: Set<RestHandler>;
  subscribed: Promise<void>;
};

const cache = new Map<string, Entry>();

function ensure(campaignId: string): Entry {
  let entry = cache.get(campaignId);
  if (entry) return entry;

  const supabase = createClient();
  const channel = supabase.channel(`vtt-rest:${campaignId}`, {
    // self:true so the sending DM's own client also receives the
    // broadcast and runs the animation alongside everyone else.
    config: { broadcast: { self: true } },
  });
  const handlers = new Set<RestHandler>();
  channel.on("broadcast", { event: "long_rest" }, () => {
    handlers.forEach((h) => h("long_rest"));
  });
  channel.on("broadcast", { event: "short_rest" }, () => {
    handlers.forEach((h) => h("short_rest"));
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

/** Send a rest broadcast. Awaits initial subscription so the very first
 *  click after page load isn't lost while the socket is still handshaking. */
export async function broadcastRest(campaignId: string, event: RestEvent) {
  const entry = ensure(campaignId);
  await entry.subscribed;
  await entry.channel.send({ type: "broadcast", event, payload: {} });
}

/** Register a handler. Returns an unregister fn — the underlying channel
 *  stays alive for other consumers and is reused on next subscribe. */
export function subscribeRest(
  campaignId: string,
  handler: RestHandler
): () => void {
  const entry = ensure(campaignId);
  entry.handlers.add(handler);
  return () => {
    entry.handlers.delete(handler);
  };
}
