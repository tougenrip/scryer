"use client";

import React from "react";
import { Bookmark } from "lucide-react";

// Custom icon components that render as filled shapes with black outlines
// Matching the style from the reference images

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

// Geometric Shapes
export const CircleIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
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
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
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
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
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
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
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
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
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
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? Number(style.strokeWidth) : 1.5;
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

// Fantasy Icons
export const AxeIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M8 2 L10 8 L14 8 L16 2 Z M10 8 L6 20 L10 20 L12 12 L14 20 L18 20 L14 8 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const PotionIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M10 2 L14 2 L14 6 L16 6 L16 18 C16 20 14 22 12 22 C10 22 8 20 8 18 L8 6 L10 6 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M11 8 L13 8"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
};

export const MoonStarIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M18 8 C18 12 14 16 10 16 C9 16 8 15.5 7.5 15 C10 18 14 18 17 15 C16.5 17 14.5 18.5 12 18.5 C7.5 18.5 4 15 4 10.5 C4 8 5 5.5 7 4 C6.5 4.5 6 5.5 6 6.5 C6 10 9 13 12.5 13 C13.5 13 14.5 12.5 15 12 C14 14 12 15.5 10 15.5 C6.5 15.5 4 12.5 4 9 C4 7 5 5 6.5 4 C7 6 9 7.5 11.5 7.5 C14 7.5 16 6 17 4 C17.5 5.5 18 6.5 18 8 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="19" cy="5" r="1.5" fill="#ffffff" stroke={strokeColor} strokeWidth="1" />
      <circle cx="20.5" cy="3.5" r="0.8" fill="#ffffff" stroke={strokeColor} strokeWidth="1" />
      <circle cx="21.5" cy="5.5" r="0.8" fill="#ffffff" stroke={strokeColor} strokeWidth="1" />
      <circle cx="20" cy="6.5" r="0.8" fill="#ffffff" stroke={strokeColor} strokeWidth="1" />
    </svg>
  );
};

export const StarIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M12 2 L14.5 9 L22 9 L16 13.5 L18.5 20.5 L12 15.5 L5.5 20.5 L8 13.5 L2 9 L9.5 9 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const SwordIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M6 2 L8 4 L4 8 L2 6 Z M20 4 L22 6 L18 10 L16 8 Z M12 8 L16 12 L12 16 L8 12 Z M4 18 L6 20 L2 22 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <line x1="4" y1="8" x2="16" y2="20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
};

export const FlagIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M4 2 L4 22 M4 2 L18 2 L14 8 L18 14 L4 14"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Location Icons (simplified, filled style)
export const CastleIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <rect x="4" y="8" width="16" height="12" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      <rect x="6" y="12" width="2" height="8" fill={strokeColor} />
      <rect x="10" y="12" width="2" height="8" fill={strokeColor} />
      <rect x="14" y="12" width="2" height="8" fill={strokeColor} />
      <path d="M8 2 L10 8 L6 8 Z" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M12 2 L14 8 L10 8 Z" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <path d="M16 2 L18 8 L14 8 Z" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
};

export const HouseIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M12 2 L2 12 L4 12 L4 20 L10 20 L10 14 L14 14 L14 20 L20 20 L20 12 L22 12 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const GlobeIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="10" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      <path d="M2 12 L22 12" stroke={strokeColor} strokeWidth={strokeWidth} />
      <path d="M12 2 C8 4 6 8 6 12 C6 16 8 20 12 22" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
      <path d="M12 2 C16 4 18 8 18 12 C18 16 16 20 12 22" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" />
    </svg>
  );
};

/** Crystal ball + sparkles — arcane / magic shop */
export const MagicShopIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M6 19h12v1.5H6z M9 20.5h6"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="12" cy="17" rx="5" ry="1.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      <circle cx="12" cy="10" r="5.5" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
      <path
        d="M10 7.5 L11 9 L10 10.5 M14 7.5 L13 9 L14 10.5 M12 6v2"
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M18 4l0.8 1.6L20.5 6l-1.7 0.4L18 8l-0.8-1.6L15.5 6l1.7-0.4z M5 3l0.5 1L6.5 4.5 5 5l-0.5-1L3.5 4.5z"
        fill={strokeColor}
        stroke={strokeColor}
        strokeWidth={0.5}
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Cleaver — butcher */
export const ButcherIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M5 18 L5 14 L9 6 L11 6 L11 18 L9 18 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="7" cy="16" r="1" fill={strokeColor} />
      <path
        d="M11 8 L19 4 L20 6 L12 11 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Open book — school / academy */
export const SchoolIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M12 5 L5 8 L12 11 L19 8 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M5 8 V17 L12 20 V11"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M19 8 V17 L12 20 V11"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <line x1="12" y1="11" x2="12" y2="20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
    </svg>
  );
};

/** Skull — enemy / danger */
export const EnemyIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M12 4 C8 4 5 7 5 11 V13 C5 14.5 5.8 15.8 7 16.5 L6.5 20 H9 L9.5 17 H14.5 L15 20 H17.5 L17 16.5 C18.2 15.8 19 14.5 19 13 V11 C19 7 16 4 12 4 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11" r="1.3" fill={strokeColor} />
      <circle cx="15" cy="11" r="1.3" fill={strokeColor} />
      <path
        d="M9 15 H15"
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.9}
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Treasure chest — loot */
export const LootIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M4 10 H20 V18 H4 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M4 10 L6 6 H18 L20 10"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <rect x="10" y="10" width="4" height="8" fill={strokeColor} opacity={0.35} />
      <path d="M12 6 V10" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx="12" cy="13" r="1" fill={strokeColor} />
    </svg>
  );
};

/** Sealed scroll — main quest */
export const QuestIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M8 3 H16 C17 3 18 4 18 5 V19 C18 20 17 21 16 21 H8 C7 21 6 20 6 19 V5 C6 4 7 3 8 3 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M8 3 C8 3 9 4 12 4 C15 4 16 3 16 3"
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
      <path
        d="M10.5 12 L11.5 13 L14 10.5"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <line x1="8" y1="16" x2="16" y2="16" stroke={strokeColor} strokeWidth={strokeWidth * 0.7} strokeLinecap="round" opacity={0.6} />
    </svg>
  );
};

/** Folded map with route — side quest */
export const SideQuestIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#ffffff';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '1.5';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M4 6 L10 4 L14 6 L20 4 V17 L14 19 L10 17 L4 19 Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <path
        d="M10 4 V17 M14 6 V19"
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.85}
        strokeLinecap="round"
        opacity={0.5}
      />
      <path
        d="M7 14 Q9 11 11 12 T15 9"
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth * 0.9}
        strokeLinecap="round"
      />
      <circle cx="7" cy="14" r="1.2" fill={strokeColor} />
      <circle cx="15" cy="9" r="1.2" fill={strokeColor} />
    </svg>
  );
};

