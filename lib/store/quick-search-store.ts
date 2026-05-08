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
    const HEADER_MIN_VISIBLE_PX = 80;
    const HEADER_HEIGHT_PX = 28;
    const winW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const winH = typeof window !== "undefined" ? window.innerHeight : 800;
    return parsed.slice(0, 8).map((c, i) => {
      const w = typeof c.width === "number" ? c.width : 360;
      const h = typeof c.height === "number" ? c.height : 540;
      const rawX = typeof c.x === "number" && Number.isFinite(c.x) ? c.x : 100 + i * 28;
      const rawY = typeof c.y === "number" && Number.isFinite(c.y) ? c.y : 100 + i * 28;
      // Clamp so a card stuck off-screen by an earlier drag is recoverable.
      const maxX = Math.max(0, winW - HEADER_MIN_VISIBLE_PX);
      const maxY = Math.max(0, winH - HEADER_HEIGHT_PX);
      const minX = -(w - HEADER_MIN_VISIBLE_PX);
      return {
        id: String(c.id ?? ""),
        type: (c.type ?? "spells") as FloatingCard["type"],
        source: (c.source ?? "srd") as FloatingCard["source"],
        index: String(c.index ?? ""),
        x: Math.min(maxX, Math.max(minX, rawX)),
        y: Math.min(maxY, Math.max(0, rawY)),
        width: w,
        height: h,
        minimized: Boolean(c.minimized),
      };
    });
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
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const width = Math.min(360, vw - 80);
    const height = Math.min(540, vh - 80);
    const x = Math.max(8, Math.min(120 + idx * 28, vw - width - 8));
    const y = Math.max(8, Math.min(100 + idx * 28, vh - 60));
    const id = `${selected.type}:${selected.source}:${selected.index}:${Date.now()}`;
    const next = [
      ...cards,
      { ...selected, id, x, y, width, height, minimized: false },
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
