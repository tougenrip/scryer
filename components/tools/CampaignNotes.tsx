"use client";

import { useState, useEffect } from "react";
import { useCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CampaignNotesProps {
  campaignId: string;
  isDm: boolean;
  className?: string;
}

export function CampaignNotes({ campaignId, isDm, className }: CampaignNotesProps) {
  const { campaign, loading } = useCampaign(campaignId);
  const { updateCampaign } = useUpdateCampaign();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (campaign) {
      setNotes(campaign.public_notes || "");
    }
  }, [campaign]);

  const handleSave = async () => {
    if (!campaign) return;
    
    setSaving(true);
    const result = await updateCampaign(campaignId, { public_notes: notes });
    setSaving(false);
    
    if (result.success) {
      toast.success("Notes saved");
    } else {
      toast.error("Failed to save notes");
    }
  };

  const hasChanges = notes !== (campaign?.public_notes || "");

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Campaign Notes
        </h3>
        {isDm && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="h-8"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        )}
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        readOnly={!isDm}
        className="flex-1 resize-none min-h-[200px] text-sm font-sans"
        placeholder={isDm ? "Write public notes here..." : "No notes yet."}
      />
    </div>
  );
}
