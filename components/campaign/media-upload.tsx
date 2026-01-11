"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Music, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface MediaUploadProps {
  imageUrl: string | null;
  audioUrl: string | null;
  onImageChange: (url: string | null) => void;
  onAudioChange: (url: string | null) => void;
  campaignId: string;
  mediaType?: 'image' | 'audio' | 'both';
  disabled?: boolean;
}

export function MediaUpload({
  imageUrl,
  audioUrl,
  onImageChange,
  onAudioChange,
  campaignId,
  mediaType = 'both',
  disabled = false,
}: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileSelect = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/") || 
                    ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].some(ext => 
                      file.name.toLowerCase().endsWith(ext)
                    );

    // Validate file type based on mediaType prop
    if (mediaType === 'image' && !isImage) {
      toast.error("Please select an image file");
      return;
    }
    if (mediaType === 'audio' && !isAudio) {
      toast.error("Please select an audio file");
      return;
    }
    if (mediaType === 'both' && !isImage && !isAudio) {
      toast.error("Please select an image or audio file");
      return;
    }

    // Validate file size
    const maxSize = isAudio ? 20 * 1024 * 1024 : 10 * 1024 * 1024; // 20MB for audio, 10MB for images
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${maxSize / (1024 * 1024)}MB`);
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
      const fileType = isAudio ? 'sound' : 'image';
      const fileName = `${campaignId}/media/${fileType}/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Use campaign-audio bucket for audio files, campaigns bucket for images
      const bucketName = isAudio ? 'campaign-audio' : 'campaigns';

      // Upload to appropriate bucket
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Update with new URL
      if (isAudio) {
        onAudioChange(publicUrl);
        toast.success("Audio uploaded successfully");
      } else {
        onImageChange(publicUrl);
        toast.success("Image uploaded successfully");
      }
    } catch (error: unknown) {
      console.error("Error uploading file:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
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
      
      // Extract filename from URL (could be from campaigns or campaign-audio bucket)
      const urlParts = imageUrl.includes("/campaign-audio/") 
        ? imageUrl.split("/campaign-audio/")
        : imageUrl.split("/campaigns/");
      if (urlParts.length > 1) {
        const fileName = urlParts[1].split("?")[0];
        const bucketName = imageUrl.includes("/campaign-audio/") ? "campaign-audio" : "campaigns";
        
        // Try to delete from storage
        try {
          await supabase.storage.from(bucketName).remove([fileName]);
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

  const handleRemoveAudio = async () => {
    if (!audioUrl) return;

    try {
      const supabase = createClient();
      
      // Extract filename from URL (could be from campaigns or campaign-audio bucket)
      const urlParts = audioUrl.includes("/campaign-audio/") 
        ? audioUrl.split("/campaign-audio/")
        : audioUrl.split("/campaigns/");
      if (urlParts.length > 1) {
        const fileName = urlParts[1].split("?")[0];
        const bucketName = audioUrl.includes("/campaign-audio/") ? "campaign-audio" : "campaigns";
        
        // Try to delete from storage
        try {
          await supabase.storage.from(bucketName).remove([fileName]);
        } catch (err) {
          console.warn("Failed to delete file from storage:", err);
        }
      }

      // Update form data
      onAudioChange(null);
      toast.success("Audio removed");
    } catch (error: unknown) {
      console.error("Error removing audio:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to remove audio";
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

  const getAcceptString = () => {
    if (mediaType === 'image') return "image/*";
    if (mediaType === 'audio') return "audio/*,.mp3,.wav,.ogg,.m4a,.aac";
    return "image/*,audio/*,.mp3,.wav,.ogg,.m4a,.aac";
  };

  const getPlaceholderText = () => {
    if (mediaType === 'image') return "Click or drag image here";
    if (mediaType === 'audio') return "Click or drag audio file here";
    return "Click or drag media file here";
  };

  const getFileTypesText = () => {
    if (mediaType === 'image') return "PNG, JPG, WEBP up to 10MB";
    if (mediaType === 'audio') return "MP3, WAV, OGG up to 20MB";
    return "Images (PNG, JPG, WEBP) or Audio (MP3, WAV, OGG)";
  };

  return (
    <div className="space-y-4">
      {/* Image Preview */}
      {imageUrl && (
        <div
          className="relative rounded-lg overflow-hidden border-2 border-border bg-muted group"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <img
            src={imageUrl}
            alt="Image preview"
            className="w-full h-48 object-contain"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
            <input
              ref={fileInputRef}
              type="file"
              accept={getAcceptString()}
              onChange={handleFileInputChange}
              className="hidden"
              disabled={disabled || uploading}
            />
            {mediaType !== 'audio' && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                  disabled={disabled || uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRemoveImage}
                  disabled={disabled || uploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Audio Preview */}
      {audioUrl && (
        <div
          className="relative rounded-lg overflow-hidden border-2 border-border bg-gradient-to-br from-orange-500/20 to-orange-600/20 p-4 group"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex items-center gap-4">
            <Music className="h-12 w-12 text-orange-500" />
            <div className="flex-1">
              <audio
                src={audioUrl}
                controls
                className="w-full"
                preload="metadata"
              />
            </div>
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <input
                ref={fileInputRef}
                type="file"
                accept={getAcceptString()}
                onChange={handleFileInputChange}
                className="hidden"
                disabled={disabled || uploading}
              />
              {mediaType !== 'image' && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
                    disabled={disabled || uploading}
                    className="mr-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveAudio}
                    disabled={disabled || uploading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Drop Zone (only shown when no media) */}
      {!imageUrl && !audioUrl && (
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
            accept={getAcceptString()}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || uploading}
          />
          <div className="flex flex-col items-center gap-2">
            {mediaType === 'audio' ? (
              <Music className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {getPlaceholderText()}
              </p>
              <p className="text-xs text-muted-foreground">
                {getFileTypesText()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
