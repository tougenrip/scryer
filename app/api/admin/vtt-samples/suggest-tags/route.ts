import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { bufferForOllamaVision } from "@/lib/admin/ollama-image-for-vision";
import {
  assertImageSize,
  getOllamaTagConfig,
  MAX_IMAGE_BYTES,
  MAX_OLLAMA_IMAGE_BYTES,
  suggestVttTagSlugsWithOllama,
} from "@/lib/admin/ollama-suggest-vtt-tags";
import {
  assertMimeForKind,
  isVttSampleKind,
  resolveExtraTagsForSampleKind,
} from "@/lib/admin/vtt-sample-assets-shared";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import {
  sampleAssetTagSlugs,
  type VttSampleAssetRow,
  type VttSampleKind,
} from "@/lib/vtt/sample-catalog";
import { labelFromSampleStoragePath } from "@/lib/vtt/sample-storage-label";
import type { SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

type SuggestContext = {
  admin: SupabaseClient;
  folderKind: VttSampleKind;
  buf: Buffer;
  fileLabel: string;
};

type Body = {
  assetId?: string;
  apply?: boolean;
};

async function runSuggest(
  ctx: SuggestContext
): Promise<{
  suggested: string[];
  raw: string;
  slugToId: Map<string, string>;
  noCatalogExtras?: boolean;
}> {
  const { data: categories, error: catErr } = await ctx.admin
    .from("vtt_sample_categories")
    .select("id, slug");
  if (catErr) {
    throw new Error(catErr.message);
  }
  const list = (categories ?? []) as { id: string; slug: string }[];
  const slugToId = new Map(list.map((c) => [c.slug, c.id] as const));
  const allowedExtraSlugs = list.map((c) => c.slug).filter((s) => s && s !== ctx.folderKind);
  if (allowedExtraSlugs.length === 0) {
    return {
      suggested: [],
      raw: "",
      slugToId,
      noCatalogExtras: true,
    };
  }
  assertImageSize(ctx.buf, MAX_IMAGE_BYTES, "source");
  const prepared = await bufferForOllamaVision(ctx.buf);
  assertImageSize(prepared, MAX_OLLAMA_IMAGE_BYTES, "ollama");
  const b64 = prepared.toString("base64");
  const out = await suggestVttTagSlugsWithOllama({
    imageBase64: b64,
    folderKind: ctx.folderKind,
    allowedExtraSlugs,
    fileLabel: ctx.fileLabel,
  });
  return { suggested: out.slugs, raw: out.raw, slugToId };
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  if (!getOllamaTagConfig()) {
    return NextResponse.json(
      {
        error:
          "Local tag suggestions are disabled. Set OLLAMA_TAG_MODEL (e.g. deepseek-ocr) and ensure Ollama is running.",
        enabled: false,
      },
      { status: 503 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  const admin = createAdminSupabaseClient();

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
    const file = form.get("file");
    const kindRaw = String(form.get("sampleKind") ?? "").trim();
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `File is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024}MB) for tag suggestion` },
        { status: 400 }
      );
    }
    if (!isVttSampleKind(kindRaw)) {
      return NextResponse.json(
        { error: "sampleKind must be battlemap, token, prop, sound, or soundboard" },
        { status: 400 }
      );
    }
    const folderKind = kindRaw as VttSampleKind;
    if (folderKind === "sound") {
      return NextResponse.json(
        { error: "Tag suggestions are only for image files" },
        { status: 400 }
      );
    }
    const mime = file.type || "application/octet-stream";
    try {
      assertMimeForKind(folderKind, mime);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid file type" },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const fileLabel = file.name && file.name.length > 0 ? file.name : "upload";
    let result: { suggested: string[]; raw: string; slugToId: Map<string, string> };
    try {
      result = await runSuggest({ admin, folderKind, buf, fileLabel });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Suggest failed";
      console.error("[suggest-tags] multipart", e);
      if (/too large|Image is too large|too large \(/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      if (msg.includes("Ollama") || msg.includes("timed out") || /context|length|token/i.test(msg)) {
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const { suggested, raw, slugToId, noCatalogExtras } = result;
    if (noCatalogExtras) {
      return NextResponse.json({
        enabled: true,
        suggestedSlugs: [],
        suggestedTagIds: [],
        raw: "",
        noCatalogExtras: true,
        applied: false,
      });
    }
    const suggestedIds = suggested.map((s) => slugToId.get(s)).filter((x): x is string => !!x);
    return NextResponse.json({
      enabled: true,
      suggestedSlugs: suggested,
      suggestedTagIds: suggestedIds,
      raw,
      applied: false,
    });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: "Use JSON with assetId or multipart form with file + sampleKind" },
      { status: 400 }
    );
  }
  const assetId = body.assetId?.trim();
  if (!assetId) {
    return NextResponse.json(
      { error: "assetId is required, or send multipart/form-data with file and sampleKind" },
      { status: 400 }
    );
  }

  const { data: row, error: rowErr } = await admin
    .from("vtt_sample_assets")
    .select("*")
    .eq("id", assetId)
    .single();
  if (rowErr || !row) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  const asset = row as VttSampleAssetRow;
  if (asset.kind === "sound") {
    return NextResponse.json(
      { error: "Tag suggestions are only for image assets" },
      { status: 400 }
    );
  }
  if (!asset.public_url) {
    return NextResponse.json({ error: "Asset has no public URL" }, { status: 400 });
  }

  const folderKind = asset.kind as VttSampleKind;
  let buf: Buffer;
  try {
    const imgRes = await fetch(asset.public_url, { cache: "no-store" });
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `Could not load image (${imgRes.status})` },
        { status: 502 }
      );
    }
    buf = Buffer.from(await imgRes.arrayBuffer());
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to download image" },
      { status: 502 }
    );
  }
  const fileLabel = labelFromSampleStoragePath(asset.storage_path);
  let result: { suggested: string[]; raw: string; slugToId: Map<string, string> };
  try {
    result = await runSuggest({ admin, folderKind, buf, fileLabel });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Suggest failed";
    console.error("[suggest-tags] json", e);
    if (/too large|Image is too large|too large \(/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg.includes("Ollama") || msg.includes("timed out") || /context|length|token/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  const { suggested, raw, slugToId, noCatalogExtras } = result;
  if (noCatalogExtras) {
    return NextResponse.json({
      enabled: true,
      suggestedSlugs: [],
      suggestedTagIds: [],
      raw: "",
      noCatalogExtras: true,
      applied: false,
    });
  }
  const suggestedIds = suggested.map((s) => slugToId.get(s)).filter((x): x is string => !!x);

  if (body.apply) {
    const currentSlugs = sampleAssetTagSlugs(asset);
    const currentExtras = currentSlugs.filter((s) => s !== folderKind);
    const mergedExtraSlugs = [...new Set([...currentExtras, ...suggested])];
    const extraIds: string[] = [];
    for (const slug of mergedExtraSlugs) {
      if (slug === folderKind) continue;
      const id = slugToId.get(slug);
      if (id) extraIds.push(id);
    }
    const tagsRes = await resolveExtraTagsForSampleKind(admin, folderKind, extraIds);
    if (!tagsRes.ok) {
      return NextResponse.json({ error: tagsRes.error }, { status: tagsRes.status });
    }
    const { data: updated, error: updErr } = await admin
      .from("vtt_sample_assets")
      .update({ tags: tagsRes.uniqueSlugs })
      .eq("id", assetId)
      .select("*")
      .single();
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }
    return NextResponse.json({
      enabled: true,
      suggestedSlugs: suggested,
      suggestedTagIds: suggestedIds,
      raw,
      asset: updated,
      applied: true,
    });
  }

  return NextResponse.json({
    enabled: true,
    suggestedSlugs: suggested,
    suggestedTagIds: suggestedIds,
    raw,
    applied: false,
  });
}
