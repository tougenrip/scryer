export interface SoundboardSound {
  id: string;
  campaign_id: string;
  name: string;
  audio_url: string;
  emoji: string | null;
  color: string | null;
  category: string | null;
  duration_ms: number | null;
  created_by: string;
  created_at: string;
}

/** Sample soundboard asset seeded by the admin tools — same shape as
 *  rest of `vtt_sample_assets` rows but with `kind = 'soundboard'`. */
export interface SampleSoundboardAsset {
  id: string;
  kind: "soundboard";
  category_id: string | null;
  name: string;
  url: string;
  emoji: string | null;
  description: string | null;
  created_at: string;
}
