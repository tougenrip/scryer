import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail, parseAdminEmails } from "@/lib/admin/scryer-admin";
import { VttSamplesAdminClient } from "@/components/admin/vtt-samples-admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "VTT sample library (admin)",
  robots: { index: false, follow: false },
};

export default async function AdminVttSamplesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth/login?redirect=/admin/vtt-samples");
  }
  if (!isAdminEmail(user.email)) {
    const configured = parseAdminEmails().length > 0;
    return (
      <div className="container max-w-lg py-16 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">VTT sample admin</CardTitle>
            <CardDescription>Access denied</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {configured ? (
              <p>
                You’re signed in as{" "}
                <span className="font-medium text-foreground">{user.email}</span>, but that address
                is not in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                  SCRYER_ADMIN_EMAILS
                </code>
                . Add the exact email you use with Supabase Auth to{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                  .env.local
                </code>{" "}
                (comma-separated), then restart{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                  yarn dev
                </code>
                .
              </p>
            ) : (
              <p>
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                  SCRYER_ADMIN_EMAILS
                </code>{" "}
                is empty or missing. Set it in{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                  .env.local
                </code>{" "}
                to your login email, then restart the dev server.
              </p>
            )}
            <p>
              URL for this tool:{" "}
              <Link href="/admin/vtt-samples" className="text-primary underline underline-offset-2">
                /admin/vtt-samples
              </Link>
              .{" "}
              <Link href="/admin" className="text-primary underline underline-offset-2">
                /admin
              </Link>{" "}
              redirects here.
            </p>
            <p>
              Uploads also need{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                SUPABASE_SERVICE_ROLE_KEY
              </code>{" "}
              in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">
                .env.local
              </code>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ data: categories }, { data: assets }] = await Promise.all([
    supabase.from("vtt_sample_categories").select("*").order("slug", { ascending: true }),
    supabase.from("vtt_sample_assets").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <VttSamplesAdminClient
      initialCategories={categories ?? []}
      initialAssets={assets ?? []}
    />
  );
}
