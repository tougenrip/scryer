"use client";

import { useState } from "react";
import { MusicPlayer } from "@/components/tools/MusicPlayer";
import { SoundboardPanel } from "@/components/tools/SoundboardPanel";
import { cn } from "@/lib/utils";
import { Music, Volume2 } from "lucide-react";

interface Props {
  campaignId: string;
  isDm: boolean;
  /** Shared audio element ref — passed through to MusicPlayer so the
   *  desktop's music doesn't restart on remount. */
  audioRef?: React.RefObject<HTMLAudioElement>;
  /** Remount key forwarded to MusicPlayer when the parent needs a
   *  hard reset (e.g. campaign switch). */
  musicKey?: string | number;
}

type Tab = "music" | "soundboard";

/**
 * Sidebar slot that hosts both the long-form music player and the
 * one-shot soundboard. Tabs at the top swap which one is visible
 * (the other stays mounted so the music track keeps playing when the
 * DM is firing SFX from the soundboard).
 */
export function MusicAndSoundboardPanel({
  campaignId,
  isDm,
  audioRef,
  musicKey,
}: Props) {
  const [tab, setTab] = useState<Tab>("music");

  return (
    <div className="flex h-full flex-col bg-card">
      {/* Tab strip */}
      <div className="flex shrink-0 border-b border-border">
        <TabButton
          active={tab === "music"}
          onClick={() => setTab("music")}
          icon={<Music className="h-3.5 w-3.5" />}
          label="Music"
        />
        <TabButton
          active={tab === "soundboard"}
          onClick={() => setTab("soundboard")}
          icon={<Volume2 className="h-3.5 w-3.5" />}
          label="Soundboard"
        />
      </div>

      {/* Both panels stay mounted so audio state survives tab swaps —
          critical for music continuity. We just hide the inactive
          one. */}
      <div className="flex-1 min-h-0 relative">
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            tab === "music" ? "block" : "hidden"
          )}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 bg-card h-full">
            <MusicPlayer
              key={musicKey}
              campaignId={campaignId}
              isDm={isDm}
              isVisible={tab === "music"}
              audioRef={audioRef}
            />
          </div>
        </div>
        <div
          className={cn(
            "absolute inset-0 overflow-hidden",
            tab === "soundboard" ? "block" : "hidden"
          )}
        >
          <SoundboardPanel campaignId={campaignId} isDm={isDm} />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors",
        active
          ? "text-amber-400 border-b-2 border-amber-400 -mb-px"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
