# VTT Handouts — Design Spec

**Date:** 2026-05-08
**Status:** Approved (defaults + clarifications)

## Problem

Today the only "handout" mechanic is: DM toggles `visible` on a pin and players see it on the active map. There is no event ("the DM just sent you something"), no history of past handouts, no way to highlight a *scene* (puzzle map, riddle illustration, NPC portrait), and pins inside a Forge scene that aren't on the active VTT map can't be sent at all.

The DM wants to hand out content — pins or whole scenes — mid-session, players want a popup that says "new handout!" plus an inbox they can revisit.

## Goals

1. DM can pick a Forge scene OR an individual pin within a scene and "send to players."
2. On send, every player gets a popup floating card (parchment style, like Quick Search) and the handout is added to their inbox.
3. Player can re-open any past handout from a "Handouts" sidebar tab. Dismissed popups don't auto-re-pop.
4. Snapshot semantics — handouts freeze the content at send time, so editing the pin later doesn't change what was already received.
5. DM also sees the inbox plus per-recipient read state.

## Non-Goals (v1)

- Per-recipient targeting (always all players in the campaign).
- Free-text handouts not tied to a pin/scene (the underlying schema leaves room — see future-proofing — but no UI in v1).
- Player-to-player handouts.
- Annotations on a received handout.

## Approach

### A. Send flow (DM)
The trigger is **not** right-click on a pin. It's a deliberate picker, because the DM may want to hand out scenes/pins that aren't currently active on the VTT map.

- New "Send handout…" button in two places (whichever is closer to where the DM is working):
  - In the existing **Handouts** sidebar tab (DM view) — top button.
  - In the Forge atlas-map toolbar — for the scene currently open.
- Click → modal-ish picker with two tabs:
  - **Scene** — list of campaign scenes (thumbnail + name). Pick one → "Send scene" button.
  - **Pin** — first pick a scene, then a list of its pins; "Send pin" button.
- After send: toast "Handout sent to N players."
- `is_private` etc. is implicit — handouts are always to all players in the campaign in v1.

### B. Receive flow (player)
- Realtime subscription on `vtt_handouts` filtered by campaign. On INSERT:
  - Show a parchment floating card (reuses the Quick Search `FloatingCard` component, generalized).
  - Add to the Handouts inbox.
  - Mark as `received` for this user (creates `vtt_handout_reads` row).
- Card has the same drag/resize/close behavior as Quick Search cards.
- Closing the card sets `dismissed_at`. The handout is still in the inbox.
- Reopening from the inbox creates a new floating card; closing it doesn't re-mark.

### C. Inbox sidebar tab
A new `"handouts"` left-sidebar tab (icon: `Inbox` from lucide). Visible to **both DM and player**.

- Chronological list (newest first), each row:
  - Thumbnail (pin icon for pins, scene image crop for scenes).
  - Title (`name` of pin or scene).
  - Sent-at relative time ("3m ago").
  - Unread dot if not yet `read_at` for this user.
  - Click → opens a floating card.
- DM-only badge on each row showing read count: `2/4 read`.

The existing **Handouts** panel for players (the map + pins atlas) is preserved as-is in this same tab — it's renamed to a single panel with a top "Inbox" section listing handouts and a bottom "Active map" section showing the existing AtlasMap. The DM tab gets the same dual layout but the bottom section is the scene picker for sending new handouts.

### D. Snapshot model
When a handout is sent, the row carries a frozen snapshot of the relevant fields. Later edits to the pin/scene do **not** mutate already-sent handouts.

Snapshot fields stored as JSONB:
```ts
type HandoutSnapshot =
  | {
      kind: 'pin';
      pin_id: string;        // for back-reference; nullable if pin later deleted
      scene_id: string | null;
      name: string;
      description: string | null;
      icon_type: string | null;
      background_shape: string | null;
      color: string;
      image_url: string | null; // pin's image, if any
    }
  | {
      kind: 'scene';
      scene_id: string;        // for back-reference; nullable if scene later deleted
      name: string;
      description: string | null;
      image_url: string | null; // scene's main image
      pin_count: number;
    };
```

## Schema

### `vtt_handouts`
```sql
create table vtt_handouts (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references campaigns(id) on delete cascade,
  sent_by      uuid not null references auth.users(id),
  kind         text not null check (kind in ('pin','scene')),
  -- Soft refs so deleting the source doesn't cascade-delete history.
  pin_id       uuid references location_markers(id) on delete set null,
  scene_id     uuid references scenes(id) on delete set null,
  snapshot     jsonb not null,
  created_at   timestamptz not null default now()
);

create index on vtt_handouts (campaign_id, created_at desc);
```

### `vtt_handout_reads`
```sql
create table vtt_handout_reads (
  handout_id   uuid not null references vtt_handouts(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  read_at      timestamptz,
  dismissed_at timestamptz,
  primary key (handout_id, user_id)
);
```

### RLS
- `vtt_handouts`: SELECT allowed if user is DM or member of the campaign. INSERT only by DM.
- `vtt_handout_reads`: SELECT allowed if user is DM or owner of the row. INSERT/UPDATE allowed only by `user_id = auth.uid()`. (DM can read everyone's; players can only read+write their own.)

### Realtime
Subscribe `vtt_handouts` filtered by `campaign_id` for both DM and player clients. New INSERTs trigger the popup for players.

## Architecture

### New files
- `hooks/useVttHandouts.ts` — list + subscribe + sendHandout + markRead/dismiss.
- `components/vtt/handouts/HandoutPickerDialog.tsx` — the Scene/Pin tabbed picker.
- `components/vtt/handouts/HandoutFloatingCard.tsx` — the popup card; reuses parchment styling. Internally just delegates to a `<FloatingCardShell>` extracted from quick-search.
- `components/vtt/handouts/HandoutsInbox.tsx` — list view rendered in the sidebar tab.
- `components/vtt/handouts/HandoutDetail.tsx` — body shown inside the floating card (image + parchment-styled name/description; for scenes, an "Open scene atlas" deep link if it's the active map).

### Refactors
- Extract `FloatingCardShell` from `components/vtt/quick-search/floating-card.tsx`. The shell handles drag, resize, focus-to-front, close. Quick Search's existing card body becomes the `children` prop. The handouts card uses the same shell.
- `components/vtt/vtt-handouts-panel.tsx` — split into top inbox (`<HandoutsInbox />`) and bottom existing AtlasMap. DM variant gets a "Send handout…" button instead of the AtlasMap.
- `components/vtt/vtt-left-sidebar.tsx` — add `"handouts"` to `VttLeftTab`, accept `handoutsPanel` prop, add the nav button (Inbox icon).
- `app/(vtt)/campaigns/[campaignId]/vtt/page.tsx` — wire the handoutsPanel slot. Mount a single `HandoutsAutoPopup` component near the canvas that watches new handouts via the hook and pushes them as floating cards.

### Floating card stack
Both Quick Search and Handouts cards share the same z-layer (`z-20`, below sidebars at `z-30`). The shared `focusCard` reorders within the cards array. Two stores (`useQuickSearchStore`, new `useHandoutsStore`) — they each maintain their own card array; both render through portals into the same canvas-overlay layer. No cross-store coordination needed.

### State
- `useHandoutsStore` (Zustand) — open card list, mirror to `localStorage` per `(userId, campaignId)` (same pattern as Quick Search).
- "Has been auto-popped on this device" tracked in `localStorage` so reload doesn't re-pop already-seen items.

## Error handling
- Send failure → toast "Couldn't send handout" with retry.
- Snapshot pin missing image / icon → fall back to the parchment text-only layout.
- Realtime drops → on reconnect we refetch the latest 50 handouts and dedupe by id (same StrictMode-safe pattern used elsewhere).

## Testing plan
- DM picks a scene → all online players get a popup + inbox row.
- Player closes the popup → re-opens from inbox; no auto-pop on reload.
- DM picks a pin from a scene that isn't the active VTT map → still works.
- Edit the pin's description after sending — old handout still shows the original text.
- Delete the pin — handout still readable from snapshot, optional "(source deleted)" hint.
- Two players online: read state updates per-user (DM sees `1/2 read` then `2/2 read`).
- Send 60 handouts; inbox virtualization is unnecessary (only newest 50 fetched).

## Out-of-scope follow-ups
- Per-player targeting.
- Ad-hoc text/image handouts not tied to a pin or scene.
- Markdown-rich descriptions.
- "Pin to map" (drop a handout on the canvas as a temporary marker).
- Read receipts surfaced in the player UI (right now only DM sees them).
