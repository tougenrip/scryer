import type { SupabaseClient } from "@supabase/supabase-js";
import type { VttSampleKind } from "@/lib/vtt/sample-catalog";

export const VTT_SAMPLES_BUCKET = "vtt-samples";
export const MAX_VTT_SAMPLE_FILE_BYTES = 50 * 1024 * 1024;

export const VTT_SAMPLE_KINDS: VttSampleKind[] = [
  "battlemap",
  "token",
  "prop",
  "sound",
  "soundboard",
];

export function isVttSampleKind(value: string): value is VttSampleKind {
  return (VTT_SAMPLE_KINDS as readonly string[]).includes(value);
}

export function parseExtraTagCategoryIds(form: FormData): string[] {
  const raw = form.get("extraTagCategoryIds");
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.length > 0);
  } catch {
    return [];
  }
}

export function assertMimeForKind(kind: VttSampleKind, mime: string) {
  if (kind === "sound") {
    if (!mime.startsWith("audio/")) {
      throw new Error("Sound assets must be audio files");
    }
  } else if (!mime.startsWith("image/")) {
    throw new Error("This asset type requires an image file");
  }
}

export function defaultBattlemapGridConfig(): Record<string, unknown> {
  return {
    pixelSize: 40,
    type: "square",
    feetPerSquare: 5,
  };
}

/** category_id points at row whose slug equals this kind (battlemap, token, …). */
export async function resolveCanonicalCategoryIdForKind(
  admin: SupabaseClient,
  kind: VttSampleKind
): Promise<{ ok: true; categoryId: string } | { ok: false; status: number; error: string }> {
  const { data, error } = await admin
    .from("vtt_sample_categories")
    .select("id")
    .eq("slug", kind)
    .maybeSingle();
  if (error) {
    return { ok: false, status: 500, error: error.message };
  }
  if (!data?.id) {
    return {
      ok: false,
      status: 400,
      error: `Missing canonical tag with slug "${kind}". Apply migration 071 (canonical rows) and 073 if needed.`,
    };
  }
  return { ok: true, categoryId: data.id };
}

/** tags[] = folder kind slug + any extra tag slugs (no per-tag kind in DB). */
export async function resolveExtraTagsForSampleKind(
  admin: SupabaseClient,
  folderKind: VttSampleKind,
  extraIds: string[]
): Promise<{ ok: true; uniqueSlugs: string[] } | { ok: false; status: number; error: string }> {
  const baseSlugs = [folderKind];
  if (extraIds.length === 0) {
    return { ok: true, uniqueSlugs: [...new Set(baseSlugs)] };
  }

  const { data: tagRows, error: tagErr } = await admin
    .from("vtt_sample_categories")
    .select("id, slug")
    .in("id", extraIds);
  if (tagErr) {
    return { ok: false, status: 500, error: tagErr.message };
  }
  const byId = new Map((tagRows ?? []).map((r) => [r.id, r.slug] as const));
  for (const id of extraIds) {
    if (!byId.has(id)) {
      return { ok: false, status: 400, error: `Unknown tag id: ${id}` };
    }
  }
  const extraSlugs = extraIds.map((id) => byId.get(id)!);
  return { ok: true, uniqueSlugs: [...new Set([...baseSlugs, ...extraSlugs])] };
}

/** True unless path is exactly `{kind}/filename` (two segments, first segment === kind). */
export function sampleStorageNeedsRewriteForKind(
  storagePath: string,
  kind: VttSampleKind
): boolean {
  const p = storagePath.split("/").filter(Boolean);
  if (p.length !== 2) return true;
  return p[0] !== kind;
}
