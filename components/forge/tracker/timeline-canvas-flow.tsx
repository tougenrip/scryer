"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Connection,
  NodeTypes,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  NodeMouseHandler,
  NodeDragHandler,
  Handle,
  Position,
  ConnectionMode,
} from "reactflow";
import "reactflow/dist/style.css";
import { cn } from "@/lib/utils";
import { CampaignTimeline } from "@/hooks/useForgeContent";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, ArrowDown, Edit, Trash2 } from "lucide-react";

interface TimelineCanvasProps {
  width?: number;
  height?: number;
  entries: CampaignTimeline[];
  mainTimelineBranches?: Map<string, string>; // Track main timeline branches: entryId -> sourceId
  onEntrySelect?: (entryId: string | null) => void;
  onEntryCreate?: (x: number, y: number, parentId?: string, branchType?: 'next' | 'side' | 'main') => void;
  onEntryConnect?: (fromId: string, toId: string) => void;
  onEntryMove?: (entryId: string, x: number, y: number) => void;
  onEntryDelete?: (entryId: string) => void;
  onEntryEdit?: (entryId: string) => void;
  selectedEntryId?: string | null;
  isDm?: boolean;
  className?: string;
}

// Using project design tokens (dark mode colors from globals.css)
const statusColors: Record<CampaignTimeline['status'], string> = {
  not_started: "rgb(84, 84, 69)",
  ongoing: "rgb(201, 184, 130)",
  finished: "rgb(133, 173, 133)",
  abandoned: "rgb(228, 124, 103)",
};

const statusMarkerColors: Record<CampaignTimeline['status'], string> = {
  not_started: "rgb(201, 184, 130)",
  ongoing: "rgb(148, 166, 184)",
  finished: "rgb(236, 217, 198)",
  abandoned: "rgb(228, 124, 103)",
};

const statusLabels: Record<CampaignTimeline['status'], string> = {
  not_started: "Not Started",
  ongoing: "Ongoing",
  finished: "Finished",
  abandoned: "Abandoned",
};

const getSessionIconText = (sessionType: CampaignTimeline['session_type']): string => {
  const iconMap: Record<string, string> = {
    prologue: '📖',
    session: '📅',
    milestone: '✨',
    downtime: '⏰',
    event: '⚠️',
  };
  return iconMap[sessionType || 'session'] || '📅';
};

// Custom Node Component for Timeline Entry
function TimelineEntryNode({ data }: { data: any }) {
  const entry = data.entry as CampaignTimeline;
  const isSelected = data.isSelected;
  const isHovered = data.isHovered;
  const isDm = data.isDm;
  const isSideQuest = data.isSideQuest;
  const hasNextNode = data.hasNextNode || false;
  const onEdit = data.onEdit;
  const onDelete = data.onDelete;
  const onCreateNext = data.onCreateNext;
  const onCreateSideQuest = data.onCreateSideQuest;
  const onCreateMainBranch = data.onCreateMainBranch;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const markerColor = statusMarkerColors[entry.status];
  const iconText = getSessionIconText(entry.session_type);

  const displayDate = entry.actual_date 
    ? new Date(entry.actual_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : entry.planned_date
    ? new Date(entry.planned_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  // Load image
  useEffect(() => {
    if (entry.image_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageSrc(entry.image_url!);
        setImageLoaded(true);
        setImageError(false);
      };
      img.onerror = () => {
        setImageError(true);
        setImageLoaded(false);
      };
      img.src = entry.image_url;
    } else {
      setImageSrc(null);
      setImageLoaded(false);
    }
  }, [entry.image_url]);

  // Create enhanced D&D-themed placeholder background
  // Different styles for main timeline vs side quest
  const placeholderGradient = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Different base colors for main timeline vs side quest
      const isMainTimeline = !isSideQuest;
      
      // Base parchment color with gradient
      const baseGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      if (isMainTimeline) {
        // Main timeline: warmer, golden tones
        baseGradient.addColorStop(0, 'rgb(56, 46, 41)');
        baseGradient.addColorStop(0.3, 'rgb(64, 52, 45)');
        baseGradient.addColorStop(0.7, 'rgb(60, 49, 43)');
        baseGradient.addColorStop(1, 'rgb(56, 46, 41)');
      } else {
        // Side quest: cooler, greenish tones
        baseGradient.addColorStop(0, 'rgb(44, 48, 40)');
        baseGradient.addColorStop(0.3, 'rgb(52, 56, 46)');
        baseGradient.addColorStop(0.7, 'rgb(48, 52, 44)');
        baseGradient.addColorStop(1, 'rgb(44, 48, 40)');
      }
      ctx.fillStyle = baseGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add aged paper texture with random spots
      ctx.fillStyle = isMainTimeline 
        ? 'rgba(201, 184, 130, 0.15)' 
        : 'rgba(133, 173, 133, 0.15)';
      for (let i = 0; i < 50; i++) {
        const x = (i * 17 + 23) % canvas.width;
        const y = (i * 13 + 31) % canvas.height;
        const size = 2 + (i % 3);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Add subtle diagonal lines for parchment texture
      ctx.strokeStyle = 'rgba(70, 64, 57, 0.1)';
      ctx.lineWidth = 0.5;
      for (let i = -canvas.height; i < canvas.width + canvas.height; i += 15) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + canvas.height, canvas.height);
        ctx.stroke();
      }
      
      // Add decorative border pattern (scroll-like edges)
      ctx.strokeStyle = isMainTimeline 
        ? 'rgba(201, 184, 130, 0.2)' 
        : 'rgba(133, 173, 133, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
      ctx.setLineDash([]);
      
      // Add center icon - different for main timeline vs side quest
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      if (isMainTimeline) {
        // Main timeline: Calendar/scroll icon
        ctx.fillStyle = 'rgba(201, 184, 130, 0.25)';
        // Scroll body
        ctx.fillRect(centerX - 35, centerY - 18, 70, 36);
        
        // Scroll edges (curled)
        ctx.beginPath();
        ctx.arc(centerX - 35, centerY - 18, 10, 0, Math.PI * 2);
        ctx.arc(centerX + 35, centerY - 18, 10, 0, Math.PI * 2);
        ctx.arc(centerX - 35, centerY + 18, 10, 0, Math.PI * 2);
        ctx.arc(centerX + 35, centerY + 18, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Add some lines to suggest text
        ctx.strokeStyle = 'rgba(201, 184, 130, 0.2)';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(centerX - 25, centerY - 6 + i * 6);
          ctx.lineTo(centerX + 25, centerY - 6 + i * 6);
          ctx.stroke();
        }
      } else {
        // Side quest: Compass/quest icon
        ctx.fillStyle = 'rgba(133, 173, 133, 0.25)';
        // Draw a compass/star shape
        ctx.beginPath();
        const radius = 20;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.fill();
        
        // Add center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return canvas.toDataURL();
  }, [isSideQuest]);

  return (
    <div
      className={cn(
        "relative w-[200px] h-[120px] rounded-none overflow-visible cursor-pointer",
        "border-2 transition-all",
        isSelected 
          ? "border-[rgb(201,184,130)] shadow-[0_0_12px_rgba(201,184,130,0.6)]" 
          : "border-[rgb(70,64,57)]"
      )}
      style={{
        boxShadow: isSelected 
          ? "0 0 12px rgba(201, 184, 130, 0.6)" 
          : "0 2px 4px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Inner container for card content with clipping */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          {imageLoaded && imageSrc ? (
            <img
              src={imageSrc}
              alt={entry.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
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
          
          {/* Gradient overlay for text readability */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        </div>

        {/* Status marker - top left */}
        <div className="absolute top-2 left-2 z-10">
          <div className="w-3 h-3 rounded-full bg-black/60 flex items-center justify-center">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: markerColor,
                boxShadow: `0 0 6px ${markerColor}`,
              }}
            />
          </div>
        </div>

        {/* Title - bottom left */}
        <div className="absolute bottom-2 left-2.5 right-2.5 z-10">
          <h3
            className="text-white font-bold text-[13px] leading-tight truncate"
            style={{
              textShadow: '1.5px 1.5px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.9)',
            }}
          >
            {entry.title}
          </h3>
        </div>
      </div>

      {/* Connection handles - visible React Flow handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: 'rgb(201, 184, 130)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: 'rgb(133, 173, 133)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{
          background: 'rgb(236, 217, 198)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          background: 'rgb(179, 166, 152)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        style={{
          background: 'rgb(132, 118, 98)',
          width: 8,
          height: 8,
          border: '2px solid rgb(23, 19, 17)',
        }}
      />

       {/* Action buttons - shown only on select */}
       {isDm && isSelected && (
         <>
           {/* Next/Branch button (right) - Only for main timeline */}
           {/* If no next node exists, create next sequential node. Otherwise, create a branch */}
           {!isSideQuest && (onCreateNext || onCreateMainBranch) && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
                 if (!hasNextNode && onCreateNext) {
                   // No next node - create next sequential node
                   onCreateNext(entry.id);
                 } else if (hasNextNode && onCreateMainBranch) {
                   // Next node exists - create a branch
                   onCreateMainBranch(entry.id);
                 }
               }}
               onMouseDown={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
               }}
               className="absolute right-[-40px] top-[36px] z-50 w-7 h-7 rounded-full bg-[rgb(201,184,130)] flex items-center justify-center shadow-md hover:shadow-lg transition-shadow pointer-events-auto cursor-pointer"
               style={{
                 boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
               }}
             >
               <ArrowRight className="w-4 h-4 text-[rgb(23,19,17)]" />
             </button>
           )}

           {/* Side quest button (down) - Only for main timeline */}
           {!isSideQuest && onCreateSideQuest && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
                 onCreateSideQuest(entry.id);
               }}
               onMouseDown={(e) => {
                 e.stopPropagation();
                 e.preventDefault();
               }}
               className="absolute right-[-40px] top-[72px] z-50 w-7 h-7 rounded-full bg-[rgb(133,173,133)] flex items-center justify-center shadow-md hover:shadow-lg transition-shadow pointer-events-auto cursor-pointer"
               style={{
                 boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
               }}
             >
               <ArrowDown className="w-4 h-4 text-[rgb(23,19,17)]" />
             </button>
           )}

          {/* Edit and Delete buttons - on card bottom */}
          <div className="absolute bottom-[-24px] left-0 right-0 flex gap-1 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(entry.id);
              }}
              className="flex-1 h-[18px] bg-[rgb(201,184,130)] text-[rgb(23,19,17)] text-[10px] font-semibold rounded-md flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onDelete) {
                  onDelete(entry.id);
                }
              }}
              className="flex-1 h-[18px] bg-[rgb(228,124,103)] text-[rgb(23,19,17)] text-[10px] font-semibold rounded-md flex items-center justify-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Define node types
const nodeTypes: NodeTypes = {
  timelineEntry: TimelineEntryNode,
};

// Inner component that uses React Flow hooks
function TimelineCanvasInner({
  width = 1200,
  height = 800,
  entries,
  mainTimelineBranches = new Map(),
  onEntrySelect,
  onEntryCreate,
  onEntryConnect,
  onEntryMove,
  onEntryDelete,
  onEntryEdit,
  selectedEntryId = null,
  isDm = true,
  className,
}: TimelineCanvasProps) {
  const reactFlowInstance = useReactFlow();
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const lastClickPositionRef = useRef<{ x: number; y: number } | null>(null);
  // Store manually positioned nodes to prevent jitter during drag
  const manuallyPositionedNodes = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Calculate positions and create nodes
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, Node>();
    const edgeList: Edge[] = [];
    const positions = new Map<string, { x: number; y: number }>();
    
    // Check for pending positions
    const pendingPositions = (window as any).__pendingTimelinePositions || {};
    
    // Use manually positioned nodes first (prevents recalculation after drag)
    manuallyPositionedNodes.current.forEach((pos, nodeId) => {
      positions.set(nodeId, pos);
    });
    
    // Separate main path and branches
    const mainPath = entries
      .filter(e => !e.parent_entry_id)
      .sort((a, b) => a.order_index - b.order_index);
    
    const branchesByParent = new Map<string, CampaignTimeline[]>();
    entries
      .filter(e => e.parent_entry_id)
      .forEach(e => {
        const parentId = e.parent_entry_id!;
        if (!branchesByParent.has(parentId)) {
          branchesByParent.set(parentId, []);
        }
        branchesByParent.get(parentId)!.push(e);
      });

    // Layout main path horizontally
    const mainTimelineY = height / 2;
    const horizontalSpacing = 450;
    const startX = 200;

    // Separate main timeline branches from regular main timeline entries
    const mainTimelineBranchesList = Array.from(mainTimelineBranches.keys());
    const regularMainPath = mainPath.filter(e => !mainTimelineBranchesList.includes(e.id));
    const branchEntries = mainPath.filter(e => mainTimelineBranchesList.includes(e.id));

    // Layout regular main timeline entries
    regularMainPath.forEach((entry, index) => {
      // Skip if already manually positioned
      if (!manuallyPositionedNodes.current.has(entry.id)) {
        positions.set(entry.id, {
          x: startX + index * horizontalSpacing,
          y: mainTimelineY,
        });
      }

      // Separate top branches and side quests
      const allBranches = branchesByParent.get(entry.id) || [];
      const topBranches: CampaignTimeline[] = [];
      const sideQuests: CampaignTimeline[] = [];
      
      allBranches.forEach(branch => {
        const existingPos = positions.get(branch.id);
        const pendingPos = pendingPositions[branch.id];
        
        if (pendingPos && pendingPos.isTopBranch) {
          topBranches.push(branch);
          positions.set(branch.id, { x: pendingPos.x, y: pendingPos.y });
          delete pendingPositions[branch.id];
        } else if (existingPos && existingPos.y < 250) {
          topBranches.push(branch);
        } else {
          sideQuests.push(branch);
        }
      });
      
      // Layout top branches
      topBranches.sort((a, b) => a.branch_path_index - b.branch_path_index).forEach((branch, branchIndex) => {
        // Skip if already manually positioned
        if (!manuallyPositionedNodes.current.has(branch.id)) {
          const existingPos = positions.get(branch.id);
          const topY = existingPos && existingPos.y < 250 ? existingPos.y : 150 + branchIndex * 200;
          positions.set(branch.id, {
            x: startX + index * horizontalSpacing,
            y: topY,
          });
        }
      });
      
      // Layout side quests
      sideQuests.sort((a, b) => a.branch_path_index - b.branch_path_index).forEach((branch, branchIndex) => {
        // Skip if already manually positioned
        if (!manuallyPositionedNodes.current.has(branch.id)) {
          const existingPos = positions.get(branch.id);
          if (existingPos && existingPos.y >= 250) {
            positions.set(branch.id, existingPos);
          } else {
            positions.set(branch.id, {
              x: startX + index * horizontalSpacing + 280,
              y: mainTimelineY + 180 + branchIndex * 200,
            });
          }
        }
      });
    });

    // Layout main timeline branches (positioned at the top of their source)
    branchEntries.forEach((branchEntry) => {
      // Skip if already manually positioned
      if (!manuallyPositionedNodes.current.has(branchEntry.id)) {
        const sourceId = mainTimelineBranches.get(branchEntry.id);
        if (sourceId) {
          const sourcePos = positions.get(sourceId);
          if (sourcePos) {
            // Position branch at the top, aligned with source horizontally
            const branchesFromSource = branchEntries.filter(e => mainTimelineBranches.get(e.id) === sourceId);
            const branchIndex = branchesFromSource.indexOf(branchEntry);
            const topY = 50; // Much higher at the top
            const stackedY = topY + branchIndex * 200; // Stack multiple branches
            positions.set(branchEntry.id, {
              x: sourcePos.x, // Aligned horizontally with source
              y: stackedY,
            });
          } else {
            // Fallback: position in main timeline if source not found
            const index = mainPath.indexOf(branchEntry);
            positions.set(branchEntry.id, {
              x: startX + index * horizontalSpacing,
              y: mainTimelineY,
            });
          }
        } else {
          // Fallback: position in main timeline
          const index = mainPath.indexOf(branchEntry);
          positions.set(branchEntry.id, {
            x: startX + index * horizontalSpacing,
            y: mainTimelineY,
          });
        }
      }
    });

    // Create nodes
    entries.forEach(entry => {
      // Prioritize manually positioned nodes, then calculated positions
      const manualPos = manuallyPositionedNodes.current.get(entry.id);
      const calculatedPos = positions.get(entry.id);
      const pos = manualPos || calculatedPos || { x: 0, y: 0 };
      const parentEntry = entry.parent_entry_id ? entries.find(e => e.id === entry.parent_entry_id) : null;
      const isSideQuest = entry.parent_entry_id && parentEntry && !parentEntry.parent_entry_id;
      
      // Check if there's already a next node in the main timeline
      const hasNextNode = !entry.parent_entry_id && mainPath.some((mainEntry, index) => {
        if (mainEntry.id === entry.id && index < mainPath.length - 1) {
          return true; // There's a next node in the main timeline
        }
        return false;
      });
      
      const node: Node = {
        id: entry.id,
        type: 'timelineEntry',
        position: pos,
        data: {
          entry,
          isSelected: selectedEntryId === entry.id,
          isHovered: false, // Hover state updated directly on nodes, not via useMemo
          isDm,
          isSideQuest,
          hasNextNode, // Pass this to the node component
          onEdit: onEntryEdit,
          onDelete: onEntryDelete,
          onCreateNext: (entryId: string) => {
            const entry = entries.find(e => e.id === entryId);
            const pos = positions.get(entryId);
            if (entry && pos && onEntryCreate) {
              onEntryCreate(pos.x + 450, pos.y, entryId, 'next');
            }
          },
          onCreateSideQuest: (entryId: string) => {
            const entry = entries.find(e => e.id === entryId);
            const pos = positions.get(entryId);
            if (entry && pos && onEntryCreate) {
              const sideQuests = entries.filter(e => e.parent_entry_id === entryId);
              onEntryCreate(pos.x + 280, pos.y + 180 + sideQuests.length * 200, entryId, 'side');
            }
          },
          onCreateMainBranch: (entryId: string) => {
            const entry = entries.find(e => e.id === entryId);
            const pos = positions.get(entryId);
            if (entry && pos && onEntryCreate) {
              // Create a new main timeline entry at the top of the source node
              const topY = 50; // Much higher at the top
              // Count existing main timeline branches from this source to stack them
              const existingBranches = entries.filter(
                e => mainTimelineBranches.get(e.id) === entryId
              );
              const stackedY = topY + existingBranches.length * 200;
              // Aligned horizontally with source
              onEntryCreate(pos.x, stackedY, entryId, 'main');
            }
          },
        },
        draggable: isDm, // Allow dragging only for DMs
        // Configure connection handles
        sourcePosition: 'right',
        targetPosition: 'left',
      };
      
      nodeMap.set(entry.id, node);
    });

    // Create edges for parent-child relationships (branches)
    entries
      .filter(entry => entry.parent_entry_id)
      .forEach(entry => {
        const fromEntry = entries.find(e => e.id === entry.parent_entry_id);
        if (!fromEntry) return;

        const fromPos = positions.get(fromEntry.id);
        const toPos = positions.get(entry.id);
        if (!fromPos || !toPos) return;

        const isSideQuest = fromEntry.parent_entry_id === null && entry.parent_entry_id === fromEntry.id;
        const isTopBranch = entry.parent_entry_id === fromEntry.id && toPos.y < mainTimelineY - 100;

        let edgeStyle: any = {};
        let edgeType = 'default';

        if (isTopBranch) {
          // Top branch - use smoothstep for vertical connections
          edgeType = 'smoothstep';
          edgeStyle = {
            stroke: 'rgb(236, 217, 198)', // chart-5 (orange/tan)
            strokeWidth: 2,
            strokeDasharray: '5,5',
          };
        } else if (isSideQuest) {
          // Side quest - use step edge for L-shaped
          edgeType = 'step';
          edgeStyle = {
            stroke: 'rgb(132, 118, 98)', // accent
            strokeWidth: 2,
            strokeDasharray: '5,5',
          };
        } else {
          // Other branch connections
          edgeType = 'default';
          edgeStyle = {
            stroke: 'rgb(179, 166, 152)', // muted-foreground
            strokeWidth: 2,
            strokeDasharray: '5,5',
          };
        }

        const edge: Edge = {
          id: `edge-${fromEntry.id}-${entry.id}`,
          source: fromEntry.id,
          target: entry.id,
          type: edgeType,
          style: edgeStyle,
          animated: true,
          sourceHandle: isTopBranch ? 'top' : isSideQuest ? 'bottom' : 'right',
          targetHandle: isTopBranch ? 'bottom-target' : 'left',
          markerEnd: {
            type: 'arrowclosed',
            color: edgeStyle.stroke,
            width: 20,
            height: 20,
          },
        };

        edgeList.push(edge);
      });

    // Connect main timeline nodes sequentially (excluding branches)
    regularMainPath.forEach((entry, index) => {
      if (index < regularMainPath.length - 1) {
        const nextEntry = regularMainPath[index + 1];
        const fromPos = positions.get(entry.id);
        const toPos = positions.get(nextEntry.id);
        
        if (fromPos && toPos) {
          const edge: Edge = {
            id: `edge-main-${entry.id}-${nextEntry.id}`,
            source: entry.id,
            target: nextEntry.id,
            type: 'default',
            style: {
              stroke: 'rgb(179, 166, 152)', // muted-foreground
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            animated: true,
            sourceHandle: 'right',
            targetHandle: 'left',
            markerEnd: {
              type: 'arrowclosed',
              color: 'rgb(179, 166, 152)',
              width: 20,
              height: 20,
            },
          };
          
          edgeList.push(edge);
        }
      }
    });

    // Create edges for main timeline branches (branches that are main timeline entries)
    // Group branches by source to connect them sequentially
    const branchesBySource = new Map<string, string[]>();
    mainTimelineBranches.forEach((sourceId, branchId) => {
      if (!branchesBySource.has(sourceId)) {
        branchesBySource.set(sourceId, []);
      }
      branchesBySource.get(sourceId)!.push(branchId);
    });

    branchesBySource.forEach((branchIds, sourceId) => {
      // Sort branches by order_index to connect them in sequence
      const sortedBranches = branchIds
        .map(id => entries.find(e => e.id === id))
        .filter((e): e is CampaignTimeline => e !== undefined)
        .sort((a, b) => a.order_index - b.order_index);

      // Create edge from source to first branch (from top handle)
      if (sortedBranches.length > 0) {
        const firstBranch = sortedBranches[0];
        const fromPos = positions.get(sourceId);
        const toPos = positions.get(firstBranch.id);
        
        if (fromPos && toPos) {
          const edge: Edge = {
            id: `edge-branch-${sourceId}-${firstBranch.id}`,
            source: sourceId,
            target: firstBranch.id,
            type: 'smoothstep',
            style: {
              stroke: 'rgb(236, 217, 198)', // chart-5 (orange/tan) for branches
              strokeWidth: 2,
              strokeDasharray: '5,5',
            },
            animated: true,
            sourceHandle: 'top', // Line comes out from top
            targetHandle: 'bottom-target', // Connects to bottom of branch
            markerEnd: {
              type: 'arrowclosed',
              color: 'rgb(236, 217, 198)',
              width: 20,
              height: 20,
            },
          };
          
          edgeList.push(edge);
        }
      }

      // Connect branches sequentially (vertical stacking)
      sortedBranches.forEach((branch, index) => {
        if (index < sortedBranches.length - 1) {
          const nextBranch = sortedBranches[index + 1];
          const fromPos = positions.get(branch.id);
          const toPos = positions.get(nextBranch.id);
          
          if (fromPos && toPos) {
            const edge: Edge = {
              id: `edge-branch-seq-${branch.id}-${nextBranch.id}`,
              source: branch.id,
              target: nextBranch.id,
              type: 'default',
              style: {
                stroke: 'rgb(236, 217, 198)', // chart-5 (orange/tan) for branches
                strokeWidth: 2,
                strokeDasharray: '5,5',
              },
              animated: true,
              sourceHandle: 'bottom', // From bottom of upper branch
              targetHandle: 'top', // To top of lower branch
              markerEnd: {
                type: 'arrowclosed',
                color: 'rgb(236, 217, 198)',
                width: 20,
                height: 20,
              },
            };
            
            edgeList.push(edge);
          }
        }
      });
    });

    // Clean up pending positions
    if (Object.keys(pendingPositions).length === 0) {
      delete (window as any).__pendingTimelinePositions;
    } else {
      (window as any).__pendingTimelinePositions = pendingPositions;
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    };
  }, [entries, height, selectedEntryId, isDm, onEntryCreate, onEntryEdit, onEntryDelete, mainTimelineBranches]);

  const [reactFlowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [reactFlowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes and edges when they change
  // But preserve positions of nodes that are being dragged and avoid unnecessary updates
  useEffect(() => {
    setNodes((currentNodes) => {
      // Quick check: if lengths match and all IDs match, do a deeper comparison
      if (currentNodes.length === nodes.length) {
        const idsMatch = currentNodes.every((cn, i) => cn.id === nodes[i]?.id);
        if (idsMatch) {
          // Check if any significant changes occurred (excluding hover and drag state)
          const hasSignificantChanges = currentNodes.some((currentNode, index) => {
            const newNode = nodes[index];
            if (!newNode) return true;
            
            // Skip if dragging (preserve current state)
            if (currentNode.dragging) return false;
            
            // Check if selection changed
            if (currentNode.data?.isSelected !== newNode.data?.isSelected) return true;
            
            // Check if entry data changed (by comparing entry ID)
            if (currentNode.data?.entry?.id !== newNode.data?.entry?.id) return true;
            
            // Check if position changed significantly (more than 1px)
            const posChanged = 
              Math.abs((currentNode.position?.x || 0) - (newNode.position?.x || 0)) > 1 ||
              Math.abs((currentNode.position?.y || 0) - (newNode.position?.y || 0)) > 1;
            
            return posChanged;
          });
          
          // No significant changes, preserve current nodes (including hover state)
          if (!hasSignificantChanges) {
            return currentNodes;
          }
        }
      }
      
      // Update needed - preserve dragging nodes and hover state
      return nodes.map((node) => {
        const currentNode = currentNodes.find(n => n.id === node.id);
        // If node is currently being dragged, keep its current position and state
        if (currentNode && currentNode.dragging) {
          return currentNode;
        }
        // Preserve hover state if it exists
        if (currentNode?.data?.isHovered) {
          return {
            ...node,
            data: {
              ...node.data,
              isHovered: true,
            }
          };
        }
        // Otherwise use the calculated position
        return node;
      });
    });
    
    // Only update edges if they actually changed (compare by ID)
    setEdges((currentEdges) => {
      if (currentEdges.length === edges.length) {
        const edgesMatch = currentEdges.every((ce, i) => ce.id === edges[i]?.id);
        if (edgesMatch) {
          return currentEdges; // No change
        }
      }
      return edges;
    });
  }, [nodes, edges, setNodes, setEdges]);

  // Track last clicked node for double-click detection
  const lastClickedNodeRef = useRef<string | null>(null);

  // Handle node click with double-click detection
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    const clickPos = { 
      x: (event as any).clientX || (event as any).pointerType ? (event as any).clientX : 0, 
      y: (event as any).clientY || (event as any).pointerType ? (event as any).clientY : 0 
    };
    
    // Check if this is a double-click (within 300ms and same node)
    const isDoubleClick = timeSinceLastClick < 300 && 
      lastClickedNodeRef.current === node.id &&
      lastClickPositionRef.current &&
      Math.abs(clickPos.x - (lastClickPositionRef.current.x || 0)) < 10 &&
      Math.abs(clickPos.y - (lastClickPositionRef.current.y || 0)) < 10;
    
    if (isDoubleClick) {
      // Double click - open edit
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      // Clear selection first, then open edit
      onEntrySelect?.(null);
      onEntryEdit?.(node.id);
      lastClickTimeRef.current = 0;
      lastClickPositionRef.current = null;
      lastClickedNodeRef.current = null;
    } else {
      // Single click - select immediately (buttons show right away)
      onEntrySelect?.(node.id);
      
      // Store click info for potential double-click detection
      lastClickTimeRef.current = now;
      lastClickPositionRef.current = clickPos;
      lastClickedNodeRef.current = node.id;
      
      // Clear any existing timeout
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      
      // Set timeout to clear double-click tracking (no action needed, just cleanup)
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        lastClickTimeRef.current = 0;
        lastClickPositionRef.current = null;
        lastClickedNodeRef.current = null;
      }, 300);
    }
  }, [onEntrySelect, onEntryEdit]);

  // Handle pane click (deselect) with double-click detection for creating entries
  const handlePaneClick = useCallback((event: React.MouseEvent<Element, MouseEvent>) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    const clickPos = { x: (event as any).clientX || 0, y: (event as any).clientY || 0 };
    
    // Check if this is a double-click on the pane (within 300ms and similar position)
    const isDoubleClick = timeSinceLastClick < 300 && 
      lastClickPositionRef.current &&
      Math.abs(clickPos.x - lastClickPositionRef.current.x) < 10 &&
      Math.abs(clickPos.y - lastClickPositionRef.current.y) < 10;
    
    if (isDoubleClick && isDm && onEntryCreate) {
      // Double click - create entry
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      
      const position = reactFlowInstance.screenToFlowPosition({
        x: clickPos.x || 0,
        y: clickPos.y || 0,
      });
      
      onEntryCreate(position.x, position.y);
      lastClickTimeRef.current = 0;
      lastClickPositionRef.current = null;
    } else {
      // Single click - deselect after delay
      lastClickTimeRef.current = now;
      lastClickPositionRef.current = clickPos;
      
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      
      clickTimeoutRef.current = setTimeout(() => {
        onEntrySelect?.(null);
        clickTimeoutRef.current = null;
        lastClickTimeRef.current = 0;
        lastClickPositionRef.current = null;
      }, 300);
    }
  }, [onEntrySelect, isDm, onEntryCreate, reactFlowInstance]);

  // Handle node mouse enter/leave - update hover state directly on nodes
  const onNodeMouseEnter: NodeMouseHandler = useCallback((event, node) => {
    // Update hover state directly without triggering full recalculation
    setNodes((currentNodes) => {
      return currentNodes.map(n => {
        if (n.id === node.id && n.data) {
          return {
            ...n,
            data: {
              ...n.data,
              isHovered: true,
            }
          };
        }
        return n;
      });
    });
  }, [setNodes]);

  const onNodeMouseLeave: NodeMouseHandler = useCallback(() => {
    // Clear hover state
    setNodes((currentNodes) => {
      return currentNodes.map(n => {
        if (n.data?.isHovered) {
          return {
            ...n,
            data: {
              ...n.data,
              isHovered: false,
            }
          };
        }
        return n;
      });
    });
  }, [setNodes]);

  // Handle node drag - store position to prevent jitter
  const onNodeDrag: NodeDragHandler = useCallback((event, node) => {
    if (node.position) {
      // Store the dragged position immediately to prevent jitter
      manuallyPositionedNodes.current.set(node.id, {
        x: node.position.x,
        y: node.position.y,
      });
    }
  }, []);

  // Handle node drag stop - save the new position
  const onNodeDragStop: NodeDragHandler = useCallback((event, node) => {
    if (onEntryMove && node.position) {
      // Store the final position
      manuallyPositionedNodes.current.set(node.id, {
        x: node.position.x,
        y: node.position.y,
      });
      // Save to backend
      onEntryMove(node.id, node.position.x, node.position.y);
    }
  }, [onEntryMove]);

  // Handle canvas right-click for creating entries
  const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
    if (!isDm || !onEntryCreate) return;
    
    event.preventDefault();
    
    // Clear any pending single-click timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    
    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    onEntryCreate(position.x, position.y);
  }, [isDm, onEntryCreate, reactFlowInstance]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Container ref for native double-click handling
  const containerRef = useRef<HTMLDivElement>(null);

  // Add native double-click listener for pane
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isDm || !onEntryCreate) return;

    const handleDoubleClick = (event: MouseEvent) => {
      // Only handle if clicking on the pane (not on a node)
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__node')) {
        return; // Node double-click is handled separately
      }

      const reactFlowBounds = container.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      onEntryCreate(position.x, position.y);
    };

    container.addEventListener('dblclick', handleDoubleClick);
    return () => {
      container.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [isDm, onEntryCreate, reactFlowInstance]);

  // Add global styles for node overflow
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .react-flow__node {
        overflow: visible !important;
      }
      .react-flow__node-timelineEntry {
        overflow: visible !important;
      }
      .react-flow__node-timelineEntry > div {
        overflow: visible !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div ref={containerRef} className={cn("w-full h-full", className)}>
      <ReactFlow
        nodes={reactFlowNodes}
        edges={reactFlowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={handlePaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        fitView={false}
        minZoom={0.2}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        style={{
          background: 'rgb(35, 29, 26)', // Use theme background color
        }}
        nodesDraggable={isDm}
        nodesConnectable={true}
        edgesFocusable={false}
        edgesUpdatable={false}
        connectionLineStyle={{ stroke: 'rgb(201, 184, 130)', strokeWidth: 2 }}
        connectionLineType="smoothstep"
        connectionMode={ConnectionMode.Loose}
        onConnect={(params) => {
          if (onEntryConnect && params.source && params.target) {
            onEntryConnect(params.source, params.target);
          }
        }}
        nodeExtent={undefined}
        proOptions={{ hideAttribution: true }}
        className="[&_.react-flow__node]:overflow-visible"
      >
        {/* Custom D&D themed background */}
        <Background 
          variant={BackgroundVariant.Lines}
          gap={100}
          size={1}
          color="rgba(70, 64, 57, 0.15)"
          lineWidth={0.5}
        />
        {/* Additional decorative grid overlay */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <defs>
            {/* Subtle texture pattern */}
            <pattern
              id="parchment-texture"
              x="0"
              y="0"
              width="200"
              height="200"
              patternUnits="userSpaceOnUse"
            >
              <rect width="200" height="200" fill="rgb(35, 29, 26)" />
              <circle cx="50" cy="50" r="0.5" fill="rgba(70, 64, 57, 0.1)" />
              <circle cx="150" cy="50" r="0.5" fill="rgba(70, 64, 57, 0.1)" />
              <circle cx="50" cy="150" r="0.5" fill="rgba(70, 64, 57, 0.1)" />
              <circle cx="150" cy="150" r="0.5" fill="rgba(70, 64, 57, 0.1)" />
              <circle cx="100" cy="100" r="0.3" fill="rgba(70, 64, 57, 0.08)" />
            </pattern>
            {/* Aged paper gradient overlay */}
            <linearGradient id="aged-overlay" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(70, 64, 57, 0.03)" />
              <stop offset="50%" stopColor="rgba(92, 74, 61, 0.05)" />
              <stop offset="100%" stopColor="rgba(70, 64, 57, 0.03)" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#parchment-texture)" />
          <rect width="100%" height="100%" fill="url(#aged-overlay)" />
        </svg>
        <Controls 
          showInteractive={false}
          style={{
            button: {
              backgroundColor: 'rgb(35, 29, 26)',
              borderColor: 'rgb(70, 64, 57)',
              color: 'rgb(236, 217, 198)',
            },
          }}
        />
      </ReactFlow>
    </div>
  );
}

// Main component with ReactFlowProvider
export function TimelineCanvas({
  width = 1200,
  height = 800,
  entries,
  mainTimelineBranches = new Map(),
  onEntrySelect,
  onEntryCreate,
  onEntryConnect,
  onEntryMove,
  onEntryDelete,
  onEntryEdit,
  selectedEntryId = null,
  isDm = true,
  className,
}: TimelineCanvasProps) {
  return (
    <div
      className={cn(
        "relative w-full h-full bg-background overflow-hidden rounded-lg border border-border",
        className
      )}
      style={{ width, height }}
    >
      <ReactFlowProvider>
        <TimelineCanvasInner
          width={width}
          height={height}
          entries={entries}
          mainTimelineBranches={mainTimelineBranches}
          onEntrySelect={onEntrySelect}
          onEntryCreate={onEntryCreate}
          onEntryConnect={onEntryConnect}
          onEntryMove={onEntryMove}
          onEntryDelete={onEntryDelete}
          onEntryEdit={onEntryEdit}
          selectedEntryId={selectedEntryId}
          isDm={isDm}
          className={className}
        />
      </ReactFlowProvider>
    </div>
  );
}

