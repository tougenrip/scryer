"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface MapImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  campaignId: string;
  disabled?: boolean;
}

export function MapImageUpload({
  imageUrl,
  onImageChange,
  campaignId,
  disabled = false,
}: MapImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB for maps)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get file extension for filename
      const timestamp = Date.now();
      const fileName = `${campaignId}/media/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      // Upload to campaigns bucket
      const { error: uploadError } = await supabase.storage
        .from("campaigns")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("campaigns")
        .getPublicUrl(fileName);

      // Update with new image URL
      onImageChange(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: unknown) {
      console.error("Error uploading image:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFileSelect(file);
  };

  const handleRemoveImage = async () => {
    if (!imageUrl) return;

    try {
      const supabase = createClient();
      
      // Extract filename from URL
      const urlParts = imageUrl.split("/campaigns/");
      if (urlParts.length > 1) {
        const fileName = urlParts[1].split("?")[0];
        
        // Try to delete from storage
        try {
          await supabase.storage.from("campaigns").remove([fileName]);
        } catch (err) {
          console.warn("Failed to delete file from storage:", err);
        }
      }

      // Update form data
      onImageChange(null);
      toast.success("Image removed");
    } catch (error: unknown) {
      console.error("Error removing image:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to remove image";
      toast.error(errorMessage);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || uploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      {imageUrl && (
        <div className="relative rounded-lg overflow-hidden border-2 border-border bg-muted">
          <img
            src={imageUrl}
            alt="Image preview"
            className="w-full h-48 object-contain"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      )}

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        } ${disabled || uploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {imageUrl ? "Click to change image" : "Click or drag image here"}
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP up to 10MB
            </p>
          </div>
        </div>
      </div>

      {imageUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemoveImage}
          disabled={disabled || uploading}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Remove Image
        </Button>
      )}
    </div>
  );
}

