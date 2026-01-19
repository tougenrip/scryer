"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/shared/navbar";
import { useParams, usePathname } from "next/navigation";
import { useCampaign } from "@/hooks/useCampaigns";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const { campaignId: campaignIdParam } = params;
  const campaignId = campaignIdParam as string;
  const [user, setUser] = useState<User | null>(null);
  const { campaign } = useCampaign(campaignId);

  const campaignName = campaign?.name || "Campaign";
  
  // Hide sidebar on character sheet pages (matches /campaigns/[id]/characters/[characterId])
  const isCharacterSheetPage = pathname?.match(/\/characters\/[^\/]+$/);
  // Hide sidebar on scene editor pages (matches /campaigns/[id]/scenes/[sceneId]/edit)
  const isSceneEditorPage = pathname?.match(/\/scenes\/[^\/]+\/edit$/);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    }
    getUser();
  }, []);

  return (
    <div className="flex h-screen flex-col">
      {!isSceneEditorPage && <Navbar user={user} />}

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-background",
          isSceneEditorPage && "overflow-hidden"
        )}>
          {isSceneEditorPage ? (
            children
          ) : (
          <div className="container py-0 px-0 h-full">
            {children}
          </div>
          )}
        </main>
      </div>
    </div>
  );
}

