/**
 * Comma-separated list in SCRYER_ADMIN_EMAILS (server-only).
 * Example: SCRYER_ADMIN_EMAILS=you@example.com,other@example.com
 */
export function parseAdminEmails(): string[] {
  return (process.env.SCRYER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = parseAdminEmails();
  if (list.length === 0) return false;
  return list.includes(email.trim().toLowerCase());
}
