export type VttSampleKind = "battlemap" | "token" | "prop" | "sound" | "soundboard";

export type VttSampleCategoryRow = {
  id: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type VttSampleAssetRow = {
  id: string;
  name: string | null;
  /** Canonical category row whose slug matches asset kind (battlemap, token, …). */
  category_id?: string | null;
  kind: VttSampleKind;
  storage_path: string;
  public_url: string;
  file_mime: string | null;
  grid_config: Record<string, unknown> | null;
  /** Tag slugs (non-empty after migration 068). */
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export function sampleAssetTagSlugs(row: Pick<VttSampleAssetRow, "tags">): string[] {
  if (Array.isArray(row.tags) && row.tags.length > 0) {
    return row.tags.filter((t): t is string => typeof t === "string" && t.length > 0);
  }
  return [];
}

export type VttSampleCatalogResponse = {
  categories: VttSampleCategoryRow[];
  assets: VttSampleAssetRow[];
};
