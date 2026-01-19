"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Moon, Skull, Calendar } from "lucide-react";
import {
  useCampaignTimeline,
  useCreateCampaignTimeline,
  useUpdateCampaignTimeline,
  useDeleteCampaignTimeline,
  type CampaignTimeline,
} from "@/hooks/useForgeContent";
import { toast } from "sonner";
import { HistoryEntryFormDialog } from "./history-entry-form-dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface HistoryTabProps {
  campaignId: string;
  isDm: boolean;
}

export function HistoryTab({ campaignId, isDm }: HistoryTabProps) {
  const { timeline, loading, refetch, addEntry, removeEntry, updateEntry } = useCampaignTimeline(campaignId);
  const { createTimelineEntry, loading: creating } = useCreateCampaignTimeline();
  const { updateTimelineEntry, loading: updating } = useUpdateCampaignTimeline();
  const { deleteTimelineEntry, loading: deleting } = useDeleteCampaignTimeline();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CampaignTimeline | null>(null);

  // Filter to show only history entries (those with actual_date or status 'completed')
  const historyEntries = timeline
    .filter(entry => entry.actual_date || entry.status === 'completed')
    .sort((a, b) => {
      // Sort by actual_date if available, otherwise by order_index
      if (a.actual_date && b.actual_date) {
        return new Date(a.actual_date).getTime() - new Date(b.actual_date).getTime();
      }
      return a.order_index - b.order_index;
    });

  const handleCreate = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleEdit = (entry: CampaignTimeline) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDelete = async (entry: CampaignTimeline) => {
    const entryId = entry.id;
    
    // Optimistically remove the entry
    removeEntry(entryId);
    
    const result = await deleteTimelineEntry(entryId);
    if (result.success) {
      toast.success("History entry deleted");
    } else {
      // If deletion failed, refetch to restore entry
      toast.error(result.error?.message || "Failed to delete entry");
      refetch();
    }
  };

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
    if (editingEntry) {
      const entryId = editingEntry.id;
      
      // Optimistically update the entry
      updateEntry(entryId, data as Partial<CampaignTimeline>);
      
      const result = await updateTimelineEntry(entryId, data);
      if (result.success && result.data) {
        // Update with server response data
        updateEntry(entryId, result.data);
        toast.success("History entry updated");
        setIsFormOpen(false);
        setEditingEntry(null);
      } else {
        // If update failed, refetch to restore original entry
        toast.error(result.error?.message || "Failed to update entry");
        refetch();
      }
    } else {
      // Calculate order_index for new entry
      const maxOrderIndex = timeline.length > 0 
        ? Math.max(...timeline.map(e => e.order_index))
        : -1;
      
      const result = await createTimelineEntry({
        campaign_id: campaignId,
        ...data,
        order_index: data.order_index ?? maxOrderIndex + 1,
        status: data.status || 'completed', // History entries are typically completed events
      });
      if (result.success && result.data) {
        // Optimistically add the entry
        addEntry(result.data);
        toast.success("History entry created");
        setIsFormOpen(false);
      } else {
        toast.error(result.error?.message || "Failed to create entry");
      }
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Campaign History</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Record major events and discoveries in your campaign's history.
          </p>
        </div>
        {isDm && (
          <Button onClick={handleCreate} disabled={creating || updating || deleting}>
            <Plus className="h-4 w-4 mr-2" />
            Add History Entry
          </Button>
        )}
      </div>

      {/* History Timeline */}
      {historyEntries.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">No history entries yet.</p>
            {isDm && (
              <p className="text-sm text-muted-foreground">
                Click "Add History Entry" to record the first event.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
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
                          {/* Category Label */}
                          {entry.session_type && (
                            <div className="absolute top-3 left-3">
                              <span className="px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm rounded-md text-foreground">
                                {entry.session_type === 'milestone' ? 'Major Discoveries' : 
                                 entry.session_type === 'event' ? 'Major Events' : 
                                 'History'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Content */}
                      <CardContent className="p-4">
                        {/* Title and Date */}
                        <div className="flex items-start gap-3 mb-2">
                          <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg mb-1">{entry.title}</h3>
                            {dateStr && (
                              <p className="text-sm text-muted-foreground">{dateStr}</p>
                            )}
                          </div>
                          {isDm && (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                                disabled={updating || deleting}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(entry)}
                                disabled={deleting}
                                className="text-destructive hover:text-destructive"
                              >
                                Delete
                              </Button>
                            </div>
                          )}
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
        entry={editingEntry}
        timeline={timeline}
        campaignId={campaignId}
        onSave={handleSave}
        loading={creating || updating}
        isDm={isDm}
      />
    </div>
  );
}

