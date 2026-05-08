"use client";

import type { Handout } from "@/hooks/useVttHandouts";
import {
  ParchmentTitle,
  ParchmentRule,
  ParchmentLabel,
} from "@/components/vtt/quick-search/parchment";
import { MapPinned, Image as ImageIcon } from "lucide-react";

interface Props {
  handout: Handout;
}

/**
 * Body content for a handout — pin or scene snapshot, parchment styled.
 */
export function HandoutDetail({ handout }: Props) {
  const s = handout.snapshot;
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{s.name || "(untitled)"}</ParchmentTitle>
        <p className="italic text-sm text-[#2b1d10]/80">
          {s.kind === "scene" ? "Scene handout" : "Pin handout"}
        </p>
      </header>

      <ParchmentRule />

      {s.image_url && (
        <div className="rounded overflow-hidden border border-[#7a1f1f]/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.image_url}
            alt={s.name}
            className="block w-full max-h-64 object-cover"
          />
        </div>
      )}

      {!s.image_url && s.kind === "pin" && (
        <div
          className="h-12 w-12 rounded-full flex items-center justify-center text-white"
          style={{ backgroundColor: s.color }}
        >
          <MapPinned className="h-5 w-5" />
        </div>
      )}

      {!s.image_url && s.kind === "scene" && (
        <div className="h-12 w-12 rounded bg-[#7a1f1f]/10 flex items-center justify-center text-[#7a1f1f]">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}

      {s.description ? (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {s.description}
        </p>
      ) : (
        <p className="text-sm italic text-[#2b1d10]/60">
          No description provided.
        </p>
      )}

      {s.kind === "scene" && (
        <ParchmentLabel label="Pins">
          {s.pin_count > 0 ? `${s.pin_count}` : "—"}
        </ParchmentLabel>
      )}
    </div>
  );
}
