"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock } from "lucide-react";
import {
  useCampaignTimeline,
  useCreateCampaignTimeline,
  useUpdateCampaignTimeline,
  useDeleteCampaignTimeline,
  type CampaignTimeline,
} from "@/hooks/useForgeContent";
import { toast } from "sonner";
import { TimelineEntryFormDialog } from "./timeline-entry-form-dialog";
import { TimelineCanvas } from "./timeline-canvas-flow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CampaignTrackerTabProps {
  campaignId: string;
  isDm: boolean;
}

export function CampaignTrackerTab({ campaignId, isDm }: CampaignTrackerTabProps) {
  const { timeline, loading, refetch } = useCampaignTimeline(campaignId);
  const { createTimelineEntry, loading: creating } = useCreateCampaignTimeline();
  const { updateTimelineEntry, loading: updating } = useUpdateCampaignTimeline();
  const { deleteTimelineEntry, loading: deleting } = useDeleteCampaignTimeline();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CampaignTimeline | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [canvasContainerRef, setCanvasContainerRef] = useState<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  // Track main timeline branches: entryId -> sourceId
  const [mainTimelineBranches, setMainTimelineBranches] = useState<Map<string, string>>(new Map());
  // Delete confirmation dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<CampaignTimeline | null>(null);

  // Update canvas size when container resizes
  useEffect(() => {
    if (!canvasContainerRef) return;

    const updateSize = () => {
      const rect = canvasContainerRef.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: Math.max(rect.height, 600) });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [canvasContainerRef]);

  const handleCreate = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleCanvasCreate = async (x: number, y: number, parentId?: string, branchType?: 'next' | 'side' | 'main') => {
    if (!isDm) return;
    
    // Calculate order_index based on branch type
    let orderIndex = 0;
    let parentEntryId: string | null = null;
    let branchPathIndex = 0;

    if (branchType === 'next' && parentId) {
      // Next in main timeline - get max order_index + 1
      const mainPath = timeline.filter(e => !e.parent_entry_id);
      orderIndex = mainPath.length > 0 ? Math.max(...mainPath.map(e => e.order_index)) + 1 : 0;
      parentEntryId = null; // Main timeline entry
    } else if (branchType === 'side' && parentId) {
      // Side quest - get max branch_path_index from this parent
      const sideQuests = timeline.filter(e => e.parent_entry_id === parentId);
      branchPathIndex = sideQuests.length;
      parentEntryId = parentId;
      // Keep parent's order_index for sorting
      const parent = timeline.find(e => e.id === parentId);
      orderIndex = parent?.order_index || 0;
    } else if (branchType === 'main' && parentId) {
      // Main timeline branch - creates a new main timeline entry that branches away
      // This is NOT a side quest, it's an alternative main timeline path
      const mainPath = timeline.filter(e => !e.parent_entry_id);
      orderIndex = mainPath.length > 0 ? Math.max(...mainPath.map(e => e.order_index)) + 1 : 0;
      parentEntryId = null; // Main timeline entry, not a branch
      branchPathIndex = 0;
    } else {
      // Default - new main timeline entry
      const mainPath = timeline.filter(e => !e.parent_entry_id);
      orderIndex = mainPath.length > 0 ? Math.max(...mainPath.map(e => e.order_index)) + 1 : 0;
    }
    
    // Create entry immediately with auto-generated data
    const result = await createTimelineEntry({
      campaign_id: campaignId,
      title: `Session ${orderIndex + 1}`,
      description: null,
      session_type: 'session',
      planned_date: null,
      actual_date: null,
      order_index: orderIndex,
      status: 'not_started',
      parent_entry_id: parentEntryId,
      branch_path_index: branchPathIndex,
      associated_location_ids: [],
      associated_quest_ids: [],
      notes: null,
    });

    if (result.success && result.data) {
      // For main timeline branches, store the branch source for visual connection
      if (branchType === 'main' && parentId) {
        setMainTimelineBranches(prev => {
          const newMap = new Map(prev);
          newMap.set(result.data!.id, parentId);
          return newMap;
        });
      }
      toast.success("Session created");
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to create session");
    }
  };

  const handleEntryConnect = async (fromId: string, toId: string) => {
    // Not used anymore - connections are created via action buttons
  };

  const handleEntryMove = async (entryId: string, x: number, y: number) => {
    // Not used - dragging removed
  };

  const handleEdit = (entry: CampaignTimeline) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
  };

  const handleDelete = async (entry: CampaignTimeline) => {
    // Show the delete confirmation dialog
    setEntryToDelete(entry);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    const result = await deleteTimelineEntry(entryToDelete.id);
    if (result.success) {
      toast.success("Timeline entry deleted");
      setShowDeleteDialog(false);
      setEntryToDelete(null);
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to delete entry");
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
      notes?: string | null;
      image_url?: string | null;
    }) => {
    if (editingEntry) {
      const result = await updateTimelineEntry(editingEntry.id, data);
      if (result.success) {
        toast.success("Timeline entry updated");
        setIsFormOpen(false);
        setEditingEntry(null);
        refetch();
      } else {
        toast.error(result.error?.message || "Failed to update entry");
      }
    } else {
      const result = await createTimelineEntry({
        campaign_id: campaignId,
        ...data,
      });
      if (result.success) {
        toast.success("Timeline entry created");
        setIsFormOpen(false);
        // Clear pending position
        delete (window as any).__pendingTimelinePosition;
        refetch();
      } else {
        toast.error(result.error?.message || "Failed to create entry");
      }
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
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
          <h2 className="font-serif text-2xl font-semibold">Campaign Timeline</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Plan and track your campaign sessions chronologically. Create branches for alternative paths.
          </p>
        </div>
      </div>

      {/* Timeline Canvas */}
      <Card>
        <CardContent className="p-0 relative">
          {/* Add New Session Button - positioned like in reference */}
          {isDm && !loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <Button onClick={handleCreate} disabled={creating} className="shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Add New Session
              </Button>
            </div>
          )}
          
          <div 
            ref={setCanvasContainerRef}
            className="w-full"
            style={{ height: '600px', minHeight: '600px' }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : timeline.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Clock className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground text-center mb-2">
                  No timeline entries yet.
                </p>
                {isDm && (
                  <>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Click anywhere on the canvas to create your first session.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <TimelineCanvas
                width={canvasSize.width}
                height={canvasSize.height}
                entries={timeline}
                mainTimelineBranches={mainTimelineBranches}
                onEntrySelect={(id) => {
                  setSelectedEntryId(id);
                }}
                onEntryCreate={handleCanvasCreate}
                onEntryConnect={handleEntryConnect}
                onEntryMove={handleEntryMove}
                onEntryDelete={async (entryId) => {
                  const entry = timeline.find(e => e.id === entryId);
                  if (!entry) return;
                  
                  // Clean up branch tracking
                  setMainTimelineBranches(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(entryId);
                    return newMap;
                  });
                  
                  await handleDelete(entry);
                }}
                onEntryEdit={(entryId) => {
                  const entry = timeline.find(e => e.id === entryId);
                  if (entry) {
                    handleEdit(entry);
                  }
                }}
                selectedEntryId={selectedEntryId}
                isDm={isDm}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Timeline Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{entryToDelete?.title}"? This action cannot be undone.
              {entryToDelete?.parent_entry_id === null && " This will also delete any branches from this entry."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setEntryToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Form Dialog */}
      <TimelineEntryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        entry={editingEntry}
        timeline={timeline}
        campaignId={campaignId}
        onSave={handleSave}
        loading={creating || updating}
        isSideQuest={editingEntry ? (() => {
          if (!editingEntry.parent_entry_id) return false;
          const parent = timeline.find(e => e.id === editingEntry.parent_entry_id);
          return parent ? parent.parent_entry_id === null : false;
        })() : false}
      />
    </div>
  );
}
