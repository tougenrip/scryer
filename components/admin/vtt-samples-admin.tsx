"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  sampleAssetTagSlugs,
  type VttSampleAssetRow,
  type VttSampleCategoryRow,
  type VttSampleKind,
} from "@/lib/vtt/sample-catalog";
import { labelFromSampleStoragePath } from "@/lib/vtt/sample-storage-label";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, RefreshCw, Sparkles, Trash2, Upload } from "lucide-react";

type Props = {
  initialCategories: VttSampleCategoryRow[];
  initialAssets: VttSampleAssetRow[];
};

/** Display order for folder/tag grouping (Battlemap, Prop, Token, Sound). */
const KIND_OPTIONS: { value: VttSampleKind; label: string }[] = [
  { value: "battlemap", label: "Battlemap" },
  { value: "prop", label: "Prop" },
  { value: "token", label: "Token" },
  { value: "sound", label: "Sound" },
];

function kindLabel(k: VttSampleKind) {
  return KIND_OPTIONS.find((o) => o.value === k)?.label ?? k;
}

function categoriesSortedSelectItems(
  categories: VttSampleCategoryRow[],
  itemClassName?: string
) {
  return categories
    .slice()
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map((c) => (
      <SelectItem key={c.id} value={c.id} className={itemClassName}>
        <span className="font-mono">{c.slug}</span>
      </SelectItem>
    ));
}

type KindFilter = "all" | VttSampleKind;

export function VttSamplesAdminClient({ initialCategories, initialAssets }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [assets, setAssets] = useState(initialAssets);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [filterKind, setFilterKind] = useState<KindFilter>("all");

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catSlug, setCatSlug] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const [sampleDialogOpen, setSampleDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<VttSampleAssetRow | null>(null);
  const [upSampleKind, setUpSampleKind] = useState<VttSampleKind>("battlemap");
  const [upName, setUpName] = useState("");
  const [upExtraTagIds, setUpExtraTagIds] = useState<Set<string>>(() => new Set());
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upLoading, setUpLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const [deleteCat, setDeleteCat] = useState<VttSampleCategoryRow | null>(null);
  const [deleteAsset, setDeleteAsset] = useState<VttSampleAssetRow | null>(null);
  const [previewAsset, setPreviewAsset] = useState<VttSampleAssetRow | null>(null);

  const filteredAssets = useMemo(() => {
    let list = assets;
    if (filterKind !== "all") {
      list = list.filter((a) => a.kind === filterKind);
    }
    if (filterCategoryId === "all") return list;
    const slug = categories.find((c) => c.id === filterCategoryId)?.slug;
    if (!slug) return list;
    return list.filter(
      (a) =>
        a.category_id === filterCategoryId || sampleAssetTagSlugs(a).includes(slug)
    );
  }, [assets, filterCategoryId, categories, filterKind]);

  const folderLabelForAsset = (a: VttSampleAssetRow) => kindLabel(a.kind);

  const refreshCatalog = async (opts?: { silent?: boolean }) => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/vtt-samples/catalog");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Refresh failed");
      setCategories(json.categories ?? []);
      setAssets(json.assets ?? []);
      if (!opts?.silent) toast.success("Catalog refreshed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const openNewCategory = () => {
    setCatSlug("");
    setCatDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!catSlug.trim()) {
      toast.error("Slug is required");
      return;
    }
    setCatSaving(true);
    try {
      const res = await fetch("/api/admin/vtt-samples/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: catSlug.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      toast.success("Tag created");
      setCatDialogOpen(false);
      await refreshCatalog({ silent: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setCatSaving(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!deleteCat) return;
    try {
      const res = await fetch(`/api/admin/vtt-samples/categories/${deleteCat.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("Category deleted");
      setDeleteCat(null);
      await refreshCatalog({ silent: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const openUpload = () => {
    setEditingAsset(null);
    setUpSampleKind("battlemap");
    setUpName("");
    setUpExtraTagIds(new Set());
    setUpFile(null);
    setSampleDialogOpen(true);
  };

  const openEdit = (a: VttSampleAssetRow) => {
    const folderKind = a.kind;
    const slugs = sampleAssetTagSlugs(a);
    const extras = new Set(
      categories
        .filter((c) => slugs.includes(c.slug) && c.slug !== folderKind)
        .map((c) => c.id)
    );

    setUpSampleKind(folderKind);
    setUpName(a.name ?? "");
    setUpExtraTagIds(extras);
    setUpFile(null);
    setEditingAsset(a);
    setSampleDialogOpen(true);
  };

  const submitSample = async () => {
    if (!editingAsset && !upFile) {
      toast.error("File is required");
      return;
    }
    setUpLoading(true);
    try {
      if (editingAsset) {
        const fd = new FormData();
        fd.set("sampleKind", upSampleKind);
        if (upName) fd.set("name", upName);
        fd.set("extraTagCategoryIds", JSON.stringify([...upExtraTagIds]));
        if (upFile) fd.set("file", upFile);
        const res = await fetch(`/api/admin/vtt-samples/assets/${editingAsset.id}`, {
          method: "PATCH",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Update failed");
        toast.success("Sample updated");
      } else {
        const fd = new FormData();
        fd.set("sampleKind", upSampleKind);
        if (upName) fd.set("name", upName);
        fd.set("file", upFile!);
        fd.set("extraTagCategoryIds", JSON.stringify([...upExtraTagIds]));
        const res = await fetch("/api/admin/vtt-samples/assets", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Upload failed");
        toast.success("Asset uploaded");
      }
      setSampleDialogOpen(false);
      setEditingAsset(null);
      await refreshCatalog({ silent: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : editingAsset ? "Update failed" : "Upload failed");
    } finally {
      setUpLoading(false);
    }
  };

  const confirmDeleteAsset = async () => {
    if (!deleteAsset) return;
    try {
      const res = await fetch(`/api/admin/vtt-samples/assets/${deleteAsset.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      toast.success("Asset removed");
      setDeleteAsset(null);
      await refreshCatalog({ silent: true });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const suggestTagsWithOllama = async (apply: boolean) => {
    if (apply && !editingAsset) {
      toast.message("Use Upload to save first", {
        description: "Suggest & apply only updates an asset that is already in the library.",
      });
      return;
    }
    if (!editingAsset) {
      if (upSampleKind === "sound") return;
      if (!upFile) {
        toast.error("Select an image file first");
        return;
      }
    }
    setSuggestLoading(true);
    try {
      let res: Response;
      if (editingAsset) {
        res = await fetch("/api/admin/vtt-samples/suggest-tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: editingAsset.id, apply }),
        });
      } else {
        const fd = new FormData();
        fd.set("file", upFile!);
        fd.set("sampleKind", upSampleKind);
        res = await fetch("/api/admin/vtt-samples/suggest-tags", { method: "POST", body: fd });
      }
      const json = (await res.json()) as {
        error?: string;
        suggestedSlugs?: string[];
        suggestedTagIds?: string[];
        raw?: string;
        noCatalogExtras?: boolean;
        asset?: VttSampleAssetRow;
      };
      if (!res.ok) {
        toast.error(json.error || "Tag suggestion failed");
        return;
      }
      if (apply && editingAsset) {
        toast.success("Tags updated from Ollama");
        if (json.asset) {
          setAssets((prev) => prev.map((a) => (a.id === json.asset!.id ? json.asset! : a)));
          setEditingAsset(json.asset);
        } else {
          await refreshCatalog({ silent: true });
        }
        return;
      }
      const ids = json.suggestedTagIds ?? [];
      const slugs = json.suggestedSlugs ?? [];
      if (ids.length === 0) {
        const rawPreview =
          typeof json.raw === "string" && json.raw.length > 0
            ? json.raw.length > 280
              ? `${json.raw.slice(0, 280)}…`
              : json.raw
            : "";
        if (json.noCatalogExtras) {
          toast.message("No extra tags to choose from", {
            description:
              "Add custom tag slugs under Tags (anything beyond the four folder kinds: battlemap, token, prop, sound). Then run suggest again.",
          });
          return;
        }
        toast.message("No matching extra tags", {
          description:
            slugs.length === 0
              ? rawPreview
                ? `Model replied: ${rawPreview}`
                : "The model returned nothing we could map to your tag slugs. Add more slugs, try a vision model (e.g. llava), or check the server terminal log."
              : "The model’s slugs did not match your catalog. Check spelling in Tags.",
        });
        return;
      }
      setUpExtraTagIds((prev) => {
        const n = new Set(prev);
        for (const id of ids) n.add(id);
        return n;
      });
      toast.success(`Suggested: ${slugs.join(", ")}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Tag suggestion failed");
    } finally {
      setSuggestLoading(false);
    }
  };

  return (
    <div className="container max-w-6xl py-8 px-4">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">VTT sample library</h1>
          <p className="mt-1 text-muted-foreground text-sm max-w-xl">
            Upload public sample files to the <code className="text-xs">vtt-samples</code> bucket.
            Storage path is <code className="text-xs">battlemap|token|prop|sound/uuid-filename</code>.
            Folder is asset kind only; tags are plain slugs for filtering. Requires{" "}
            <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> and{" "}
            <code className="text-xs">SCRYER_ADMIN_EMAILS</code>.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void refreshCatalog()}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Tags</CardTitle>
              <CardDescription>
                URL-safe slugs for filters (not asset kind — that is only on each sample). Cannot
                rename; delete only when no sample uses the slug.
              </CardDescription>
            </div>
            <Button type="button" size="sm" onClick={openNewCategory}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] pr-3">
              <ul className="space-y-2 text-sm">
                {categories.length === 0 && (
                  <li className="text-muted-foreground">No tags yet.</li>
                )}
                {categories.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2"
                  >
                    <code className="min-w-0 truncate text-xs font-medium">{c.slug}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive"
                      onClick={() => setDeleteCat(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload asset</CardTitle>
            <CardDescription>
              Folder = Battlemap / Prop / Token / Sound only; optional extra tags; file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={openUpload} disabled={categories.length === 0}>
              <Upload className="h-4 w-4 mr-2" />
              New upload
            </Button>
            {categories.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Add at least one tag slug first.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Assets</CardTitle>
            <CardDescription>
              Labels come from the file name. Use tabs to narrow by asset kind. Battlemaps: tune
              grid in the VTT.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[220px]">
            <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tags</SelectItem>
                {categoriesSortedSelectItems(categories)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={filterKind}
            onValueChange={(v) => setFilterKind(v as KindFilter)}
            className="mb-4 w-full"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-5">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All kinds
              </TabsTrigger>
              <TabsTrigger value="battlemap" className="text-xs sm:text-sm">
                Battlemap
              </TabsTrigger>
              <TabsTrigger value="prop" className="text-xs sm:text-sm">
                Prop
              </TabsTrigger>
              <TabsTrigger value="token" className="text-xs sm:text-sm">
                Token
              </TabsTrigger>
              <TabsTrigger value="sound" className="text-xs sm:text-sm">
                Sound
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAssets.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full">No assets in this filter.</p>
            )}
            {filteredAssets.map((a) => (
              <div
                key={a.id}
                className="overflow-hidden rounded-lg border border-border bg-card text-sm"
              >
                <div className="relative h-32 bg-muted">
                  {a.kind === "sound" ? (
                    <div className="flex h-full items-center p-2">
                      <audio controls className="h-10 w-full" src={a.public_url} preload="metadata">
                        <track kind="captions" />
                      </audio>
                    </div>
                  ) : a.public_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewAsset(a)}
                      className="absolute inset-0 h-full w-full cursor-zoom-in border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      aria-label={`Enlarge preview: ${labelFromSampleStoragePath(a.storage_path)}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.public_url}
                        alt=""
                        className="pointer-events-none h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No preview
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-2">
                  <p className="font-medium truncate text-xs" title={a.storage_path}>
                    {a.name ?? labelFromSampleStoragePath(a.storage_path)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-medium text-foreground">{folderLabelForAsset(a)}</span>
                  </p>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {sampleAssetTagSlugs(a).map((slug) => (
                      <Badge key={slug} variant="secondary" className="px-1.5 py-0 text-[9px] font-normal">
                        {slug}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-7 flex-1 text-[10px]"
                      onClick={() => openEdit(a)}
                    >
                      <Pencil className="h-3 w-3 mr-0.5 shrink-0" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 text-[10px] text-destructive"
                      onClick={() => setDeleteAsset(a)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New tag</DialogTitle>
            <DialogDescription>
              Letters, numbers, and hyphens (e.g. <code className="text-xs">snow</code>,{" "}
              <code className="text-xs">city-market</code>). Must be unique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label htmlFor="cat-slug">Slug</Label>
              <Input
                id="cat-slug"
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                placeholder="e.g. wilderness"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCatDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void saveCategory()} disabled={catSaving}>
              {catSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={sampleDialogOpen}
        onOpenChange={(o) => {
          setSampleDialogOpen(o);
          if (!o) setEditingAsset(null);
        }}
      >
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[598px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold sm:text-2xl">
              {editingAsset ? "Edit sample" : "Upload sample"}
            </DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              Path:{" "}
              <code className="rounded bg-muted px-2 py-0.5 text-sm text-foreground">
                battlemap|token|prop|sound/uuid-filename
              </code>
              . Folder is only that kind. Extra tag slugs refine filters.
              {editingAsset &&
                " Changing kind or file moves storage; leave file empty to keep the current file."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label className="text-lg font-semibold">Folder</Label>
              <p className="text-base text-muted-foreground">
                Only <strong className="font-medium text-foreground">Battlemap</strong>,{" "}
                <strong className="font-medium text-foreground">Prop</strong>,{" "}
                <strong className="font-medium text-foreground">Token</strong>, or{" "}
                <strong className="font-medium text-foreground">Sound</strong> — not custom slugs.
              </p>
              <Select
                value={upSampleKind}
                onValueChange={(v) => {
                  const k = v as VttSampleKind;
                  setUpSampleKind(k);
                  setUpExtraTagIds((prev) => {
                    const n = new Set<string>();
                    for (const eid of prev) {
                      const cat = categories.find((c) => c.id === eid);
                      if (cat && cat.slug !== k) n.add(eid);
                    }
                    return n;
                  });
                }}
              >
                <SelectTrigger className="h-12 w-full min-w-0 max-w-full text-base">
                  <SelectValue placeholder="Select folder kind" />
                </SelectTrigger>
                <SelectContent className="z-[200] max-h-[min(360px,70vh)]">
                  {KIND_OPTIONS.map((k) => (
                    <SelectItem key={k.value} value={k.value} className="text-base">
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="up-name" className="text-lg font-semibold">Name (optional)</Label>
              <p className="text-sm text-muted-foreground">
                Leave empty to use the filename as the name.
              </p>
              <Input
                id="up-name"
                value={upName}
                onChange={(e) => setUpName(e.target.value)}
                placeholder="e.g. Forest Encounter"
                className="h-12 text-base"
              />
            </div>
            {editingAsset ? (
              <>
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">Additional tags</Label>
                  <p className="text-base text-muted-foreground">
                    Optional. Any tag slugs you created (e.g. city, indoor). The folder kind slug is added
                    automatically and is not listed here.
                  </p>
                  {editingAsset.kind !== "sound" && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="text-sm"
                          disabled={suggestLoading || upLoading}
                          onClick={() => void suggestTagsWithOllama(false)}
                        >
                          {suggestLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          <span className="ml-1.5">Suggest tags</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-sm"
                          disabled={suggestLoading || upLoading}
                          onClick={() => void suggestTagsWithOllama(true)}
                        >
                          Suggest &amp; apply
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uses local Ollama when <code className="text-[10px]">OLLAMA_TAG_MODEL</code> is
                        set (e.g. <code className="text-[10px]">deepseek-ocr</code>). Only suggests slugs
                        you already created as tags.
                      </p>
                    </div>
                  )}
                  <ScrollArea className="h-[min(360px,50vh)] min-h-[220px] rounded-md border border-border">
                    <div className="p-3 pr-4">
                      {categories.length === 0 ? (
                        <p className="text-base text-muted-foreground">Add tag slugs in the list first.</p>
                      ) : categories.filter((c) => c.slug !== upSampleKind).length === 0 ? (
                        <p className="text-base text-muted-foreground">
                          No extra tags yet (only the canonical folder slugs exist). Add tags in the
                          list above.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-4 sm:gap-x-3">
                          {categories
                            .filter((c) => c.slug !== upSampleKind)
                            .map((c) => (
                              <div
                                key={c.id}
                                className="flex min-h-10 min-w-0 items-center gap-2 rounded-md px-1.5 py-2 hover:bg-muted/50 sm:min-h-11"
                              >
                                <Checkbox
                                  id={`up-extra-${c.id}`}
                                  className="h-5 w-5 shrink-0 border-2 sm:h-6 sm:w-6"
                                  checked={upExtraTagIds.has(c.id)}
                                  onCheckedChange={(checked) => {
                                    setUpExtraTagIds((prev) => {
                                      const n = new Set(prev);
                                      if (checked === true) n.add(c.id);
                                      else n.delete(c.id);
                                      return n;
                                    });
                                  }}
                                />
                                <Label
                                  htmlFor={`up-extra-${c.id}`}
                                  className="min-w-0 cursor-pointer break-all font-mono text-sm font-medium leading-snug tracking-tight text-foreground sm:text-base"
                                >
                                  {c.slug}
                                </Label>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="up-file" className="text-lg font-semibold">
                    File (optional)
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Expecting {upSampleKind === "sound" ? "audio" : "image"} for {kindLabel(upSampleKind)}.
                  </p>
                  <Input
                    id="up-file"
                    type="file"
                    className="h-12 cursor-pointer text-base file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-base file:font-medium"
                    accept={upSampleKind === "sound" ? "audio/*" : "image/*"}
                    onChange={(e) => setUpFile(e.target.files?.[0] ?? null)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="up-file" className="text-lg font-semibold">
                    File
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Expecting {upSampleKind === "sound" ? "audio" : "image"} for {kindLabel(upSampleKind)}.
                    {upSampleKind !== "sound" && " Choose a file, then use Suggest tags on the next section."}
                  </p>
                  <Input
                    id="up-file"
                    type="file"
                    className="h-12 cursor-pointer text-base file:mr-3 file:h-9 file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-base file:font-medium"
                    accept={upSampleKind === "sound" ? "audio/*" : "image/*"}
                    onChange={(e) => setUpFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">Additional tags</Label>
                  <p className="text-base text-muted-foreground">
                    Optional. Any tag slugs you created (e.g. city, indoor). The folder kind slug is added
                    automatically and is not listed here.
                  </p>
                  {upSampleKind !== "sound" && (
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="text-sm"
                          disabled={suggestLoading || upLoading || !upFile}
                          onClick={() => void suggestTagsWithOllama(false)}
                        >
                          {suggestLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          <span className="ml-1.5">Suggest tags from file</span>
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Uses local Ollama when <code className="text-[10px]">OLLAMA_TAG_MODEL</code> is
                        set. Select an image file above first. Suggest &amp; apply is available after
                        the asset is saved (Edit).
                      </p>
                    </div>
                  )}
                  <ScrollArea className="h-[min(360px,50vh)] min-h-[220px] rounded-md border border-border">
                    <div className="p-3 pr-4">
                      {categories.length === 0 ? (
                        <p className="text-base text-muted-foreground">Add tag slugs in the list first.</p>
                      ) : categories.filter((c) => c.slug !== upSampleKind).length === 0 ? (
                        <p className="text-base text-muted-foreground">
                          No extra tags yet (only the canonical folder slugs exist). Add tags in the
                          list above.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-2 gap-y-2 sm:grid-cols-4 sm:gap-x-3">
                          {categories
                            .filter((c) => c.slug !== upSampleKind)
                            .map((c) => (
                              <div
                                key={c.id}
                                className="flex min-h-10 min-w-0 items-center gap-2 rounded-md px-1.5 py-2 hover:bg-muted/50 sm:min-h-11"
                              >
                                <Checkbox
                                  id={`up-extra-${c.id}`}
                                  className="h-5 w-5 shrink-0 border-2 sm:h-6 sm:w-6"
                                  checked={upExtraTagIds.has(c.id)}
                                  onCheckedChange={(checked) => {
                                    setUpExtraTagIds((prev) => {
                                      const n = new Set(prev);
                                      if (checked === true) n.add(c.id);
                                      else n.delete(c.id);
                                      return n;
                                    });
                                  }}
                                />
                                <Label
                                  htmlFor={`up-extra-${c.id}`}
                                  className="min-w-0 cursor-pointer break-all font-mono text-sm font-medium leading-snug tracking-tight text-foreground sm:text-base"
                                >
                                  {c.slug}
                                </Label>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="h-11 text-base"
              onClick={() => {
                setSampleDialogOpen(false);
                setEditingAsset(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-11 text-base"
              onClick={() => void submitSample()}
              disabled={upLoading}
            >
              {upLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : editingAsset ? (
                "Save"
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewAsset}
        onOpenChange={(o) => {
          if (!o) setPreviewAsset(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="max-h-[min(96vh,96dvh)] w-[min(100%,100vw)] max-w-[min(96vw,72rem)] gap-0 overflow-hidden border bg-background/95 p-0 shadow-2xl sm:max-w-[min(96vw,72rem)]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Sample preview</DialogTitle>
          </DialogHeader>
          {previewAsset?.public_url && (
            <div className="flex max-h-[min(90vh,90dvh)] min-h-0 flex-col">
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-4 pt-12 sm:p-6 sm:pt-14">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewAsset.public_url}
                  alt=""
                  className="h-auto w-full max-w-full object-contain [max-height:min(80vh,80dvh)]"
                />
              </div>
              <p className="shrink-0 border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{folderLabelForAsset(previewAsset)}</span>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                <span className="font-mono">{labelFromSampleStoragePath(previewAsset.storage_path)}</span>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCat} onOpenChange={(o) => !o && setDeleteCat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tag?</AlertDialogTitle>
            <AlertDialogDescription>
              Only if no sample uses this slug. Tag: <code>{deleteCat?.slug}</code>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteCategory()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteAsset} onOpenChange={(o) => !o && setDeleteAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes the database row and the file in storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDeleteAsset()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
