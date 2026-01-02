"use client";

import { MediaItem } from "@/hooks/useCampaignContent";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, Image as ImageIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreVertical } from "lucide-react";

interface MediaLibraryGridProps {
  items: MediaItem[];
  onEdit: (item: MediaItem) => void;
  onDelete: (itemId: string) => void;
  onTypeChange?: (itemId: string, type: 'map' | 'token' | 'prop' | null) => void;
  onView?: (item: MediaItem) => void;
  isLoading?: boolean;
}

export function MediaLibraryGrid({
  items,
  onEdit,
  onDelete,
  onTypeChange,
  onView,
  isLoading = false,
}: MediaLibraryGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="aspect-square">
            <CardContent className="p-0">
              <div className="w-full h-full bg-muted animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            No items yet. Upload some images to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getTypeColor = (type: string | null) => {
    if (!type) return 'bg-gray-500';
    switch (type) {
      case 'map':
        return 'bg-blue-500';
      case 'token':
        return 'bg-green-500';
      case 'prop':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: string | null) => {
    if (!type) return 'No Type';
    switch (type) {
      case 'map':
        return 'Map';
      case 'token':
        return 'Token';
      case 'prop':
        return 'Prop';
      default:
        return type;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
          <CardContent className="p-0">
            {/* Image */}
            <div className="relative aspect-square bg-muted">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                </div>
              )}
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  {onView && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onView(item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onEdit(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Type Selector - Always visible on desktop, shows on hover */}
              <div className="absolute top-2 left-2 z-10">
                {onTypeChange ? (
                  <Select
                    value={item.type || "none"}
                    onValueChange={(value) => {
                      onTypeChange(item.id, value === "none" ? null : value as 'map' | 'token' | 'prop');
                    }}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs bg-black/70 hover:bg-black/80 border-0 text-white [&>svg]:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="map">Map</SelectItem>
                      <SelectItem value="token">Token</SelectItem>
                      <SelectItem value="prop">Prop</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  item.type && (
                    <Badge className={getTypeColor(item.type)}>
                      {getTypeLabel(item.type)}
                    </Badge>
                  )
                )}
              </div>

              {/* Actions Menu (always visible on mobile) */}
              <div className="absolute top-2 right-2 md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 bg-black/50 hover:bg-black/70"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onView && (
                      <DropdownMenuItem onClick={() => onView(item)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Name */}
            <div className="p-3">
              <p className="text-sm font-medium truncate" title={item.name}>
                {item.name}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

