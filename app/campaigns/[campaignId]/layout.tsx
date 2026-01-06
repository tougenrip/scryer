"use client";

import { useState, useEffect } from "react";
import { CampaignSidebar } from "@/components/shared/sidebar";
import { Navbar } from "@/components/shared/navbar";
import { useParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useCampaign } from "@/hooks/useCampaigns";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function CampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const campaignId = params.campaignId as string;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
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
      <Navbar user={user} />

      {/* Mobile sidebar trigger - Hide on character sheet pages and scene editor */}
      {!isCharacterSheetPage && !isSceneEditorPage && (
        <div className="lg:hidden border-b border-border/40 px-4 py-2">
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Menu className="h-4 w-4" />
                <span className="font-serif font-semibold">{campaignName}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetTitle className="sr-only">Campaign Navigation</SheetTitle>
              <CampaignSidebar 
                campaignId={campaignId} 
                campaignName={campaignName}
                collapsed={false}
              />
            </SheetContent>
          </Sheet>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Hide on character sheet pages and scene editor */}
        {!isCharacterSheetPage && !isSceneEditorPage && (
          <aside className="hidden lg:flex">
            <CampaignSidebar
              campaignId={campaignId}
              campaignName={campaignName}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </aside>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-y-auto bg-background",
          isSceneEditorPage && "overflow-hidden"
        )}>
          {isSceneEditorPage ? (
            children
          ) : (
          <div className="container py-6 px-4 md:px-6">
            {children}
          </div>
          )}
        </main>
      </div>
    </div>
  );
}

