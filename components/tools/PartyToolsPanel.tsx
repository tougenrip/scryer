"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ObjectiveTracker } from "./ObjectiveTracker";
import { PartyInventory } from "./PartyInventory";
import { CampaignNotes } from "./CampaignNotes";
import { CheckCircle2, Package, FileText } from "lucide-react";

interface PartyToolsPanelProps {
  campaignId: string;
  isDm: boolean;
  className?: string;
}

export function PartyToolsPanel({ campaignId, isDm, className }: PartyToolsPanelProps) {
  return (
    <Tabs defaultValue="objectives" className={className}>
      <TabsList className="w-full grid grid-cols-3">
        <TabsTrigger value="objectives" className="gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span className="hidden sm:inline">Objectives</span>
        </TabsTrigger>
        <TabsTrigger value="inventory" className="gap-2">
          <Package className="w-4 h-4" />
          <span className="hidden sm:inline">Inventory</span>
        </TabsTrigger>
        <TabsTrigger value="notes" className="gap-2">
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Notes</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="objectives" className="mt-4 h-[400px] border rounded-md p-4">
        <ObjectiveTracker campaignId={campaignId} isDm={isDm} />
      </TabsContent>
      
      <TabsContent value="inventory" className="mt-4 h-[400px] border rounded-md p-4">
        <PartyInventory campaignId={campaignId} />
      </TabsContent>
      
      <TabsContent value="notes" className="mt-4 h-[400px] border rounded-md p-4">
        <CampaignNotes campaignId={campaignId} isDm={isDm} />
      </TabsContent>
    </Tabs>
  );
}
