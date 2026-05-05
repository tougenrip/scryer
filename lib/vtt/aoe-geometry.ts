import type { AoeShape } from "@/types/vtt-aoe";

const CONE_HALF_ANGLE_RAD = Math.PI / 4;
const LINE_WIDTH_FT = 5;
const RING_THICKNESS_FT = 5;

export interface DragPoints {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function distancePx(d: DragPoints): number {
  const dx = d.endX - d.startX;
  const dy = d.endY - d.startY;
  return Math.hypot(dx, dy);
}

export function dragAngleRad(d: DragPoints): number {
  return Math.atan2(d.endY - d.startY, d.endX - d.startX);
}

export function snapDistanceToFeet(
  px: number,
  gridSize: number,
  feetPerSquare: number
): { feet: number; px: number } {
  if (gridSize <= 0 || feetPerSquare <= 0) {
    return { feet: feetPerSquare, px: gridSize };
  }
  const rawSquares = px / gridSize;
  const squares = Math.max(1, Math.round(rawSquares));
  return { feet: squares * feetPerSquare, px: squares * gridSize };
}

export function feetToPx(feet: number, gridSize: number, feetPerSquare: number): number {
  if (feetPerSquare <= 0) return 0;
  return (feet / feetPerSquare) * gridSize;
}

export function computeConePolygon(
  originX: number,
  originY: number,
  angleRad: number,
  lengthPx: number
): number[] {
  const leftAngle = angleRad - CONE_HALF_ANGLE_RAD;
  const rightAngle = angleRad + CONE_HALF_ANGLE_RAD;
  return [
    originX,
    originY,
    originX + Math.cos(leftAngle) * lengthPx,
    originY + Math.sin(leftAngle) * lengthPx,
    originX + Math.cos(rightAngle) * lengthPx,
    originY + Math.sin(rightAngle) * lengthPx,
  ];
}

export function computeLineRect(
  originX: number,
  originY: number,
  angleRad: number,
  lengthPx: number,
  widthPx: number
): {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  offsetX: number;
  offsetY: number;
} {
  return {
    x: originX,
    y: originY,
    width: lengthPx,
    height: widthPx,
    rotationDeg: (angleRad * 180) / Math.PI,
    offsetX: 0,
    offsetY: widthPx / 2,
  };
}

export function lineWidthFt(): number {
  return LINE_WIDTH_FT;
}

export function ringThicknessFt(): number {
  return RING_THICKNESS_FT;
}

export function computeSquareRect(
  originX: number,
  originY: number,
  _angleRad: number,
  lengthPx: number
): {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg: number;
  offsetX: number;
  offsetY: number;
} {
  // Cube AOE is axis-aligned and centered on the origin so it expands on all
  // four sides simultaneously as the user drags.
  return {
    x: originX,
    y: originY,
    width: lengthPx,
    height: lengthPx,
    rotationDeg: 0,
    offsetX: lengthPx / 2,
    offsetY: lengthPx / 2,
  };
}

export function snapToGridCenter(
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } {
  if (gridSize <= 0) return { x, y };
  return {
    x: (Math.floor(x / gridSize) + 0.5) * gridSize,
    y: (Math.floor(y / gridSize) + 0.5) * gridSize,
  };
}

export function snapToGridCorner(
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } {
  if (gridSize <= 0) return { x, y };
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

/**
 * Compute the snapped origin for a shape so its edges align to grid lines.
 * Circle/Cone/Ring emanate from a point → grid center.
 * Square is centered on origin → snap to grid center for odd-grid sizes,
 * grid corner for even-grid sizes (so edges land on grid lines either way).
 * Line's length axis snaps to grid corner so its end lands on a grid line;
 * its width axis snaps to grid center so the 5ft width's edges land on grid lines.
 */
export function effectiveOriginForShape(
  shape: AoeShape,
  rawX: number,
  rawY: number,
  lengthPx: number,
  angleRad: number,
  gridSize: number
): { x: number; y: number } {
  switch (shape) {
    case "circle":
    case "cone":
    case "ring":
      return snapToGridCenter(rawX, rawY, gridSize);
    case "square": {
      const squares = Math.max(1, Math.round(lengthPx / gridSize));
      return squares % 2 === 1
        ? snapToGridCenter(rawX, rawY, gridSize)
        : snapToGridCorner(rawX, rawY, gridSize);
    }
    case "line": {
      const cos = Math.cos(angleRad);
      const sin = Math.sin(angleRad);
      if (Math.abs(cos) >= Math.abs(sin)) {
        return {
          x: Math.round(rawX / gridSize) * gridSize,
          y: (Math.floor(rawY / gridSize) + 0.5) * gridSize,
        };
      }
      return {
        x: (Math.floor(rawX / gridSize) + 0.5) * gridSize,
        y: Math.round(rawY / gridSize) * gridSize,
      };
    }
  }
}

export function computeRingRadii(
  lengthPx: number,
  thicknessPx: number
): { outer: number; inner: number } {
  const outer = Math.max(thicknessPx, lengthPx);
  const inner = Math.max(1, outer - thicknessPx);
  return { outer, inner };
}

/**
 * Hit-test helpers used by the eraser tool. All inputs are in stage coordinates.
 */
export function pointInAoe(
  px: number,
  py: number,
  shape: AoeShape,
  originX: number,
  originY: number,
  lengthPx: number,
  rotationRad: number,
  ringThicknessPx: number,
  lineWidthPx: number
): boolean {
  const dx = px - originX;
  const dy = py - originY;
  switch (shape) {
    case "circle":
      return Math.hypot(dx, dy) <= lengthPx;
    case "ring": {
      const d = Math.hypot(dx, dy);
      const inner = Math.max(1, lengthPx - ringThicknessPx);
      return d >= inner && d <= lengthPx;
    }
    case "cone": {
      const d = Math.hypot(dx, dy);
      if (d > lengthPx) return false;
      if (d < 0.0001) return true;
      const a = Math.atan2(dy, dx);
      let diff = a - rotationRad;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      return Math.abs(diff) <= Math.PI / 4;
    }
    case "square": {
      // Axis-aligned, centered on origin (rotationRad ignored).
      const half = lengthPx / 2;
      return Math.abs(dx) <= half && Math.abs(dy) <= half;
    }
    case "line": {
      // Rotated rect: anchored at origin, extending forward `lengthPx`,
      // width centered perpendicular to drag axis.
      const cos = Math.cos(-rotationRad);
      const sin = Math.sin(-rotationRad);
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      const halfW = lineWidthPx / 2;
      return lx >= 0 && lx <= lengthPx && ly >= -halfW && ly <= halfW;
    }
  }
}

function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 1e-6) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

export function pointNearPolyline(
  px: number,
  py: number,
  points: { x: number; y: number }[],
  thresholdPx: number
): boolean {
  if (points.length === 0) return false;
  if (points.length === 1) {
    return Math.hypot(px - points[0].x, py - points[0].y) <= thresholdPx;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (pointToSegmentDistance(px, py, a.x, a.y, b.x, b.y) <= thresholdPx) {
      return true;
    }
  }
  return false;
}

export function aoeLabelText(shape: AoeShape, feet: number): string {
  switch (shape) {
    case "circle":
      return `${feet} ft radius`;
    case "cone":
      return `${feet} ft cone`;
    case "line":
      return `${feet} ft line`;
    case "square":
      return `${feet} ft square`;
    case "ring":
      return `${feet} ft ring`;
  }
}
