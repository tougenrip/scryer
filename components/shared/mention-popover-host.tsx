"use client";

import { useEffect, useRef, useState } from "react";
import { useMentionables } from "@/hooks/useMentionables";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  isRichTextHtmlVisuallyEmpty,
  richTextHtmlToPlainText,
} from "@/lib/utils/rich-text-html";

const ROUTE_BY_TYPE: Record<string, (campaignId: string, id: string) => string> = {
  npc: (c, id) => `/campaigns/${c}/npcs/${id}`,
  location: (c, id) => `/campaigns/${c}/locations/${id}`,
  faction: (c, id) => `/campaigns/${c}/factions/${id}`,
  quest: (c, id) => `/campaigns/${c}/quest-board?quest=${id}`,
};

const TYPE_LABELS: Record<string, string> = {
  npc: "NPC",
  location: "Location",
  faction: "Faction",
  quest: "Quest",
};

interface Props {
  /** Container ref — we wire delegated click handlers on .mention[data-id]
   * elements within. */
  containerRef: React.RefObject<HTMLElement | null>;
  campaignId: string | null;
}

/**
 * Sibling component to RichTextDisplay. Listens for clicks on tiptap-style
 * `.mention[data-id]` spans inside `containerRef` and opens a parchment
 * popover with the entity's name + description + a deep link.
 *
 * Doing it this way (rather than a custom HTML-to-React parser) means
 * RichTextDisplay's existing `dangerouslySetInnerHTML` path stays untouched —
 * we just decorate it with interactive behavior.
 */
export function MentionPopoverHost({ containerRef, campaignId }: Props) {
  const { mentionables } = useMentionables(campaignId);
  const [openAt, setOpenAt] = useState<{
    rect: DOMRect;
    id: string;
    label: string;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const span = target.closest(".mention[data-id]") as HTMLElement | null;
      if (!span || !root.contains(span)) return;
      e.preventDefault();
      e.stopPropagation();
      const id = span.dataset.id ?? "";
      const label = span.dataset.label ?? span.textContent?.replace(/^@/, "") ?? "";
      const rect = span.getBoundingClientRect();
      setOpenAt({ rect, id, label });
    };
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("click", onClick);
    };
  }, [containerRef]);

  // Resolve the clicked mention against the campaign's mentionables.
  const entity = openAt
    ? mentionables.find((m) => m.id === openAt.id) ?? null
    : null;

  return (
    <Popover
      open={!!openAt}
      onOpenChange={(o) => {
        if (!o) setOpenAt(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-hidden
          tabIndex={-1}
          // The trigger is invisible — we manually position it under the
          // clicked mention span via fixed positioning so the popover anchors
          // there.
          style={{
            position: "fixed",
            top: openAt ? openAt.rect.top : 0,
            left: openAt ? openAt.rect.left : 0,
            width: openAt ? openAt.rect.width : 0,
            height: openAt ? openAt.rect.height : 0,
            pointerEvents: "none",
            opacity: 0,
          }}
        />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={6}
        className="max-w-xs bg-popover text-popover-foreground border border-amber-500/40 shadow-lg font-serif"
      >
        {!openAt ? null : !entity ? (
          <p className="text-xs italic text-rose-400">
            @{openAt.label} — entity not found.
          </p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p
                className="font-bold text-amber-400"
                style={{ fontVariant: "small-caps" }}
              >
                {entity.name}
              </p>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {TYPE_LABELS[entity.type] ?? entity.type}
              </span>
            </div>
            {entity.description &&
              !isRichTextHtmlVisuallyEmpty(entity.description) && (
                <p className="text-xs leading-relaxed line-clamp-5">
                  {richTextHtmlToPlainText(entity.description)}
                </p>
              )}
            {campaignId && ROUTE_BY_TYPE[entity.type] && (
              <a
                href={ROUTE_BY_TYPE[entity.type](campaignId, entity.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[10px] text-amber-400 hover:underline"
              >
                Open {TYPE_LABELS[entity.type] ?? "page"} →
              </a>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
