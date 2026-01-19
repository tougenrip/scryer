"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Moon, Skull, Calendar, Plus, Trash2 } from "lucide-react";
import { 
  useCampaignTimeline, 
  useCreateCampaignTimeline,
  useUpdateCampaignTimeline,
  useDeleteCampaignTimeline,
  type CampaignTimeline 
} from "@/hooks/useForgeContent";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { HistoryEntryFormDialog } from "@/components/forge/history/history-entry-form-dialog";

interface EntityHistoryProps {
  campaignId: string;
  entityId: string;
  entityType: 'npc' | 'faction' | 'location' | 'pantheon';
  isDm?: boolean;
  editMode?: boolean;
}

export function EntityHistory({ campaignId, entityId, entityType, isDm = false, editMode = false }: EntityHistoryProps) {
  const { timeline, loading, refetch, addEntry, removeEntry } = useCampaignTimeline(campaignId);
  const { createTimelineEntry, loading: creating } = useCreateCampaignTimeline();
  const { deleteTimelineEntry, loading: deleting } = useDeleteCampaignTimeline();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Filter timeline entries based on entity type and ID
  const historyEntries = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];

    return timeline
      .filter(entry => {
        // Filter by entity association
        if (entityType === 'npc') {
          return entry.associated_npc_ids?.includes(entityId) || false;
        } else if (entityType === 'faction') {
          return entry.associated_faction_ids?.includes(entityId) || false;
        } else if (entityType === 'location') {
          return entry.associated_location_ids?.includes(entityId) || false;
        } else if (entityType === 'pantheon') {
          // Pantheons don't have direct associations in timeline yet
          return false;
        }
        return false;
      })
      .filter(entry => entry.actual_date || entry.status === 'completed') // Only show history entries
      .sort((a, b) => {
        // Sort by actual_date if available, otherwise by order_index
        if (a.actual_date && b.actual_date) {
          return new Date(a.actual_date).getTime() - new Date(b.actual_date).getTime();
        }
        return a.order_index - b.order_index;
      });
  }, [timeline, entityId, entityType]);

  const getIcon = (sessionType: string | null) => {
    switch (sessionType) {
      case 'milestone':
        return Moon;
      case 'event':
        return Skull;
      default:
        return Calendar;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return format(date, "MMMM d, yyyy");
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const handleSave = async (data: {
    title: string;
    description?: string | null;
    session_type?: CampaignTimeline['session_type'];
    planned_date?: string | null;
    actual_date?: string | null;
    order_index: number;
    status?: CampaignTimeline['status'];
    parent_entry_id?: string | null;
    branch_path_index?: number;
    associated_location_ids?: string[];
    associated_quest_ids?: string[];
    associated_npc_ids?: string[];
    associated_faction_ids?: string[];
    notes?: string | null;
    image_url?: string | null;
    hidden_from_players?: boolean;
  }) => {
    // Calculate order_index for new entry
    const maxOrderIndex = timeline.length > 0 
      ? Math.max(...timeline.map(e => e.order_index))
      : -1;
    
    const result = await createTimelineEntry({
      campaign_id: campaignId,
      ...data,
      order_index: data.order_index ?? maxOrderIndex + 1,
      status: data.status || 'completed',
    });
    
    if (result.success && result.data) {
      // Optimistically add the entry
      addEntry(result.data);
      toast.success("History entry created");
      setIsFormOpen(false);
      refetch(); // Refetch to ensure associations are loaded
    } else {
      toast.error(result.error?.message || "Failed to create entry");
    }
  };

  const handleDelete = async (entry: CampaignTimeline) => {
    const entryId = entry.id;
    
    // Optimistically remove the entry
    removeEntry(entryId);
    
    const result = await deleteTimelineEntry(entryId);
    if (result.success) {
      toast.success("History entry deleted");
      refetch(); // Refetch to ensure data is in sync
    } else {
      // If deletion failed, refetch to restore entry
      toast.error(result.error?.message || "Failed to delete entry");
      refetch();
    }
  };

  if (historyEntries.length === 0 && !isDm) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
        <p>No history entries yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold">History Timeline</h2>
        {isDm && editMode && (
          <Button onClick={() => setIsFormOpen(true)} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            Add History Entry
          </Button>
        )}
      </div>

      {/* Empty State */}
      {historyEntries.length === 0 && isDm && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>No history entries yet.</p>
          <p className="text-sm mt-2">
            Click "Add History Entry" to create the first entry for this {entityType}.
          </p>
        </div>
      )}

      {/* Timeline */}
      {historyEntries.length > 0 && (
        <div className="relative">
      {/* Vertical Timeline Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

      {/* History Entries */}
      <div className="space-y-8">
        {historyEntries.map((entry, index) => {
          const Icon = getIcon(entry.session_type);
          const isLast = index === historyEntries.length - 1;
          const dateStr = formatDate(entry.actual_date);

          return (
            <div key={entry.id} className="relative flex gap-6">
              {/* Timeline Node */}
              <div className="relative z-10 flex-shrink-0">
                <div className={cn(
                  "w-4 h-4 rounded-sm transform rotate-45 border-2",
                  isLast ? "border-muted-foreground/30 bg-transparent" : "border-border bg-background"
                )} />
              </div>

              {/* History Card */}
              <div className="flex-1 pb-8">
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Background Image */}
                  {entry.image_url && (
                    <div className="relative h-48 w-full overflow-hidden">
                      <img
                        src={entry.image_url}
                        alt={entry.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <CardContent className="p-4">
                    {/* Title and Date */}
                    <div className="flex items-start gap-3 mb-2">
                      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1">{entry.title}</h3>
                            {dateStr && (
                              <p className="text-sm text-muted-foreground">{dateStr}</p>
                            )}
                          </div>
                          {isDm && editMode && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(entry)}
                              disabled={deleting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {entry.description && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-2">
                        {entry.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}
      </div>
    </div>
      )}

      {/* Form Dialog */}
      <HistoryEntryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        entry={null}
        timeline={timeline}
        campaignId={campaignId}
        initialEntityId={entityId}
        initialEntityType={entityType}
        onSave={handleSave}
        loading={creating}
        isDm={isDm}
      />
    </div>
  );
}

