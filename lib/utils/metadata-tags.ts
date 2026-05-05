/** Normalize `metadata.tags` from DB (string, string[], or missing) to a string[]. */
export function normalizeMetadataTags(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return [];
    if (s.includes(",") || s.includes("\n")) {
      return s
        .split(/[,\n]+/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
    return [s];
  }
  return [];
}
