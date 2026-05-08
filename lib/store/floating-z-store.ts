import { create } from "zustand";

/**
 * Single source of truth for floating-card z-ordering across every store
 * (quick search, handouts, character sheets, …). Each store still owns
 * its own per-card data, but the on-screen stacking is decided here.
 *
 * Stays inside the [20, 29] band so cards never paint over the sidebars
 * (z-30) or modal dialogs.
 */
const Z_MIN = 20;
const Z_MAX = 29;

interface FloatingZState {
  /** card-id → current z. */
  zMap: Record<string, number>;
  /** Bring a card to the front of all floating cards. */
  focus: (id: string) => void;
  /** Drop a card from tracking when it closes. */
  release: (id: string) => void;
  /** Get the current z for a card; default to Z_MIN. */
  getZ: (id: string) => number;
}

export const useFloatingZStore = create<FloatingZState>((set, get) => ({
  zMap: {},

  focus: (id) =>
    set((s) => {
      const entries = Object.entries(s.zMap);
      const currentMax = entries.length
        ? Math.max(...entries.map(([, z]) => z))
        : Z_MIN - 1;
      // No-op if already topmost.
      if (s.zMap[id] === currentMax && currentMax >= Z_MIN) return s;
      const next = currentMax + 1;
      if (next <= Z_MAX) {
        return { zMap: { ...s.zMap, [id]: next } };
      }
      // Normalize: re-rank everyone starting at Z_MIN, then place this card on top.
      const sorted = entries
        .filter(([k]) => k !== id)
        .sort((a, b) => a[1] - b[1])
        .map(([k]) => k);
      const renormalized: Record<string, number> = {};
      sorted.forEach((k, i) => {
        renormalized[k] = Math.min(Z_MIN + i, Z_MAX - 1);
      });
      renormalized[id] = Math.min(Z_MIN + sorted.length, Z_MAX);
      return { zMap: renormalized };
    }),

  release: (id) =>
    set((s) => {
      if (!(id in s.zMap)) return s;
      const next = { ...s.zMap };
      delete next[id];
      return { zMap: next };
    }),

  getZ: (id) => get().zMap[id] ?? Z_MIN,
}));
