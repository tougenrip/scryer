"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Pre-creation portrait picker. The existing `CharacterPortrait`
 * component requires a `characterId` (which doesn't exist before
 * the character is saved), so this is the creator-flow analogue:
 *
 *   • Lets the player pick from a small curated preset gallery
 *     (DiceBear avatars — generated on the fly, no asset hosting)
 *   • OR uploads a custom file to the `character-portraits` bucket
 *     under a draft prefix `draft_{timestamp}_{rand}.{ext}` so the
 *     URL is valid before the character row exists.
 *
 * `value` is the current `imageUrl` (null when unset). `onChange`
 * receives the new URL or null on remove.
 */

interface Props {
  characterName: string;
  value: string | null;
  onChange: (next: string | null) => void;
}

/** Curated preset gallery — DiceBear adventurer/lorelei/avataaars
 *  seeded with thematic D&D names. Pure URLs, no storage cost,
 *  always available. Players can override the name in the seed via
 *  their character's name on save. */
const PRESET_SEEDS = [
  // Adventurer style (D&D Beyond–ish illustrations)
  { style: "adventurer", seed: "Aric" },
  { style: "adventurer", seed: "Bryn" },
  { style: "adventurer", seed: "Cael" },
  { style: "adventurer", seed: "Dara" },
  { style: "adventurer", seed: "Erys" },
  { style: "adventurer", seed: "Faren" },
  { style: "adventurer", seed: "Gwyn" },
  { style: "adventurer", seed: "Hale" },
  // Lorelei (softer, painterly)
  { style: "lorelei", seed: "Ivor" },
  { style: "lorelei", seed: "Jora" },
  { style: "lorelei", seed: "Kael" },
  { style: "lorelei", seed: "Lyra" },
  // Personas (more stylised)
  { style: "personas", seed: "Mira" },
  { style: "personas", seed: "Nyx" },
  { style: "personas", seed: "Orin" },
  { style: "personas", seed: "Pyra" },
];

function presetUrl(style: string, seed: string): string {
  // DiceBear v9 public API — returns an SVG. Cacheable + no auth.
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

export function PortraitPicker({ characterName, value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<"gallery" | "upload">("gallery");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = (() => {
    const trimmed = characterName.trim();
    if (!trimmed) return "?";
    return trimmed
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  })();

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      // Random + timestamp is enough here — the bucket policy
      // already scopes uploads to authenticated users, and we
      // don't have a character ID yet.
      const path = `draft_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;

      // Delete previous draft upload if its URL points into our
      // bucket — keeps the bucket tidy when the player swaps
      // images during the same creation session.
      if (value && value.includes("/character-portraits/")) {
        const oldPath = value.split("/character-portraits/")[1]?.split("?")[0];
        if (oldPath) {
          await supabase.storage.from("character-portraits").remove([oldPath]);
        }
      }

      const { error: upErr } = await supabase.storage
        .from("character-portraits")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("character-portraits").getPublicUrl(path);

      onChange(publicUrl);
      toast.success("Portrait uploaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!value) return;
    // Only delete from storage if the URL is a draft upload — preset
    // gallery URLs are external (DiceBear) and not in our bucket.
    if (value.includes("/character-portraits/")) {
      try {
        const path = value.split("/character-portraits/")[1]?.split("?")[0];
        if (path) {
          const supabase = createClient();
          await supabase.storage
            .from("character-portraits")
            .remove([path]);
        }
      } catch (err) {
        console.warn("Failed to remove draft upload:", err);
      }
    }
    onChange(null);
  };

  return (
    <div className="sc-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden border-2 border-border bg-muted">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={characterName || "Portrait"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <span className="text-2xl font-bold text-primary/60">
                {initials}
              </span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base font-semibold leading-tight">
            Portrait
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
            Optional — pick a preset or upload your own image (up to 5MB).
            You can change it later from the character sheet.
          </p>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Tab switch */}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setTab("gallery")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
            tab === "gallery"
              ? "bg-primary/15 text-primary border border-primary/40"
              : "bg-background text-muted-foreground border border-border hover:border-primary/30"
          )}
        >
          <ImageIcon className="h-3 w-3 inline mr-1" />
          Gallery
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
            tab === "upload"
              ? "bg-primary/15 text-primary border border-primary/40"
              : "bg-background text-muted-foreground border border-border hover:border-primary/30"
          )}
        >
          <Upload className="h-3 w-3 inline mr-1" />
          Upload
        </button>
      </div>

      {tab === "gallery" && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {PRESET_SEEDS.map((p, i) => {
            const url = presetUrl(p.style, p.seed);
            const active = value === url;
            return (
              <button
                key={`${p.style}-${p.seed}-${i}`}
                type="button"
                onClick={() => onChange(url)}
                className={cn(
                  "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border hover:border-primary/40"
                )}
                title={`${p.style} · ${p.seed}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`${p.style} ${p.seed}`}
                  className="w-full h-full object-cover bg-muted"
                />
              </button>
            );
          })}
        </div>
      )}

      {tab === "upload" && (
        <div className="flex flex-col items-center gap-2 py-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => !uploading && fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "w-full max-w-sm rounded-md border-2 border-dashed border-border bg-background py-6 flex flex-col items-center justify-center gap-1 transition-colors",
              !uploading && "hover:border-primary/40 hover:bg-primary/5",
              uploading && "opacity-60"
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
            <p className="text-xs font-medium">
              {uploading ? "Uploading…" : "Click to upload an image"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              PNG, JPG, WEBP — up to 5MB
            </p>
          </button>
        </div>
      )}
    </div>
  );
}
