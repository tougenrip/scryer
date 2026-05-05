"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

type VttCombatWidgetProps = {
  isOpen: boolean;
  onClose: () => void;
  initiativePanel: React.ReactNode;
  combatPanel: React.ReactNode;
};

export function VttCombatWidget({ isOpen, onClose, combatPanel }: Omit<VttCombatWidgetProps, 'initiativePanel'>) {
  const [pos, setPos] = useState({ x: 300, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      
      setPos({
        x: dragRef.current.initX + dx,
        y: dragRef.current.initY + dy,
      });
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        dragRef.current = null;
      }
    };

    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div
      className="absolute z-[24] flex w-[320px] flex-col overflow-hidden rounded-md border border-border bg-card shadow-2xl"
      style={{
        left: pos.x,
        top: pos.y,
        // Ensure it doesn't block clicks from falling through where it shouldn't, but the panel itself catches clicks
      }}
    >
      {/* Drag Handle Header */}
      <div 
        className="flex cursor-grab items-center justify-between border-b border-border bg-muted/50 px-2.5 py-1.5 active:cursor-grabbing"
        onPointerDown={(e) => {
          setIsDragging(true);
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initX: pos.x,
            initY: pos.y,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <GripHorizontal className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Combat & Order</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 rounded-sm hover:bg-destructive hover:text-destructive-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex max-h-[520px] flex-col overflow-y-auto bg-background/50 p-2 custom-scrollbar">
        {combatPanel}
      </div>
    </div>
  );
}
