"use client";

import { useCampaignCharacters } from "@/hooks/useDndContent";
import { ExternalLink, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useCharacterCardsStore } from "@/lib/store/character-cards-store";

interface Props {
  campaignId: string | null;
  userId: string | null;
  isDm: boolean;
}

/**
 * In-VTT party roster. Lists every character assigned to the campaign.
 * Click a row → opens a draggable/resizable parchment-style floating card
 * with the full sheet (read-only for non-owners), matching the info-modal
 * UX. Use the inline external-link icon to open the full route in a new
 * tab instead.
 */
export function PartyPanel({ campaignId, userId }: Props) {
  const { characters, loading } = useCampaignCharacters(campaignId ?? "");
  const openSheet = useCharacterCardsStore((s) => s.open);

  if (!campaignId) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="shrink-0 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold">Party</h2>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Open any character sheet — read-only for sheets you don&apos;t own.
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
        {loading && (
          <p className="px-2 py-3 text-[11px] text-muted-foreground text-center">
            Loading party…
          </p>
        )}
        {!loading && characters.length === 0 && (
          <p className="px-2 py-3 text-[11px] text-muted-foreground text-center">
            No characters assigned to this campaign yet.
          </p>
        )}
        {characters.map((c) => {
          const isOwn = c.user_id === userId;
          const subtitle = [
            c.class_index ? `${c.class_index}` : null,
            c.level ? `Lvl ${c.level}` : null,
            c.race_index ? `${c.race_index}` : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded border border-border bg-background hover:bg-muted/40 transition-colors p-2 group cursor-pointer"
              onClick={() => openSheet(c.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openSheet(c.id);
                }
              }}
            >
              <div className="h-10 w-10 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center text-amber-400 capitalize text-sm font-bold">
                {c.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (c.name ?? "?").slice(0, 1)
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {c.name}
                  {isOwn && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wider text-amber-400">
                      You
                    </span>
                  )}
                </p>
                {subtitle && (
                  <p className="truncate text-[10px] text-muted-foreground capitalize">
                    {subtitle}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground">
                  HP {c.hp_current ?? "?"}/{c.hp_max ?? "?"} · AC {c.armor_class ?? "?"}
                </p>
              </div>
              <Link
                href={`/campaigns/${campaignId}/characters/${c.id}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Open in new tab"
                className="h-7 w-7 flex items-center justify-center rounded text-muted-foreground hover:text-amber-400 hover:bg-muted transition-colors shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
