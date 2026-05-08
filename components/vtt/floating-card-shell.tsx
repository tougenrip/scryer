"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import {
  PARCHMENT_BG,
  PARCHMENT_BORDER,
} from "@/components/vtt/quick-search/parchment";

const MIN_W = 240;
const MIN_H = 160;

export interface FloatingCardShellProps {
  /** Stable id used for focus/move/resize/close store actions. */
  cardId: string;
  /** Initial / current position from the store. */
  x: number;
  y: number;
  /** Initial / current size from the store. */
  width: number;
  height: number;
  /** Header label (left side, small-caps red). */
  label: string;
  /** Body content. Already inside an overflow-y-auto wrapper. */
  children: React.ReactNode;
  /** Notify the owning store the user dragged. */
  onMove: (id: string, x: number, y: number) => void;
  /** Notify the owning store the user resized. */
  onResize: (id: string, width: number, height: number) => void;
  /** Notify the owning store the user closed the card. */
  onClose: (id: string) => void;
  /** Notify the owning store this card was focused (for z-order). */
  onFocus: (id: string) => void;
}

/**
 * Shared draggable + resizable parchment-styled floating card. Used by both
 * Quick Search and Handouts. Always renders at `z-20`, beneath the sidebars
 * (z-30) so the canvas overlays never cover the persistent UI rails.
 */
export function FloatingCardShell({
  cardId,
  x,
  y,
  width,
  height,
  label,
  children,
  onMove,
  onResize,
  onClose,
  onFocus,
}: FloatingCardShellProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    cardX: number;
    cardY: number;
  } | null>(null);

  const resizeState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [pos, setPos] = useState({ x, y });
  const [size, setSize] = useState({ w: width, h: height });

  useEffect(() => {
    setPos({ x, y });
  }, [x, y]);
  useEffect(() => {
    setSize({ w: width, h: height });
  }, [width, height]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    headerRef.current?.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      cardX: pos.x,
      cardY: pos.y,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    const nx = Math.max(0, dragState.current.cardX + dx);
    const ny = Math.max(0, dragState.current.cardY + dy);
    setPos({ x: nx, y: ny });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragState.current || dragState.current.pointerId !== e.pointerId) return;
    headerRef.current?.releasePointerCapture(e.pointerId);
    onMove(cardId, pos.x, pos.y);
    dragState.current = null;
  };

  const onResizeDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    resizeRef.current?.setPointerCapture(e.pointerId);
    resizeState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startW: size.w,
      startH: size.h,
    };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (!resizeState.current || resizeState.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - resizeState.current.startX;
    const dy = e.clientY - resizeState.current.startY;
    const w = Math.max(MIN_W, resizeState.current.startW + dx);
    const h = Math.max(MIN_H, resizeState.current.startH + dy);
    setSize({ w, h });
  };
  const onResizeUp = (e: React.PointerEvent) => {
    if (!resizeState.current || resizeState.current.pointerId !== e.pointerId) return;
    resizeRef.current?.releasePointerCapture(e.pointerId);
    onResize(cardId, size.w, size.h);
    resizeState.current = null;
  };

  return (
    <div
      onPointerDownCapture={() => onFocus(cardId)}
      className={cn(
        "fixed z-20 shadow-2xl rounded-md flex flex-col",
        PARCHMENT_BORDER,
        PARCHMENT_BG
      )}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      }}
    >
      <div
        ref={headerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex items-center gap-1 px-2 py-1 cursor-move bg-[#7a1f1f] text-[#f5ecd7] rounded-t-md select-none"
      >
        <span className="text-[10px] uppercase tracking-wider font-bold flex-1 truncate font-serif">
          {label}
        </span>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onClose(cardId);
          }}
          className="h-5 w-5 flex items-center justify-center hover:bg-white/15 rounded"
          title="Close"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">{children}</div>
      <div
        ref={resizeRef}
        onPointerDown={onResizeDown}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeUp}
        onPointerCancel={onResizeUp}
        className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        title="Resize"
        style={{
          backgroundImage:
            "linear-gradient(135deg, transparent 0 50%, rgba(122,31,31,0.55) 50% 60%, transparent 60% 70%, rgba(122,31,31,0.55) 70% 80%, transparent 80%)",
        }}
      />
    </div>
  );
}
