"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Download, Upload } from "lucide-react";
import type { EnrichedInventoryItem } from "@/lib/utils/equipment-effects";

interface ManageInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: EnrichedInventoryItem[];
  onItemDelete?: (itemId: string) => void;
  onItemToggle?: (itemId: string, field: "equipped" | "attuned", value: boolean) => void;
}

export function ManageInventoryDialog({
  open,
  onOpenChange,
  items,
  onItemDelete,
  onItemToggle,
}: ManageInventoryDialogProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<'equip' | 'unequip' | 'delete' | null>(null);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const handleBulkAction = () => {
    if (!bulkAction || selectedItems.size === 0) return;

    selectedItems.forEach(itemId => {
      switch (bulkAction) {
        case 'equip':
          onItemToggle?.(itemId, 'equipped', true);
          break;
        case 'unequip':
          onItemToggle?.(itemId, 'equipped', false);
          break;
        case 'delete':
          onItemDelete?.(itemId);
          break;
      }
    });

    setSelectedItems(new Set());
    setBulkAction(null);
  };

  const exportInventory = () => {
    const exportData = items.map(item => ({
      name: item.name,
      source: item.source,
      quantity: item.quantity,
      equipped: item.equipped,
      attuned: item.attuned,
      notes: item.notes,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importInventory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        console.log('Import data:', data);
        // Note: Actual import would need to be handled by parent component
        // This is just a placeholder for the UI
      } catch (error) {
        console.error('Failed to import inventory:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Inventory</DialogTitle>
          <DialogDescription>
            Bulk edit, import, or export your inventory
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Bulk Actions */}
          <div className="flex items-center gap-2 p-4 border rounded-md">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
            >
              {selectedItems.size === items.length ? "Deselect All" : "Select All"}
            </Button>
            <span className="text-sm text-muted-foreground">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex-1" />
            <select
              value={bulkAction || ''}
              onChange={(e) => setBulkAction(e.target.value as any || null)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="">Bulk Action...</option>
              <option value="equip">Equip Selected</option>
              <option value="unequip">Unequip Selected</option>
              <option value="delete">Delete Selected</option>
            </select>
            {bulkAction && (
              <Button
                size="sm"
                onClick={handleBulkAction}
                variant="destructive"
              >
                Apply
              </Button>
            )}
          </div>

          {/* Import/Export */}
          <div className="flex items-center gap-2 p-4 border rounded-md">
            <Button
              variant="outline"
              size="sm"
              onClick={exportInventory}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Inventory
            </Button>
            <Label htmlFor="import-inventory" className="cursor-pointer">
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Inventory
                </span>
              </Button>
            </Label>
            <input
              id="import-inventory"
              type="file"
              accept=".json"
              onChange={importInventory}
              className="hidden"
            />
          </div>

          {/* Items Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedItems.size === items.length && items.length > 0}
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Equipped</TableHead>
                <TableHead>Attuned</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedItems.has(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={item.equipped}
                      onCheckedChange={(checked) => {
                        onItemToggle?.(item.id, "equipped", checked === true);
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={item.attuned}
                      onCheckedChange={(checked) => {
                        onItemToggle?.(item.id, "attuned", checked === true);
                      }}
                    />
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{item.notes || "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onItemDelete?.(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
