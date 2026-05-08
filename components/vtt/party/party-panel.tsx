"use client";

import { useCampaignCharacters } from "@/hooks/useDndContent";
import { ExternalLink, User as UserIcon } from "lucide-react";
import Link from "next/link";

interface Props {
  campaignId: string | null;
  userId: string | null;
  isDm: boolean;
}

/**
 * In-VTT party roster. Lists every character assigned to the campaign and
 * links to the existing character-sheet route. Non-owners get the sheet
 * read-only via the sheet's `editable` prop (already wired in the page).
 */
export function PartyPanel({ campaignId, userId }: Props) {
  const { characters, loading } = useCampaignCharacters(campaignId ?? "");

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
            <Link
              key={c.id}
              href={`/campaigns/${campaignId}/characters/${c.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded border border-border bg-background hover:bg-muted/40 transition-colors p-2 group"
            >
              <div
                className="h-10 w-10 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center text-amber-400 capitalize text-sm font-bold"
                style={{
                  backgroundColor: c.image_url ? undefined : undefined,
                }}
              >
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
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
