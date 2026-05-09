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

/** Single shared vanishing point for the rain field. Slightly above the
 *  viewport centre so the perspective leans skyward without being centred. */
function getVanishingPoint(view: Viewport) {
  return {
    x: view.left + view.width * 0.5,
    y: view.top + view.height * 0.4,
  };
}

/** Sun position for godrays — top-left area of the viewport so cones
 *  fan diagonally across the table toward the bottom-right. */
function getSunPosition(view: Viewport) {
  // Anchored OFF-SCREEN above the top-left so the convergence point
  // is never visible — only the rays fan into view.
  return {
    x: view.left - view.width * 0.12,
    y: view.top - view.height * 0.25,
  };
}

/** Dust motes that drift through the godrays. Spawned anywhere in the
 *  viewport, drifting slowly in the ray direction (sun → bottom-right). */
function spawnSunnyParticle(view: Viewport): Particle {
  const sun = getSunPosition(view);
  const x = view.left + Math.random() * view.width;
  const y = view.top + Math.random() * view.height;
  // Drift away from the sun (gives the impression motes are floating
  // along the rays). Slow + slightly randomized.
  const dx = x - sun.x;
  const dy = y - sun.y;
  const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const speed = (10 + Math.random() * 18) / view.scale;
  const vx = (dx / distance) * speed + ((Math.random() - 0.5) * 6) / view.scale;
  const vy = (dy / distance) * speed + ((Math.random() - 0.5) * 6) / view.scale;
  return {
    x,
    y,
    vx,
    vy,
    size: 0.6 + Math.random() * 1.4,
    opacity: 0.25 + Math.random() * 0.45,
  };
}

/** Snow uses the same vanishing-point perspective as the rain — flakes
 *  spawn radially around the camera-edge ring and drift toward the
 *  vanishing point, shrinking + fading as they recede. Slower than rain,
 *  with a slight horizontal wobble for natural snowfall feel. */
function spawnSnowParticle(view: Viewport): Particle {
  const pad = RAIN_SCREEN_PADDING / view.scale;
  const v = getVanishingPoint(view);

  const minRadiusX = view.width * 0.18;
  const minRadiusY = view.height * 0.18;
  const maxRadiusX = view.width * 0.55 + pad / 2;
  const maxRadiusY = view.height * 0.55 + pad / 2;
  const angle = Math.random() * Math.PI * 2;
  const radiusT = 0.55 + Math.random() * 0.45;
  const x =
    v.x + Math.cos(angle) * (minRadiusX + radiusT * (maxRadiusX - minRadiusX));
  const y =
    v.y + Math.sin(angle) * (minRadiusY + radiusT * (maxRadiusY - minRadiusY));

  const dx = v.x - x;
  const dy = v.y - y;
  const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  // Snow drifts much slower than rain.
  const speed = (110 + Math.random() * 80) / view.scale;
  const vx = (dx / distance) * speed;
  const vy = (dy / distance) * speed;

  return {
    x,
    y,
    vx,
    vy,
    size: 0.8 + Math.random() * 1.2,
    opacity: 0.7 + Math.random() * 0.3,
    targetX: v.x,
    targetY: v.y,
  };
}

function spawnRainParticle(view: Viewport): Particle {
  const pad = RAIN_SCREEN_PADDING / view.scale;
  const v = getVanishingPoint(view);

  // Spawn radially around the vanishing point at a comfortable distance,
  // anywhere on screen (top, sides, bottom). Drops then travel TOWARD
  // the vanishing point, so they appear to recede away from the camera
  // no matter where on the table they show up.
  const minRadiusX = view.width * 0.18;
  const minRadiusY = view.height * 0.18;
  const maxRadiusX = view.width * 0.55 + pad / 2;
  const maxRadiusY = view.height * 0.55 + pad / 2;
  const angle = Math.random() * Math.PI * 2;
  const radiusT = 0.55 + Math.random() * 0.45; // bias toward outer ring
  const x = v.x + Math.cos(angle) * (minRadiusX + radiusT * (maxRadiusX - minRadiusX));
  const y = v.y + Math.sin(angle) * (minRadiusY + radiusT * (maxRadiusY - minRadiusY));

  const dx = v.x - x;
  const dy = v.y - y;
  const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const speed = (520 + Math.random() * 420) / view.scale;
  const vx = (dx / distance) * speed;
  const vy = (dy / distance) * speed;

  return {
    x,
    y,
    vx,
    vy,
    size: 0.6 + Math.random() * 0.9,
    opacity: 0.5 + Math.random() * 0.35,
    targetX: v.x,
    targetY: v.y,
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
  // Storm lightning state — when >0, a fullscreen flash is rendered at
  // this alpha. Decays per frame; periodically re-armed by the animation.
  const flashRef = useRef(0);
  // Seconds until the next lightning bolt fires.
  const nextFlashRef = useRef(0);

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
        : weatherType === "storm"
          ? Math.round(1200 * weatherIntensity)
          : weatherType === "snow"
            ? Math.round(300 * weatherIntensity)
            : weatherType === "sunny"
              ? Math.round(140 * weatherIntensity)
              : Math.round(50 * weatherIntensity);

    flashRef.current = 0;
    nextFlashRef.current = 2 + Math.random() * 4;

    animRef.current = new Konva.Animation((frame) => {
      if (!frame) return;
      const view = getViewport(layerRef.current);
      if (!view) return;

      const timeDiff = frame.timeDiff / 1000;
      const particles = particlesRef.current;

      if (particles.length < targetCount) {
        const spawnCount = Math.ceil((targetCount - particles.length) * 0.12);
        for (let i = 0; i < spawnCount; i++) {
          if (weatherType === "rain" || weatherType === "storm") {
            particles.push(spawnRainParticle(view));
          } else if (weatherType === "snow") {
            particles.push(spawnSnowParticle(view));
          } else if (weatherType === "sunny") {
            particles.push(spawnSunnyParticle(view));
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

        if (weatherType === "rain" || weatherType === "storm") {
          // Recycle when the drop reaches its horizon target (it's
          // receded into the distance) or leaves the viewport.
          const targetX = p.targetX ?? view.left + view.width * 0.5;
          const targetY = p.targetY ?? view.top + view.height * 0.2;
          const dxToTarget = targetX - p.x;
          const dyToTarget = targetY - p.y;
          const reachedTarget =
            dxToTarget * p.vx + dyToTarget * p.vy <= 0;
          if (reachedTarget || isOutsidePaddedView(p, view)) {
            Object.assign(p, spawnRainParticle(view));
          }
        } else if (weatherType === "snow") {
          // Same vanishing-point recycle as rain — once the flake
          // reaches the convergence point or leaves the viewport,
          // respawn at the outer ring.
          const targetX = p.targetX ?? view.left + view.width * 0.5;
          const targetY = p.targetY ?? view.top + view.height * 0.4;
          const dxToTarget = targetX - p.x;
          const dyToTarget = targetY - p.y;
          const reachedTarget =
            dxToTarget * p.vx + dyToTarget * p.vy <= 0;
          if (reachedTarget || isOutsidePaddedView(p, view)) {
            Object.assign(p, spawnSnowParticle(view));
          } else {
            // Gentle perpendicular wobble so flakes drift sideways as
            // they fall — natural snowfall feel without breaking the
            // overall convergence vector.
            const wobble =
              Math.sin(frame.time * 0.001 + p.x * 0.012 + p.y * 0.008) *
              (12 / view.scale);
            p.x += wobble * timeDiff;
          }
        } else if (weatherType === "sunny") {
          // Recycle motes that drift off-screen back into the viewport.
          if (isOutsidePaddedView(p, view)) {
            Object.assign(p, spawnSunnyParticle(view));
          }
        } else if (weatherType === "fog") {
          if (p.x > view.left + view.width + p.size) p.x = view.left - p.size;
          if (p.x < view.left - p.size) p.x = view.left + view.width + p.size;
          if (p.y > view.top + view.height + p.size) p.y = view.top - p.size;
          if (p.y < view.top - p.size) p.y = view.top + view.height + p.size;
        }
      });

      if (weatherType === "rain" || weatherType === "storm") {
        const stormBoost = weatherType === "storm" ? 1.8 : 1;
        const targetRipples = Math.round(120 * weatherIntensity * stormBoost);
        // Spawn rate scales with dt so density is frame-rate independent.
        const spawnChance = weatherIntensity * 4 * stormBoost * timeDiff;
        if (
          ripplesRef.current.length < targetRipples &&
          Math.random() < spawnChance
        ) {
          // Spread evenly across the WHOLE viewport — drops are landing
          // on the table everywhere, not just near the horizon.
          const depth = Math.random();
          ripplesRef.current.push({
            x: view.left + Math.random() * view.width,
            y: view.top + Math.random() * view.height,
            age: 0,
            life: 0.6 + Math.random() * 0.5,
            radius: 1 / view.scale,
            maxRadius: (12 + depth * 28) / view.scale,
            opacity: 0.55 + depth * 0.35,
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

      // Lightning timer — only fires during a storm. Each bolt is a
      // 2-3 stage flash (the classic stutter), implemented by setting
      // flashRef high and letting it decay; occasionally we re-arm it
      // mid-decay for the secondary strike.
      if (weatherType === "storm") {
        nextFlashRef.current -= timeDiff;
        if (nextFlashRef.current <= 0) {
          flashRef.current = 0.55 + Math.random() * 0.35;
          // Either a single strike or a stutter — schedule next fire
          // soon for the second flicker, otherwise wait several seconds.
          const stutter = Math.random() < 0.55;
          nextFlashRef.current = stutter
            ? 0.08 + Math.random() * 0.12
            : 4 + Math.random() * 7;
        }
        // Decay current flash quickly (~250ms feel).
        flashRef.current = Math.max(0, flashRef.current - timeDiff * 4);
      } else {
        flashRef.current = 0;
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

          // Storm = rain + dark wash + lightning flashes. Draw the
          // darken layer FIRST so the rain streaks render bright on top.
          if (weatherType === "storm") {
            context.save();
            context.fillStyle = `rgba(8, 12, 22, ${0.42 * weatherIntensity})`;
            context.fillRect(view.left, view.top, view.width, view.height);
            context.restore();
          }

          if (weatherType === "rain" || weatherType === "storm") {
            // Single vanishing point shared by every drop. Drops far
            // from this point are "near the camera" → big bright long
            // streaks. Drops close to this point are "near the
            // vanishing horizon" → tiny faint specks.
            const v = getVanishingPoint(view);
            const maxDist = Math.sqrt(view.width * view.width + view.height * view.height) * 0.5;
            particlesRef.current.forEach((p) => {
              const speed = Math.max(1, Math.sqrt(p.vx * p.vx + p.vy * p.vy));
              const ux = p.vx / speed;
              const uy = p.vy / speed;
              const distToV = Math.sqrt(
                (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y)
              );
              const foreground = Math.max(0.05, Math.min(1, distToV / maxDist));
              const curve = foreground * foreground;
              const length =
                (4 + curve * 90 * p.size) / view.scale;
              const lineWidth =
                (0.4 + foreground * 2.6) / view.scale;

              // Tapered streak: stronger at the head (where the drop is
              // "now"), fading along the trail behind. We achieve this
              // with a linear gradient along the streak vector.
              const headX = p.x;
              const headY = p.y;
              const tailX = p.x - ux * length;
              const tailY = p.y - uy * length;
              const grad = context.createLinearGradient(
                headX,
                headY,
                tailX,
                tailY
              );
              const headAlpha = p.opacity * foreground;
              grad.addColorStop(
                0,
                `rgba(220, 235, 250, ${Math.min(1, headAlpha * 1.4)})`
              );
              grad.addColorStop(0.4, `rgba(174, 205, 235, ${headAlpha})`);
              grad.addColorStop(1, `rgba(174, 205, 235, 0)`);
              context.beginPath();
              context.strokeStyle = grad;
              context.lineWidth = lineWidth;
              context.lineCap = "round";
              context.moveTo(headX, headY);
              context.lineTo(tailX, tailY);
              context.stroke();

              // Bright leading dot for foreground drops — sells the "in
              // front of camera" feel by giving close rain a sharp head.
              if (foreground > 0.5) {
                context.beginPath();
                context.fillStyle = `rgba(245, 252, 255, ${headAlpha})`;
                context.arc(
                  headX,
                  headY,
                  Math.max(0.3, lineWidth * 0.7),
                  0,
                  Math.PI * 2
                );
                context.fill();
              }
            });

            ripplesRef.current.forEach((r) => {
              const t = Math.min(1, r.age / r.life);
              // Linear (not squared) falloff so ripples stay visible
              // through most of their life. Squared killed them halfway
              // through and made them invisible.
              const alpha = r.opacity * (1 - t);

              context.beginPath();
              context.strokeStyle = `rgba(220, 240, 255, ${alpha})`;
              context.lineWidth = (1.8 + (1 - t) * 1.4) / view.scale;
              context.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
              context.stroke();

              // Inner concentric ring fires once the ripple has expanded
              // — feels like the splash + secondary wave.
              if (t > 0.25) {
                context.beginPath();
                context.strokeStyle = `rgba(245, 252, 255, ${alpha * 0.85})`;
                context.lineWidth = 1.1 / view.scale;
                context.arc(r.x, r.y, r.radius * 0.55, 0, Math.PI * 2);
                context.stroke();
              }
            });
          } else if (weatherType === "snow") {
            // Same depth math as rain — distance from the shared
            // vanishing point drives perspective scaling. Flakes near
            // the edges are bigger + brighter; flakes near the
            // vanishing point are tiny + faint.
            const v = getVanishingPoint(view);
            const maxDist =
              Math.sqrt(view.width * view.width + view.height * view.height) *
              0.5;
            particlesRef.current.forEach((p) => {
              const distToV = Math.sqrt(
                (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y)
              );
              const foreground = Math.max(
                0.05,
                Math.min(1, distToV / maxDist)
              );
              const curve = foreground * foreground;
              const radius = (1 + curve * 5 * p.size) / view.scale;
              const alpha = p.opacity * foreground;
              // Soft fluffy flake: bright core + a translucent halo
              // (radial gradient) for a snowflake glow.
              const grad = context.createRadialGradient(
                p.x,
                p.y,
                0,
                p.x,
                p.y,
                radius * 1.6
              );
              grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
              grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.6})`);
              grad.addColorStop(1, "rgba(255, 255, 255, 0)");
              context.beginPath();
              context.fillStyle = grad;
              context.arc(p.x, p.y, radius * 1.6, 0, Math.PI * 2);
              context.fill();
            });
          } else if (weatherType === "sunny") {
            // Crepuscular godrays — wide warm cones radiating from a
            // top-left sun position, drawn additively so they brighten
            // whatever is underneath.
            const sun = getSunPosition(view);
            const diag = Math.sqrt(
              view.width * view.width + view.height * view.height
            );
            const rayLength = diag * 1.1;

            context.save();
            context.globalCompositeOperation = "lighter";

            // Soft warm wash centred on the sun — gives the scene that
            // overall sunlit feel.
            const wash = context.createRadialGradient(
              sun.x,
              sun.y,
              0,
              sun.x,
              sun.y,
              diag * 0.85
            );
            const washA = 0.18 * weatherIntensity;
            wash.addColorStop(0, `rgba(255, 236, 190, ${washA})`);
            wash.addColorStop(0.45, `rgba(255, 220, 160, ${washA * 0.55})`);
            wash.addColorStop(1, "rgba(255, 210, 140, 0)");
            context.fillStyle = wash;
            context.fillRect(view.left, view.top, view.width, view.height);

            // Ray cones. Spread across a ~110° arc that fans toward the
            // bottom-right of the table.
            const rayCount = 11;
            const arcStart = Math.PI * 0.05; // just past straight down-right
            const arcEnd = Math.PI * 0.62;
            // Slowly rotate the whole fan so the rays "shimmer" as time
            // passes — anchored to performance.now via Date for cheap drift.
            const t = (Date.now() % 60000) / 60000;
            const drift = Math.sin(t * Math.PI * 2) * 0.04;
            for (let i = 0; i < rayCount; i++) {
              const tt = i / (rayCount - 1);
              const angle = arcStart + (arcEnd - arcStart) * tt + drift;
              // Each ray gets a slightly different width and opacity to
              // avoid a banded "rake" look.
              const halfWidth =
                (0.045 + 0.025 * Math.sin(i * 1.7 + t * 6)) * Math.PI;
              const a1 = angle - halfWidth;
              const a2 = angle + halfWidth;

              const baseAlpha =
                (0.08 + 0.07 * (0.5 + 0.5 * Math.sin(i * 2.3 + t * 4))) *
                weatherIntensity;

              const x1 = sun.x + Math.cos(a1) * rayLength;
              const y1 = sun.y + Math.sin(a1) * rayLength;
              const x2 = sun.x + Math.cos(a2) * rayLength;
              const y2 = sun.y + Math.sin(a2) * rayLength;

              // Linear gradient along the ray axis fades from bright at
              // the sun to transparent at the far end.
              const midX = sun.x + Math.cos(angle) * rayLength * 0.5;
              const midY = sun.y + Math.sin(angle) * rayLength * 0.5;
              const grad = context.createLinearGradient(
                sun.x,
                sun.y,
                midX,
                midY
              );
              grad.addColorStop(0, `rgba(255, 244, 210, ${baseAlpha * 1.5})`);
              grad.addColorStop(0.4, `rgba(255, 232, 180, ${baseAlpha})`);
              grad.addColorStop(1, `rgba(255, 220, 150, 0)`);

              context.beginPath();
              context.moveTo(sun.x, sun.y);
              context.lineTo(x1, y1);
              context.lineTo(x2, y2);
              context.closePath();
              context.fillStyle = grad;
              context.fill();
            }

            // The sun disc itself — small bright core + warm halo.
            const sunRadius = Math.min(view.width, view.height) * 0.06;
            const halo = context.createRadialGradient(
              sun.x,
              sun.y,
              0,
              sun.x,
              sun.y,
              sunRadius * 4
            );
            halo.addColorStop(0, `rgba(255, 255, 240, ${0.95 * weatherIntensity})`);
            halo.addColorStop(0.2, `rgba(255, 244, 200, ${0.55 * weatherIntensity})`);
            halo.addColorStop(0.6, `rgba(255, 220, 150, ${0.18 * weatherIntensity})`);
            halo.addColorStop(1, "rgba(255, 210, 140, 0)");
            context.fillStyle = halo;
            context.beginPath();
            context.arc(sun.x, sun.y, sunRadius * 4, 0, Math.PI * 2);
            context.fill();

            // Dust motes drifting through the rays.
            particlesRef.current.forEach((p) => {
              const radius = (p.size * 1.2) / view.scale;
              const grad = context.createRadialGradient(
                p.x,
                p.y,
                0,
                p.x,
                p.y,
                radius * 2
              );
              grad.addColorStop(
                0,
                `rgba(255, 245, 215, ${p.opacity * weatherIntensity})`
              );
              grad.addColorStop(1, "rgba(255, 240, 200, 0)");
              context.fillStyle = grad;
              context.beginPath();
              context.arc(p.x, p.y, radius * 2, 0, Math.PI * 2);
              context.fill();
            });

            context.restore();
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

          // Lightning flash overlay — additive bluish-white wash whose
          // opacity is driven by flashRef (set by the storm timer).
          if (weatherType === "storm" && flashRef.current > 0) {
            context.save();
            context.globalCompositeOperation = "lighter";
            context.fillStyle = `rgba(220, 230, 255, ${flashRef.current})`;
            context.fillRect(view.left, view.top, view.width, view.height);
            context.restore();
          }

          context.fillStrokeShape(shape);
        }}
      />
    </Layer>
  );
};
