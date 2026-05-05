"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import { Layer, Shape } from "react-konva";
import { useVttStore } from "@/lib/store/vtt-store";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  targetX?: number;
  targetY?: number;
}

interface Ripple {
  x: number;
  y: number;
  age: number;
  life: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

type Viewport = {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
};

const RAIN_SCREEN_PADDING = 520;

function getViewport(layer: Konva.Layer | null): Viewport | null {
  const stage = layer?.getStage();
  if (!stage) return null;

  const scale = Math.max(0.1, stage.scaleX() || 1);
  return {
    left: -stage.x() / scale,
    top: -stage.y() / scale,
    width: stage.width() / scale,
    height: stage.height() / scale,
    scale,
  };
}

function spawnRainParticle(view: Viewport): Particle {
  const pad = RAIN_SCREEN_PADDING / view.scale;
  const edgeRoll = Math.random();
  let x = view.left + Math.random() * view.width;
  let y = view.top + Math.random() * view.height;

  if (edgeRoll < 0.7) {
    x = view.left - pad + Math.random() * (view.width + pad * 2);
    y = view.top + view.height + Math.random() * pad;
  } else if (edgeRoll < 0.85) {
    x = view.left - Math.random() * pad;
    y = view.top + view.height * 0.12 + Math.random() * (view.height * 0.88 + pad);
  } else {
    x = view.left + view.width + Math.random() * pad;
    y = view.top + view.height * 0.12 + Math.random() * (view.height * 0.88 + pad);
  }

  const horizonX = view.left + view.width * (0.5 + (Math.random() - 0.5) * 0.36);
  const targetX = x * 0.42 + horizonX * 0.58;
  const targetY = view.top + view.height * (0.08 + Math.random() * 0.24);
  const dx = targetX - x;
  const dy = targetY - y;
  const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const speed = (540 + Math.random() * 460) / view.scale;
  const vy = (dy / distance) * speed;
  const rawVx = (dx / distance) * speed;
  const maxVx = Math.abs(vy) * 0.48;
  const vx = Math.max(-maxVx, Math.min(maxVx, rawVx));

  return {
    x,
    y,
    vx,
    vy,
    size: 0.65 + Math.random() * 1.25,
    opacity: 0.3 + Math.random() * 0.36,
    targetX,
    targetY,
  };
}

function isOutsidePaddedView(p: Particle, view: Viewport) {
  const pad = RAIN_SCREEN_PADDING / view.scale;
  return (
    p.x < view.left - pad ||
    p.x > view.left + view.width + pad ||
    p.y < view.top - pad ||
    p.y > view.top + view.height + pad
  );
}

export const WeatherOverlay = () => {
  const { weatherType, weatherIntensity } = useVttStore();
  const layerRef = useRef<Konva.Layer>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const animRef = useRef<Konva.Animation | null>(null);

  useEffect(() => {
    if (weatherType === "none") {
      particlesRef.current = [];
      ripplesRef.current = [];
      animRef.current?.stop();
      layerRef.current?.batchDraw();
      return;
    }

    particlesRef.current = [];
    ripplesRef.current = [];

    const targetCount =
      weatherType === "rain"
        ? Math.round(700 * weatherIntensity)
        : weatherType === "snow"
          ? Math.round(300 * weatherIntensity)
          : Math.round(50 * weatherIntensity);

    animRef.current = new Konva.Animation((frame) => {
      if (!frame) return;
      const view = getViewport(layerRef.current);
      if (!view) return;

      const timeDiff = frame.timeDiff / 1000;
      const particles = particlesRef.current;

      if (particles.length < targetCount) {
        const spawnCount = Math.ceil((targetCount - particles.length) * 0.12);
        for (let i = 0; i < spawnCount; i++) {
          if (weatherType === "rain") {
            particles.push(spawnRainParticle(view));
          } else if (weatherType === "snow") {
            particles.push({
              x: view.left + Math.random() * view.width,
              y: view.top - Math.random() * (120 / view.scale),
              vx: ((Math.random() - 0.5) * 30) / view.scale,
              vy: (30 + Math.random() * 30) / view.scale,
              size: (2 + Math.random() * 3) / view.scale,
              opacity: 0.6 + Math.random() * 0.4,
            });
          } else {
            particles.push({
              x: view.left + Math.random() * view.width,
              y: view.top + Math.random() * view.height,
              vx: ((Math.random() - 0.5) * 10) / view.scale,
              vy: ((Math.random() - 0.5) * 5) / view.scale,
              size: (50 + Math.random() * 100) / view.scale,
              opacity: 0.1 + Math.random() * 0.2,
            });
          }
        }
      } else if (particles.length > targetCount) {
        particles.splice(targetCount);
      }

      particles.forEach((p) => {
        p.x += p.vx * timeDiff;
        p.y += p.vy * timeDiff;

        if (weatherType === "rain") {
          const targetX = p.targetX ?? view.left + view.width * 0.5;
          const targetY = p.targetY ?? view.top + view.height * 0.2;
          const dxToTarget = targetX - p.x;
          const dyToTarget = targetY - p.y;
          const reachedTarget = dxToTarget * p.vx + dyToTarget * p.vy <= 0;

          if (reachedTarget || isOutsidePaddedView(p, view)) {
            Object.assign(p, spawnRainParticle(view));
          }
        } else if (weatherType === "snow") {
          if (p.y > view.top + view.height) {
            p.y = view.top - 10 / view.scale;
            p.x = view.left + Math.random() * view.width;
          }
          if (p.x > view.left + view.width) p.x = view.left;
          if (p.x < view.left) p.x = view.left + view.width;
          p.vx += Math.sin(frame.time * 0.001 + p.y * 0.01) * 0.5;
        } else if (weatherType === "fog") {
          if (p.x > view.left + view.width + p.size) p.x = view.left - p.size;
          if (p.x < view.left - p.size) p.x = view.left + view.width + p.size;
          if (p.y > view.top + view.height + p.size) p.y = view.top - p.size;
          if (p.y < view.top - p.size) p.y = view.top + view.height + p.size;
        }
      });

      if (weatherType === "rain") {
        const targetRipples = Math.round(70 * weatherIntensity);
        if (ripplesRef.current.length < targetRipples && Math.random() < weatherIntensity * 1.1) {
          const depth = Math.random();
          const farScale = 0.32 + depth * 0.55;
          ripplesRef.current.push({
            x: view.left + Math.random() * view.width,
            y: view.top + view.height * (0.08 + depth * 0.42),
            age: 0,
            life: 0.62 + Math.random() * 0.5,
            radius: 1.5 / view.scale,
            maxRadius: (7 + farScale * 22) / view.scale,
            opacity: 0.16 + farScale * 0.16,
          });
        }

        ripplesRef.current = ripplesRef.current
          .map((r) => ({
            ...r,
            age: r.age + timeDiff,
            radius: r.radius + (r.maxRadius / r.life) * timeDiff,
          }))
          .filter((r) => r.age < r.life);
      } else {
        ripplesRef.current = [];
      }
    }, layerRef.current);

    animRef.current.start();

    return () => {
      animRef.current?.stop();
    };
  }, [weatherType, weatherIntensity]);

  if (weatherType === "none") return null;

  return (
    <Layer ref={layerRef} listening={false}>
      <Shape
        sceneFunc={(context, shape) => {
          const view = getViewport(layerRef.current);
          if (!view) return;

          if (weatherType === "rain") {
            particlesRef.current.forEach((p) => {
              const speed = Math.max(1, Math.sqrt(p.vx * p.vx + p.vy * p.vy));
              const ux = p.vx / speed;
              const uy = p.vy / speed;
              const distanceFromTop = Math.max(0, p.y - view.top) / Math.max(1, view.height);
              const foreground = Math.max(0.25, Math.min(1, distanceFromTop));
              const length = (10 + foreground * 42 * p.size) / view.scale;
              const lineWidth = (0.6 + foreground * 1.8) / view.scale;

              context.beginPath();
              context.strokeStyle = `rgba(174, 205, 235, ${p.opacity * foreground})`;
              context.lineWidth = lineWidth;
              context.moveTo(p.x, p.y);
              context.lineTo(p.x + ux * length, p.y + uy * length);
              context.stroke();
            });

            ripplesRef.current.forEach((r) => {
              const t = Math.min(1, r.age / r.life);
              const alpha = r.opacity * (1 - t) * (1 - t);

              context.beginPath();
              context.strokeStyle = `rgba(210, 238, 255, ${alpha})`;
              context.lineWidth = (1.2 + (1 - t) * 1.1) / view.scale;
              context.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
              context.stroke();

              if (t > 0.28) {
                context.beginPath();
                context.strokeStyle = `rgba(245, 252, 255, ${alpha * 0.7})`;
                context.lineWidth = 0.8 / view.scale;
                context.arc(r.x, r.y, r.radius * 0.55, 0, Math.PI * 2);
                context.stroke();
              }
            });
          } else if (weatherType === "snow") {
            context.fillStyle = "rgba(255, 255, 255, 0.8)";
            particlesRef.current.forEach((p) => {
              context.beginPath();
              context.arc(p.x, p.y, p.size, 0, Math.PI * 2, true);
              context.fill();
            });
          } else if (weatherType === "fog") {
            particlesRef.current.forEach((p) => {
              const g = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
              g.addColorStop(0, `rgba(200, 200, 200, ${p.opacity})`);
              g.addColorStop(1, "rgba(200, 200, 200, 0)");
              context.fillStyle = g;
              context.beginPath();
              context.arc(p.x, p.y, p.size, 0, Math.PI * 2, true);
              context.fill();
            });
          }

          context.fillStrokeShape(shape);
        }}
      />
    </Layer>
  );
};
