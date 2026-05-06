"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  AoeShape,
  DrawingPoint,
  EphemeralAoe,
  EphemeralDrawing,
  PingEvent,
} from "@/types/vtt-aoe";
import { presenceColorForUser } from "@/lib/vtt/presence-color";

const PING_TTL_MS = 1600;
const EPHEMERAL_TTL_MS = 4000;
const PING_MIN_INTERVAL_MS = 500; // ~2 pings/sec per user, broadcast-side throttle

interface PingPayload {
  id: string;
  user_id: string;
  display_name: string;
  color: string;
  x: number;
  y: number;
  fired_at: number;
}

interface AoeDragPayload {
  user_id: string;
  display_name: string;
  color: string;
  shape: AoeShape;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  updated_at: number;
}

interface AoeCancelPayload {
  user_id: string;
}

interface DrawingStrokePayload {
  user_id: string;
  display_name: string;
  color: string;
  stroke_width: number;
  points: DrawingPoint[];
  updated_at: number;
}

interface DrawingCancelPayload {
  user_id: string;
}

export function useVttOverlays(campaignId: string | null, mapId: string | null) {
  const [activePings, setActivePings] = useState<PingEvent[]>([]);
  const [peerEphemerals, setPeerEphemerals] = useState<Map<string, EphemeralAoe>>(
    new Map()
  );
  const [peerDrawings, setPeerDrawings] = useState<Map<string, EphemeralDrawing>>(
    new Map()
  );
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const displayNameRef = useRef<string>("Player");
  const colorRef = useRef<string>("#3b82f6");
  const lastPingAtRef = useRef<number>(0);

  useEffect(() => {
    if (!campaignId || !mapId) {
      setActivePings([]);
      setPeerEphemerals(new Map());
      setPeerDrawings(new Map());
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let pruneInterval: ReturnType<typeof setInterval> | null = null;

    const run = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      userIdRef.current = user.id;
      colorRef.current = presenceColorForUser(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.display_name) displayNameRef.current = profile.display_name;

      const topic = `vtt_overlays:${campaignId}:${mapId}`;
      channel = supabase.channel(topic, { config: { broadcast: { self: false } } });
      channelRef.current = channel;

      channel.on("broadcast", { event: "ping" }, ({ payload }) => {
        const p = payload as PingPayload;
        setActivePings((prev) => [
          ...prev,
          {
            id: p.id,
            userId: p.user_id,
            displayName: p.display_name,
            color: p.color,
            x: p.x,
            y: p.y,
            firedAt: p.fired_at,
          },
        ]);
      });

      channel.on("broadcast", { event: "aoe_drag" }, ({ payload }) => {
        const p = payload as AoeDragPayload;
        setPeerEphemerals((prev) => {
          const next = new Map(prev);
          next.set(p.user_id, {
            userId: p.user_id,
            displayName: p.display_name,
            color: p.color,
            shape: p.shape,
            startX: p.start_x,
            startY: p.start_y,
            endX: p.end_x,
            endY: p.end_y,
            updatedAt: p.updated_at,
          });
          return next;
        });
      });

      channel.on("broadcast", { event: "aoe_cancel" }, ({ payload }) => {
        const p = payload as AoeCancelPayload;
        setPeerEphemerals((prev) => {
          if (!prev.has(p.user_id)) return prev;
          const next = new Map(prev);
          next.delete(p.user_id);
          return next;
        });
      });

      channel.on("broadcast", { event: "drawing_stroke" }, ({ payload }) => {
        const p = payload as DrawingStrokePayload;
        setPeerDrawings((prev) => {
          const next = new Map(prev);
          next.set(p.user_id, {
            userId: p.user_id,
            displayName: p.display_name,
            color: p.color,
            strokeWidth: p.stroke_width,
            points: p.points,
            updatedAt: p.updated_at,
          });
          return next;
        });
      });

      channel.on("broadcast", { event: "drawing_cancel" }, ({ payload }) => {
        const p = payload as DrawingCancelPayload;
        setPeerDrawings((prev) => {
          if (!prev.has(p.user_id)) return prev;
          const next = new Map(prev);
          next.delete(p.user_id);
          return next;
        });
      });

      channel.subscribe();

      pruneInterval = setInterval(() => {
        const now = Date.now();
        setActivePings((prev) => prev.filter((p) => now - p.firedAt < PING_TTL_MS));
        setPeerEphemerals((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const [k, v] of prev) {
            if (now - v.updatedAt > EPHEMERAL_TTL_MS) {
              next.delete(k);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
        setPeerDrawings((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const [k, v] of prev) {
            if (now - v.updatedAt > EPHEMERAL_TTL_MS) {
              next.delete(k);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }, 500);
    };

    void run();

    return () => {
      cancelled = true;
      if (pruneInterval) clearInterval(pruneInterval);
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [campaignId, mapId]);

  const broadcastPing = useCallback((x: number, y: number) => {
    const ch = channelRef.current;
    const userId = userIdRef.current;
    if (!ch || !userId) return;
    const now = Date.now();
    if (now - lastPingAtRef.current < PING_MIN_INTERVAL_MS) return;
    lastPingAtRef.current = now;
    const id = `${userId}-${now}-${Math.random().toString(36).slice(2, 7)}`;
    const payload: PingPayload = {
      id,
      user_id: userId,
      display_name: displayNameRef.current,
      color: colorRef.current,
      x,
      y,
      fired_at: now,
    };
    void ch.send({ type: "broadcast", event: "ping", payload });
    setActivePings((prev) => [
      ...prev,
      {
        id,
        userId,
        displayName: displayNameRef.current,
        color: colorRef.current,
        x,
        y,
        firedAt: payload.fired_at,
      },
    ]);
  }, []);

  const broadcastAoeDrag = useCallback(
    (shape: AoeShape, startX: number, startY: number, endX: number, endY: number) => {
      const ch = channelRef.current;
      const userId = userIdRef.current;
      if (!ch || !userId) return;
      const payload: AoeDragPayload = {
        user_id: userId,
        display_name: displayNameRef.current,
        color: colorRef.current,
        shape,
        start_x: startX,
        start_y: startY,
        end_x: endX,
        end_y: endY,
        updated_at: Date.now(),
      };
      void ch.send({ type: "broadcast", event: "aoe_drag", payload });
    },
    []
  );

  const broadcastAoeCancel = useCallback(() => {
    const ch = channelRef.current;
    const userId = userIdRef.current;
    if (!ch || !userId) return;
    const payload: AoeCancelPayload = { user_id: userId };
    void ch.send({ type: "broadcast", event: "aoe_cancel", payload });
  }, []);

  const broadcastDrawingStroke = useCallback(
    (points: DrawingPoint[], strokeWidth: number) => {
      const ch = channelRef.current;
      const userId = userIdRef.current;
      if (!ch || !userId) return;
      const payload: DrawingStrokePayload = {
        user_id: userId,
        display_name: displayNameRef.current,
        color: colorRef.current,
        stroke_width: strokeWidth,
        points,
        updated_at: Date.now(),
      };
      void ch.send({ type: "broadcast", event: "drawing_stroke", payload });
    },
    []
  );

  const broadcastDrawingCancel = useCallback(() => {
    const ch = channelRef.current;
    const userId = userIdRef.current;
    if (!ch || !userId) return;
    const payload: DrawingCancelPayload = { user_id: userId };
    void ch.send({ type: "broadcast", event: "drawing_cancel", payload });
  }, []);

  const myColor = useCallback(() => colorRef.current, []);
  const myUserId = useCallback(() => userIdRef.current, []);

  return {
    activePings,
    peerEphemerals,
    peerDrawings,
    broadcastPing,
    broadcastAoeDrag,
    broadcastAoeCancel,
    broadcastDrawingStroke,
    broadcastDrawingCancel,
    myColor,
    myUserId,
  };
}
