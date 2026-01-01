"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCampaign, useUpdateCampaign } from "@/hooks/useCampaigns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  initialValues?: {
    name: string;
    description?: string;
  };
  userId: string;
}

export function CampaignForm({
  open,
  onOpenChange,
  campaignId,
  initialValues,
  userId,
}: CampaignFormProps) {
  const router = useRouter();
  const { createCampaign, loading: creating } = useCreateCampaign();
  const { updateCampaign, loading: updating } = useUpdateCampaign();
  const isEditing = !!campaignId;

  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: initialValues || {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (values: CampaignFormValues) => {
    if (isEditing) {
      const result = await updateCampaign(campaignId!, values);
      if (result.success) {
        toast.success("Campaign updated successfully");
        onOpenChange(false);
        form.reset();
      } else {
        toast.error(result.error?.message || "Failed to update campaign");
      }
    } else {
      const result = await createCampaign({
        name: values.name,
        description: values.description,
        dm_user_id: userId,
      });

      if (result.success) {
        toast.success("Campaign created successfully");
        onOpenChange(false);
        form.reset();
        router.push(`/campaigns/${result.data?.id}`);
      } else {
        toast.error(result.error?.message || "Failed to create campaign");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEditing ? "Edit Campaign" : "Create New Campaign"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your campaign details below."
              : "Start a new D&D campaign. You'll be set as the Dungeon Master."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Name</FormLabel>
                  <FormControl>
                    <Input placeholder="The Lost Mines of Phandelver" {...field} />
                  </FormControl>
                  <FormDescription>
                    Choose a memorable name for your campaign.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of your campaign..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add a short description to help players understand the campaign.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
                disabled={creating || updating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {creating || updating
                  ? (isEditing ? "Updating..." : "Creating...")
                  : (isEditing ? "Update Campaign" : "Create Campaign")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

