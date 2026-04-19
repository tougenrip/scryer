"use client";

import { X, Crown, Users, Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDisplay, COLOR_THEMES, ColorTheme } from "@/contexts/display-context";
import { useRole } from "@/contexts/role-context";

const THEME_ORDER: { id: ColorTheme; sub: string; swatch: [string, string] }[] = [
  { id: "shadowforge", sub: "Charcoal · Ember",     swatch: ["#1c1917", "#ea580c"] },
  { id: "obsidian",    sub: "Near-black · Gold",    swatch: ["#111111", "#c9a84c"] },
  { id: "nightfall",   sub: "Midnight · Cyan",      swatch: ["#0f172a", "#38bdf8"] },
  { id: "grimoire",    sub: "Violet · Arcane",      swatch: ["#1a1425", "#c084fc"] },
  { id: "parchment",   sub: "Ivory · Ink (light)",  swatch: ["#f5f0e8", "#92742d"] },
  { id: "silverlight", sub: "Clean · Indigo (light)", swatch: ["#f8fafc", "#6366f1"] },
];

interface TweaksPanelProps {
  open: boolean;
  onClose: () => void;
}

export function TweaksPanel({ open, onClose }: TweaksPanelProps) {
  const { settings, setColorTheme } = useDisplay();
  const { role, setRole } = useRole();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="sc-fade-in"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        width: 300,
        background: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div className="font-serif" style={{ fontSize: 16 }}>
          Tweaks
        </div>
        <button
          className="sc-btn sc-btn-ghost sc-btn-icon sc-btn-sm"
          onClick={onClose}
          aria-label="Close tweaks"
        >
          <X size={12} />
        </button>
      </div>

      <div className="sc-label" style={{ marginBottom: 8 }}>
        Theme
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          marginBottom: 16,
        }}
      >
        {THEME_ORDER.map((t) => {
          const active = settings.colorTheme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setColorTheme(t.id)}
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                textAlign: "left",
                background: active ? "var(--accent)" : "transparent",
                border: active ? "1px solid var(--primary)" : "1px solid var(--border)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", flexShrink: 0 }}>
                <div
                  style={{
                    width: 10,
                    height: 18,
                    background: t.swatch[0],
                    borderRadius: "2px 0 0 2px",
                  }}
                />
                <div
                  style={{
                    width: 10,
                    height: 18,
                    background: t.swatch[1],
                    borderRadius: "0 2px 2px 0",
                  }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>
                  {COLOR_THEMES[t.id].name}
                </div>
                <div
                  className="truncate"
                  style={{ fontSize: 9, color: "var(--muted-foreground)" }}
                >
                  {t.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sc-label" style={{ marginBottom: 8 }}>
        View as
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => setRole("dm")}
          className={`sc-btn ${role === "dm" ? "sc-btn-primary" : ""}`}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Crown size={12} />
          DM
        </button>
        <button
          onClick={() => setRole("player")}
          className={`sc-btn ${role === "player" ? "sc-btn-primary" : ""}`}
          style={{ flex: 1, justifyContent: "center" }}
        >
          <Users size={12} />
          Player
        </button>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--muted-foreground)",
          lineHeight: 1.45,
        }}
      >
        Player view hides DM-only secrets across all pages — notes,
        relationships, encounter stats.
      </div>
    </div>,
    document.body,
  );
}

export function TweaksTrigger({ onClick }: { onClick: () => void }) {
  const { settings } = useDisplay();
  return (
    <button
      className="sc-btn"
      onClick={onClick}
      style={{ justifyContent: "flex-start" }}
      aria-label="Open tweaks"
    >
      <Palette size={14} />
      Tweaks
      <span
        style={{
          marginLeft: "auto",
          fontSize: 10,
          color: "var(--muted-foreground)",
        }}
      >
        {settings.colorTheme}
      </span>
    </button>
  );
}
