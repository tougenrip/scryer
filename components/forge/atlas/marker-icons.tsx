"use client";

import React from "react";
import { Bookmark } from "lucide-react";

/** Props for background-shape chips (filled glyphs on the marker form). */
interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

export const CircleIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || "currentColor";
  const strokeColor = style?.stroke || "#ffffff";
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : "3";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="10" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
    </svg>
  );
};

export const DiamondIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || "currentColor";
  const strokeColor = style?.stroke || "#ffffff";
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : "3";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M12 2 L22 12 L12 22 L2 12 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const SquareIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || "currentColor";
  const strokeColor = style?.stroke || "#ffffff";
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : "3";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <rect x="2" y="2" width="20" height="20" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} rx="2" />
    </svg>
  );
};

export const TriangleIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || "currentColor";
  const strokeColor = style?.stroke || "#ffffff";
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : "3";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M12 2 L22 20 L2 20 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Classic map pin — shared path for picker + atlas frame */
export const TEARDROP_PIN_PATH =
  "M12 2.8 C17 2.8 20.2 6.5 20.2 11.2 C20.2 15 18 18 12 22.8 C6 18 3.8 15 3.8 11.2 C3.8 6.5 7 2.8 12 2.8 Z";

export const TeardropIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || "currentColor";
  const strokeColor = style?.stroke || "#ffffff";
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : "3";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d={TEARDROP_PIN_PATH}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const BookmarkIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || "currentColor";
  const strokeColor = style?.stroke || "#ffffff";
  const strokeWidth = style?.strokeWidth ? Number(style.strokeWidth) : 3;
  return (
    <Bookmark
      className={className}
      style={{
        ...style,
        fill: fillColor,
        stroke: strokeColor,
        strokeWidth: strokeWidth,
      }}
    />
  );
};
