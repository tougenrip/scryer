import { create } from "zustand";

export type CharacterCard = {
  /** vtt store key. Same as character.id but kept distinct so future
   * features (e.g. multiple read-only views of the same character) still
   * work. */
  id: string;
  characterId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

const KEY_PREFIX = "scryer:character-cards:";

function key(userId: string | null, campaignId: string | null) {
  if (!userId || !campaignId) return null;
  return `${KEY_PREFIX}${userId}:${campaignId}`;
}

function clampPos(
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

function loadCards(
  userId: string | null,
  campaignId: string | null
): CharacterCard[] {
  if (typeof window === "undefined") return [];
  const k = key(userId, campaignId);
  if (!k) return [];
  try {
    const raw = window.localStorage.getItem(k);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<CharacterCard>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 6).map((c, i) => {
      const w = typeof c.width === "number" ? c.width : 720;
      const h = typeof c.height === "number" ? c.height : 720;
      const rawX = typeof c.x === "number" && Number.isFinite(c.x) ? c.x : 80 + i * 32;
      const rawY = typeof c.y === "number" && Number.isFinite(c.y) ? c.y : 80 + i * 32;
      const safe = clampPos(rawX, rawY, w);
      return {
        id: String(c.id ?? ""),
        characterId: String(c.characterId ?? ""),
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

let writeTimer: ReturnType<typeof setTimeout> | null = null;
function persist(
  userId: string | null,
  campaignId: string | null,
  cards: CharacterCard[]
) {
  if (typeof window === "undefined") return;
  const k = key(userId, campaignId);
  if (!k) return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(k, JSON.stringify(cards));
    } catch {
      /* ignored */
    }
  }, 250);
}

interface State {
  cards: CharacterCard[];
  ownerUserId: string | null;
  ownerCampaignId: string | null;

  bind: (userId: string | null, campaignId: string | null) => void;
  open: (characterId: string) => void;
  close: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  resize: (id: string, width: number, height: number) => void;
  focus: (id: string) => void;
}

const MAX_CARDS = 6;

export const useCharacterCardsStore = create<State>((set, get) => ({
  cards: [],
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
    });
    persist(userId, campaignId, sanitized);
  },

  open: (characterId) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    // If a card for this character is already open, just focus it.
    const existing = cards.find((c) => c.characterId === characterId);
    if (existing) {
      get().focus(existing.id);
      return;
    }
    const idx = cards.length % 5;
    const id = `${characterId}:${Date.now()}`;
    const next = [
      ...cards,
      {
        id,
        characterId,
        x: 100 + idx * 32,
        y: 80 + idx * 32,
        width: 720,
        height: 720,
      },
    ].slice(-MAX_CARDS);
    set({ cards: next });
    persist(ownerUserId, ownerCampaignId, next);
  },

  close: (id) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const next = cards.filter((c) => c.id !== id);
    set({ cards: next });
    persist(ownerUserId, ownerCampaignId, next);
  },

  move: (id, x, y) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const next = cards.map((c) => (c.id === id ? { ...c, x, y } : c));
    set({ cards: next });
    persist(ownerUserId, ownerCampaignId, next);
  },

  resize: (id, width, height) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const next = cards.map((c) =>
      c.id === id ? { ...c, width, height } : c
    );
    set({ cards: next });
    persist(ownerUserId, ownerCampaignId, next);
  },

  focus: (id) => {
    const { cards, ownerUserId, ownerCampaignId } = get();
    const target = cards.find((c) => c.id === id);
    if (!target) return;
    if (cards[cards.length - 1]?.id === id) return;
    const next = [...cards.filter((c) => c.id !== id), target];
    set({ cards: next });
    persist(ownerUserId, ownerCampaignId, next);
  },
}));
