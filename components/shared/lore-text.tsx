"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  isRichTextHtmlVisuallyEmpty,
  richTextHtmlToPlainText,
} from "@/lib/utils/rich-text-html";

/**
 * Inline `@type:id` mentions inside lore text. Supported types:
 *   @npc:<id>
 *   @location:<id>
 *   @faction:<id>
 *   @scene:<id>
 *
 * Renders the mention as a clickable amber-tinted badge. Hover/click opens a
 * popover with the entity's name and a short description, fetched on demand
 * (and memoized per-entity inside this module so a 200-NPC wiki page doesn't
 * fan out 200 fetches).
 *
 * Authors paste the id in directly — there's no fancy editor autocomplete in
 * v1, but the format is forgiving (matches plain-text descriptions too).
 */

type MentionKind = "npc" | "location" | "faction" | "scene";

interface MentionEntity {
  id: string;
  name: string | null;
  description: string | null;
  kind: MentionKind;
}

const TABLE_BY_KIND: Record<MentionKind, string> = {
  npc: "npcs",
  location: "locations",
  faction: "factions",
  scene: "scenes",
};

const ROUTE_BY_KIND: Record<MentionKind, (campaignId: string, id: string) => string> = {
  npc: (c, id) => `/campaigns/${c}/npcs/${id}`,
  location: (c, id) => `/campaigns/${c}/locations/${id}`,
  faction: (c, id) => `/campaigns/${c}/factions/${id}`,
  scene: (c, id) => `/campaigns/${c}/scenes/${id}`,
};

const cache = new Map<string, Promise<MentionEntity | null>>();

function fetchMention(
  kind: MentionKind,
  id: string
): Promise<MentionEntity | null> {
  const key = `${kind}:${id}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const promise = (async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from(TABLE_BY_KIND[kind])
      .select("id, name, description")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id as string,
      name: (data.name as string) ?? null,
      description: (data.description as string) ?? null,
      kind,
    };
  })();
  cache.set(key, promise);
  return promise;
}

const MENTION_RE = /@(npc|location|faction|scene):([a-f0-9-]{8,})/gi;

interface LoreTextProps {
  text: string | null | undefined;
  campaignId: string | null;
  className?: string;
  /** Inline (single line) vs block (preserve whitespace). Default: block. */
  inline?: boolean;
}

/**
 * Render a string with `@type:id` mentions tokenized into Mention components.
 * If the input is rich-text HTML, it's flattened to plain text first.
 */
export function LoreText({ text, campaignId, className, inline = false }: LoreTextProps) {
  const raw = text ?? "";
  const plain =
    raw && !isRichTextHtmlVisuallyEmpty(raw)
      ? richTextHtmlToPlainText(raw)
      : "";

  const parts = useTokenize(plain, campaignId);

  if (!plain) return null;

  return (
    <span
      className={cn(
        inline ? "" : "whitespace-pre-wrap leading-relaxed",
        className
      )}
    >
      {parts}
    </span>
  );
}

function useTokenize(text: string, campaignId: string | null): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // RegExp.exec is stateful; clone the regex so re-renders are safe.
  const re = new RegExp(MENTION_RE.source, MENTION_RE.flags);
  while ((match = re.exec(text)) !== null) {
    const [full, kind, id] = match;
    const start = match.index;
    if (start > lastIndex) {
      out.push(text.slice(lastIndex, start));
    }
    out.push(
      <Mention
        key={`${kind}:${id}:${start}`}
        kind={kind.toLowerCase() as MentionKind}
        id={id}
        campaignId={campaignId}
      />
    );
    lastIndex = start + full.length;
  }
  if (lastIndex < text.length) {
    out.push(text.slice(lastIndex));
  }
  return out;
}

const KIND_LABELS: Record<MentionKind, string> = {
  npc: "NPC",
  location: "Location",
  faction: "Faction",
  scene: "Scene",
};

function Mention({
  kind,
  id,
  campaignId,
}: {
  kind: MentionKind;
  id: string;
  campaignId: string | null;
}) {
  const [entity, setEntity] = useState<MentionEntity | null | undefined>(
    undefined
  );

  useEffect(() => {
    let alive = true;
    void fetchMention(kind, id).then((e) => {
      if (alive) setEntity(e);
    });
    return () => {
      alive = false;
    };
  }, [kind, id]);

  const label = entity?.name ?? `@${kind}`;
  const missing = entity === null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-baseline rounded px-1 py-0 text-amber-300 hover:bg-amber-500/15 transition-colors align-baseline",
            missing && "text-rose-400 line-through"
          )}
          title={`@${kind}:${id}`}
        >
          @{label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={6}
        className="max-w-xs bg-popover text-popover-foreground border border-amber-500/40 shadow-lg font-serif"
      >
        {entity === undefined && (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}
        {missing && (
          <p className="text-xs italic text-rose-400">
            This {kind} no longer exists.
          </p>
        )}
        {entity && (
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <p
                className="font-bold text-amber-400"
                style={{ fontVariant: "small-caps" }}
              >
                {entity.name ?? "(unnamed)"}
              </p>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {KIND_LABELS[entity.kind]}
              </span>
            </div>
            {entity.description && !isRichTextHtmlVisuallyEmpty(entity.description) && (
              <p className="text-xs leading-relaxed line-clamp-5">
                {richTextHtmlToPlainText(entity.description)}
              </p>
            )}
            {campaignId && (
              <a
                href={ROUTE_BY_KIND[entity.kind](campaignId, entity.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[10px] text-amber-400 hover:underline"
              >
                Open {KIND_LABELS[entity.kind]} →
              </a>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
