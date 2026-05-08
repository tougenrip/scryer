"use client";

import type { Handout } from "@/hooks/useVttHandouts";
import {
  ParchmentTitle,
  ParchmentRule,
  ParchmentLabel,
} from "@/components/vtt/quick-search/parchment";
import { MapPinned, Image as ImageIcon, User as UserIcon } from "lucide-react";
import {
  isRichTextHtmlVisuallyEmpty,
  richTextHtmlToPlainText,
} from "@/lib/utils/rich-text-html";
import { SceneHandoutMap } from "./scene-handout-map";
import { cn } from "@/lib/utils";
import { RichTextDisplay } from "@/components/shared/rich-text-display";

interface Props {
  handout: Handout;
}

const STATUS_STYLES: Record<
  "available" | "claimed" | "completed",
  string
> = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  claimed: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
};

/**
 * Body content for a handout — pin / scene / bounty snapshot, parchment styled.
 */
export function HandoutDetail({ handout }: Props) {
  const s = handout.snapshot;
  // Description may arrive as rich-text HTML; normalize before deciding what
  // to render so we don't show literal "<p></p>" to players.
  const descPlain =
    s.description != null && !isRichTextHtmlVisuallyEmpty(s.description)
      ? richTextHtmlToPlainText(s.description)
      : "";

  // NPC handouts use the same general layout as the Forge NPC details page:
  // header card with portrait + name + species/class/location, then stacked
  // sections (Description / Appearance / Personality / Background) using
  // RichTextDisplay so anything authored in the Forge editor renders as
  // formatted HTML — not plain text.
  if (s.kind === "npc") {
    const sub = [s.species_label, s.class_label, s.location]
      .filter(Boolean)
      .join(" · ");
    const sections: Array<[string, string | null]> = [
      ["Description", s.description],
      ["Appearance", s.appearance],
      ["Personality", s.personality],
      ["Background", s.background],
    ];
    const populated = sections.filter(
      ([, body]) => body && !isRichTextHtmlVisuallyEmpty(body)
    );
    return (
      <div className="space-y-4 font-serif">
        <header className="flex items-start gap-3">
          <div className="h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted border border-amber-500/30 flex items-center justify-center text-amber-400">
            {s.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.image_url}
                alt={s.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0">
            <ParchmentTitle>{s.name || "(unnamed NPC)"}</ParchmentTitle>
            {sub && (
              <p className="italic text-xs text-muted-foreground capitalize mt-0.5">
                {sub}
              </p>
            )}
          </div>
        </header>
        <ParchmentRule />
        {populated.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No further details provided.
          </p>
        ) : (
          populated.map(([title, body]) => (
            <section key={title} className="space-y-1.5">
              <h3
                className="text-sm font-bold text-amber-400 border-b border-amber-500/30 pb-1"
                style={{ fontVariant: "small-caps" }}
              >
                {title}
              </h3>
              <div className="text-sm leading-relaxed [&_p]:m-0 [&_p+p]:mt-2">
                <RichTextDisplay
                  content={body!}
                  campaignId={handout.campaign_id}
                />
              </div>
            </section>
          ))
        )}
      </div>
    );
  }

  // Bounty handouts get a dedicated layout — they have very different fields
  // (target/reward/status) and benefit from a wanted-poster styling.
  if (s.kind === "bounty") {
    return (
      <div className="space-y-3 font-serif">
        <header>
          <div className="flex items-start justify-between gap-2">
            <ParchmentTitle>{s.name || "Wanted"}</ParchmentTitle>
            <span
              className={cn(
                "shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                STATUS_STYLES[s.status] ?? STATUS_STYLES.available
              )}
            >
              {s.status}
            </span>
          </div>
          <p className="italic text-sm text-muted-foreground">
            Bounty · {s.target_type === "npc"
              ? "NPC target"
              : s.target_type === "monster"
              ? "Monster target"
              : "Target"}
          </p>
        </header>

        <ParchmentRule />

        {/* Wanted-poster banner */}
        <div className="rounded border border-amber-500/40 bg-amber-500/5 p-3 text-center space-y-2">
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold"
          >
            Wanted
          </p>
          {s.image_url && (
            <div className="rounded overflow-hidden border border-amber-500/30 bg-black/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image_url}
                alt={s.target_name}
                className="block w-full max-h-72 object-cover"
              />
            </div>
          )}
          <p
            className="font-serif text-xl font-bold text-amber-300 leading-tight"
            style={{ fontVariant: "small-caps" }}
          >
            {s.target_name}
          </p>
          {s.reward && (
            <p className="text-sm text-foreground">
              Reward: <span className="font-semibold">{s.reward}</span>
            </p>
          )}
        </div>

        {s.location && <ParchmentLabel label="Last seen">{s.location}</ParchmentLabel>}

        {descPlain ? (
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {descPlain}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">
            No further details provided.
          </p>
        )}
      </div>
    );
  }

  // Pin / scene layout (existing).
  return (
    <div className="space-y-3 font-serif">
      <header>
        <ParchmentTitle>{s.name || "(untitled)"}</ParchmentTitle>
        <p className="italic text-sm text-muted-foreground">
          {s.kind === "scene" ? "Scene handout" : "Pin handout"}
        </p>
      </header>

      <ParchmentRule />

      {s.kind === "scene" && s.image_url ? (
        <SceneHandoutMap imageUrl={s.image_url} markers={s.markers ?? []} />
      ) : s.image_url ? (
        <div className="rounded overflow-hidden border border-amber-500/30">
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
        <div className="h-12 w-12 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}

      {descPlain ? (
        <p className="text-sm whitespace-pre-wrap leading-relaxed">
          {descPlain}
        </p>
      ) : (
        <p className="text-sm italic text-muted-foreground">
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

