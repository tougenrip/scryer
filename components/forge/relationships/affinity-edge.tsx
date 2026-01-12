"use client";

import { memo, useEffect, useState, useRef } from "react";
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from "reactflow";
import { useRelationshipGraphStore } from "./relationship-graph-store";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Heart, Plus, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type RelationshipType = 
  | 'romance' 
  | 'bond' 
  | 'hostile' 
  | 'enemy' 
  | 'trade' 
  | 'alliance' 
  | 'family' 
  | 'neutral'
  | 'rivalry'
  | 'war'
  | 'vassal'
  | 'trade_partner'
  | 'friendly'
  | 'trading_partner'
  | 'trade_route';

export interface RelationshipEdgeData {
  type: RelationshipType;
  strength: number;
  isSecret: boolean;
  description?: string | null;
  onStrengthChange?: (newStrength: number) => void;
  onDelete?: () => void;
  relationshipId?: string;
  sourceType?: string;
  targetType?: string;
  isDm?: boolean;
}

// Scryer-themed colors based on app color palette
const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  romance: '#d4a574', // Warm gold tint
  bond: '#c9b882', // Scryer primary gold
  hostile: '#b8735c', // Warm red-brown
  enemy: '#a85d48', // Darker red-brown
  trade: '#c9b882', // Scryer primary gold
  alliance: '#a8b88a', // Muted green-gold
  family: '#d4a574', // Warm gold
  neutral: '#847862', // Muted brown-gray
  rivalry: '#b8735c', // Warm red-brown
  war: '#a85d48', // Darker red-brown
  vassal: '#b8a882', // Gold with slight purple tint
  trade_partner: '#c9b882', // Scryer primary gold
  friendly: '#a8b88a', // Muted green-gold
  trading_partner: '#c9b882', // Scryer primary gold
  trade_route: '#c9b882', // Scryer primary gold
};

const RELATIONSHIP_ICONS: Record<RelationshipType, string> = {
  romance: '❤️',
  bond: '🤝',
  hostile: '⚔️',
  enemy: '⚔️',
  trade: '🤝',
  alliance: '🤝',
  family: '🩸',
  neutral: '⚪',
  rivalry: '⚔️',
  war: '⚔️',
  vassal: '🤝',
  trade_partner: '🤝',
  friendly: '🤝',
  trading_partner: '🤝',
  trade_route: '🤝',
};

export function AffinityEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps<RelationshipEdgeData>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 20, // Beautiful rounded corners
  });

  const relationshipType = data?.type || 'neutral';
  const baseStrength = data?.strength ?? 50;
  const isSecret = data?.isSecret ?? false;
  const description = data?.description || null;
  const onStrengthChange = data?.onStrengthChange;
  
  // Use local state for optimistic updates - this is the ONLY source of truth for UI
  // We never call setEdges, preventing canvas resets
  const [localStrength, setLocalStrength] = useState<number>(baseStrength);
  
  // Track pending updates to allow sync when database confirms
  const pendingStrengthRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Sync from parent only if:
    // 1. We have no pending changes, OR
    // 2. The parent value matches our pending value (database confirmed our update)
    if (pendingStrengthRef.current === null) {
      // No pending changes - sync from parent
      setLocalStrength(baseStrength);
    } else if (Math.abs(baseStrength - pendingStrengthRef.current) < 5) {
      // Database confirmed our update - clear pending and sync
      pendingStrengthRef.current = null;
      setLocalStrength(baseStrength);
    }
    // Otherwise, keep local state (optimistic update still pending)
  }, [baseStrength]);
  
  // Current strength to display - always use local state
  const strength = localStrength;

  const edgeColor = RELATIONSHIP_COLORS[relationshipType] || RELATIONSHIP_COLORS.neutral;
  const icon = RELATIONSHIP_ICONS[relationshipType] || RELATIONSHIP_ICONS.neutral;
  
  // Convert strength (0-100) to hearts (0-5)
  const heartCount = Math.round((strength / 100) * 5);
  const hearts = Array.from({ length: 5 }, (_, i) => i < heartCount);

  // Use Zustand store for updating edge strength
  const updateEdgeStrength = useRelationshipGraphStore((state) => state.updateEdgeStrength);
  
  const updateStrengthOptimistically = (newStrength: number) => {
    // Update local state immediately - this only re-renders this edge component
    setLocalStrength(newStrength);
    pendingStrengthRef.current = newStrength;
    
    // Update in Zustand store - this updates the edge data without resetting canvas
    updateEdgeStrength(id, newStrength);
    
    // Update the database in the background
    // When it completes, the parent will refetch and baseStrength will update
    // Our useEffect will then sync the confirmed value
    if (onStrengthChange) {
      onStrengthChange(newStrength);
    }
  };

  const handleHeartClick = (index: number) => {
    const newStrength = Math.min(100, (index + 1) * 20);
    updateStrengthOptimistically(newStrength);
  };

  const handleIncrement = () => {
    const newStrength = Math.min(100, strength + 20);
    updateStrengthOptimistically(newStrength);
  };

  const handleDecrement = () => {
    const newStrength = Math.max(0, strength - 20);
    updateStrengthOptimistically(newStrength);
  };
  
  // High strength for romance/bond relationships makes the badge pulse
  const shouldPulse = (relationshipType === 'romance' || relationshipType === 'bond') && strength >= 70;

  // Calculate dash array for animation
  const dashArray = isSecret ? '8,4' : '10,5';
  const dashTotal = isSecret ? 12 : 15; // Sum of dash and gap

  const edgeStyle: React.CSSProperties = {
    ...style,
    stroke: edgeColor,
    strokeWidth: 3,
    strokeDasharray: dashArray,
    opacity: isSecret ? 0.6 : 0.9,
    pointerEvents: 'none', // Allow clicks to pass through the edge to the label
  };

  // Add CSS animation for dashed line movement (only once globally)
  useEffect(() => {
    const styleId = 'affinity-edge-dash-animation';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes dash-animation {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 15;
          }
        }
        .react-flow__edge.affinity-edge .react-flow__edge-path {
          animation: dash-animation 1.5s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <>
      {/* Use React Flow's smooth step path for beautiful curves */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          className="absolute pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            zIndex: 10, // Ensure it's above other elements
          }}
        >
          <div
            className={cn(
              "relative flex flex-col items-center gap-1.5 p-2 rounded-lg bg-background/95 backdrop-blur-sm border-2 shadow-xl",
              isSecret && "border-muted opacity-70"
            )}
            style={{
              borderColor: edgeColor,
              minWidth: '140px',
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {/* Delete button - top right */}
            {data?.isDm && data?.onDelete && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-5 w-5 p-0 hover:bg-destructive/20 rounded-t-lg rounded-bl-none"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  data.onDelete?.();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
              </Button>
            )}

            {/* Relationship icon and type */}
            <div className="flex items-center gap-1.5">
              <span className="text-base">{icon}</span>
              <span className="text-xs font-medium text-foreground">
                {relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1).replace('_', ' ')}
              </span>
            </div>

            {/* Heart rating */}
            {onStrengthChange && (
              <div className="flex items-center gap-1">
                {/* Decrement button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/20 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleDecrement();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Minus size={12} />
                </Button>

                {/* Hearts */}
                <div className="flex items-center gap-0.5">
                  {hearts.map((filled, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleHeartClick(index);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      className="transition-all hover:scale-110 cursor-pointer"
                    >
                      <Heart
                        size={16}
                        className={cn(
                          filled 
                            ? "fill-[#ec4899] text-[#ec4899]" 
                            : "fill-none text-muted-foreground/40"
                        )}
                      />
                    </button>
                  ))}
                </div>

                {/* Increment button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-primary/20 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleIncrement();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Plus size={12} />
                </Button>
              </div>
            )}

            {/* Description tooltip */}
            {description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground cursor-help underline">
                      {description.length > 20 ? `${description.substring(0, 20)}...` : description}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="font-medium mb-1">{relationshipType.charAt(0).toUpperCase() + relationshipType.slice(1).replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">{description}</p>
                    {isSecret && <p className="text-xs text-amber-500 mt-1">Secret</p>}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const edgeTypes = {
  affinity: AffinityEdge,
};

