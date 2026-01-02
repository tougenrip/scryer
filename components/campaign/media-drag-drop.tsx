"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  url?: string;
}

interface MediaDragDropProps {
  campaignId: string;
  type: 'map' | 'token' | 'prop';
  onUploadComplete: (urls: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function MediaDragDrop({
  campaignId,
  type,
  onUploadComplete,
  disabled = false,
  className,
}: MediaDragDropProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Initialize upload progress
    const newUploads: UploadProgress[] = validFiles.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    }));
    setUploads(newUploads);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not authenticated");
      return;
    }

    const uploadedUrls: string[] = [];

    // Upload files sequentially to show progress
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const uploadIndex = i;

      try {
        const fileExt = file.name.split(".").pop();
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${campaignId}/media/${type}/${timestamp}-${uploadIndex}-${sanitizedName}`;

        // Upload file
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

        uploadedUrls.push(publicUrl);

        // Update upload status
        setUploads(prev => prev.map((upload, idx) =>
          idx === uploadIndex
            ? { ...upload, progress: 100, status: 'success', url: publicUrl }
            : upload
        ));
      } catch (error: any) {
        console.error(`Error uploading ${file.name}:`, error);
        setUploads(prev => prev.map((upload, idx) =>
          idx === uploadIndex
            ? { ...upload, progress: 0, status: 'error', error: error.message || "Upload failed" }
            : upload
        ));
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploadedUrls.length > 0) {
      onUploadComplete(uploadedUrls);
      // Clear uploads after a delay
      setTimeout(() => {
        setUploads([]);
      }, 3000);
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

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeUpload = (index: number) => {
    setUploads(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-2">
          <div className={cn(
            "rounded-full p-3",
            dragActive ? "bg-primary/10" : "bg-muted"
          )}>
            <Upload className={cn(
              "h-6 w-6 transition-colors",
              dragActive ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {dragActive ? "Drop files here" : "Drag & drop images here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse • PNG, JPG, WEBP up to 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <div
              key={index}
              className="border rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate flex-1">
                  {upload.fileName}
                </span>
                {upload.status === 'success' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeUpload(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {upload.status === 'uploading' && (
                <Progress value={upload.progress} className="h-2" />
              )}
              {upload.status === 'success' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Loader2 className="h-4 w-4" />
                  Uploaded successfully
                </div>
              )}
              {upload.status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <X className="h-4 w-4" />
                  {upload.error || "Upload failed"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

