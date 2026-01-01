"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useInvitePlayer } from "@/hooks/useCampaigns";
import { toast } from "sonner";
import { Copy, Check, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

interface InviteDialogProps {
  campaignId: string;
  trigger?: React.ReactNode;
}

export function InviteDialog({ campaignId, trigger }: InviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const { invitePlayer, loading } = useInvitePlayer();
  const inviteLink = typeof window !== "undefined" 
    ? `${window.location.origin}/campaigns/${campaignId}/join`
    : "";

  const handleInviteByEmail = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Find user by email
    const { data: users, error: userError } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", email)
      .single();

    // Since we can't directly query auth.users, we'll use a different approach
    // For now, we'll show the invite link method
    toast.info("Please use the invite link method. Direct email invites coming soon!");
    setOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Player
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Invite Player</DialogTitle>
          <DialogDescription>
            Share an invite link or send an email invitation to add players to your campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invite Link Method */}
          <div className="space-y-2">
            <Label>Invite Link</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with players to let them join your campaign.
            </p>
          </div>

          {/* Email Method (Future) */}
          <div className="space-y-2">
            <Label>Email Invitation (Coming Soon)</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled
              />
              <Button
                type="button"
                onClick={handleInviteByEmail}
                disabled={loading || !email}
              >
                Send
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Direct email invitations will be available in a future update.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
