"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TimelineImageUploadProps {
  imageUrl: string | null;
  onImageChange: (url: string | null) => void;
  campaignId: string;
  disabled?: boolean;
}

export function TimelineImageUpload({
  imageUrl,
  onImageChange,
  campaignId,
  disabled = false,
}: TimelineImageUploadProps) {
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

    // Validate file size (max 10MB)
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
      const fileName = `${campaignId}/timeline/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

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
      const urlParts = imageUrl.split('/');
      const fileName = urlParts.slice(urlParts.indexOf('timeline')).join('/');
      
      if (fileName && fileName.includes('timeline/')) {
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from("campaigns")
          .remove([fileName]);

        if (deleteError) {
          console.error("Error deleting image:", deleteError);
          // Continue anyway - the URL will be removed from the database
        }
      }

      onImageChange(null);
      toast.success("Image removed");
    } catch (error: unknown) {
      console.error("Error removing image:", error);
      toast.error("Failed to remove image");
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
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      {imageUrl ? (
        /* Image with hover overlay */
        <div
          ref={dropZoneRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative rounded-lg overflow-hidden border-2 border-border bg-muted cursor-pointer group ${
            dragActive ? "border-primary" : ""
          } ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          <img
            src={imageUrl}
            alt="Timeline entry preview"
            className="w-full h-48 object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          {/* Hover overlay */}
          {!uploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
              <Upload className="h-8 w-8 text-white" />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-white">
                  Click to change image
                </p>
                <p className="text-xs text-white/80">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Drop Zone when no image */
        <div
          ref={dropZoneRef}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/50 hover:bg-muted"
          } ${disabled || uploading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {dragActive ? "Drop image here" : "Click to upload or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {imageUrl && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemoveImage}
          disabled={uploading}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Remove Image
        </Button>
      )}
    </div>
  );
}
