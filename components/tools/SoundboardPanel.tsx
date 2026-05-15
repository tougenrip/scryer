"use client";

import { useMemo, useRef, useState } from "react";
import { useSoundboard } from "@/hooks/useSoundboard";
import type {
  SoundboardSound,
  SampleSoundboardAsset,
} from "@/types/soundboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Play,
  Trash2,
  Plus,
  Upload,
  Library,
  Loader2,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  campaignId: string;
  isDm: boolean;
}

const CATEGORY_PRESETS = [
  "combat",
  "ambient",
  "humor",
  "fx",
  "music",
  "voice",
];

export function SoundboardPanel({ campaignId, isDm }: Props) {
  const {
    sounds,
    grouped,
    samples,
    loading,
    play,
    createSound,
    deleteSound,
    uploadFile,
    addFromSample,
  } = useSoundboard(campaignId);

  const [addOpen, setAddOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 shrink-0">
        <Volume2 className="h-4 w-4 text-amber-400" />
        <p
          className="flex-1 text-xs font-bold text-amber-400"
          style={{ fontVariant: "small-caps" }}
        >
          Soundboard
        </p>
        {isDm && (
          <>
            <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                  <Library className="h-3 w-3 mr-1" />
                  Samples
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add from samples</DialogTitle>
                </DialogHeader>
                <SampleBrowser
                  samples={samples}
                  existingUrls={new Set(sounds.map((s) => s.audio_url))}
                  onPick={async (sample) => {
                    const created = await addFromSample(sample);
                    if (created) {
                      toast.success(`Added "${sample.name}"`);
                    }
                  }}
                />
              </DialogContent>
            </Dialog>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                  <Plus className="h-3 w-3 mr-1" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Upload sound</DialogTitle>
                </DialogHeader>
                <UploadForm
                  onUpload={async (file, name, emoji, category) => {
                    const url = await uploadFile(file);
                    if (!url) return false;
                    const created = await createSound({
                      name: name || file.name,
                      audio_url: url,
                      emoji: emoji || null,
                      category: category || null,
                    });
                    if (created) {
                      toast.success(`Added "${created.name}"`);
                      setAddOpen(false);
                      return true;
                    }
                    return false;
                  }}
                />
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 custom-scrollbar">
        {loading ? (
          <p className="px-2 py-4 text-[11px] italic text-muted-foreground">
            Loading…
          </p>
        ) : sounds.length === 0 ? (
          <div className="px-3 py-6 text-center space-y-2">
            <p className="text-xs text-muted-foreground italic">
              No sounds yet.
            </p>
            {isDm && (
              <p className="text-[11px] text-muted-foreground">
                Tap{" "}
                <button
                  type="button"
                  onClick={() => setSampleOpen(true)}
                  className="text-amber-400 hover:underline"
                >
                  Samples
                </button>{" "}
                to start, or{" "}
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="text-amber-400 hover:underline"
                >
                  upload
                </button>{" "}
                your own.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map(({ category, sounds: catSounds }) => (
              <section key={category}>
                <p className="px-1 mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {category}
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {catSounds.map((s) => (
                    <SoundButton
                      key={s.id}
                      sound={s}
                      onPlay={() =>
                        void play({
                          audio_url: s.audio_url,
                          name: s.name,
                        })
                      }
                      onDelete={isDm ? () => void deleteSound(s.id) : undefined}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SoundButton({
  sound,
  onPlay,
  onDelete,
}: {
  sound: SoundboardSound;
  onPlay: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className="group relative aspect-square rounded-md border border-border bg-muted/30 overflow-hidden flex flex-col items-center justify-center p-1 text-center hover:border-amber-500/50 transition-colors"
      style={
        sound.color
          ? {
              borderColor: `${sound.color}66`,
              backgroundColor: `${sound.color}10`,
            }
          : undefined
      }
    >
      <button
        type="button"
        onClick={onPlay}
        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
        title={sound.name}
      >
        <span className="text-xl leading-none">
          {sound.emoji || "🔊"}
        </span>
        <span className="text-[9px] leading-tight line-clamp-2 px-0.5 mt-0.5">
          {sound.name}
        </span>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remove "${sound.name}"?`)) onDelete();
          }}
          className="absolute top-0.5 right-0.5 z-10 h-5 w-5 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-background/60"
          aria-label="Delete sound"
          title="Remove"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function SampleBrowser({
  samples,
  existingUrls,
  onPick,
}: {
  samples: SampleSoundboardAsset[];
  existingUrls: Set<string>;
  onPick: (sample: SampleSoundboardAsset) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return samples;
    return samples.filter((s) => s.name.toLowerCase().includes(q));
  }, [samples, query]);

  return (
    <div className="space-y-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sample sounds…"
        className="h-8 text-sm"
        autoFocus
      />
      {samples.length === 0 ? (
        <p className="text-xs italic text-muted-foreground text-center py-4">
          No sample sounds available yet. Ask the admin to seed some.
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto rounded border border-border divide-y divide-border/40">
          {filtered.map((s) => {
            const already = existingUrls.has(s.url);
            return (
              <li key={s.id} className="flex items-center gap-2 px-2 py-1.5">
                <span className="text-lg shrink-0">{s.emoji || "🔊"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{s.name}</p>
                  {s.description && (
                    <p className="text-[10px] text-muted-foreground italic truncate">
                      {s.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const audio = new Audio(s.url);
                    void audio.play().catch(() => {
                      // ignore — preview-only, autoplay may block
                    });
                  }}
                  className="h-7 w-7 rounded text-muted-foreground hover:text-foreground flex items-center justify-center"
                  title="Preview locally (doesn't broadcast)"
                >
                  <Play className="h-3.5 w-3.5" />
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant={already ? "outline" : "default"}
                  className="h-7 text-[11px]"
                  disabled={already}
                  onClick={() => void onPick(s)}
                >
                  {already ? "Added" : "Add"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UploadForm({
  onUpload,
}: {
  onUpload: (
    file: File,
    name: string,
    emoji: string,
    category: string
  ) => Promise<boolean>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");
  const [category, setCategory] = useState("fx");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) {
      toast.error("Pick a file first.");
      return;
    }
    setBusy(true);
    const ok = await onUpload(file, name.trim(), emoji.trim(), category.trim());
    setBusy(false);
    if (ok) {
      setFile(null);
      setName("");
      setEmoji("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Audio file
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
          }}
          className="block w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:bg-muted file:text-foreground"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Slash"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Emoji
          </label>
          <Input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="⚔️"
            className="h-8 text-sm text-center"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
        >
          {CATEGORY_PRESETS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="button"
        onClick={submit}
        disabled={!file || busy}
        className="w-full"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 mr-1" />
        )}
        Upload
      </Button>
    </div>
  );
}
