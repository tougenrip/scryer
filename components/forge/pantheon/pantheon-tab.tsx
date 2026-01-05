"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Sparkles, Search, Edit, Trash2, Star } from "lucide-react";
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-4" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Pantheon</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage gods, deities, and religions in your campaign world
          </p>
        </div>
        {isDm && (
          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="h-4 w-4 mr-2" />
            Add Deity
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deities by name, title, or domain..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Deity List */}
      {deities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center mb-2">
              No deities yet.
            </p>
            {isDm && (
              <p className="text-sm text-muted-foreground text-center">
                Create your first deity to start building your pantheon.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDeities.map((deity) => (
            <Card
              key={deity.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                setSelectedDeity(deity);
                setIsDetailOpen(true);
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <h3 className="font-semibold text-lg">{deity.name}</h3>
                    </div>
                    {deity.title && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        {deity.title}
                      </p>
                    )}
                  </div>
                  {deity.alignment && (
                    <Badge variant="outline" className="shrink-0">
                      {deity.alignment}
                    </Badge>
                  )}
                </div>

                {deity.domain && deity.domain.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {deity.domain.slice(0, 3).map((domain, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {domain}
                      </Badge>
                    ))}
                    {deity.domain.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{deity.domain.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                {deity.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {deity.description}
                  </p>
                )}

                {isDm && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(deity);
                      }}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(deity);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
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
