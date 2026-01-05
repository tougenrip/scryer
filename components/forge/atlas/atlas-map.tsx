"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LocationMarker } from "@/hooks/useForgeContent";
import { MapPin, X, Edit2, ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AtlasMapProps {
  imageUrl: string | null;
  markers: LocationMarker[];
  onMarkerClick?: (marker: LocationMarker) => void;
  onMarkerAdd?: (x: number, y: number) => void;
  onMarkerDelete?: (markerId: string) => void;
  isDm: boolean;
  editingMarkerId?: string | null;
}

export function AtlasMap({
  imageUrl,
  markers,
  onMarkerClick,
  onMarkerAdd,
  onMarkerDelete,
  isDm,
  editingMarkerId,
}: AtlasMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });
  const [justEndedDrag, setJustEndedDrag] = useState(false);
  const dragDistanceRef = useRef({ x: 0, y: 0 });

  // Calculate image display size
  useEffect(() => {
    if (!imageUrl) {
      setImageSize(null);
      setContainerSize(null);
      return;
    }

    const updateSizes = () => {
      if (!containerRef.current || !imageUrl) return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      // Load image to get natural dimensions
      const img = new Image();
      
      img.onload = () => {
        const containerWidth = containerRect.width - 32; // padding
        const containerHeight = containerRect.height - 32;
        
        // Calculate aspect ratio and scale
        const imgAspect = img.width / img.height;
        const containerAspect = containerWidth / containerHeight;
        
        let displayWidth: number;
        let displayHeight: number;
        
        if (imgAspect > containerAspect) {
          // Image is wider
          displayWidth = containerWidth;
          displayHeight = containerWidth / imgAspect;
        } else {
          // Image is taller
          displayHeight = containerHeight;
          displayWidth = containerHeight * imgAspect;
        }
        
        setImageSize({ width: img.width, height: img.height });
        setContainerSize({ width: displayWidth, height: displayHeight });
      };
      
      img.onerror = () => {
        console.error('Failed to load atlas image:', imageUrl);
        setImageSize(null);
        setContainerSize(null);
      };
      
      img.src = imageUrl;
    };

    // Small delay to ensure container is rendered
    const timeoutId = setTimeout(updateSizes, 100);
    window.addEventListener('resize', updateSizes);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateSizes);
    };
  }, [imageUrl]);

  // Handle zoom with mouse wheel
  useEffect(() => {
    if (!containerRef.current || !isDm || !imageUrl) return;

    const container = containerRef.current;
    
    const handleWheel = (e: WheelEvent) => {
      // Only zoom with Ctrl/Cmd + wheel, or just wheel when holding shift
      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(5, zoom * delta));
      
      if (newZoom !== zoom && containerSize) {
        // Get container center or mouse position
        const rect = container.getBoundingClientRect();
        const containerCenterX = rect.width / 2;
        const containerCenterY = rect.height / 2;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Use mouse position if available, otherwise use center
        const zoomPointX = mouseX;
        const zoomPointY = mouseY;
        
        // Calculate zoom point in image coordinates (accounting for current pan)
        const imagePointX = (zoomPointX - pan.x) / zoom;
        const imagePointY = (zoomPointY - pan.y) / zoom;
        
        // Adjust pan to keep zoom point under cursor/center
        const newPanX = zoomPointX - imagePointX * newZoom;
        const newPanY = zoomPointY - imagePointY * newZoom;
        
        setZoom(newZoom);
        setPan({ x: newPanX, y: newPanY });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [zoom, pan, isDm, imageUrl, containerSize]);

  // Reset zoom and pan
  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Zoom in/out - zoom towards center
  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    if (!containerRef.current || !containerSize) return;
    
    const newZoom = Math.min(5, zoom * 1.2);
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate center point in image coordinates
    const imageCenterX = (centerX - pan.x) / zoom;
    const imageCenterY = (centerY - pan.y) / zoom;
    
    // Adjust pan to keep center point at center
    const newPanX = centerX - imageCenterX * newZoom;
    const newPanY = centerY - imageCenterY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    if (!containerRef.current || !containerSize) return;
    
    const newZoom = Math.max(0.5, zoom / 1.2);
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate center point in image coordinates
    const imageCenterX = (centerX - pan.x) / zoom;
    const imageCenterY = (centerY - pan.y) / zoom;
    
    // Adjust pan to keep center point at center
    const newPanX = centerX - imageCenterX * newZoom;
    const newPanY = centerY - imageCenterY * newZoom;
    
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left mouse button
    if (!isDm) {
      dragDistanceRef.current = { x: 0, y: 0 };
      return;
    }
    
    // Check if clicking on a marker, its popover, or zoom controls
    const target = e.target as HTMLElement;
    if (target.closest('[data-marker]') || target.closest('[role="dialog"]') || target.closest('[data-zoom-controls]')) {
      // Don't start drag if clicking on marker, popover, or zoom controls
      dragDistanceRef.current = { x: 0, y: 0 };
      return;
    }
    
    setIsDragging(true);
    setJustEndedDrag(false);
    
    // Store the initial mouse position and current pan
    const startX = e.clientX;
    const startY = e.clientY;
    setDragStart({ x: startX, y: startY });
    setInitialPan({ x: pan.x, y: pan.y });
    dragDistanceRef.current = { x: 0, y: 0 };
    
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate mouse movement delta
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // Track drag distance to determine if it was a real drag or just a click
    dragDistanceRef.current = {
      x: Math.abs(deltaX),
      y: Math.abs(deltaY),
    };
    
    // Apply the delta to the initial pan position
    setPan({
      x: initialPan.x + deltaX,
      y: initialPan.y + deltaY,
    });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      // If we dragged more than 5 pixels, mark as a drag operation
      const dragDistance = Math.max(
        dragDistanceRef.current.x,
        dragDistanceRef.current.y
      );
      
      if (dragDistance > 5) {
        setJustEndedDrag(true);
        // Clear the flag after a short delay to prevent click event
        setTimeout(() => {
          setJustEndedDrag(false);
        }, 100);
      }
    }
    
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDm || !onMarkerAdd || !containerSize || !imageSize) return;
    if (isDragging) return; // Don't add marker if we are currently dragging
    if (justEndedDrag) return; // Don't add marker if we just finished dragging
    
    // Check if click was on a marker or popover
    const target = e.target as HTMLElement;
    if (target.closest('[data-marker]') || target.closest('[role="dialog"]')) {
      return; // Don't add marker if clicking on existing marker
    }
    
    // Check if click was on zoom controls
    if (target.closest('[data-zoom-controls]')) {
      return; // Don't add marker if clicking on zoom controls
    }
    
    const container = containerRef.current;
    if (!container || !imageRef.current) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left - 16; // Account for padding
    const clickY = e.clientY - rect.top - 16;

    // Adjust for zoom and pan
    const adjustedX = (clickX - pan.x) / zoom;
    const adjustedY = (clickY - pan.y) / zoom;

    // Get image element's natural position
    if (!containerSize || !imageSize) return;

    // Calculate position relative to original image dimensions (0-100 scale)
    const relativeX = (adjustedX / containerSize.width) * 100;
    const relativeY = (adjustedY / containerSize.height) * 100;

    // Clamp to valid range (0-100)
    const clampedX = Math.max(0, Math.min(100, relativeX));
    const clampedY = Math.max(0, Math.min(100, relativeY));

    onMarkerAdd(clampedX, clampedY);
  };

  const getMarkerStyle = (marker: LocationMarker) => {
    if (!containerSize) {
      return { display: 'none' };
    }

    // Convert percentage coordinates (0-100) to pixels relative to container
    // marker.x and marker.y are stored as integers 0-100 representing percentages
    // Since markers are now inside the transform container, they inherit zoom/pan automatically
    const baseLeft = (marker.x / 100) * containerSize.width;
    const baseTop = (marker.y / 100) * containerSize.height;

    return {
      left: `${baseLeft}px`,
      top: `${baseTop}px`,
      transform: 'translate(-50%, -100%)', // Bottom of pin aligns with click position
      transformOrigin: 'bottom center', // Pin point at bottom
      position: 'absolute' as const,
      willChange: isDragging ? 'transform' : 'auto',
    };
  };

  const getMarkerIcon = (iconType: LocationMarker['icon_type'], markerColor?: string) => {
    // Return appropriate icon/color based on type, using marker color if provided
    const defaultColors: Record<string, string> = {
      'city': '#3b82f6',
      'village': '#10b981',
      'fort': '#ef4444',
      'tavern': '#f59e0b',
      'shop': '#8b5cf6',
      'temple': '#ec4899',
      'dungeon': '#1f2937',
      'cave': '#6b7280',
      'landmark': '#f97316',
      'port': '#06b6d4',
      'border': '#dc2626',
    };
    
    const icons: Record<string, string> = {
      'city': '🏛️',
      'village': '🏘️',
      'fort': '🏰',
      'tavern': '🍺',
      'shop': '🏪',
      'temple': '⛪',
      'dungeon': '⚫',
      'cave': '🕳️',
      'landmark': '🗿',
      'port': '⚓',
      'border': '🚩',
    };
    
    // Use marker's custom color if provided, otherwise use default for icon type
    const color = markerColor || defaultColors[iconType || 'landmark'] || '#c9b882';
    const icon = icons[iconType || 'landmark'] || '📍';
    
    return { icon, color };
  };

  const getStatusOverlay = (status: LocationMarker['status_icon']) => {
    if (!status || status === 'normal') return null;
    
    const predefinedStatuses: Record<string, string> = {
      'under_attack': '⚔️',
      'celebrating': '🎉',
      'plague': '☠️',
      'trade_route': '📦',
      'blockaded': '🚫',
      'at_war': '⚔️',
      'prosperous': '💰',
      'declining': '📉',
    };
    
    // Return emoji for predefined statuses, or show first letter for custom statuses
    return predefinedStatuses[status] || '📌';
  };

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <p className="text-muted-foreground">Upload a map image to get started</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full bg-muted rounded-lg overflow-hidden",
        "border-2 border-border",
        isDm && onMarkerAdd && !isDragging && zoom === 1 && "cursor-crosshair",
        isDm && isDragging && "cursor-grabbing",
        isDm && !isDragging && (zoom > 1 || zoom < 1) && "cursor-grab",
        isDm && !isDragging && zoom === 1 && "cursor-default"
      )}
      style={{ minHeight: '400px', padding: '16px' }}
      onClick={handleMapClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          willChange: isDragging ? 'transform' : 'auto',
        }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Atlas Map"
          className="rounded"
          style={{
            width: containerSize ? `${containerSize.width}px` : '100%',
            height: 'auto',
            display: 'block',
            maxWidth: 'none',
            pointerEvents: 'none',
          }}
          draggable={false}
          onLoad={() => {
            // Trigger size recalculation when image loads
            if (imageRef.current && containerRef.current) {
              const img = imageRef.current;
              const container = containerRef.current;
              const containerRect = container.getBoundingClientRect();
              
              const containerWidth = containerRect.width - 32;
              const containerHeight = containerRect.height - 32;
              
              const imgAspect = img.naturalWidth / img.naturalHeight;
              const containerAspect = containerWidth / containerHeight;
              
              let displayWidth: number;
              let displayHeight: number;
              
              if (imgAspect > containerAspect) {
                displayWidth = containerWidth;
                displayHeight = containerWidth / imgAspect;
              } else {
                displayHeight = containerHeight;
                displayWidth = containerHeight * imgAspect;
              }
              
              setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
              setContainerSize({ width: displayWidth, height: displayHeight });
            }
          }}
          onError={(e) => {
            console.error('Failed to load atlas image:', imageUrl);
            console.error('Image error:', e);
          }}
        />
        
        {/* Markers container - inside transform so they move with the image */}
        {imageSize && containerSize && (
          <>

            {/* Markers */}
            {markers
              .filter((m) => m.visible)
              .map((marker) => {
                const { icon, color } = getMarkerIcon(marker.icon_type, marker.color);
                const statusOverlay = getStatusOverlay(marker.status_icon);
                const isEditing = editingMarkerId === marker.id;

                return (
                  <div
                    key={marker.id}
                    className={cn(
                      "absolute z-10 cursor-pointer",
                      !isDragging && "transition-all hover:scale-125 hover:z-20",
                      isEditing && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={getMarkerStyle(marker)}
                    data-marker={marker.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkerClick?.(marker);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <div className="relative">
                      <MapPin
                        className={cn(
                          "drop-shadow-lg",
                          marker.size === 'small' && "h-6 w-6",
                          marker.size === 'medium' && "h-8 w-8",
                          marker.size === 'large' && "h-10 w-10"
                        )}
                        style={{ color, fill: color }}
                      />
                      {statusOverlay && (
                        <div className="absolute -top-2 -right-2 text-xs bg-background rounded-full p-0.5">
                          {statusOverlay}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </>
        )}
      </div>
      
      {!imageSize && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded">
          <p className="text-sm text-muted-foreground">Loading map image...</p>
        </div>
      )}

      {/* Zoom Controls */}
      {isDm && (
        <div 
          data-zoom-controls
          className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 border border-border shadow-lg z-30"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            className="h-8 w-8 p-0"
            title="Zoom In (Ctrl + Wheel)"
            type="button"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            className="h-8 w-8 p-0"
            title="Zoom Out (Ctrl + Wheel)"
            type="button"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="h-8 w-8 p-0"
            title="Reset Zoom"
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            type="button"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Zoom Level Indicator */}
      {isDm && zoom !== 1 && (
        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-medium border border-border">
          {Math.round(zoom * 100)}%
        </div>
      )}

      {/* Helper Text */}
      {isDm && onMarkerAdd && zoom === 1 && !isDragging && (
        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground max-w-[calc(100%-32px)] sm:max-w-none">
          Drag to pan • Click to add marker • Ctrl + Scroll to zoom
        </div>
      )}

      {isDm && (zoom > 1 || zoom < 1) && !isDragging && (
        <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground max-w-[calc(100%-32px)] sm:max-w-none">
          Drag to pan • Ctrl + Scroll to zoom • Click to add marker
        </div>
      )}
    </div>
  );
}

