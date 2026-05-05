/** `battlemap/<uuid>-my-map.webp` (or legacy `folder/kind/file`) → `my-map.webp` */
export function labelFromSampleStoragePath(storagePath: string): string {
  const seg = storagePath.split("/").pop() ?? storagePath;
  const m = seg.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i
  );
  return m?.[1] ?? seg;
}
