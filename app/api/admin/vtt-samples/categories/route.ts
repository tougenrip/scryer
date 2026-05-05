import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/require-admin-session";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { slugifyLabel } from "@/lib/admin/slugify";

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { slug?: string };
    const raw = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!raw) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const slug = slugifyLabel(raw);
    if (!slug) {
      return NextResponse.json({ error: "slug must contain letters or numbers" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();
    const { data: clash } = await admin
      .from("vtt_sample_categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (clash) {
      return NextResponse.json({ error: "That slug already exists" }, { status: 409 });
    }

    const { data, error } = await admin
      .from("vtt_sample_categories")
      .insert({ slug })
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create category";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
