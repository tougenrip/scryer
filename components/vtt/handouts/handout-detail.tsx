"use client";

import type { Handout } from "@/hooks/useVttHandouts";
import {
  ParchmentTitle,
  ParchmentRule,
  ParchmentLabel,
} from "@/components/vtt/quick-search/parchment";
import { MapPinned, Image as ImageIcon } from "lucide-react";
import {
  isRichTextHtmlVisuallyEmpty,
  richTextHtmlToPlainText,
} from "@/lib/utils/rich-text-html";
import { SceneHandoutMap } from "./scene-handout-map";

interface Props {
  handout: Handout;
}

/**
 * Body content for a handout — pin or scene snapshot, parchment styled.
 */
export function HandoutDetail({ handout }: Props) {
  const s = handout.snapshot;
  // Description may arrive as rich-text HTML; normalize before deciding what
  // to render so we don't show literal "<p></p>" to players.
  const descPlain =
    s.description != null && !isRichTextHtmlVisuallyEmpty(s.description)
      ? richTextHtmlToPlainText(s.description)
      : "";
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{s.name || "(untitled)"}</ParchmentTitle>
        <p className="italic text-sm text-[#2b1d10]/80">
          {s.kind === "scene" ? "Scene handout" : "Pin handout"}
        </p>
      </header>

      <ParchmentRule />

      {s.kind === "scene" && s.image_url ? (
        <SceneHandoutMap imageUrl={s.image_url} markers={s.markers ?? []} />
      ) : s.image_url ? (
        <div className="rounded overflow-hidden border border-[#7a1f1f]/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image_url}
            alt={s.name}
            className="block w-full max-h-64 object-cover"
          />
        </div>
      ) : s.kind === "pin" ? (
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: s.color }}
        >
          <MapPinned className="h-5 w-5" />
        </div>
      ) : (
        <div className="h-12 w-12 rounded bg-[#7a1f1f]/10 flex items-center justify-center text-[#7a1f1f]">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}

      {descPlain ? (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {descPlain}
        </p>
      ) : (
        <p className="text-sm italic text-[#2b1d10]/60">
          No description provided.
        </p>
      )}

      {s.kind === "scene" && (
        <ParchmentLabel label="Pins">
          {s.pin_count > 0 ? `${s.pin_count}` : "none"}
        </ParchmentLabel>
      )}
    </div>
  );
}
