import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import {
  assertMimeForKind,
  defaultBattlemapGridConfig,
  isVttSampleKind,
  MAX_VTT_SAMPLE_FILE_BYTES,
  parseExtraTagCategoryIds,
  resolveCanonicalCategoryIdForKind,
  resolveExtraTagsForSampleKind,
  VTT_SAMPLES_BUCKET,
} from "@/lib/admin/vtt-sample-assets-shared";
import { safeStorageFilename } from "@/lib/admin/slugify";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { VttSampleKind } from "@/lib/vtt/sample-catalog";

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    if (file.size > MAX_VTT_SAMPLE_FILE_BYTES) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const sampleKindRaw = String(form.get("sampleKind") ?? "").trim();
    if (!isVttSampleKind(sampleKindRaw)) {
      return NextResponse.json(
        {
          error:
            "sampleKind must be battlemap, token, prop, sound, or soundboard",
        },
        { status: 400 }
      );
    }
    const sampleKind = sampleKindRaw as VttSampleKind;
    
    const assetNameRaw = form.get("name");
    const assetName = typeof assetNameRaw === "string" && assetNameRaw.trim() ? assetNameRaw.trim() : null;

    const admin = createAdminSupabaseClient();
    const extraIds = parseExtraTagCategoryIds(form);

    const canon = await resolveCanonicalCategoryIdForKind(admin, sampleKind);
    if (!canon.ok) {
      return NextResponse.json({ error: canon.error }, { status: canon.status });
    }

    const tagsRes = await resolveExtraTagsForSampleKind(admin, sampleKind, extraIds);
    if (!tagsRes.ok) {
      return NextResponse.json({ error: tagsRes.error }, { status: tagsRes.status });
    }
    const { uniqueSlugs } = tagsRes;

    const mime = file.type || "application/octet-stream";
    try {
      assertMimeForKind(sampleKind, mime);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid file type" },
        { status: 400 }
      );
    }

    let grid_config: Record<string, unknown> | null = null;
    if (sampleKind === "battlemap") {
      const pixelRaw = form.get("grid_pixel_size");
      const typeRaw = form.get("grid_type");
      const feetRaw = form.get("feet_per_square");
      const pixelSize =
        typeof pixelRaw === "string" && pixelRaw !== ""
          ? Number(pixelRaw)
          : typeof pixelRaw === "number"
            ? pixelRaw
            : 40;
      const gridType =
        typeof typeRaw === "string" && typeRaw === "hex" ? "hex" : "square";
      const feetPerSquare =
        typeof feetRaw === "string" && feetRaw !== ""
          ? Number(feetRaw)
          : typeof feetRaw === "number"
            ? feetRaw
            : 5;
      grid_config = {
        pixelSize: Number.isFinite(pixelSize) ? pixelSize : 40,
        type: gridType,
        feetPerSquare: Number.isFinite(feetPerSquare) ? feetPerSquare : 5,
      };
    }

    const objectPath = `${sampleKind}/${crypto.randomUUID()}-${safeStorageFilename(file.name)}`;
    const buf = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await admin.storage.from(VTT_SAMPLES_BUCKET).upload(objectPath, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) throw upErr;

    const {
      data: { publicUrl },
    } = admin.storage.from(VTT_SAMPLES_BUCKET).getPublicUrl(objectPath);

    const { data: row, error: insErr } = await admin
      .from("vtt_sample_assets")
      .insert({
        category_id: canon.categoryId,
        kind: sampleKind,
        name: assetName,
        storage_path: objectPath,
        public_url: publicUrl,
        file_mime: mime,
        grid_config,
        tags: uniqueSlugs,
      })
      .select("*")
      .single();

    if (insErr) {
      await admin.storage.from(VTT_SAMPLES_BUCKET).remove([objectPath]);
      throw insErr;
    }

    return NextResponse.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to upload asset";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
