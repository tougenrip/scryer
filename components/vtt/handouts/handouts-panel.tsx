"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Inbox, Send } from "lucide-react";
import { HandoutsInbox } from "./handouts-inbox";
import { HandoutPickerDialog } from "./handout-picker-dialog";

interface Props {
  campaignId: string | null;
  userId: string | null;
  isDm: boolean;
}

export function HandoutsPanel({ campaignId, userId, isDm }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      <div className="shrink-0 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold flex-1">Handouts</h2>
          {isDm && (
            <Button
              type="button"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="h-7 text-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Send…
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3">
        <HandoutsInbox campaignId={campaignId} userId={userId} isDm={isDm} />
      </div>
      <HandoutPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        campaignId={campaignId}
        userId={userId}
      />
    </div>
  );
}
