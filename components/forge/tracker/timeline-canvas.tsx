"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Group, Rect, Line, Text, Circle, Path, Image as KonvaImage } from "react-konva";
import { cn } from "@/lib/utils";
import Konva from "konva";
import { CampaignTimeline } from "@/hooks/useForgeContent";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight, ArrowDown, ArrowUp } from "lucide-react";

interface TimelineCanvasProps {
  width?: number;
  height?: number;
  entries: CampaignTimeline[];
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
  not_started: "rgb(84, 84, 69)", // Secondary
  ongoing: "rgb(201, 184, 130)", // Primary
  finished: "rgb(133, 173, 133)", // Chart-2 (green)
  abandoned: "rgb(228, 124, 103)", // Destructive
};

const statusMarkerColors: Record<CampaignTimeline['status'], string> = {
  not_started: "rgb(201, 184, 130)", // Primary (gold)
  ongoing: "rgb(148, 166, 184)", // Chart-4 (blue)
  finished: "rgb(236, 217, 198)", // Chart-5 (orange)
  abandoned: "rgb(228, 124, 103)", // Destructive (red)
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

export function TimelineCanvas({
  width = 1200,
  height = 800,
  entries,
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
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [entryPositions, setEntryPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);

  // Auto-layout: Main timeline horizontally, branches below
  useEffect(() => {
    if (entries.length === 0) return;

    const positions = new Map<string, { x: number; y: number }>();
    
    // Check for pending positions from newly created entries
    const pendingPositions = (window as any).__pendingTimelinePositions || {};
    
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
    const horizontalSpacing = 450; // Increased from 300 for more spacing between cards
    const startX = 200;

    mainPath.forEach((entry, index) => {
      positions.set(entry.id, {
        x: startX + index * horizontalSpacing,
        y: mainTimelineY,
      });

      // Separate top branches and side quests
      const allBranches = branchesByParent.get(entry.id) || [];
      
      // Find top branches and side quests
      // Top branches are identified by checking if their current position is at the top (y < 200)
      // or if they should be placed at the top based on their creation context
      const topBranches: CampaignTimeline[] = [];
      const sideQuests: CampaignTimeline[] = [];
      
      allBranches.forEach(branch => {
        const existingPos = entryPositions.get(branch.id);
        const pendingPos = pendingPositions[branch.id];
        
        // Check if this is a pending top branch (from handleCreateMainBranch)
        if (pendingPos && pendingPos.isTopBranch) {
          topBranches.push(branch);
          // Set the position from pending
          positions.set(branch.id, { x: pendingPos.x, y: pendingPos.y });
          // Clear pending position
          delete pendingPositions[branch.id];
        }
        // Top branches should be at y < 250 (top area of canvas)
        else if (existingPos && existingPos.y < 250) {
          topBranches.push(branch);
        } else {
          // For entries without position or with position >= 250, treat as side quest
          sideQuests.push(branch);
        }
      });
      
      // Layout top branches at the top
      topBranches.sort((a, b) => a.branch_path_index - b.branch_path_index).forEach((branch, branchIndex) => {
        const existingPos = entryPositions.get(branch.id);
        // Preserve existing y position if it's already at the top, otherwise stack
        const topY = existingPos && existingPos.y < 250 ? existingPos.y : 150 + branchIndex * 200;
        positions.set(branch.id, {
          x: startX + index * horizontalSpacing,
          y: topY, // Stack at top, but preserve if already positioned
        });
      });
      
      // Layout side quests below this entry, offset to the right
      sideQuests.sort((a, b) => a.branch_path_index - b.branch_path_index).forEach((branch, branchIndex) => {
        const existingPos = entryPositions.get(branch.id);
        // Preserve existing position if it's not in the top area
        if (existingPos && existingPos.y >= 250) {
          positions.set(branch.id, existingPos);
        } else {
          positions.set(branch.id, {
            x: startX + index * horizontalSpacing + 280, // Offset further to the right (increased from 220)
            y: mainTimelineY + 180 + branchIndex * 200, // Stack below
          });
        }
      });
    });

    // Update positions, preserving existing ones that are manually set (especially top branches)
    setEntryPositions(prev => {
      const newPositions = new Map(prev);
      positions.forEach((pos, id) => {
        // If entry already has a position in the top area (y < 250), preserve it
        const existingPos = prev.get(id);
        if (existingPos && existingPos.y < 250) {
          // Keep the existing top position
          newPositions.set(id, existingPos);
        } else if (!newPositions.has(id)) {
          // Set new position for entries without one
          newPositions.set(id, pos);
        } else if (existingPos && existingPos.y >= 250) {
          // Preserve existing position if it's not in top area (might be manually positioned)
          newPositions.set(id, existingPos);
        } else {
          // Update with calculated position
          newPositions.set(id, pos);
        }
      });
      return newPositions;
    });
    
    // Clean up pending positions after processing
    if (Object.keys(pendingPositions).length === 0) {
      delete (window as any).__pendingTimelinePositions;
    } else {
      (window as any).__pendingTimelinePositions = pendingPositions;
    }
  }, [entries, height]); // Removed entryPositions to prevent infinite loop

  // Cleanup click timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [clickTimeout]);

  // Handle keyboard shortcuts (for clearing click timeout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        setClickTimeout(null);
        setLastClickedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clickTimeout]);

  // Pan handlers
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    // Check what was clicked
    const clickedOnEmpty = e.target === stage || e.target.name() === 'background' || e.target.name() === 'grid';
    const clickedOnEntry = e.target.getParent()?.name() === 'entry' || e.target.name() === 'entry';
    const clickedOnButton = e.target.getParent()?.name() === 'action-button' || e.target.getParent()?.name() === 'card-buttons';
    const clickedOnCardButton = e.target.getParent()?.name() === 'card-buttons';

    // Right click or middle click for panning
    if (e.evt.button === 1 || e.evt.button === 2) {
      setIsPanning(true);
      const pos = stage.getPointerPosition();
      if (pos) {
        setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
      }
      e.evt.preventDefault();
      return;
    }

    // Left click on empty space - start panning
    if (e.evt.button === 0 && clickedOnEmpty && !clickedOnEntry && !clickedOnButton && !clickedOnCardButton) {
      setIsPanning(true);
      const pos = stage.getPointerPosition();
      if (pos) {
        setPanStart({ x: pos.x - pan.x, y: pos.y - pan.y });
      }
      // Deselect when starting to pan
      onEntrySelect?.(null);
      e.evt.preventDefault();
      return;
    }

    // Left click on entry or button - don't pan, let those handle their clicks
    if (e.evt.button === 0) {
      // Deselect if clicking on empty space (but not panning)
      if (clickedOnEmpty && !clickedOnEntry && !clickedOnButton && !clickedOnCardButton) {
        onEntrySelect?.(null);
      }
    }
  }, [pan, onEntrySelect]);

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (isPanning) {
      const pos = stage.getPointerPosition();
      if (pos) {
        setPan({
          x: pos.x - panStart.x,
          y: pos.y - panStart.y,
        });
      }
    }
  }, [isPanning, panStart]);

  const handleStageMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;

    const scaleBy = 1.1;
    
    setZoom(prevZoom => {
      const oldZoom = prevZoom;
      let newZoom = prevZoom;
      
      if (e.evt.deltaY < 0) {
        newZoom = Math.min(prevZoom * scaleBy, 2);
      } else {
        newZoom = Math.max(prevZoom / scaleBy, 0.5);
      }

      if (newZoom !== oldZoom) {
        setPan(prevPan => {
          const mousePointTo = {
            x: (pointerPos.x - prevPan.x) / oldZoom,
            y: (pointerPos.y - prevPan.y) / oldZoom,
          };

          return {
            x: pointerPos.x - mousePointTo.x * newZoom,
            y: pointerPos.y - mousePointTo.y * newZoom,
          };
        });
      }
      
      return newZoom;
    });
  }, []);

  // Handle entry click
  const handleEntryClick = useCallback((entryId: string) => {
    // Handle single vs double click
    if (lastClickedId === entryId && clickTimeout) {
      // Double click - open edit
      clearTimeout(clickTimeout);
      setClickTimeout(null);
      onEntrySelect?.(entryId);
    } else {
      // Potential single click - wait
      setLastClickedId(entryId);
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      const timeout = setTimeout(() => {
        onEntrySelect?.(entryId);
        setClickTimeout(null);
        setLastClickedId(null);
      }, 300);
      setClickTimeout(timeout);
    }
  }, [lastClickedId, clickTimeout, onEntrySelect]);

  // Handle action button clicks
  const handleCreateNext = useCallback((entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    const pos = entryPositions.get(entryId);
    if (entry && pos && onEntryCreate) {
      onEntryCreate(pos.x + 450, pos.y, entryId, 'next'); // Match horizontalSpacing
    }
  }, [entries, entryPositions, onEntryCreate]);

  const handleCreateSideQuest = useCallback((entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    const pos = entryPositions.get(entryId);
    if (entry && pos && onEntryCreate) {
      const sideQuests = entries.filter(e => e.parent_entry_id === entryId);
      // Offset further to the right (increased from 220 to 280 to match layout)
      onEntryCreate(pos.x + 280, pos.y + 180 + sideQuests.length * 200, entryId, 'side');
    }
  }, [entries, entryPositions, onEntryCreate]);

  const handleCreateMainBranch = useCallback((entryId: string) => {
    const entry = entries.find(e => e.id === entryId);
    const pos = entryPositions.get(entryId);
    const mainTimelineY = height / 2;
    const topBranchY = 150; // Far at the top
    
    if (entry && pos && onEntryCreate) {
      // Count existing top branches to stack them
      const existingTopBranches = entries.filter(
        e => e.parent_entry_id === entryId && entryPositions.get(e.id)?.y < 250
      );
      const stackedY = topBranchY + existingTopBranches.length * 200;
      
      // Create at top, aligned with parent horizontally
      onEntryCreate(pos.x, stackedY, entryId, 'main');
      
      // Immediately set the position so auto-layout preserves it
      // This prevents the auto-layout from placing it as a side quest
      setEntryPositions(prev => {
        const newPositions = new Map(prev);
        // We'll set the position after the entry is created
        // For now, we'll rely on the auto-layout checking branchType
        return newPositions;
      });
    }
  }, [entries, entryPositions, height, onEntryCreate]);

  // Calculate connection points
  const getConnectionPoints = useCallback((fromEntry: CampaignTimeline, toEntry: CampaignTimeline) => {
    const fromPos = entryPositions.get(fromEntry.id) || { x: 0, y: 0 };
    const toPos = entryPositions.get(toEntry.id) || { x: 0, y: 0 };
    
        const cardWidth = 200;
        const cardHeight = 120;
    
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Connect from right side of source to left side of target
    const fromX = fromPos.x * zoom + pan.x + cardWidth / 2;
    const fromY = fromPos.y * zoom + pan.y;
    const toX = toPos.x * zoom + pan.x - cardWidth / 2;
    const toY = toPos.y * zoom + pan.y;
    
    return { fromX, fromY, toX, toY };
  }, [zoom, pan, entryPositions]);

  // Render connections
  const renderConnections = useMemo(() => {
    const mainTimelineY = height / 2;
    
    return entries
      .filter(entry => entry.parent_entry_id)
      .map(entry => {
        const fromEntry = entries.find(e => e.id === entry.parent_entry_id);
        if (!fromEntry) return null;

        const fromPos = entryPositions.get(fromEntry.id);
        const toPos = entryPositions.get(entry.id);
        if (!fromPos || !toPos) return null;

        const cardWidth = 160;
        const isMainPath = !fromEntry.parent_entry_id && !entry.parent_entry_id;
        const isSideQuest = fromEntry.parent_entry_id === null && entry.parent_entry_id === fromEntry.id;
        const isTopBranch = entry.parent_entry_id === fromEntry.id && toPos.y < mainTimelineY - 100; // Top branches

        // Top branch connections (vertical up)
        if (isTopBranch) {
          const fromX = fromPos.x * zoom + pan.x;
          const fromY = fromPos.y * zoom + pan.y - 60;
          const toX = toPos.x * zoom + pan.x;
          const toY = toPos.y * zoom + pan.y + 60;
          
          return (
            <Group key={`conn-${entry.id}`}>
              <Line
                points={[fromX, fromY, toX, toY]}
                stroke="rgb(236, 217, 198)" // chart-5 (orange/tan)
                strokeWidth={2}
                lineCap="round"
              />
            </Group>
          );
        }

        // Main timeline connections (horizontal)
        if (isMainPath || (!entry.parent_entry_id && !isSideQuest)) {
          const fromX = fromPos.x * zoom + pan.x + cardWidth / 2;
          const fromY = fromPos.y * zoom + pan.y;
          const toX = toPos.x * zoom + pan.x - cardWidth / 2;
          const toY = toPos.y * zoom + pan.y;
          
          return (
            <Line
              key={`conn-${entry.id}`}
              points={[fromX, fromY, toX, toY]}
              stroke="rgb(179, 166, 152)" // muted-foreground
              strokeWidth={2}
              lineCap="round"
            />
          );
        }

        // Side quest connections (L-shaped: right from bottom-right, then sharply down to bottom of child)
        if (isSideQuest) {
          const fromX = fromPos.x * zoom + pan.x;
          const fromY = fromPos.y * zoom + pan.y;
          const toX = toPos.x * zoom + pan.x;
          const toY = toPos.y * zoom + pan.y;
          
          // Calculate points: start from bottom-right of parent, go right, then sharply down to bottom of child
          const cardWidth = 160 * zoom;
          const cardHeight = 120 * zoom;
          const startX = fromX + cardWidth / 2; // Bottom-right of parent card
          const startY = fromY + cardHeight / 2; // Bottom of parent card
          const endX = toX; // Center horizontally of child card
          const endY = toY + cardHeight / 2 - 10; // Bottom of child card (connect to bottom, not top)
          
          // Create sharp L-shape: horizontal right, then vertical down
          // Horizontal segment: from bottom-right of parent, go right (corner is more to the left to account for cards being further right)
          const cornerX = startX + 40 * zoom; // Move right but less (corner is more left since cards are further right)
          const cornerY = startY; // Same Y level
          
          // Vertical segment: from corner, go straight down to bottom of child
          const pathData = `M ${startX} ${startY} L ${cornerX} ${cornerY} L ${cornerX} ${endY} L ${endX} ${endY}`;
          
          return (
            <Group key={`conn-${entry.id}`}>
              <Path
                data={pathData}
                stroke="rgb(132, 118, 98)" // accent
                strokeWidth={2}
                lineCap="round"
                lineJoin="round"
                tension={0}
                fill=""
              />
            </Group>
          );
        }

        return null;
      })
      .filter(Boolean);
  }, [entries, entryPositions, zoom, pan, height]);

  // Load placeholder image for cards (used when no image_url is set)
  const [placeholderImage, setPlaceholderImage] = useState<HTMLImageElement | null>(null);
  
  // Keep loaded images in state for proper updates
  const [loadedEntryImages, setLoadedEntryImages] = useState<Map<string, HTMLImageElement>>(new Map());
  
  useEffect(() => {
    // Create a placeholder image with a gradient pattern
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    
    // Create a canvas-based placeholder
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create gradient background - darker, more textured
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgb(35, 29, 26)');
      gradient.addColorStop(0.5, 'rgb(44, 36, 33)');
      gradient.addColorStop(1, 'rgb(35, 29, 26)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add subtle texture pattern
      ctx.fillStyle = 'rgba(70, 64, 57, 0.15)';
      for (let i = 0; i < 30; i++) {
        const x = (i * 11) % canvas.width;
        const y = (i * 8) % canvas.height;
        ctx.fillRect(x, y, 3, 3);
      }
    }
    
    img.onload = () => setPlaceholderImage(img);
    img.src = canvas.toDataURL();
  }, []);

  // Keep track of which images are currently loading to prevent duplicate loads
  const loadingImagesRef = useRef<Set<string>>(new Set());

  // Track image URLs to detect changes
  const imageUrlMapRef = useRef<Map<string, string>>(new Map());

  // Load entry images dynamically
  useEffect(() => {
    const entriesWithImages = entries.filter(e => e.image_url);
    const entryIdsWithImages = new Set(entriesWithImages.map(e => e.id));
    
    // Clean up images for entries that no longer have image_url first
    setLoadedEntryImages(prev => {
      let hasChanges = false;
      const updated = new Map(prev);
      
      // Remove entries that are no longer in the entries list or don't have image_url
      prev.forEach((_, entryId) => {
        const entry = entries.find(e => e.id === entryId);
        if (!entry || !entry.image_url || !entryIdsWithImages.has(entryId)) {
          updated.delete(entryId);
          loadingImagesRef.current.delete(entryId);
          imageUrlMapRef.current.delete(entryId);
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
    
    // Load images for entries that need them
    entriesWithImages.forEach(entry => {
      const currentUrl = imageUrlMapRef.current.get(entry.id);
      const newUrl = entry.image_url!;
      
      // Skip if already loaded with the same URL or currently loading
      setLoadedEntryImages(prev => {
        if (currentUrl === newUrl && prev.has(entry.id)) {
          return prev; // Already loaded with this URL
        }
        
        if (loadingImagesRef.current.has(entry.id)) {
          return prev; // Currently loading
        }

        // URL changed or needs loading - start loading
        if (currentUrl !== newUrl) {
          // Remove old image if URL changed
          const updated = new Map(prev);
          updated.delete(entry.id);
          prev = updated;
        }

        // Mark as loading and track URL
        loadingImagesRef.current.add(entry.id);
        imageUrlMapRef.current.set(entry.id, newUrl);

        const img = new window.Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          loadingImagesRef.current.delete(entry.id);
          setLoadedEntryImages(current => {
            // Verify this is still the current URL for this entry
            const entryInState = entries.find(e => e.id === entry.id);
            if (entryInState?.image_url === newUrl && !current.has(entry.id)) {
              const updated = new Map(current);
              updated.set(entry.id, img);
              return updated;
            }
            return current;
          });
        };
        img.onerror = () => {
          loadingImagesRef.current.delete(entry.id);
          imageUrlMapRef.current.delete(entry.id);
          setLoadedEntryImages(current => {
            if (current.has(entry.id)) {
              const updated = new Map(current);
              updated.delete(entry.id);
              return updated;
            }
            return current;
          });
        };
        img.src = newUrl;
        
        return prev; // Return state (possibly with old image removed)
      });
    });
  }, [entries]); // Only depend on entries

  // Render entry cards
  const renderEntries = useMemo(() => {
    return entries.map(entry => {
      const entryImage = entry.image_url ? loadedEntryImages.get(entry.id) : null;
      const pos = entryPositions.get(entry.id) || { x: 0, y: 0 };
      const x = pos.x * zoom + pan.x;
      const y = pos.y * zoom + pan.y;
      const isSelected = selectedEntryId === entry.id;
      const isHovered = hoveredEntryId === entry.id;
      
      // Scale card size with zoom
      const baseCardWidth = 200;
      const baseCardHeight = 120;
      const cardWidth = baseCardWidth * zoom;
      const cardHeight = baseCardHeight * zoom;
      const mainTimelineY = height / 2;
      const isTopBranch = entry.parent_entry_id && (pos.y < mainTimelineY - 100);
      // Side quest: has a parent and that parent is on the main timeline (has no parent itself)
      const parentEntry = entry.parent_entry_id ? entries.find(e => e.id === entry.parent_entry_id) : null;
      const isSideQuest = entry.parent_entry_id && parentEntry && !parentEntry.parent_entry_id;
      const markerColor = statusMarkerColors[entry.status];
      const iconText = getSessionIconText(entry.session_type);
      
      const displayDate = entry.actual_date 
        ? new Date(entry.actual_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : entry.planned_date
        ? new Date(entry.planned_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : null;

      return (
        <Group
          key={entry.id}
          id={entry.id}
          name="entry"
          x={x}
          y={y}
          onMouseEnter={() => setHoveredEntryId(entry.id)}
          onMouseLeave={() => setHoveredEntryId(null)}
          onClick={(e) => {
            // Check if click is on a button or button parent
            const target = e.target;
            const targetParent = target.getParent();
            const targetName = target.name();
            const parentName = targetParent?.name();
            
            const isButton = parentName === 'action-buttons' || 
                             parentName === 'card-buttons' ||
                             targetName === 'action-buttons' ||
                             targetName === 'card-buttons';
            
            // Only select if not clicking on buttons
            if (!isButton) {
              e.cancelBubble = true;
              onEntrySelect?.(entry.id);
            }
          }}
        >
          {/* Connection lines are rendered separately in renderConnections */}

          {/* Card clipping area - sharp edges */}
          <Group
            clipX={-cardWidth / 2}
            clipY={-cardHeight / 2}
            clipWidth={cardWidth}
            clipHeight={cardHeight}
          >
            {/* Background image - full coverage with sharp edges */}
            {entryImage ? (
              <KonvaImage
                image={entryImage}
                x={-cardWidth / 2}
                y={-cardHeight / 2}
                width={cardWidth}
                height={cardHeight}
                listening={false}
              />
            ) : placeholderImage ? (
              <KonvaImage
                image={placeholderImage}
                x={-cardWidth / 2}
                y={-cardHeight / 2}
                width={cardWidth}
                height={cardHeight}
                listening={false}
              />
            ) : (
              <Rect
                width={cardWidth}
                height={cardHeight}
                x={-cardWidth / 2}
                y={-cardHeight / 2}
                fill="rgb(35, 29, 26)" // card background - darker
                listening={false}
              />
            )}

            {/* Dark overlay on top of image */}
            <Rect
              width={cardWidth}
              height={cardHeight}
              x={-cardWidth / 2}
              y={-cardHeight / 2}
              fill="rgba(0, 0, 0, 0.4)" // Dark overlay on top of image
              listening={false}
            />

            {/* Gradient overlay for better text readability - darker at bottom */}
            <Rect
              width={cardWidth}
              height={cardHeight}
              x={-cardWidth / 2}
              y={-cardHeight / 2}
              fillLinearGradientStartPoint={{ x: -cardWidth / 2, y: -cardHeight / 2 }}
              fillLinearGradientEndPoint={{ x: -cardWidth / 2, y: cardHeight / 2 }}
              fillLinearGradientColorStops={[
                0, 'rgba(0, 0, 0, 0.1)',
                0.6, 'rgba(0, 0, 0, 0.2)',
                0.8, 'rgba(0, 0, 0, 0.4)',
                1, 'rgba(0, 0, 0, 0.6)' // Darker at bottom for text readability
              ]}
              listening={false}
            />
          </Group>

          {/* Card border - sharp edges */}
          <Rect
            width={cardWidth}
            height={cardHeight}
            x={-cardWidth / 2}
            y={-cardHeight / 2}
            fill="transparent"
            stroke={isSelected ? "rgb(201, 184, 130)" : "rgb(70, 64, 57)"} // primary when selected, border otherwise
            strokeWidth={(isSelected ? 2 : 1) * zoom}
            cornerRadius={0} // Sharp edges
            shadowColor={isSelected ? "rgb(201, 184, 130)" : "rgba(0, 0, 0, 0.5)"}
            shadowBlur={isSelected ? 12 * zoom : 4 * zoom}
            shadowOpacity={isSelected ? 0.6 : 0.3}
            listening={true}
          />

          {/* Status icon - top left with visibility */}
          <Group>
            {/* Status background circle for visibility */}
            <Circle
              x={-cardWidth / 2 + 16 * zoom}
              y={-cardHeight / 2 + 16 * zoom}
              radius={7 * zoom}
              fill="rgba(0, 0, 0, 0.6)" // Dark background for visibility
              listening={false}
            />
            {/* Status marker (colored circle) - top left */}
            <Circle
              x={-cardWidth / 2 + 16 * zoom}
              y={-cardHeight / 2 + 16 * zoom}
              radius={5 * zoom}
              fill={markerColor}
              shadowColor={markerColor}
              shadowBlur={6 * zoom}
              shadowOpacity={0.9}
              listening={false}
            />
          </Group>


          {/* Session name - bottom left with depth effect */}
          <Group>
            {/* Text shadow layer 1 - deepest */}
            <Text
              text={entry.title}
              x={-cardWidth / 2 + 10 * zoom}
              y={cardHeight / 2 - 22 * zoom}
              fontSize={13 * zoom}
              fontStyle="bold"
              fill="rgba(0, 0, 0, 0.9)"
              offsetX={0}
              offsetY={0}
              listening={false}
              ellipsis={true}
              width={cardWidth - 50 * zoom}
            />
            {/* Text shadow layer 2 - medium */}
            <Text
              text={entry.title}
              x={-cardWidth / 2 + 10 * zoom}
              y={cardHeight / 2 - 21 * zoom}
              fontSize={13 * zoom}
              fontStyle="bold"
              fill="rgba(0, 0, 0, 0.7)"
              offsetX={0}
              offsetY={0}
              listening={false}
              ellipsis={true}
              width={cardWidth - 50 * zoom}
            />
            {/* Text outline for depth */}
            <Text
              text={entry.title}
              x={-cardWidth / 2 + 10 * zoom}
              y={cardHeight / 2 - 20 * zoom}
              fontSize={13 * zoom}
              fontStyle="bold"
              fill="transparent"
              stroke="rgba(0, 0, 0, 0.8)"
              strokeWidth={3 * zoom}
              offsetX={0}
              offsetY={0}
              listening={false}
              ellipsis={true}
              width={cardWidth - 50 * zoom}
            />
            {/* Main text - white with strong shadow for depth */}
            <Text
              text={entry.title}
              x={-cardWidth / 2 + 10 * zoom}
              y={cardHeight / 2 - 20 * zoom}
              fontSize={13 * zoom}
              fontStyle="bold"
              fill="rgb(255, 255, 255)" // White text
              shadowColor="rgba(0, 0, 0, 0.9)"
              shadowBlur={6 * zoom}
              shadowOffset={{ x: 1.5 * zoom, y: 1.5 * zoom }}
              offsetX={0}
              offsetY={0}
              listening={false}
              ellipsis={true}
              width={cardWidth - 50 * zoom}
            />
          </Group>

          {/* Action buttons (shown on hover/select) - Outside card */}
          {isDm && (isHovered || isSelected) && (
            <Group name="action-buttons">
              {/* Next button (right) - Primary/Gold - Only show for main timeline entries, not side quests */}
              {!isSideQuest && (
                <Group
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleCreateNext(entry.id);
                  }}
                  onMouseDown={(e) => {
                    e.cancelBubble = true;
                  }}
                >
                  <Circle
                    x={cardWidth / 2 + 24 * zoom}
                    y={-cardHeight / 2 + 20 * zoom + 36 * zoom}
                    radius={14 * zoom}
                    fill="rgb(201, 184, 130)" // primary (gold)
                    shadowBlur={6 * zoom}
                    shadowOpacity={0.3}
                  />
                  <Text
                    text="→"
                    x={cardWidth / 2 + 24 * zoom}
                    y={-cardHeight / 2 + 20 * zoom + 36 * zoom}
                    fontSize={16 * zoom}
                    fill="rgb(23, 19, 17)" // primary-foreground (dark text)
                    align="center"
                    verticalAlign="middle"
                    width={28 * zoom}
                    height={28 * zoom}
                    offsetX={14 * zoom}
                    offsetY={14 * zoom}
                  />
                </Group>
              )}

              {/* Side quest button (down) - Green - Only show for main timeline entries, not side quests */}
              {!isSideQuest && (
                <Group
                  onClick={(e) => {
                    e.cancelBubble = true;
                    handleCreateSideQuest(entry.id);
                  }}
                  onMouseDown={(e) => {
                    e.cancelBubble = true;
                  }}
                >
                  <Circle
                    x={cardWidth / 2 + 24 * zoom}
                    y={-cardHeight / 2 + 20 * zoom + 72 * zoom}
                    radius={14 * zoom}
                    fill="rgb(133, 173, 133)" // chart-2 (green)
                    shadowBlur={6 * zoom}
                    shadowOpacity={0.3}
                  />
                  <Text
                    text="↓"
                    x={cardWidth / 2 + 24 * zoom}
                    y={-cardHeight / 2 + 20 * zoom + 72 * zoom}
                    fontSize={16 * zoom}
                    fill="rgb(23, 19, 17)" // primary-foreground (dark text)
                    align="center"
                    verticalAlign="middle"
                    width={28 * zoom}
                    height={28 * zoom}
                    offsetX={14 * zoom}
                    offsetY={14 * zoom}
                  />
                </Group>
              )}
            </Group>
          )}

          {/* Edit and Delete buttons - ON the card bottom */}
          {isDm && (isHovered || isSelected) && (
            <Group name="card-buttons">
              {/* Edit button - Primary */}
              <Group
                name="card-buttons"
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (onEntryEdit) {
                    onEntryEdit(entry.id);
                  } else if (onEntrySelect) {
                    onEntrySelect(entry.id);
                  }
                }}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                }}
              >
                <Rect
                  x={-cardWidth / 2 + 8 * zoom}
                  y={cardHeight / 2 - 24 * zoom}
                  width={cardWidth / 2 - 12 * zoom}
                  height={18 * zoom}
                  fill="rgb(201, 184, 130)" // primary
                  cornerRadius={6 * zoom}
                  shadowBlur={3 * zoom}
                  shadowOpacity={0.2}
                />
                <Text
                  text="Edit"
                  x={-cardWidth / 2 + 8 * zoom + (cardWidth / 2 - 12 * zoom) / 2}
                  y={cardHeight / 2 - 24 * zoom + 9 * zoom}
                  fontSize={10 * zoom}
                  fontStyle="600"
                  fill="rgb(23, 19, 17)" // primary-foreground
                  align="center"
                  verticalAlign="middle"
                  width={cardWidth / 2 - 12 * zoom}
                  height={18 * zoom}
                  offsetX={(cardWidth / 2 - 12 * zoom) / 2}
                  offsetY={9 * zoom}
                />
              </Group>

              {/* Delete button - Destructive */}
              <Group
                name="card-buttons"
                onClick={(e) => {
                  e.cancelBubble = true;
                  if (onEntryDelete && confirm(`Are you sure you want to delete "${entry.title}"?`)) {
                    onEntryDelete(entry.id);
                  }
                }}
                onMouseDown={(e) => {
                  e.cancelBubble = true;
                }}
              >
                <Rect
                  x={4 * zoom}
                  y={cardHeight / 2 - 24 * zoom}
                  width={cardWidth / 2 - 12 * zoom}
                  height={18 * zoom}
                  fill="rgb(228, 124, 103)" // destructive
                  cornerRadius={6 * zoom}
                  shadowBlur={3 * zoom}
                  shadowOpacity={0.2}
                />
                <Text
                  text="Delete"
                  x={4 * zoom + (cardWidth / 2 - 12 * zoom) / 2}
                  y={cardHeight / 2 - 24 * zoom + 9 * zoom}
                  fontSize={10 * zoom}
                  fontStyle="600"
                  fill="rgb(23, 19, 17)" // destructive-foreground
                  align="center"
                  verticalAlign="middle"
                  width={cardWidth / 2 - 12 * zoom}
                  height={18 * zoom}
                  offsetX={(cardWidth / 2 - 12 * zoom) / 2}
                  offsetY={9 * zoom}
                />
              </Group>
            </Group>
          )}
        </Group>
      );
    });
  }, [entries, entryPositions, zoom, pan, selectedEntryId, hoveredEntryId, isDm, handleEntryClick, handleCreateNext, handleCreateSideQuest, handleCreateMainBranch, placeholderImage, loadedEntryImages, height, onEntryDelete, onEntryEdit, onEntrySelect]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-background overflow-hidden rounded-lg border border-border",
        className
      )}
    >
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        <Layer>
          {/* Background grid */}
          <Group name="grid" listening={false}>
            {Array.from({ length: 50 }).map((_, i) => (
              <Line
                key={`v-${i}`}
                points={[i * 50 * zoom, -10000, i * 50 * zoom, 10000]}
                stroke="rgba(70, 64, 57, 0.2)" // border color with opacity
                strokeWidth={1}
                listening={false}
              />
            ))}
            {Array.from({ length: 50 }).map((_, i) => (
              <Line
                key={`h-${i}`}
                points={[-10000, i * 50 * zoom, 10000, i * 50 * zoom]}
                stroke="rgba(70, 64, 57, 0.2)" // border color with opacity
                strokeWidth={1}
                listening={false}
              />
            ))}
          </Group>

          {/* Main timeline line (horizontal) - align with card centers */}
          {entries
            .filter(e => !e.parent_entry_id)
            .map((entry, index, mainPath) => {
              const pos = entryPositions.get(entry.id);
              if (!pos) return null;
              
              // Get the y position of main timeline entries (should all be the same)
              const mainY = pos.y * zoom + pan.y;
              
              // Only draw the line for the first entry to avoid duplicates
              if (index === 0) {
                return (
                  <Line
                    key="main-timeline-line"
                    points={[0, mainY, width, mainY]}
                    stroke="rgba(179, 166, 152, 0.3)" // muted-foreground with opacity
                    strokeWidth={2}
                    listening={false}
                    name="background"
                  />
                );
              }
              return null;
            })
            .filter(Boolean)}

          {/* Connections */}
          {renderConnections}
          
          {/* Entry cards */}
          {renderEntries}
        </Layer>
      </Stage>
    </div>
  );
}
