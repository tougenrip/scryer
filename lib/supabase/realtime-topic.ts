/**
 * Supabase reuses Realtime channels by topic — calling `supabase.channel(topic)`
 * twice with the same topic can return a still-being-torn-down instance from a
 * previous mount. Attaching `.on('postgres_changes', ...)` to a channel that
 * has already had `.subscribe()` called on it throws:
 *
 *   "cannot add postgres_changes callbacks for realtime:<topic> after subscribe()"
 *
 * The race shows up under React Strict Mode, hot reload, and any rapid
 * mount/unmount/remount cycle. We avoid it by appending a per-mount random
 * suffix so each useEffect invocation gets a fresh channel.
 */
export function uniqueChannelTopic(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 9);
  return `${base}:${suffix}`;
}
