"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaign } from "@/hooks/useCampaigns";
import {
  useCampaignMediaItems,
  useCreateMediaItem,
  useUpdateMediaItem,
  useDeleteMediaItem,
  type MediaItem,
} from "@/hooks/useCampaignContent";
import { MediaItemFormDialog } from "@/components/campaign/media-item-form-dialog";
import { MediaDragDrop } from "@/components/campaign/media-drag-drop";
import { MediaLibraryGrid } from "@/components/campaign/media-library-grid";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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

type MediaType = 'all' | 'map' | 'token' | 'prop' | 'sound';

export default function MediaLibraryPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  // const [userId, setUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);
  const [activeTab, setActiveTab] = useState<MediaType>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [pendingAudioUrls, setPendingAudioUrls] = useState<string[]>([]);

  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const { items, loading: itemsLoading, refetch: refetchItems } = useCampaignMediaItems(
    campaignId,
    activeTab === 'all' ? null : activeTab
  );
  const { createMediaItem, loading: creating } = useCreateMediaItem();
  const { updateMediaItem } = useUpdateMediaItem(); // loading: updating unused
  const { deleteMediaItem, loading: deleting } = useDeleteMediaItem();

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // setUserId(user.id);
        if (campaign) {
          setIsDm(campaign.dm_user_id === user.id);
        }
      }
    }
    getUser();
  }, [campaign]);

  const handleCreateFromUrls = async (urls: string[], type: 'map' | 'token' | 'prop' | 'sound' | null = null, isAudio: boolean = false) => {
    // Create media items for each uploaded URL
    const promises = urls.map((url, index) =>
      createMediaItem({
        campaign_id: campaignId,
        name: `Untitled Item ${Date.now()}-${index}`,
        image_url: isAudio ? null : url,
        audio_url: isAudio ? url : null,
        type: type,
      })
    );

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    if (successCount > 0) {
      toast.success(`Created ${successCount} item(s)`);
      refetchItems();
    }

    if (successCount < urls.length) {
      toast.error(`Failed to create ${urls.length - successCount} item(s)`);
    }

    setPendingUrls([]);
  };

  const handleCreate = async (data: {
    campaign_id: string;
    name: string;
    image_url?: string | null;
    audio_url?: string | null;
    type?: 'map' | 'token' | 'prop' | 'sound' | null;
  }) => {
    const result = await createMediaItem(data);
    if (result.success) {
      toast.success("Media item created successfully");
      setCreateDialogOpen(false);
      refetchItems();
    } else {
      toast.error(result.error?.message || "Failed to create media item");
      return result;
    }
    return { success: true };
  };

  const handleUpdate = async (
    itemId: string,
    data: {
      name?: string;
      image_url?: string | null;
      audio_url?: string | null;
      type?: 'map' | 'token' | 'prop' | 'sound' | null;
    },
    silent = false
  ) => {
    const result = await updateMediaItem(itemId, data);
    if (result.success) {
      if (!silent) {
        toast.success("Media item updated successfully");
      }
      if (!silent) {
        setEditingItem(null);
      }
      refetchItems();
    } else {
      toast.error(result.error?.message || "Failed to update media item");
      return result;
    }
    return { success: true };
  };

  const handleDelete = async () => {
    if (!deletingItemId) return;
    const result = await deleteMediaItem(deletingItemId);
    if (result.success) {
      toast.success("Media item deleted successfully");
      setDeletingItemId(null);
      refetchItems();
    } else {
      toast.error(result.error?.message || "Failed to delete media item");
    }
  };

  const handleDragDropComplete = (urls: string[], isAudio: boolean = false) => {
    if (activeTab === 'all') {
      // On "All" tab, always open dialog to select type (or none)
      if (isAudio) {
        setPendingAudioUrls(urls);
      } else {
        setPendingUrls(urls);
      }
      setCreateDialogOpen(true);
    } else if (urls.length === 1) {
      // Single file - open dialog to name it
      if (isAudio) {
        setPendingAudioUrls(urls);
      } else {
        setPendingUrls(urls);
      }
      setCreateDialogOpen(true);
    } else {
      // Multiple files - create with default names using active tab type
      handleCreateFromUrls(urls, activeTab as 'map' | 'token' | 'prop' | 'sound', isAudio);
    }
  };

  if (campaignLoading || itemsLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="aspect-square">
              <CardContent className="p-0">
                <Skeleton className="h-full w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Campaign not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Media Library</h1>
          <p className="text-muted-foreground mt-1">
            Manage maps, tokens, and props for your campaign
          </p>
        </div>
        {isDm && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Media
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MediaType)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="map">Maps</TabsTrigger>
          <TabsTrigger value="token">Tokens</TabsTrigger>
          <TabsTrigger value="prop">Props</TabsTrigger>
          <TabsTrigger value="sound">Sounds</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 mt-6">
          {/* Drag & Drop Zone - Only show when no items exist */}
          {isDm && items.length === 0 && (
            <Card>
              <CardContent className="p-6">
                {activeTab === 'all' ? (
                  <MediaDragDrop
                    campaignId={campaignId}
                    type="map"
                    onUploadComplete={(urls) => handleDragDropComplete(urls, false)}
                    disabled={creating}
                  />
                ) : (
                  <MediaDragDrop
                    campaignId={campaignId}
                    type={activeTab as 'map' | 'token' | 'prop' | 'sound'}
                    onUploadComplete={(urls) => handleDragDropComplete(urls, activeTab === 'sound')}
                    disabled={creating}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Media Grid */}
          <MediaLibraryGrid
            items={items}
            onEdit={setEditingItem}
            onDelete={setDeletingItemId}
            onTypeChange={async (itemId, newType) => {
              await handleUpdate(itemId, { type: newType as 'map' | 'token' | 'prop' | 'sound' | null }, true);
            }}
            isLoading={itemsLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <MediaItemFormDialog
        open={createDialogOpen || editingItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingItem(null);
            setPendingUrls([]);
            setPendingAudioUrls([]);
          }
        }}
        campaignId={campaignId}
        item={editingItem}
        defaultType={pendingUrls.length > 0 || pendingAudioUrls.length > 0 ? (activeTab === 'all' ? (pendingAudioUrls.length > 0 ? 'sound' : 'map') : activeTab) : undefined}
        pendingImageUrl={pendingUrls.length > 0 ? pendingUrls[0] : null}
        pendingAudioUrl={pendingAudioUrls.length > 0 ? pendingAudioUrls[0] : null}
        onCreate={async (data) => {
          // Use the URLs from the form (which already has the pending URLs if applicable)
          return handleCreate(data);
        }}
        onUpdate={handleUpdate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deletingItemId !== null}
        onOpenChange={(open) => !open && setDeletingItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

