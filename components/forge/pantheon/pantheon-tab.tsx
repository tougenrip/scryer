"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Sparkles, Search, Edit, Trash2 } from "lucide-react";
import {
  usePantheonDeities,
  useCreatePantheonDeity,
  useUpdatePantheonDeity,
  useDeletePantheonDeity,
  type PantheonDeity,
} from "@/hooks/useForgeContent";
import { toast } from "sonner";
import { DeityFormDialog } from "./deity-form-dialog";
import { DeityDetailDialog } from "./deity-detail-dialog";

const DEITY_COLORS = [
  "#5b9bd5",
  "#d6a85a",
  "#7ec27e",
  "#b583e0",
  "#c87b5a",
  "#7ab0d6",
  "#d98b3a",
  "#9dd89d",
];

const hashColor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return DEITY_COLORS[h % DEITY_COLORS.length];
};

interface PantheonTabProps {
  campaignId: string;
  isDm: boolean;
}

const alignmentOptions = [
  { value: "LG", label: "Lawful Good" },
  { value: "NG", label: "Neutral Good" },
  { value: "CG", label: "Chaotic Good" },
  { value: "LN", label: "Lawful Neutral" },
  { value: "N", label: "Neutral" },
  { value: "CN", label: "Chaotic Neutral" },
  { value: "LE", label: "Lawful Evil" },
  { value: "NE", label: "Neutral Evil" },
  { value: "CE", label: "Chaotic Evil" },
];

const domainOptions = [
  "War", "Peace", "Life", "Death", "Light", "Darkness", "Nature", "Chaos",
  "Order", "Wisdom", "Knowledge", "Trickery", "Tempest", "Forge", "Grave",
  "Arcana", "Strength", "Beauty", "Love", "Hate", "Justice", "Mercy",
  "Travel", "Commerce", "Secrets", "Music", "Poetry", "Healing"
];

export function PantheonTab({ campaignId, isDm }: PantheonTabProps) {
  const { deities, loading, refetch } = usePantheonDeities(campaignId);
  const { createDeity, loading: creating } = useCreatePantheonDeity();
  const { updateDeity, loading: updating } = useUpdatePantheonDeity();
  const { deleteDeity, loading: deleting } = useDeletePantheonDeity();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeity, setSelectedDeity] = useState<PantheonDeity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingDeity, setEditingDeity] = useState<PantheonDeity | null>(null);

  const filteredDeities = deities.filter(deity =>
    deity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (deity.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    deity.domain.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreate = () => {
    setEditingDeity(null);
    setIsFormOpen(true);
  };

  const handleEdit = (deity: PantheonDeity) => {
    setEditingDeity(deity);
    setIsFormOpen(true);
  };

  const handleDelete = async (deity: PantheonDeity) => {
    if (!confirm(`Are you sure you want to delete "${deity.name}"?`)) {
      return;
    }

    const result = await deleteDeity(deity.id);
    if (result.success) {
      toast.success("Deity deleted");
      refetch();
    } else {
      toast.error(result.error?.message || "Failed to delete deity");
    }
  };

  const handleSave = async (data: {
    name: string;
    title?: string | null;
    domain?: string[];
    alignment?: PantheonDeity['alignment'];
    symbol?: string | null;
    image_url?: string | null;
    description?: string | null;
    worshipers_location_ids?: string[];
    holy_days?: string[];
  }) => {
    if (editingDeity) {
      const result = await updateDeity(editingDeity.id, data);
      if (result.success) {
        toast.success("Deity updated");
        setIsFormOpen(false);
        setEditingDeity(null);
        refetch();
      } else {
        toast.error(result.error?.message || "Failed to update deity");
      }
    } else {
      const result = await createDeity({
        campaign_id: campaignId,
        ...data,
      });
      if (result.success) {
        toast.success("Deity created");
        setIsFormOpen(false);
        refetch();
      } else {
        toast.error(result.error?.message || "Failed to create deity");
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 14,
          }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} className="sc-card" style={{ padding: 16 }}>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div className="font-serif" style={{ fontSize: 20 }}>
            The Pantheon
          </div>
          <div
            style={{ fontSize: 12, color: "var(--muted-foreground)" }}
          >
            {filteredDeities.length} of {deities.length} known power{deities.length === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={12}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-foreground)",
              }}
            />
            <input
              className="sc-input"
              placeholder="Search deities…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, width: 220, fontSize: 12 }}
            />
          </div>
          {isDm && (
            <button
              type="button"
              className="sc-btn sc-btn-primary sc-btn-sm"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus size={12} />
              Deity
            </button>
          )}
        </div>
      </div>

      {/* Empty */}
      {deities.length === 0 ? (
        <div className="sc-card" style={{ padding: 40 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              color: "var(--muted-foreground)",
            }}
          >
            <Sparkles size={48} style={{ opacity: 0.5, marginBottom: 10 }} />
            <div style={{ marginBottom: 6 }}>No deities yet.</div>
            {isDm && (
              <div style={{ fontSize: 12 }}>
                Create your first deity to start building your pantheon.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 14,
          }}
        >
          {filteredDeities.map((deity) => {
            const color = hashColor(deity.id);
            const symbolChar = deity.name ? deity.name.charAt(0) : "✦";
            return (
              <div
                key={deity.id}
                className="sc-card sc-card-hover"
                style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}
                onClick={() => {
                  setSelectedDeity(deity);
                  setIsDetailOpen(true);
                }}
              >
                <div
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${color} 30%, var(--card)), var(--card))`,
                    padding: "20px 16px 14px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${color} 30%, var(--background))`,
                      border: `1.5px solid ${color}`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 26,
                      fontFamily: "var(--font-serif)",
                      color,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {deity.symbol && deity.symbol.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={deity.symbol}
                        alt={deity.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      symbolChar
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="font-serif truncate"
                      style={{
                        fontSize: 18,
                        letterSpacing: "0.04em",
                      }}
                    >
                      {deity.name}
                    </div>
                    {deity.title && (
                      <div
                        className="truncate"
                        style={{
                          fontSize: 12,
                          color: "var(--muted-foreground)",
                          fontStyle: "italic",
                        }}
                      >
                        {deity.title}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {deity.alignment && (
                      <span className="sc-badge" style={{ fontSize: 10 }}>
                        {deity.alignment}
                      </span>
                    )}
                    {(deity.domain || []).slice(0, 4).map((dom) => (
                      <span
                        key={dom}
                        className="sc-badge"
                        style={{
                          fontSize: 10,
                          borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
                          color,
                        }}
                      >
                        {dom}
                      </span>
                    ))}
                    {(deity.domain?.length || 0) > 4 && (
                      <span className="sc-badge" style={{ fontSize: 10 }}>
                        +{(deity.domain?.length || 0) - 4}
                      </span>
                    )}
                  </div>
                  {deity.description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--muted-foreground)",
                        lineHeight: 1.6,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 3,
                        overflow: "hidden",
                      }}
                    >
                      {deity.description}
                    </div>
                  )}
                  {isDm && (
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <button
                        type="button"
                        className="sc-btn sc-btn-sm sc-btn-ghost"
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(deity);
                        }}
                      >
                        <Edit size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="sc-btn sc-btn-sm sc-btn-ghost"
                        style={{ color: "var(--destructive)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(deity);
                        }}
                        disabled={deleting}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <DeityFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        deity={editingDeity}
        campaignId={campaignId}
        onSave={handleSave}
        loading={creating || updating}
        alignmentOptions={alignmentOptions}
        domainOptions={domainOptions}
      />

      <DeityDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        deity={selectedDeity}
        campaignId={campaignId}
        isDm={isDm}
        alignmentOptions={alignmentOptions}
        onEdit={() => {
          if (selectedDeity) {
            setEditingDeity(selectedDeity);
            setIsDetailOpen(false);
            setIsFormOpen(true);
          }
        }}
        onDelete={() => {
          if (selectedDeity) {
            handleDelete(selectedDeity);
            setIsDetailOpen(false);
          }
        }}
      />
    </div>
  );
}
