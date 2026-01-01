"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useCampaignMembers, useRemoveMember } from "@/hooks/useCampaigns";
import { toast } from "sonner";
import { Trash2, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MemberListProps {
  campaignId: string;
  currentUserId: string;
  isDm: boolean;
}

export function MemberList({ campaignId, currentUserId, isDm }: MemberListProps) {
  const { members, loading, error } = useCampaignMembers(campaignId);
  const { removeMember, loading: removing } = useRemoveMember();
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const handleRemoveMember = async (userId: string) => {
    const result = await removeMember(campaignId, userId);
    if (result.success) {
      toast.success("Member removed successfully");
      setRemovingUserId(null);
    } else {
      toast.error(result.error?.message || "Failed to remove member");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Members</CardTitle>
          <CardDescription>Campaign members and their roles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Error loading members: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Members</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "member" : "members"} in this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;
              const isDmMember = member.role === "dm";
              const canRemove = isDm && !isCurrentUser && !isDmMember;

              return (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {member.user_id.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {isCurrentUser ? "You" : `User ${member.user_id.slice(0, 8)}`}
                        </span>
                        {isDmMember && (
                          <Badge variant="default" className="bg-primary/10 text-primary">
                            <Crown className="h-3 w-3 mr-1" />
                            DM
                          </Badge>
                        )}
                        {!isDmMember && (
                          <Badge variant="secondary">Player</Badge>
                        )}
                      </div>
                      {member.joined_at && (
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setRemovingUserId(member.user_id)}
                      disabled={removing}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={removingUserId !== null} onOpenChange={(open) => !open && setRemovingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the campaign? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removingUserId && handleRemoveMember(removingUserId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

