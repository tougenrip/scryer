/**
 * Detect TipTap / ProseMirror-style HTML that has no visible text.
 */
export function isRichTextHtmlVisuallyEmpty(
  html: string | null | undefined
): boolean {
  if (html == null) return true;
  const normalized = html
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  if (!normalized) return true;

  const withoutTags = normalized.replace(/<[^>]+>/g, " ");
  const text = withoutTags
    .replace(/\s+/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  return text.length === 0;
}

/**
 * Strip HTML for one-line previews (tooltips, list subtitles).
 */
export function richTextHtmlToPlainText(html: string): string {
  if (isRichTextHtmlVisuallyEmpty(html)) return "";
  let s = html.replace(/\u00a0/g, " ").replace(/&nbsp;/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, " ");
  s = s.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, " ");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return s.replace(/\s+/g, " ").trim();
}
