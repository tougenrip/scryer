import { create } from "zustand";

export type QuickSearchTab =
  | "spells"
  | "monsters"
  | "equipment"
  | "magic-items"
  | "conditions"
  | "races"
  | "classes"
  | "features";

export type EntityRef = {
  type: QuickSearchTab;
  source: "srd" | "homebrew";
  index: string;
};

export type FloatingCard = EntityRef & {
  id: string;
  x: number;
  y: number;
  minimized: boolean;
};

const STORAGE_KEY_PREFIX = "scryer:quick-search-cards:";

function storageKey(userId: string | null, campaignId: string | null) {
  if (!userId || !campaignId) return null;
  return `${STORAGE_KEY_PREFIX}${userId}:${campaignId}`;
}

function loadCards(userId: string | null, campaignId: string | null): FloatingCard[] {
  if (typeof window === "undefined") return [];
  const key = storageKey(userId, campaignId);
  if (!key) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FloatingCard[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 8);
  } catch {
    return [];
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
function persistCards(
  userId: string | null,
  campaignId: string | null,
  cards: FloatingCard[]
) {
  if (typeof window === "undefined") return;
  const key = storageKey(userId, campaignId);
  if (!key) return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(cards));
    } catch {
      /* quota errors are silent */
    }
  }, 250);
}

interface QuickSearchState {
  drawerOpen: boolean;
  activeTab: QuickSearchTab;
  selected: EntityRef | null;
  cards: FloatingCard[];
  ownerUserId: string | null;
  ownerCampaignId: string | null;

  bind: (userId: string | null, campaignId: string | null) => void;
  open: (target?: EntityRef) => void;
  close: () => void;
  setTab: (t: QuickSearchTab) => void;
  select: (ref: EntityRef | null) => void;
  popOut: () => void;
  closeCard: (id: string) => void;
  toggleMinimize: (id: string) => void;
  moveCard: (id: string, x: number, y: number) => void;
}

const MAX_CARDS = 8;

export const useQuickSearchStore = create<QuickSearchState>((set, get) => ({
  drawerOpen: false,
  activeTab: "spells",
  selected: null,
  cards: [],
  ownerUserId: null,
  ownerCampaignId: null,

  bind: (userId, campaignId) => {
    const cur = get();
    if (cur.ownerUserId === userId && cur.ownerCampaignId === campaignId) return;
    set({
      ownerUserId: userId,
      ownerCampaignId: campaignId,
      cards: loadCards(userId, campaignId),
    });
  },

  open: (target) =>
    set((s) => ({
      drawerOpen: true,
      activeTab: target?.type ?? s.activeTab,
      selected: target ?? s.selected,
    })),

  close: () => set({ drawerOpen: false }),

  setTab: (t) => set({ activeTab: t, selected: null }),

  select: (ref) => set({ selected: ref }),

  popOut: () => {
    const { selected, cards, ownerUserId, ownerCampaignId } = get();
    if (!selected) return;
    // Cascade position: 24px offset per existing card, wrap at 6.
    const idx = cards.length % 6;
    const x = 120 + idx * 28;
    const y = 100 + idx * 28;
    const id = `${selected.type}:${selected.source}:${selected.index}:${Date.now()}`;
    const next = [
      ...cards,
      { ...selected, id, x, y, minimized: false },
    ].slice(-MAX_CARDS);
    set({ cards: next });
    persistCards(ownerUserId, ownerCampaignId, next);
  },

  closeCard: (id) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const next = cards.filter((c) => c.id !== id);
    set({ cards: next });
    persistCards(ownerUserId, ownerCampaignId, next);
  },

  toggleMinimize: (id) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const next = cards.map((c) =>
      c.id === id ? { ...c, minimized: !c.minimized } : c
    );
    set({ cards: next });
    persistCards(ownerUserId, ownerCampaignId, next);
  },

  moveCard: (id, x, y) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const next = cards.map((c) => (c.id === id ? { ...c, x, y } : c));
    set({ cards: next });
    persistCards(ownerUserId, ownerCampaignId, next);
  },
}));
