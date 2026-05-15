"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCampaign } from "@/hooks/useCampaigns";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import { MobileTabBar, type MobileTab } from "@/components/mobile/mobile-tab-bar";
import { MobileVttTab } from "@/components/mobile/mobile-vtt-tab";
import { MobileCharacterTab } from "@/components/mobile/mobile-character-tab";
import { MobileDiceTab } from "@/components/mobile/mobile-dice-tab";
import { MobileChatTab } from "@/components/mobile/mobile-chat-tab";
import { MobilePartyTab } from "@/components/mobile/mobile-party-tab";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";

export default function MobileCampaignPage() {
  const router = useRouter();
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;

  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState<MobileTab>("vtt");
  // When set, the Party tab is replaced by a character detail view —
  // editable when it's the user's own character, read-only otherwise.
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);

  // Auth gate.
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace(
          `/auth/login?next=${encodeURIComponent(
            `/m/campaigns/${campaignId}`
          )}`
        );
        return;
      }
      setUserId(user.id);
      setAuthChecked(true);
    });
  }, [router, campaignId]);

  const { campaign } = useCampaign(campaignId);
  const isDm = !!campaign && campaign.dm_user_id === userId;

  // All campaign characters — used for the Party tab + the detail
  // overlay. RLS already restricts visibility to members.
  const { characters } = useCampaignCharacters(campaignId);
  const openCharacter = useMemo(
    () => characters.find((c) => c.id === openCharacterId) ?? null,
    [characters, openCharacterId]
  );

  // Auth still resolving.
  if (!authChecked || !userId) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  // Detail view ownership gate. Only the author can edit; everyone
  // else sees a read-only view (mirrors the desktop sheet behaviour).
  const canEditOpen = !!openCharacter && openCharacter.user_id === userId;

  return (
    <>
      <header className="shrink-0 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
        {openCharacter ? (
          <button
            type="button"
            onClick={() => setOpenCharacterId(null)}
            className="rounded p-1 text-neutral-400 hover:text-neutral-200"
            title="Back to party"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <p
          className="text-xs font-bold text-amber-400 uppercase tracking-wider truncate"
          style={{ fontVariant: "small-caps" }}
        >
          {openCharacter ? openCharacter.name : campaign.name}
        </p>
        {!openCharacter && isDm && (
          <span className="text-[9px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 uppercase tracking-wider">
            DM
          </span>
        )}
        {openCharacter && !canEditOpen && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-neutral-500">
            <Eye className="h-3 w-3" />
            Read-only
          </span>
        )}
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        {openCharacter ? (
          <MobileCharacterTab
            character={openCharacter}
            campaignId={campaignId}
            editable={canEditOpen}
          />
        ) : tab === "vtt" ? (
          <MobileVttTab campaignId={campaignId} />
        ) : tab === "dice" ? (
          <MobileDiceTab
            campaignId={campaignId}
            character={null}
            isDm={isDm}
          />
        ) : tab === "chat" ? (
          <MobileChatTab
            campaignId={campaignId}
            userId={userId}
            character={null}
          />
        ) : (
          <MobilePartyTab
            campaignId={campaignId}
            userId={userId}
            onSelect={(id) => setOpenCharacterId(id)}
          />
        )}
      </main>

      {/* Tab bar is hidden when a character detail view is open so the
          back arrow is the only navigation — keeps the focus on the
          sheet and avoids accidental tab swaps. */}
      {!openCharacter && (
        <MobileTabBar active={tab} onChange={setTab} />
      )}
    </>
  );
}
