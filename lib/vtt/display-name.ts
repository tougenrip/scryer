export function cleanVttDisplayName(name: string | null | undefined, fallback = "Unknown") {
  const cleaned = (name ?? "")
    .replace(/^\s*\[Monster\]\s*/gi, "")
    .replace(/\.(png|jpe?g|webp|gif)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}
