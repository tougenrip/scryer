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
  sampleStorageNeedsRewriteForKind,
  VTT_SAMPLES_BUCKET,
} from "@/lib/admin/vtt-sample-assets-shared";
import { safeStorageFilename } from "@/lib/admin/slugify";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import type { VttSampleAssetRow, VttSampleKind } from "@/lib/vtt/sample-catalog";

type Ctx = { params: Promise<{ assetId: string }> };

function filenameFromStoragePath(storagePath: string): string {
  const seg = storagePath.split("/").pop() ?? "file";
  const dash = seg.indexOf("-");
  return dash >= 0 ? seg.slice(dash + 1) : seg;
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { assetId } = await ctx.params;
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as {
        grid_config?: Record<string, unknown> | null;
      };

      const admin = createAdminSupabaseClient();
      const { data: existing, error: exErr } = await admin
        .from("vtt_sample_assets")
        .select("id, kind")
        .eq("id", assetId)
        .single();
      if (exErr || !existing) {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }

      if (body.grid_config === undefined) {
        return NextResponse.json({ error: "grid_config is required" }, { status: 400 });
      }
      if (existing.kind !== "battlemap") {
        return NextResponse.json(
          { error: "Only battlemap assets have grid settings" },
          { status: 400 }
        );
      }

      const { data, error } = await admin
        .from("vtt_sample_assets")
        .update({ grid_config: body.grid_config })
        .eq("id", assetId)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to update asset";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Use multipart/form-data for metadata or application/json for grid_config" },
      { status: 400 }
    );
  }

  try {
    const form = await request.formData();
    const sampleKindRaw = String(form.get("sampleKind") ?? "").trim();
    if (!isVttSampleKind(sampleKindRaw)) {
      return NextResponse.json(
        { error: "sampleKind must be battlemap, token, prop, or sound" },
        { status: 400 }
      );
    }
    const newKind = sampleKindRaw as VttSampleKind;

    const assetNameRaw = form.get("name");
    const assetName = typeof assetNameRaw === "string" && assetNameRaw.trim() ? assetNameRaw.trim() : null;

    const fileField = form.get("file");
    const file = fileField instanceof File && fileField.size > 0 ? fileField : null;
    if (file && file.size > MAX_VTT_SAMPLE_FILE_BYTES) {
      return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: existing, error: exErr } = await admin
      .from("vtt_sample_assets")
      .select("*")
      .eq("id", assetId)
      .single();

    if (exErr || !existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const row = existing as VttSampleAssetRow;

    const canon = await resolveCanonicalCategoryIdForKind(admin, newKind);
    if (!canon.ok) {
      return NextResponse.json({ error: canon.error }, { status: canon.status });
    }

    const extraIds = parseExtraTagCategoryIds(form);
    const tagsRes = await resolveExtraTagsForSampleKind(admin, newKind, extraIds);
    if (!tagsRes.ok) {
      return NextResponse.json({ error: tagsRes.error }, { status: tagsRes.status });
    }
    const { uniqueSlugs } = tagsRes;

    const mime = file ? file.type || "application/octet-stream" : row.file_mime || "application/octet-stream";
    try {
      assertMimeForKind(newKind, mime);
    } catch (e: unknown) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid file type for kind" },
        { status: 400 }
      );
    }

    const storageNeedsRewrite =
      !!file || newKind !== row.kind || sampleStorageNeedsRewriteForKind(row.storage_path, newKind);

    let grid_config: Record<string, unknown> | null;
    if (newKind !== "battlemap") {
      grid_config = null;
    } else if (row.kind !== "battlemap") {
      grid_config = defaultBattlemapGridConfig();
    } else {
      grid_config = row.grid_config as Record<string, unknown> | null;
    }

    if (!storageNeedsRewrite) {
      const { data, error } = await admin
        .from("vtt_sample_assets")
        .update({
          category_id: canon.categoryId,
          kind: newKind,
          name: assetName,
          tags: uniqueSlugs,
          grid_config,
        })
        .eq("id", assetId)
        .select("*")
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    const baseName = file ? file.name : filenameFromStoragePath(row.storage_path);
    const objectPath = `${newKind}/${crypto.randomUUID()}-${safeStorageFilename(baseName)}`;
    let buf: Buffer;
    if (file) {
      buf = Buffer.from(await file.arrayBuffer());
    } else {
      const { data: downloaded, error: dlErr } = await admin.storage
        .from(VTT_SAMPLES_BUCKET)
        .download(row.storage_path);
      if (dlErr) throw dlErr;
      if (!downloaded) throw new Error("Failed to download existing object");
      buf = Buffer.from(await downloaded.arrayBuffer());
    }

    const { error: upErr } = await admin.storage.from(VTT_SAMPLES_BUCKET).upload(objectPath, buf, {
      contentType: mime,
      upsert: false,
    });
    if (upErr) throw upErr;

    const {
      data: { publicUrl },
    } = admin.storage.from(VTT_SAMPLES_BUCKET).getPublicUrl(objectPath);

    const { data: updated, error: updErr } = await admin
      .from("vtt_sample_assets")
      .update({
        category_id: canon.categoryId,
        kind: newKind,
        name: assetName,
        storage_path: objectPath,
        public_url: publicUrl,
        file_mime: mime,
        tags: uniqueSlugs,
        grid_config,
      })
      .eq("id", assetId)
      .select("*")
      .single();

    if (updErr) {
      await admin.storage.from(VTT_SAMPLES_BUCKET).remove([objectPath]);
      throw updErr;
    }

    const { error: rmErr } = await admin.storage.from(VTT_SAMPLES_BUCKET).remove([row.storage_path]);
    if (rmErr) {
      console.error("Failed to remove old sample object", rmErr);
    }

    return NextResponse.json(updated);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to update asset";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { assetId } = await ctx.params;
  try {
    const admin = createAdminSupabaseClient();
    const { data: row, error: fErr } = await admin
      .from("vtt_sample_assets")
      .select("storage_path")
      .eq("id", assetId)
      .single();
    if (fErr || !row?.storage_path) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const { error: rmErr } = await admin.storage.from(VTT_SAMPLES_BUCKET).remove([row.storage_path]);
    if (rmErr) {
      console.error(rmErr);
    }

    const { error: dErr } = await admin.from("vtt_sample_assets").delete().eq("id", assetId);
    if (dErr) throw dErr;

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to delete asset";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
