"use client";

import { memo, useMemo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { cn } from "@/lib/utils";
import { User, Flag, MapPin, Sparkles } from "lucide-react";

// Scryer-themed colors
const SCRYER_GOLD = "#c9b882";
const SCRYER_BORDER = "rgb(70, 64, 57)";

// Node type colors
const NODE_TYPE_CONFIG = {
  npc: {
    color: "rgb(139, 157, 196)", // Muted blue for NPCs
    icon: User,
    markerColor: "rgb(148, 166, 184)", // Chart-4 blue
  },
  faction: {
    color: "rgb(184, 115, 92)", // Warm red-brown for Factions
    icon: Flag,
    markerColor: "rgb(228, 124, 103)", // Destructive red
  },
  location: {
    color: "rgb(168, 184, 138)", // Muted green-gold for Locations
    icon: MapPin,
    markerColor: "rgb(133, 173, 133)", // Chart-2 green
  },
  pantheon: {
    color: SCRYER_GOLD, // Scryer gold for Pantheons
    icon: Sparkles, // Star icon for worship/deities
    markerColor: "rgb(236, 217, 198)", // Chart-5 orange
  },
};

// Shared timeline-style card node component
function BaseTimelineCardNode({ 
  data, 
  typeConfig 
}: { 
  data: BaseNodeData;
  typeConfig: typeof NODE_TYPE_CONFIG[keyof typeof NODE_TYPE_CONFIG];
}) {
  const width = 200;
  const height = 120;
  
  const isSelected = data.selected || false;
  const borderColor = isSelected ? SCRYER_GOLD : SCRYER_BORDER;

  // Create placeholder gradient background similar to timeline cards
  const placeholderGradient = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Base parchment color with gradient matching timeline style
      const baseGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      baseGradient.addColorStop(0, 'rgb(56, 46, 41)');
      baseGradient.addColorStop(0.3, 'rgb(64, 52, 45)');
      baseGradient.addColorStop(0.7, 'rgb(60, 49, 43)');
      baseGradient.addColorStop(1, 'rgb(56, 46, 41)');
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add aged paper texture
      ctx.fillStyle = 'rgba(201, 184, 130, 0.15)';
      for (let i = 0; i < 50; i++) {
        const x = (i * 17 + 23) % canvas.width;
        const y = (i * 13 + 31) % canvas.height;
        const size = 2 + (i % 3);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return canvas.toDataURL();
  }, []);

  const imageUrl = ('imageUrl' in data ? data.imageUrl : null) || 
                   ('emblemUrl' in data ? data.emblemUrl : null) ||
                   ('mapSnippet' in data ? data.mapSnippet : null);

  return (
    <div
      className={cn(
        "relative overflow-visible",
        data.dimmed && "opacity-30",
        isSelected && "z-50"
      )}
      style={{ width: width, height: height }}
    >
      {/* Connection handles on all 4 sides - timeline style */}
      <Handle 
        id="top-source"
        type="source" 
        position={Position.Top} 
        style={{
          background: 'rgb(236, 217, 198)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle 
        id="top-target"
        type="target" 
        position={Position.Top} 
        style={{
          background: 'rgb(179, 166, 152)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle 
        id="right-source"
        type="source" 
        position={Position.Right} 
        style={{
          background: SCRYER_GOLD,
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle 
        id="right-target"
        type="target" 
        position={Position.Right} 
        style={{
          background: 'rgb(179, 166, 152)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle 
        id="bottom-source"
        type="source" 
        position={Position.Bottom} 
        style={{
          background: typeConfig.markerColor,
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle 
        id="bottom-target"
        type="target" 
        position={Position.Bottom} 
        style={{
          background: 'rgb(179, 166, 152)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle 
        id="left-source"
        type="source" 
        position={Position.Left} 
        style={{
          background: 'rgb(179, 166, 152)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle 
        id="left-target"
        type="target" 
        position={Position.Left} 
        style={{
          background: 'rgb(179, 166, 152)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      
      {/* Timeline-style card */}
      <div
        className={cn(
          "relative rounded-none border-2 transition-all overflow-hidden",
          isSelected && "shadow-[0_0_12px_rgba(201,184,130,0.6)]"
        )}
        style={{
          width: width,
          height: height,
          borderColor: borderColor,
          boxShadow: isSelected 
            ? "0 0 12px rgba(201, 184, 130, 0.6)" 
            : "0 2px 4px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Inner container for card content */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Background Image or Placeholder */}
          <div className="absolute inset-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={data.label}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${placeholderGradient})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}
            
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/40" />
            
            {/* Gradient overlay for text readability - matching timeline */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.6) 100%)',
              }}
            />
          </div>

          {/* Type marker - top left (similar to timeline status marker) */}
          <div className="absolute top-2 left-2 z-10">
            <div className="w-3 h-3 rounded-full bg-black/60 flex items-center justify-center">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: typeConfig.markerColor,
                  boxShadow: `0 0 6px ${typeConfig.markerColor}`,
                }}
              />
            </div>
          </div>

          {/* Type icon - top right */}
          <div className="absolute top-2 right-2 z-10">
            <div 
              className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
              style={{
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              }}
            >
              {<typeConfig.icon size={14} style={{ color: typeConfig.color }} />}
            </div>
          </div>

          {/* Label - bottom left (matching timeline style) */}
          <div className="absolute bottom-2 left-2.5 right-2.5 z-10">
            <h3
              className="text-white font-bold text-[13px] leading-tight truncate"
              style={{
                textShadow: '1.5px 1.5px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.9)',
              }}
            >
              {data.label}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BaseNodeData {
  id: string;
  label: string;
  entityType: 'npc' | 'faction' | 'location' | 'pantheon';
  alignment?: string | null;
  imageUrl?: string | null;
  selected?: boolean;
  dimmed?: boolean;
}

export interface NPCNodeData extends BaseNodeData {
  entityType: 'npc';
  alignment?: string | null;
  imageUrl?: string | null;
}

export interface FactionNodeData extends BaseNodeData {
  entityType: 'faction';
  alignment?: string | null;
  emblemUrl?: string | null;
}

export interface LocationNodeData extends BaseNodeData {
  entityType: 'location';
  mapSnippet?: string | null;
}

export interface PantheonNodeData extends BaseNodeData {
  entityType: 'pantheon';
  alignment?: string | null;
  imageUrl?: string | null;
}

export type NodeData = NPCNodeData | FactionNodeData | LocationNodeData | PantheonNodeData;

// NPC Node - Timeline-style card
function NPCNode({ data }: NodeProps<NPCNodeData>) {
  return <BaseTimelineCardNode data={data} typeConfig={NODE_TYPE_CONFIG.npc} />;
}

// Faction Node - Timeline-style card
function FactionNode({ data }: NodeProps<FactionNodeData>) {
  return <BaseTimelineCardNode data={data} typeConfig={NODE_TYPE_CONFIG.faction} />;
}

// Location Node - Timeline-style card
function LocationNode({ data }: NodeProps<LocationNodeData>) {
  return <BaseTimelineCardNode data={data} typeConfig={NODE_TYPE_CONFIG.location} />;
}

// Pantheon Node - Timeline-style card
function PantheonNode({ data }: NodeProps<PantheonNodeData>) {
  return <BaseTimelineCardNode data={data} typeConfig={NODE_TYPE_CONFIG.pantheon} />;
}

// Main node component that routes to the correct type
export function CustomNode({ data }: NodeProps<NodeData>) {
  switch (data.entityType) {
    case 'npc':
      return <NPCNode data={data as NPCNodeData} />;
    case 'faction':
      return <FactionNode data={data as FactionNodeData} />;
    case 'location':
      return <LocationNode data={data as LocationNodeData} />;
    case 'pantheon':
      return <PantheonNode data={data as PantheonNodeData} />;
    default:
      return null;
  }
}

export const nodeTypes = {
  custom: CustomNode,
};
