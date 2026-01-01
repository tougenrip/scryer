"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEquipment } from "@/hooks/useDndContent";
import type { Equipment } from "@/hooks/useDndContent";
import { Plus } from "lucide-react";

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string | null;
  onAddItem: (item: Equipment, quantity: number, notes?: string) => Promise<void>;
}

export function AddItemDialog({
  open,
  onOpenChange,
  campaignId,
  onAddItem,
}: AddItemDialogProps) {
  const [selectedItem, setSelectedItem] = useState<Equipment | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { equipment, loading: equipmentLoading } = useEquipment(campaignId);

  const filteredEquipment = useMemo(() => {
    let filtered = equipment;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.equipment_category === categoryFilter);
    }

    // Filter by search query (Command will also filter, but we do manual filtering for category)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.equipment_category?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [equipment, categoryFilter, searchQuery]);

  const categories = useMemo(() => {
    const cats = new Set(equipment.map((item) => item.equipment_category || "Other"));
    return ["all", ...Array.from(cats)].sort();
  }, [equipment]);

  const handleAdd = async () => {
    if (!selectedItem) return;

    setLoading(true);
    try {
      await onAddItem(selectedItem, quantity, notes.trim() || undefined);
      // Reset form
      setSelectedItem(null);
      setQuantity(1);
      setNotes("");
      setSearchQuery("");
      setCategoryFilter("all");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Item to Inventory</DialogTitle>
          <DialogDescription>
            Search and select an item to add to your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={categoryFilter === category ? "default" : "outline"}
                size="sm"
                onClick={() => setCategoryFilter(category)}
                className="text-xs"
              >
                {category === "all" ? "All" : category}
              </Button>
            ))}
          </div>

          {/* Search and Equipment List */}
          <div className="flex-1 min-h-0 flex gap-4">
            <div className="flex-1 flex flex-col min-h-0">
              <Command className="flex-1 flex flex-col min-h-0" shouldFilter={false}>
                <CommandInput
                  placeholder="Search equipment..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList className="flex-1">
                  <CommandEmpty>No equipment found.</CommandEmpty>
                  <CommandGroup>
                      {filteredEquipment.map((item) => (
                        <CommandItem
                          key={`${item.source}-${item.index}`}
                          value={`${item.name} ${item.equipment_category || ''}`}
                          onSelect={() => setSelectedItem(item)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{item.name}</span>
                              <div className="flex gap-2 items-center">
                                <Badge variant="outline" className="text-xs">
                                  {item.equipment_category || "Other"}
                                </Badge>
                                {item.source === "homebrew" && (
                                  <Badge variant="secondary" className="text-xs">
                                    Homebrew
                                  </Badge>
                                )}
                                {item.cost && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.cost.quantity} {item.cost.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                            {selectedItem?.index === item.index &&
                              selectedItem?.source === item.source && (
                                <div className="text-primary">✓</div>
                              )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                </CommandList>
              </Command>
            </div>

            {/* Selected Item Details */}
            {selectedItem && (
              <div className="w-80 border rounded-md p-4 space-y-4 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-lg">{selectedItem.name}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{selectedItem.equipment_category || "Other"}</Badge>
                    {selectedItem.source === "homebrew" && (
                      <Badge variant="secondary">Homebrew</Badge>
                    )}
                  </div>
                </div>

                {selectedItem.description && (
                  <div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedItem.description}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedItem.cost && (
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <p className="font-medium">
                          {selectedItem.cost.quantity} {selectedItem.cost.unit}
                        </p>
                      </div>
                    )}
                    {selectedItem.weight && (
                      <div>
                        <span className="text-muted-foreground">Weight:</span>
                        <p className="font-medium">{selectedItem.weight} lb</p>
                      </div>
                    )}
                    {selectedItem.damage && (
                      <div>
                        <span className="text-muted-foreground">Damage:</span>
                        <p className="font-medium">
                          {selectedItem.damage.damage_dice} {selectedItem.damage.damage_type}
                        </p>
                      </div>
                    )}
                    {selectedItem.armor_class && (
                      <div>
                        <span className="text-muted-foreground">Armor Class:</span>
                        <p className="font-medium">
                          {typeof selectedItem.armor_class === "number"
                            ? selectedItem.armor_class
                            : selectedItem.armor_class.base || "—"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      placeholder="Add any notes about this item..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <Button
                    onClick={handleAdd}
                    disabled={loading || quantity < 1}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {loading ? "Adding..." : "Add to Inventory"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
