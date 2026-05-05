import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { isVttSampleKind } from "@/lib/admin/vtt-sample-assets-shared";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

type Ctx = { params: Promise<{ categoryId: string }> };

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { categoryId } = await ctx.params;
  try {
    const admin = createAdminSupabaseClient();
    const { data: cat, error: catErr } = await admin
      .from("vtt_sample_categories")
      .select("slug")
      .eq("id", categoryId)
      .single();
    if (catErr || !cat?.slug) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    if (isVttSampleKind(cat.slug)) {
      return NextResponse.json(
        { error: "Cannot delete canonical folder kinds (battlemap, token, prop, sound)" },
        { status: 400 }
      );
    }

    const { count: byFolder, error: fkErr } = await admin
      .from("vtt_sample_assets")
      .select("*", { count: "exact", head: true })
      .eq("category_id", categoryId);
    if (fkErr) throw fkErr;

    const { count: byTags, error: countErr } = await admin
      .from("vtt_sample_assets")
      .select("*", { count: "exact", head: true })
      .contains("tags", [cat.slug]);
    if (countErr) throw countErr;

    if ((byFolder && byFolder > 0) || (byTags && byTags > 0)) {
      return NextResponse.json(
        { error: "Remove this tag from all sample assets (folder or filters) before deleting it" },
        { status: 400 }
      );
    }

    const { error } = await admin.from("vtt_sample_categories").delete().eq("id", categoryId);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to delete category";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
