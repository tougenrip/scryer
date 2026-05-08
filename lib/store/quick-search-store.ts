import { create } from "zustand";

export type QuickSearchTab =
  | "spells"
  | "monsters"
  | "equipment"
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
  width: number;
  height: number;
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
    const parsed = JSON.parse(raw) as Partial<FloatingCard>[];
    if (!Array.isArray(parsed)) return [];
    // Backfill defaults for fields added after the persisted shape was first
    // written (e.g., width/height) so old localStorage data still renders.
    return parsed.slice(0, 8).map((c) => ({
      id: String(c.id ?? ""),
      type: (c.type ?? "spells") as FloatingCard["type"],
      source: (c.source ?? "srd") as FloatingCard["source"],
      index: String(c.index ?? ""),
      x: typeof c.x === "number" ? c.x : 100,
      y: typeof c.y === "number" ? c.y : 100,
      width: typeof c.width === "number" ? c.width : 360,
      height: typeof c.height === "number" ? c.height : 540,
      minimized: Boolean(c.minimized),
    }));
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
  resizeCard: (id: string, width: number, height: number) => void;
  /** Bring a card to the front (last in z-order via DOM order). */
  focusCard: (id: string) => void;
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
      { ...selected, id, x, y, width: 360, height: 540, minimized: false },
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

  resizeCard: (id, width, height) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const next = cards.map((c) =>
      c.id === id ? { ...c, width, height } : c
    );
    set({ cards: next });
    persistCards(ownerUserId, ownerCampaignId, next);
  },

  focusCard: (id) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const target = cards.find((c) => c.id === id);
    if (!target) return;
    // Already on top? No-op so we don't churn state on every pointerdown.
    if (cards[cards.length - 1]?.id === id) return;
    const next = [...cards.filter((c) => c.id !== id), target];
    set({ cards: next });
    persistCards(ownerUserId, ownerCampaignId, next);
  },
}));
