import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const admin = createAdminSupabaseClient();
    const [{ data: categories, error: cErr }, { data: assets, error: aErr }] = await Promise.all([
      admin.from("vtt_sample_categories").select("*").order("slug", { ascending: true }),
      admin
        .from("vtt_sample_assets")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (cErr) throw cErr;
    if (aErr) throw aErr;
    return NextResponse.json({ categories: categories ?? [], assets: assets ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load catalog";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
