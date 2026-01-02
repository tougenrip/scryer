"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

interface DmNotesProps {
  campaignId: string;
  publicNotes: string | null;
  privateNotes: string | null;
  onUpdate: (publicNotes: string | null, privateNotes: string | null) => Promise<void>;
  loading?: boolean;
}

export function DmNotes({
  campaignId,
  publicNotes,
  privateNotes,
  onUpdate,
  loading = false,
}: DmNotesProps) {
  const [publicNotesValue, setPublicNotesValue] = useState(publicNotes || "");
  const [privateNotesValue, setPrivateNotesValue] = useState(privateNotes || "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("public");

  // Update local state when props change
  useEffect(() => {
    setPublicNotesValue(publicNotes || "");
    setPrivateNotesValue(privateNotes || "");
  }, [publicNotes, privateNotes]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate(
        publicNotesValue.trim() || null,
        privateNotesValue.trim() || null
      );
      toast.success("Notes saved successfully");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    publicNotesValue !== (publicNotes || "") ||
    privateNotesValue !== (privateNotes || "");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-serif">DM Notes</CardTitle>
            <CardDescription>
              Keep track of campaign information, plot points, and reminders
            </CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving || loading}
            size="sm"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="public" className="gap-2">
              <Globe className="h-4 w-4" />
              Public Notes
            </TabsTrigger>
            <TabsTrigger value="private" className="gap-2">
              <Lock className="h-4 w-4" />
              Private Notes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="public" className="mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Public notes are visible to all campaign members. Use this for shared information,
                reminders, or campaign updates.
              </p>
              <Textarea
                value={publicNotesValue}
                onChange={(e) => setPublicNotesValue(e.target.value)}
                placeholder="Enter public notes that all players can see..."
                className="min-h-[300px] font-mono text-sm"
                disabled={saving || loading}
              />
            </div>
          </TabsContent>
          <TabsContent value="private" className="mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Private notes are only visible to you (the DM). Use this for plot secrets,
                NPC motivations, encounter planning, or personal reminders.
              </p>
              <Textarea
                value={privateNotesValue}
                onChange={(e) => setPrivateNotesValue(e.target.value)}
                placeholder="Enter private notes only you can see..."
                className="min-h-[300px] font-mono text-sm"
                disabled={saving || loading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

