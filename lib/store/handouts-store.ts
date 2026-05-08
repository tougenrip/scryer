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

/** Clamp a persisted position so the card header is always reachable in
 * the current viewport — guards against stale localStorage from a smaller
 * window or an old build that allowed off-screen drags. */
function sanitizePos(
  x: number,
  y: number,
  width: number
): { x: number; y: number } {
  if (typeof window === "undefined") return { x, y };
  const HEADER_MIN_VISIBLE_PX = 80;
  const HEADER_HEIGHT_PX = 28;
  const maxX = Math.max(0, window.innerWidth - HEADER_MIN_VISIBLE_PX);
  const maxY = Math.max(0, window.innerHeight - HEADER_HEIGHT_PX);
  const minX = -(width - HEADER_MIN_VISIBLE_PX);
  return {
    x: Math.min(maxX, Math.max(minX, x)),
    y: Math.min(maxY, Math.max(0, y)),
  };
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
    return parsed.slice(0, 8).map((c, i) => {
      const w = typeof c.width === "number" ? c.width : 360;
      const h = typeof c.height === "number" ? c.height : 480;
      const rawX = typeof c.x === "number" && Number.isFinite(c.x) ? c.x : 140 + i * 28;
      const rawY = typeof c.y === "number" && Number.isFinite(c.y) ? c.y : 140 + i * 28;
      const safe = sanitizePos(rawX, rawY, w);
      return {
        id: String(c.id ?? ""),
        x: safe.x,
        y: safe.y,
        width: w,
        height: h,
      };
    });
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
    const sanitized = loadCards(userId, campaignId);
    set({
      ownerUserId: userId,
      ownerCampaignId: campaignId,
      cards: sanitized,
      seen: loadSeen(userId, campaignId),
    });
    // Write back so off-screen positions are healed for next session even
    // before the user touches a card.
    persistCards(userId, campaignId, sanitized);
  },

  open: (handoutId) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    if (cards.some((c) => c.id === handoutId)) {
      // Already open: bring to front.
      get().focusCard(handoutId);
      return;
    }
    const idx = cards.length % 6;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const width = Math.min(360, vw - 80);
    const height = Math.min(480, vh - 80);
    const next: HandoutCard[] = [
      ...cards,
      {
        id: handoutId,
        x: Math.max(8, Math.min(160 + idx * 28, vw - width - 8)),
        y: Math.max(8, Math.min(140 + idx * 28, vh - 60)),
        width,
        height,
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
