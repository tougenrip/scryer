import { create } from "zustand";

/**
 * Tracks which duel ids the current user has chosen to view in their
 * local DuelLayer modal. Decoupled from the duel data so the toast
 * notification (DuelLayer) and the "Open" buttons in the Duels tab can
 * coordinate without lifting state through the tree.
 */
interface DuelViewState {
  viewing: Set<string>;
  open: (id: string) => void;
  close: (id: string) => void;
  isOpen: (id: string) => boolean;
}

export const useDuelViewStore = create<DuelViewState>((set, get) => ({
  viewing: new Set(),
  open: (id) =>
    set((s) => {
      if (s.viewing.has(id)) return s;
      const next = new Set(s.viewing);
      next.add(id);
      return { viewing: next };
    }),
  close: (id) =>
    set((s) => {
      if (!s.viewing.has(id)) return s;
      const next = new Set(s.viewing);
      next.delete(id);
      return { viewing: next };
    }),
  isOpen: (id) => get().viewing.has(id),
}));
