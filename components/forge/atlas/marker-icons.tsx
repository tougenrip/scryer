"use client";

import React from "react";

// Custom icon components that render as filled shapes with black outlines
// Matching the style from the reference images

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

// Geometric Shapes
export const CircleIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#000000';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '2.5';
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
  const strokeColor = style?.stroke || '#000000';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '2.5';
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
  const strokeColor = style?.stroke || '#000000';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '2.5';
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
  const strokeColor = style?.stroke || '#000000';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '2.5';
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

// Fantasy Icons
export const AxeIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
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
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const PotionIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
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
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M11 8 L13 8"
        stroke="#000000"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const MoonStarIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
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
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="5" r="1.5" fill="#ffffff" stroke="#000000" strokeWidth="1" />
      <circle cx="20.5" cy="3.5" r="0.8" fill="#ffffff" stroke="#000000" strokeWidth="1" />
      <circle cx="21.5" cy="5.5" r="0.8" fill="#ffffff" stroke="#000000" strokeWidth="1" />
      <circle cx="20" cy="6.5" r="0.8" fill="#ffffff" stroke="#000000" strokeWidth="1" />
    </svg>
  );
};

export const StarIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  const strokeColor = style?.stroke || '#000000';
  const strokeWidth = style?.strokeWidth ? String(style.strokeWidth) : '2.5';
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
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <line x1="4" y1="8" x2="16" y2="20" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
};

export const FlagIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
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
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

// Location Icons (simplified, filled style)
export const CastleIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <rect x="4" y="8" width="16" height="12" fill={fillColor} stroke="#000000" strokeWidth="2.5" />
      <rect x="6" y="12" width="2" height="8" fill="#000000" />
      <rect x="10" y="12" width="2" height="8" fill="#000000" />
      <rect x="14" y="12" width="2" height="8" fill="#000000" />
      <path d="M8 2 L10 8 L6 8 Z" fill={fillColor} stroke="#000000" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M12 2 L14 8 L10 8 Z" fill={fillColor} stroke="#000000" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 2 L18 8 L14 8 Z" fill={fillColor} stroke="#000000" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
};

export const HouseIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
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
        stroke="#000000"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const GlobeIcon: React.FC<IconProps> = ({ className, style }) => {
  const fillColor = style?.fill || style?.color || 'currentColor';
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="10" fill={fillColor} stroke="#000000" strokeWidth="2.5" />
      <path d="M2 12 L22 12" stroke="#000000" strokeWidth="2" />
      <path d="M12 2 C8 4 6 8 6 12 C6 16 8 20 12 22" stroke="#000000" strokeWidth="2" fill="none" />
      <path d="M12 2 C16 4 18 8 18 12 C18 16 16 20 12 22" stroke="#000000" strokeWidth="2" fill="none" />
    </svg>
  );
};

