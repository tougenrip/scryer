"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MapPreviewProps {
  imageUrl: string | null;
  gridSize: number; // feet per square
  gridType: 'square' | 'hex';
  width?: number | null;
  height?: number | null;
}

export function MapPreview({
  imageUrl,
  gridSize,
  gridType,
  width,
  height,
}: MapPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Load image and get dimensions
  useEffect(() => {
    if (!imageUrl) {
      setImageLoaded(false);
      setImageDimensions(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);
    };
    
    img.onerror = () => {
      setImageLoaded(false);
      setImageDimensions(null);
    };
    
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw grid overlay
  useEffect(() => {
    if (!imageLoaded || !imageDimensions || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const drawGrid = () => {
      // Set canvas size to match container
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Calculate aspect ratio
      const imageAspect = imageDimensions.width / imageDimensions.height;
      const containerAspect = rect.width / rect.height;

      let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;

      if (imageAspect > containerAspect) {
        // Image is wider
        drawWidth = rect.width;
        drawHeight = rect.width / imageAspect;
        offsetX = 0;
        offsetY = (rect.height - drawHeight) / 2;
      } else {
        // Image is taller
        drawHeight = rect.height;
        drawWidth = rect.height * imageAspect;
        offsetX = (rect.width - drawWidth) / 2;
        offsetY = 0;
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate grid spacing in pixels
      // Base: 5 feet = 50 pixels (adjustable scale)
      const baseScale = 50; // pixels per 5 feet
      const pixelsPerFoot = baseScale / 5;
      const gridSpacingPixels = gridSize * pixelsPerFoot;

      // Scale grid to match image size
      const scaleX = drawWidth / imageDimensions.width;
      const scaleY = drawHeight / imageDimensions.height;
      const scaledGridSpacing = gridSpacingPixels * scaleX;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;

      if (gridType === 'square') {
        // Draw square grid
        const startX = offsetX;
        const startY = offsetY;
        const endX = offsetX + drawWidth;
        const endY = offsetY + drawHeight;

        // Vertical lines
        for (let x = startX; x <= endX; x += scaledGridSpacing) {
          ctx.beginPath();
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
          ctx.stroke();
        }

        // Horizontal lines
        for (let y = startY; y <= endY; y += scaledGridSpacing) {
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
          ctx.stroke();
        }
      } else {
        // Draw hex grid
        const hexRadius = scaledGridSpacing / 2;
        const hexWidth = hexRadius * 2;
        const hexHeight = hexRadius * Math.sqrt(3);

        const startX = offsetX;
        const startY = offsetY;
        const endX = offsetX + drawWidth;
        const endY = offsetY + drawHeight;

        // Draw hexagons
        let row = 0;
        for (let y = startY; y < endY + hexHeight; y += hexHeight * 0.75) {
          const offset = row % 2 === 0 ? 0 : hexRadius;
          for (let x = startX + offset; x < endX + hexWidth; x += hexWidth) {
            drawHexagon(ctx, x, y, hexRadius);
          }
          row++;
        }
      }
    };

    drawGrid();

    // Handle window resize
    const handleResize = () => {
      drawGrid();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [imageLoaded, imageDimensions, gridSize, gridType, width, height]);

  const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const hexX = x + radius * Math.cos(angle);
      const hexY = y + radius * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(hexX, hexY);
      } else {
        ctx.lineTo(hexX, hexY);
      }
    }
    ctx.closePath();
    ctx.stroke();
  };

  if (!imageUrl) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Upload an image to see the preview
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Preview</h3>
          <div
            ref={containerRef}
            className="relative w-full bg-muted rounded-lg overflow-hidden"
            style={{ aspectRatio: imageDimensions ? `${imageDimensions.width} / ${imageDimensions.height}` : '16/9', maxHeight: '500px' }}
          >
            {imageLoaded ? (
              <>
                <img
                  src={imageUrl}
                  alt="Map preview"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading image...</p>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Grid: {gridSize}ft {gridType}</p>
            {imageDimensions && (
              <p>Image: {imageDimensions.width} × {imageDimensions.height}px</p>
            )}
            {width && height && (
              <p>Dimensions: {width} × {height} grid units</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

