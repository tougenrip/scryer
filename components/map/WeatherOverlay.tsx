'use client';

import React, { useEffect, useRef } from 'react';
import { Layer, Shape } from 'react-konva';
import Konva from 'konva';
import { useVttStore } from '@/lib/store/vtt-store';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export const WeatherOverlay = () => {
  const { weatherType, weatherIntensity, stageScale, stagePos } = useVttStore();
  const layerRef = useRef<Konva.Layer>(null);
  const shapeRef = useRef<Konva.Shape>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<Konva.Animation | null>(null);

  // Initialize or update particles based on weather type
  useEffect(() => {
    if (weatherType === 'none') {
      particlesRef.current = [];
      if (animRef.current) {
        animRef.current.stop();
      }
      if (layerRef.current) {
        layerRef.current.batchDraw();
      }
      return;
    }

    // Determine particle count based on intensity
    // Base counts for max intensity (1.0)
    let count = 0;
    if (weatherType === 'rain') count = 500 * weatherIntensity;
    if (weatherType === 'snow') count = 300 * weatherIntensity;
    if (weatherType === 'fog') count = 50 * weatherIntensity;

    // Get stage dimensions (approximate visible area or just a large buffer)
    // Since we are transforming with the stage, we might want to spawn particles 
    // in the visible viewport, or just over a large area.
    // For simplicity, let's assume a fixed large area or dynamic based on viewport.
    // Ideally, we simulate particles in "world space" or "screen space".
    // "Screen space" (fixed to camera) is usually better for weather overlays.
    // However, if we put this layer inside the Stage, it will be transformed by stageScale and stagePos.
    // If we want it to be "screen space" (static overlay), we should inverse transform 
    // or put it in a separate Stage on top (which is complex).
    // Alternatively, we can just apply inverse transform to the Layer so it stays fixed to the screen?
    // Or just let it rain on the map (world space). Rain usually looks better in screen space for VTTs 
    // so it covers the view. But if we zoom in, rain drops shouldn't get huge.
    
    // Let's try to keep it in screen space by applying inverse transform to the layer or shape.
    // But Konva Layers are part of the stage.
    
    // Strategy: We will render particles in a large area around the viewport,
    // OR we can counteract the stage transform in the drawing function.
    // Let's try counteracting the stage transform so weather is "screen space".
    
    const initParticles = () => {
      const p: Particle[] = [];
      // We'll figure out bounds in the animation loop or draw function
      // For now just init empty array, we will spawn in loop
      particlesRef.current = p;
    };
    
    initParticles();

    // Start animation
    animRef.current = new Konva.Animation((frame) => {
      const stage = layerRef.current?.getStage();
      if (!stage || !frame) return;

      const width = stage.width();
      const height = stage.height();
      
      // Calculate viewport in world coordinates if we want world space rain
      // Or just use 0..width, 0..height for screen space rain
      
      const timeDiff = frame.timeDiff / 1000; // seconds

      // Spawn new particles if needed
      const currentCount = particlesRef.current.length;
      if (currentCount < count) {
        const spawnCount = Math.ceil((count - currentCount) * 0.1); // trickle in
        for (let i = 0; i < spawnCount; i++) {
          let p: Particle;
          
          if (weatherType === 'rain') {
             p = {
              x: Math.random() * width,
              y: Math.random() * -100, // start above
              vx: (Math.random() - 0.5) * 50, // slight wind
              vy: 500 + Math.random() * 200, // fast down
              size: 1 + Math.random() * 2, // length
              opacity: 0.4 + Math.random() * 0.3
            };
          } else if (weatherType === 'snow') {
             p = {
              x: Math.random() * width,
              y: Math.random() * -100,
              vx: (Math.random() - 0.5) * 30,
              vy: 30 + Math.random() * 30, // slow down
              size: 2 + Math.random() * 3, // radius
              opacity: 0.6 + Math.random() * 0.4
            };
          } else { // fog
             p = {
              x: Math.random() * width,
              y: Math.random() * height,
              vx: (Math.random() - 0.5) * 10,
              vy: (Math.random() - 0.5) * 5,
              size: 50 + Math.random() * 100,
              opacity: 0.1 + Math.random() * 0.2
            };
          }
          particlesRef.current.push(p);
        }
      } else if (currentCount > count) {
        particlesRef.current.splice(count);
      }

      // Update particles
      particlesRef.current.forEach(p => {
        p.x += p.vx * timeDiff;
        p.y += p.vy * timeDiff;

        // Reset if out of bounds
        if (weatherType === 'rain' || weatherType === 'snow') {
            if (p.y > height) {
                p.y = -10;
                p.x = Math.random() * width;
            }
            if (p.x > width) p.x = 0;
            if (p.x < 0) p.x = width;
        } else if (weatherType === 'fog') {
            if (p.x > width + p.size) p.x = -p.size;
            if (p.x < -p.size) p.x = width + p.size;
            if (p.y > height + p.size) p.y = -p.size;
            if (p.y < -p.size) p.y = height + p.size;
        }
        
        // Snow wobble
        if (weatherType === 'snow') {
            p.vx += Math.sin(frame.time * 0.001 + p.y * 0.01) * 0.5;
        }
      });

    }, layerRef.current);

    animRef.current.start();

    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
  }, [weatherType, weatherIntensity]);

  // Handle stage transform inverse to keep weather static on screen (HUD-like)
  // or let it scale? Usually weather is better as screen overlay.
  // We can set the layer transform to identity every frame or use absolutePosition?
  useEffect(() => {
    if (layerRef.current) {
       // We want the layer to completely ignore the stage transform (zoom/pan)
       // So we set its scale to 1/stageScale and position to -stagePos/stageScale?
       // Actually easier: set absolute position to 0,0 and scale to 1?
       // But Konva Layer inside Stage inherits Stage transform.
       // To "ignore" parent transform:
       // newScale = 1 / parentScale
       // newPos = -parentPos / parentScale
       
       const layer = layerRef.current;
       layer.scale({ x: 1 / stageScale, y: 1 / stageScale });
       layer.position({
         x: -stagePos.x / stageScale,
         y: -stagePos.y / stageScale
       });
       layer.batchDraw();
    }
  }, [stageScale, stagePos]);

  if (weatherType === 'none') return null;

  return (
    <Layer ref={layerRef} listening={false}>
      <Shape
        ref={shapeRef}
        sceneFunc={(context, shape) => {
          // Draw particles
          const particles = particlesRef.current;
          
          context.beginPath();
          
          if (weatherType === 'rain') {
             context.strokeStyle = 'rgba(174, 194, 224, 0.6)';
             context.lineWidth = 1;
             particles.forEach(p => {
               context.moveTo(p.x, p.y);
               context.lineTo(p.x + p.vx * 0.1, p.y + p.vy * 0.1); // streak
             });
             context.stroke();
          } else if (weatherType === 'snow') {
             context.fillStyle = 'rgba(255, 255, 255, 0.8)';
             particles.forEach(p => {
               context.moveTo(p.x, p.y);
               context.arc(p.x, p.y, p.size, 0, Math.PI * 2, true); 
             });
             context.fill();
          } else if (weatherType === 'fog') {
             particles.forEach(p => {
               // Fog is tricky with basic context. Simple circles with low alpha
               // Using radial gradient for soft edges
               const g = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
               g.addColorStop(0, `rgba(200, 200, 200, ${p.opacity})`);
               g.addColorStop(1, 'rgba(200, 200, 200, 0)');
               context.fillStyle = g;
               context.beginPath();
               context.arc(p.x, p.y, p.size, 0, Math.PI * 2, true);
               context.fill();
             });
          }
          
          context.closePath();
          // Konva specific manual drawing requirement
          context.fillStrokeShape(shape);
        }}
      />
    </Layer>
  );
};
