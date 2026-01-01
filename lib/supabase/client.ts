import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for browser use.
 * This client automatically handles authentication via cookies.
 * 
 * Note: createBrowserClient from @supabase/ssr automatically reads
 * and writes auth cookies, so no manual cookie handling is needed.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
