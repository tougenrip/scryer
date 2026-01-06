"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCampaign, useDeleteCampaign } from "@/hooks/useCampaigns";
import { CampaignForm } from "@/components/campaign/campaign-form";
import { MemberList } from "@/components/campaign/member-list";
import { InviteDialog } from "@/components/campaign/invite-dialog";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function CampaignSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  // const { updateCampaign } = useUpdateCampaign();
  const { deleteCampaign, loading: deleting } = useDeleteCampaign();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDm, setIsDm] = useState(false);

  useEffect(() => {
    async function getUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        if (campaign) {
          setIsDm(campaign.dm_user_id === user.id);
        }
      }
    }
    getUser();
  }, [campaign]);

  const handleDelete = async () => {
    const result = await deleteCampaign(campaignId);
    if (result.success) {
      toast.success("Campaign deleted successfully");
      router.push("/campaigns");
    } else {
      toast.error(result.error?.message || "Failed to delete campaign");
    }
  };

  if (campaignLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
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
    <>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold">Campaign Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your campaign details and members</p>
        </div>

        {/* Campaign Details */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Campaign Details</CardTitle>
            <CardDescription>Update your campaign name and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Name</p>
              <p className="text-sm text-muted-foreground">{campaign.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Description</p>
              <p className="text-sm text-muted-foreground">
                {campaign.description || "No description"}
              </p>
            </div>
            <Button onClick={() => setEditDialogOpen(true)} variant="outline">
              Edit Campaign
            </Button>
          </CardContent>
        </Card>

        {/* Members */}
        {currentUserId && (
          <MemberList
            campaignId={campaignId}
            currentUserId={currentUserId}
            isDm={isDm}
          />
        )}

        {/* Invite Players */}
        {isDm && (
          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Invite Players</CardTitle>
              <CardDescription>Add new players to your campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <InviteDialog campaignId={campaignId} />
            </CardContent>
          </Card>
        )}

        {/* Danger Zone */}
        {isDm && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="font-serif text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Campaign
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                This will permanently delete the campaign and all associated data.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      {currentUserId && (
        <CampaignForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          campaignId={campaignId}
          initialValues={{
            name: campaign.name,
            description: campaign.description || "",
          }}
          userId={currentUserId}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{campaign.name}&quot;? This action cannot be undone.
              All campaign data, characters, maps, and homebrew content will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

