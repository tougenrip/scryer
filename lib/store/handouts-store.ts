import { create } from "zustand";

export type HandoutCard = {
  /** vtt_handouts.id — unique per send event. */
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const KEY_PREFIX = "scryer:handout-cards:";
const SEEN_KEY_PREFIX = "scryer:handout-seen:";

function cardsKey(userId: string | null, campaignId: string | null) {
  if (!userId || !campaignId) return null;
  return `${KEY_PREFIX}${userId}:${campaignId}`;
}
function seenKey(userId: string | null, campaignId: string | null) {
  if (!userId || !campaignId) return null;
  return `${SEEN_KEY_PREFIX}${userId}:${campaignId}`;
}

function loadCards(userId: string | null, campaignId: string | null): HandoutCard[] {
  if (typeof window === "undefined") return [];
  const k = cardsKey(userId, campaignId);
  if (!k) return [];
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<HandoutCard>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 8).map((c) => ({
      id: String(c.id ?? ""),
      x: typeof c.x === "number" ? c.x : 140,
      y: typeof c.y === "number" ? c.y : 140,
      width: typeof c.width === "number" ? c.width : 360,
      height: typeof c.height === "number" ? c.height : 480,
    }));
  } catch {
    return [];
  }
}

function loadSeen(userId: string | null, campaignId: string | null): Set<string> {
  if (typeof window === "undefined") return new Set();
  const k = seenKey(userId, campaignId);
  if (!k) return new Set();
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null;
function persistCards(
  userId: string | null,
  campaignId: string | null,
  cards: HandoutCard[]
) {
  if (typeof window === "undefined") return;
  const k = cardsKey(userId, campaignId);
  if (!k) return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(k, JSON.stringify(cards));
    } catch {
      /* quota errors are silent */
    }
  }, 250);
}

function persistSeen(
  userId: string | null,
  campaignId: string | null,
  seen: Set<string>
) {
  if (typeof window === "undefined") return;
  const k = seenKey(userId, campaignId);
  if (!k) return;
  try {
    window.localStorage.setItem(k, JSON.stringify(Array.from(seen)));
  } catch {
    /* quota errors are silent */
  }
}

interface HandoutsState {
  cards: HandoutCard[];
  /** Handout IDs that have already been auto-popped on this device. */
  seen: Set<string>;
  ownerUserId: string | null;
  ownerCampaignId: string | null;

  bind: (userId: string | null, campaignId: string | null) => void;
  /** Open a card for the given handout id. No-op if already open. */
  open: (handoutId: string) => void;
  /** Mark a handout as auto-popped on this device. */
  markSeen: (handoutId: string) => void;
  hasSeen: (handoutId: string) => boolean;
  closeCard: (id: string) => void;
  moveCard: (id: string, x: number, y: number) => void;
  resizeCard: (id: string, width: number, height: number) => void;
  focusCard: (id: string) => void;
}

const MAX_CARDS = 8;

export const useHandoutsStore = create<HandoutsState>((set, get) => ({
  cards: [],
  seen: new Set(),
  ownerUserId: null,
  ownerCampaignId: null,

  bind: (userId, campaignId) => {
    const cur = get();
    if (cur.ownerUserId === userId && cur.ownerCampaignId === campaignId) return;
    set({
      ownerUserId: userId,
      ownerCampaignId: campaignId,
      cards: loadCards(userId, campaignId),
      seen: loadSeen(userId, campaignId),
    });
  },

  open: (handoutId) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    if (cards.some((c) => c.id === handoutId)) {
      // Already open: bring to front.
      get().focusCard(handoutId);
      return;
    }
    const idx = cards.length % 6;
    const next: HandoutCard[] = [
      ...cards,
      {
        id: handoutId,
        x: 160 + idx * 28,
        y: 140 + idx * 28,
        width: 360,
        height: 480,
      },
    ].slice(-MAX_CARDS);
    set({ cards: next });
    persistCards(ownerUserId, ownerCampaignId, next);
  },

  markSeen: (handoutId) => {
    const { seen, ownerUserId, ownerCampaignId } = get();
    if (seen.has(handoutId)) return;
    const next = new Set(seen);
    next.add(handoutId);
    set({ seen: next });
    persistSeen(ownerUserId, ownerCampaignId, next);
  },

  hasSeen: (handoutId) => get().seen.has(handoutId),

  closeCard: (id) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const next = cards.filter((c) => c.id !== id);
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
    if (cards[cards.length - 1]?.id === id) return;
    const next = [...cards.filter((c) => c.id !== id), target];
    set({ cards: next });
    persistCards(ownerUserId, ownerCampaignId, next);
  },
}));
