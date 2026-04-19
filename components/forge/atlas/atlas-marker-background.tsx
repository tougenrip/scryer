"use client";

import { useId } from "react";
import type { LocationMarker } from "@/hooks/useForgeContent";
import { TEARDROP_PIN_PATH } from "@/components/forge/atlas/marker-icons";

type MarkerShape = NonNullable<LocationMarker["background_shape"]>;

const BOOKMARK_D =
  "M7 2.5 H17 C17.83 2.5 18.5 3.17 18.5 4 V21.5 L12 17.2 L5.5 21.5 V4 C5.5 3.17 6.17 2.5 7 2.5 Z";

const white = "#ffffff";
const ink = "#0a0a0a";

/** Thin outer rim (black). */
const OUTER_INK_W = 1.1;
/** Wide band between black and fill (white) — visibly thicker than black. */
const INNER_WHITE_W = 2.75;

/** Approximate center for symmetric scaling (viewBox 24×24). */
const TEARDROP_ORIGIN = { x: 12, y: 12.5 };

/**
 * Atlas marker frame: thin black outer rim, wide white band, saturated interior.
 * Drop shadow applies only to the rings — fill is drawn on top without the filter
 * so feDropShadow does not darken the edge between white and marker color.
 */
export function AtlasMarkerBackground({
  shape,
  fill,
  size,
}: {
  shape: MarkerShape;
  fill: string;
  size: number;
}) {
  const rawId = useId().replace(/:/g, "");
  const fid = `mk-${rawId}`;

  const shadow = (
    <filter
      id={`${fid}-drop`}
      x="-45%"
      y="-45%"
      width="190%"
      height="190%"
      filterUnits="objectBoundingBox"
    >
      <feDropShadow
        dx="0"
        dy="1.25"
        stdDeviation="1.35"
        floodColor="#000000"
        floodOpacity="0.42"
      />
    </filter>
  );

  if (shape === "circle") {
    // White stroke inner radius ≈ 8.52 - INNER_WHITE_W/2; fill meets it (no gap / no shadow bleed)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="shrink-0 block"
        aria-hidden
      >
        <defs>{shadow}</defs>
        <g filter={`url(#${fid}-drop)`}>
          <circle
            cx="12"
            cy="12"
            r="10.28"
            fill="none"
            stroke={ink}
            strokeWidth={OUTER_INK_W}
          />
          <circle
            cx="12"
            cy="12"
            r="8.52"
            fill="none"
            stroke={white}
            strokeWidth={INNER_WHITE_W}
          />
        </g>
        <circle cx="12" cy="12" r="7.14" fill={fill} stroke="none" />
      </svg>
    );
  }

  if (shape === "diamond") {
    const d = "M12 2 L22 12 L12 22 L2 12 Z";
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="shrink-0 block"
        aria-hidden
      >
        <defs>{shadow}</defs>
        <g filter={`url(#${fid}-drop)`}>
          <path
            d={d}
            fill="none"
            stroke={ink}
            strokeWidth={OUTER_INK_W}
            strokeLinejoin="round"
            transform="translate(12,12) scale(1.07) translate(-12,-12)"
          />
          <path
            d={d}
            fill="none"
            stroke={white}
            strokeWidth={INNER_WHITE_W}
            strokeLinejoin="round"
            transform="translate(12,12) scale(0.975) translate(-12,-12)"
          />
        </g>
        <path
          d={d}
          fill={fill}
          stroke="none"
          transform="translate(12,12) scale(0.865) translate(-12,-12)"
        />
      </svg>
    );
  }

  if (shape === "square") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="shrink-0 block"
        aria-hidden
      >
        <defs>{shadow}</defs>
        <g filter={`url(#${fid}-drop)`}>
          <rect
            x="1.22"
            y="1.22"
            width="21.56"
            height="21.56"
            rx="2.7"
            fill="none"
            stroke={ink}
            strokeWidth={OUTER_INK_W}
          />
          <rect
            x="2.35"
            y="2.35"
            width="19.3"
            height="19.3"
            rx="2.25"
            fill="none"
            stroke={white}
            strokeWidth={INNER_WHITE_W}
          />
        </g>
        <rect x="3.72" y="3.72" width="16.56" height="16.56" rx="1.45" fill={fill} stroke="none" />
      </svg>
    );
  }

  if (shape === "triangle") {
    const d = "M12 2 L22 20 L2 20 Z";
    const ox = 12;
    const oy = 11.5;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="shrink-0 block"
        aria-hidden
      >
        <defs>{shadow}</defs>
        <g filter={`url(#${fid}-drop)`}>
          <path
            d={d}
            fill="none"
            stroke={ink}
            strokeWidth={OUTER_INK_W}
            strokeLinejoin="round"
            transform={`translate(${ox},${oy}) scale(1.06) translate(${-ox},${-oy})`}
          />
          <path
            d={d}
            fill="none"
            stroke={white}
            strokeWidth={INNER_WHITE_W}
            strokeLinejoin="round"
            transform={`translate(${ox},${oy}) scale(0.97) translate(${-ox},${-oy})`}
          />
        </g>
        <path
          d={d}
          fill={fill}
          stroke="none"
          transform={`translate(${ox},${oy}) scale(0.885) translate(${-ox},${-oy})`}
        />
      </svg>
    );
  }

  if (shape === "teardrop") {
    const { x: ox, y: oy } = TEARDROP_ORIGIN;
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="shrink-0 block"
        aria-hidden
      >
        <defs>{shadow}</defs>
        <g filter={`url(#${fid}-drop)`}>
          <path
            d={TEARDROP_PIN_PATH}
            fill="none"
            stroke={ink}
            strokeWidth={OUTER_INK_W}
            strokeLinejoin="round"
            transform={`translate(${ox},${oy}) scale(1.055) translate(${-ox},${-oy})`}
          />
          <path
            d={TEARDROP_PIN_PATH}
            fill="none"
            stroke={white}
            strokeWidth={INNER_WHITE_W}
            strokeLinejoin="round"
            transform={`translate(${ox},${oy}) scale(0.985) translate(${-ox},${-oy})`}
          />
        </g>
        <path
          d={TEARDROP_PIN_PATH}
          fill={fill}
          stroke="none"
          transform={`translate(${ox},${oy}) scale(0.895) translate(${-ox},${-oy})`}
        />
      </svg>
    );
  }

  // bookmark
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="shrink-0 block"
      aria-hidden
    >
      <defs>{shadow}</defs>
      <g filter={`url(#${fid}-drop)`}>
        <path
          d={BOOKMARK_D}
          fill="none"
          stroke={ink}
          strokeWidth={OUTER_INK_W}
          strokeLinejoin="round"
          transform="translate(12,12) scale(1.055) translate(-12,-12)"
        />
        <path
          d={BOOKMARK_D}
          fill="none"
          stroke={white}
          strokeWidth={INNER_WHITE_W}
          strokeLinejoin="round"
          transform="translate(12,12) scale(0.985) translate(-12,-12)"
        />
      </g>
      <path
        d={BOOKMARK_D}
        fill={fill}
        stroke="none"
        transform="translate(12,12) scale(0.905) translate(-12,-12)"
      />
    </svg>
  );
}
