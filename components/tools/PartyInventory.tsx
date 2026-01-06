"use client";

import { useState } from "react";
import { usePartyInventory, useAddPartyItem, useUpdatePartyItem, useDeletePartyItem } from "@/hooks/usePartyTools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus, Trash2, Package, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface PartyInventoryProps {
  campaignId: string;
  className?: string;
}

export function PartyInventory({ campaignId, className }: PartyInventoryProps) {
  const { items, loading, refetch } = usePartyInventory(campaignId);
  const { addItem, loading: adding } = useAddPartyItem();
  const { updateItem } = useUpdatePartyItem();
  const { deleteItem } = useDeletePartyItem();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, weight: 0, notes: "" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const result = await addItem({
      campaign_id: campaignId,
      name: newItem.name.trim(),
      quantity: newItem.quantity,
      weight: newItem.weight,
      notes: newItem.notes,
    });

    if (result.success) {
      setNewItem({ name: "", quantity: 1, weight: 0, notes: "" });
      setIsAddOpen(false);
      refetch();
      toast.success("Item added to party inventory");
    } else {
      toast.error("Failed to add item");
    }
  };

  const handleDelete = async (id: string) => {
    const result = await deleteItem(id);
    if (result.success) {
      refetch();
    } else {
      toast.error("Failed to delete item");
    }
  };

  const handleUpdateQty = async (id: string, currentQty: number, change: number) => {
    const newQty = Math.max(0, currentQty + change);
    if (newQty === 0) {
      // Ask to delete? Or just set to 0?
      // For now, let's keep it 0 or delete if explicit.
    }
    await updateItem(id, { quantity: newQty });
  };

  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Inventory
        </h3>
        <span className="text-xs text-muted-foreground">
          {items.length} Items • {totalWeight} lb
        </span>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Party inventory is empty.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-md bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{item.name}</div>
                  {item.notes && (
                    <div className="text-xs text-muted-foreground truncate">{item.notes}</div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-md px-1">
                    <button
                      className="w-5 h-5 flex items-center justify-center text-xs hover:bg-background rounded"
                      onClick={() => handleUpdateQty(item.id, item.quantity, -1)}
                    >
                      -
                    </button>
                    <span className="text-xs w-6 text-center tabular-nums">{item.quantity}</span>
                    <button
                      className="w-5 h-5 flex items-center justify-center text-xs hover:bg-background rounded"
                      onClick={() => handleUpdateQty(item.id, item.quantity, 1)}
                    >
                      +
                    </button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="mt-4">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full h-9" size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Party Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g. Bag of Holding"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (lb)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min="0"
                    step="0.1"
                    value={newItem.weight}
                    onChange={(e) => setNewItem({ ...newItem, weight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <Button type="submit" className="w-full" disabled={adding}>
                {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
