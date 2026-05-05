"use client";

import { type CSSProperties, type ReactNode } from "react";

type ForgeTabHeaderProps = {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** margin below header in px (handoff uses 14) */
  marginBottom?: number;
  /** Merged onto the title line (e.g. letterSpacing for all-caps tab titles). */
  titleStyle?: CSSProperties;
};

/**
 * Shared title row for Forge tab bodies — matches handoff: font-serif 20px title,
 * 12px muted subtitle, trailing actions with sc-btn.
 */
export function ForgeTabHeader({
  title,
  subtitle,
  actions,
  marginBottom = 14,
  titleStyle,
}: ForgeTabHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom,
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      <div>
        <div
          className="font-serif"
          style={{ fontSize: 20, lineHeight: 1.2, ...titleStyle }}
        >
          {title}
        </div>
        {subtitle != null && subtitle !== false && (
          <div style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
            {subtitle}
          </div>
        )}
      </div>
      {actions != null ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {actions}
        </div>
      ) : null}
    </div>
  );
}

/** Outer padding for scrollable forge tab content (handoff: 16px 20px). */
export const forgeTabPaddingClass = "px-5 py-4";
