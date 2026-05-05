import { NextResponse } from "next/server";
import { createAnonSupabaseClient } from "@/lib/supabase/anon-server";

/** Public catalog for VTT / clients (no auth). */
export async function GET() {
  try {
    const supabase = createAnonSupabaseClient();
    const [{ data: categories, error: cErr }, { data: assets, error: aErr }] = await Promise.all([
      supabase.from("vtt_sample_categories").select("*").order("slug", { ascending: true }),
      supabase.from("vtt_sample_assets").select("*").order("created_at", { ascending: false }),
    ]);
    if (cErr) throw cErr;
    if (aErr) throw aErr;
    return NextResponse.json({
      categories: categories ?? [],
      assets: assets ?? [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load samples";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
