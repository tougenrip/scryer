"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CharacterPortraitProps {
  characterId: string;
  imageUrl: string | null;
  characterName: string;
  onImageUpdate: (imageUrl: string | null) => Promise<void>;
  editable?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function CharacterPortrait({
  characterId,
  imageUrl,
  characterName,
  onImageUpdate,
  editable = false,
  size = "lg",
}: CharacterPortraitProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
    xl: "h-48 w-48",
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      
      // Get file extension
      const fileExt = file.name.split(".").pop();
      const fileName = `${characterId}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // Delete old image if it exists
      if (imageUrl) {
        try {
          // Extract filename from URL - format: .../storage/v1/object/public/character-portraits/filename
          const urlParts = imageUrl.split("/character-portraits/");
          if (urlParts.length > 1) {
            const oldFileName = urlParts[1].split("?")[0]; // Remove query params if any
            await supabase.storage.from("character-portraits").remove([oldFileName]);
          }
        } catch (err) {
          console.warn("Failed to delete old image:", err);
          // Continue anyway
        }
      }

      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from("character-portraits")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("character-portraits")
        .getPublicUrl(filePath);

      // Update character with new image URL
      await onImageUpdate(publicUrl);
      toast.success("Character portrait updated");
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      const supabase = createClient();
      
      // Extract filename from URL - format: .../storage/v1/object/public/character-portraits/filename
      const urlParts = imageUrl.split("/character-portraits/");
      if (urlParts.length <= 1) {
        // If we can't parse the path, just update the character
        await onImageUpdate(null);
        return;
      }
      
      const fileName = urlParts[1].split("?")[0]; // Remove query params if any

      // Delete from storage
      const { error } = await supabase.storage
        .from("character-portraits")
        .remove([fileName]);

      if (error) {
        console.warn("Error removing file from storage:", error);
        // Continue to update character even if file deletion fails
      }

      // Update character
      await onImageUpdate(null);
      toast.success("Character portrait removed");
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error(error.message || "Failed to remove image");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative group">
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-border bg-muted`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={characterName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className={`font-bold text-primary/60 ${size === 'xl' ? 'text-3xl' : size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
              {getInitials(characterName)}
            </span>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}

        {editable && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full flex items-center justify-center gap-2 z-20">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-1" />
              {imageUrl ? "Change" : "Upload"}
            </Button>
            {imageUrl && (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRemoveImage}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

