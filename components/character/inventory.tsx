"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Trash2, AlertTriangle, Shield, Zap, Plus, Search, Filter, X, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loot, Weapon, Armor, MagicItem } from "dnd-icons/entity";
import { Attunement } from "dnd-icons/attribute";
import type { EnrichedInventoryItem } from "@/lib/utils/equipment-effects";
import { getAbilityModifier } from "@/lib/utils/character";
import { calculateInventoryWeight, calculateCarryingCapacity, getEncumbranceStatus } from "@/lib/utils/character";
import { AddItemDialog } from "./add-item-dialog";
import { MoneyDialog, type CharacterMoney } from "./money-dialog";
import { ManageInventoryDialog } from "./manage-inventory-dialog";
import type { Equipment } from "@/hooks/useDndContent";
import { useCampaignCharacters } from "@/hooks/useDndContent";
import { createClient } from "@/lib/supabase/client";

interface InventoryProps {
  items: EnrichedInventoryItem[];
  characterStrength?: number;
  characterDexterity?: number;
  campaignId?: string | null;
  characterId?: string;
  money?: CharacterMoney;
  onItemToggle?: (itemId: string, field: "equipped" | "attuned", value: boolean) => void;
  onItemDelete?: (itemId: string) => void;
  onItemAdd?: (item: Equipment, quantity: number, notes?: string) => Promise<void>;
  onMoneyUpdate?: (money: CharacterMoney) => Promise<void>;
  editable?: boolean;
}

interface PartyInventoryItem {
  characterId: string;
  characterName: string;
  items: EnrichedInventoryItem[];
}

export function Inventory({
  items,
  characterStrength = 10,
  characterDexterity = 10,
  campaignId = null,
  characterId,
  money,
  onItemToggle,
  onItemDelete,
  onItemAdd,
  onMoneyUpdate,
  editable = false,
}: InventoryProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [moneyDialogOpen, setMoneyDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'weight' | 'cost' | 'quantity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['equipment', 'attunement', 'other']));
  const [partyInventory, setPartyInventory] = useState<PartyInventoryItem[]>([]);
  const [loadingPartyInventory, setLoadingPartyInventory] = useState(false);

  const { characters: campaignCharacters } = useCampaignCharacters(campaignId || "", { enabled: !!campaignId });

  // Fetch party inventory
  useEffect(() => {
    if (!campaignId || !characterId || !campaignCharacters.length) return;

    async function fetchPartyInventory() {
      setLoadingPartyInventory(true);
      try {
        const supabase = createClient();
        const otherCharacters = campaignCharacters.filter(c => c.id !== characterId);
        
        const partyData: PartyInventoryItem[] = [];
        
        for (const char of otherCharacters) {
          // Fetch inventory from JSONB or junction table
          let charItems: EnrichedInventoryItem[] = [];
          
          if (char.inventory && Array.isArray(char.inventory) && char.inventory.length > 0) {
            const inventoryJsonb = char.inventory as Array<{
              source: string;
              index: string;
              quantity: number;
              equipped: boolean;
              attuned: boolean;
              notes?: string;
            }>;

            // Fetch equipment data for each item
            for (const invItem of inventoryJsonb) {
              let equipmentData;
              if (invItem.source === 'srd') {
                const { data } = await supabase
                  .from('srd_equipment')
                  .select('*')
                  .eq('index', invItem.index)
                  .single();
                equipmentData = data;
              } else {
                const { data } = await supabase
                  .from('homebrew_equipment')
                  .select('*')
                  .eq('id', invItem.index)
                  .single();
                equipmentData = data;
              }

              if (equipmentData) {
                charItems.push({
                  id: `${char.id}-${invItem.index}`,
                  name: equipmentData.name,
                  source: invItem.source as 'srd' | 'homebrew',
                  quantity: invItem.quantity,
                  equipped: invItem.equipped,
                  attuned: invItem.attuned,
                  notes: invItem.notes,
                  equipmentData: equipmentData as any,
                });
              }
            }
          }

          if (charItems.length > 0) {
            partyData.push({
              characterId: char.id,
              characterName: char.name,
              items: charItems,
            });
          }
        }

        setPartyInventory(partyData);
      } catch (error) {
        console.error('Error fetching party inventory:', error);
      } finally {
        setLoadingPartyInventory(false);
      }
    }

    if (campaignCharacters.length > 0) {
      fetchPartyInventory();
    }
  }, [campaignId, characterId, campaignCharacters]);

  // Calculate weight and encumbrance
  const totalWeight = useMemo(() => calculateInventoryWeight(items), [items]);
  const carryingCapacity = useMemo(() => calculateCarryingCapacity(characterStrength), [characterStrength]);
  const encumbranceStatus = useMemo(() => getEncumbranceStatus(totalWeight, carryingCapacity), [totalWeight, carryingCapacity]);

  // Group items by category
  const equipmentItems = items.filter(item => item.equipped);
  const attunedItems = items.filter(item => item.attuned);
  const otherItems = items.filter(item => !item.equipped && !item.attuned);

  const equipmentWeight = useMemo(() => calculateInventoryWeight(equipmentItems), [equipmentItems]);
  const attunedWeight = useMemo(() => calculateInventoryWeight(attunedItems), [attunedItems]);
  const otherWeight = useMemo(() => calculateInventoryWeight(otherItems), [otherItems]);

  // Filter and search items
  const getFilteredItems = () => {
    let filtered = items;

    // Category filter
    switch (activeFilter) {
      case "equipment":
        filtered = equipmentItems;
        break;
      case "attunement":
        filtered = attunedItems;
        break;
      case "other-possessions":
        filtered = otherItems;
        break;
      default:
        filtered = items;
    }

    // Source filter
    if (sourceFilter !== "all") {
      filtered = filtered.filter(item => item.source === sourceFilter);
    }

    // Category filter (equipment category)
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => 
        item.equipmentData?.equipment_category === categoryFilter
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const categoryMatch = item.equipmentData?.equipment_category?.toLowerCase().includes(query);
        const notesMatch = item.notes?.toLowerCase().includes(query);
        const sourceMatch = item.source === query || (query === 'srd' && item.source === 'srd') || (query === 'homebrew' && item.source === 'homebrew');
        return nameMatch || categoryMatch || notesMatch || sourceMatch;
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'weight':
          aValue = (a.equipmentData?.weight ?? 0) * a.quantity;
          bValue = (b.equipmentData?.weight ?? 0) * b.quantity;
          break;
        case 'cost':
          aValue = a.equipmentData?.cost?.quantity ?? 0;
          bValue = b.equipmentData?.cost?.quantity ?? 0;
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const filteredItems = getFilteredItems();

  // Get items that can be attuned (magic items)
  const attunableItems = useMemo(() => {
    return items.filter(item => {
      // Check if item description mentions attunement or is a magic item
      const desc = item.equipmentData?.description?.toLowerCase() || '';
      return desc.includes('attunement') || item.equipmentData?.equipment_category === 'Wondrous Item' || 
             item.equipmentData?.equipment_category === 'Weapon' && desc.includes('magic') ||
             item.equipmentData?.equipment_category === 'Armor' && desc.includes('magic');
    });
  }, [items]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const getItemCost = (item: EnrichedInventoryItem): number => {
    if (!item.equipmentData?.cost) return 0;
    const cost = item.equipmentData.cost;
    if (typeof cost === 'object' && cost.quantity) {
      // Convert to gold pieces
      const unit = cost.unit?.toLowerCase() || 'gp';
      const quantity = cost.quantity || 0;
      switch (unit) {
        case 'pp': return quantity * 10;
        case 'gp': return quantity;
        case 'ep': return quantity * 0.5;
        case 'sp': return quantity * 0.1;
        case 'cp': return quantity * 0.01;
        default: return quantity;
      }
    }
    return 0;
  };

  const CurrencyDisplay = ({ money }: { money: CharacterMoney }) => {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMoneyDialogOpen(true)}
        className="h-8 gap-2"
      >
        <Loot size={16} className="text-yellow-500" />
        <span className="font-medium">{money.gp || 0}</span>
      </Button>
    );
  };

  const renderItemRow = (item: EnrichedInventoryItem) => {
    const equipmentData = item.equipmentData;
    const itemWeight = (equipmentData?.weight ?? 0) * item.quantity;
    const itemCost = getItemCost(item);
    const hasStealthDisadvantage = equipmentData?.stealth_disadvantage === true;
    const strRequirement = equipmentData?.str_minimum;
    const meetsStrRequirement = strRequirement ? characterStrength >= strRequirement : true;
    const isArmor = equipmentData?.armor_category && equipmentData.armor_category !== 'Shield';
    const isShield = equipmentData?.armor_category === 'Shield';
    
    // Calculate AC contribution
    let acContribution: number | null = null;
    if (isArmor && equipmentData.armor_class) {
      if (typeof equipmentData.armor_class === 'number') {
        acContribution = equipmentData.armor_class;
      } else if (typeof equipmentData.armor_class === 'object' && equipmentData.armor_class !== null) {
        const acData = equipmentData.armor_class as any;
        acContribution = acData.base || 10;
        if (acData.dex_bonus) {
          const dexMod = getAbilityModifier(characterDexterity);
          const maxBonus = acData.max_bonus ?? Infinity;
          acContribution += Math.min(dexMod, maxBonus);
        }
      }
    } else if (isShield) {
      acContribution = 2;
    }

    // Get item icon based on category
    const getItemIcon = () => {
      if (equipmentData?.weapon_category) return <Weapon size={16} className="text-muted-foreground" />;
      if (equipmentData?.armor_category) return <Armor size={16} className="text-muted-foreground" />;
      if (equipmentData?.equipment_category === 'Wondrous Item') return <MagicItem size={16} className="text-muted-foreground" />;
      return null;
    };

    return (
      <TableRow key={item.id} className={item.equipped ? "bg-muted/30" : ""}>
        <TableCell className="w-12">
          {editable && (
            <Checkbox
              checked={item.equipped}
              onCheckedChange={(checked) => {
                onItemToggle?.(item.id, "equipped", checked === true);
              }}
            />
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            {getItemIcon()}
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={item.equipped ? "font-medium" : ""}>{item.name}</span>
                {item.source === 'srd' && <Badge variant="outline" className="text-xs">Legacy</Badge>}
                {item.source === 'homebrew' && <Badge variant="secondary" className="text-xs">Homebrew</Badge>}
                {item.quantity > 1 && <Badge variant="outline" className="text-xs">×{item.quantity}</Badge>}
                {item.attuned && <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Attunement size={12} />
                  Attuned
                </Badge>}
                {acContribution !== null && item.equipped && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        AC {acContribution}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Armor Class contribution when equipped</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {hasStealthDisadvantage && item.equipped && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Stealth Disadvantage
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This armor imposes disadvantage on Stealth checks</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {strRequirement && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={meetsStrRequirement ? "outline" : "destructive"} className="text-xs flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        STR {strRequirement}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Strength requirement: {strRequirement}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {equipmentData?.equipment_category && (
                <div className="text-xs text-muted-foreground mt-1">
                  {equipmentData.equipment_category}
                  {equipmentData.gear_category && ` • ${equipmentData.gear_category}`}
                </div>
              )}
              {item.notes && (
                <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right">{itemWeight > 0 ? `${itemWeight.toFixed(1)} lb.` : "—"}</TableCell>
        <TableCell className="text-right">{item.quantity}</TableCell>
        <TableCell className="text-right">{itemCost > 0 ? itemCost.toFixed(1) : "—"}</TableCell>
        <TableCell className="max-w-xs truncate">{item.notes || "—"}</TableCell>
        {editable && (
          <TableCell className="w-20">
            <div className="flex items-center gap-1">
              {item.equipped && (
                <Checkbox
                  checked={item.attuned}
                  onCheckedChange={(checked) => {
                    onItemToggle?.(item.id, "attuned", checked === true);
                  }}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onItemDelete?.(item.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        )}
      </TableRow>
    );
  };

  const renderCategorySection = (
    title: string,
    categoryItems: EnrichedInventoryItem[],
    categoryKey: string,
    weight: number
  ) => {
    const isExpanded = expandedCategories.has(categoryKey);
    
    if (categoryItems.length === 0 && activeFilter === categoryKey) {
      return (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No items in {title.toLowerCase()}.
        </div>
      );
    }

    if (categoryItems.length === 0) return null;

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(categoryKey)}>
        <div className="space-y-2">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="font-semibold">
                  {title.toUpperCase()} ({categoryItems.length})
                </span>
                <span className="text-sm text-muted-foreground">
                  {weight.toFixed(1)} lb.
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(categoryKey);
                }}
              >
                {isExpanded ? "Hide Contents" : "Show Contents"}
              </Button>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">ACTIVE</TableHead>
                  <TableHead>NAME</TableHead>
                  <TableHead className="text-right">WEIGHT</TableHead>
                  <TableHead className="text-right">QTY</TableHead>
                  <TableHead className="text-right">COST (GP)</TableHead>
                  <TableHead>NOTES</TableHead>
                  {editable && <TableHead className="w-20"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryItems.map(item => renderItemRow(item))}
              </TableBody>
            </Table>
            {editable && onItemAdd && (
              <div className="p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddItemDialogOpen(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {title.slice(0, -1)}
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  const encumbranceBadgeColor = encumbranceStatus === 'unencumbered' 
    ? 'bg-green-500/20 text-green-500 border-green-500' 
    : encumbranceStatus === 'encumbered'
    ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500'
    : 'bg-red-500/20 text-red-500 border-red-500';

  const encumbranceLabel = encumbranceStatus === 'unencumbered'
    ? 'UNENCUMBERED'
    : encumbranceStatus === 'encumbered'
    ? 'ENCUMBERED'
    : 'HEAVILY ENCUMBERED';

  return (
    <div className="space-y-4">
      {/* Header with weight, currency, and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm text-muted-foreground">WEIGHT CARRIED</div>
            <div className="text-lg font-semibold">{totalWeight.toFixed(1)} lb.</div>
          </div>
          <Badge variant="outline" className={encumbranceBadgeColor}>
            {encumbranceLabel}
          </Badge>
          {money && editable && onMoneyUpdate && <CurrencyDisplay money={money} />}
        </div>
        <div className="flex items-center gap-2">
          {editable && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setManageDialogOpen(true)}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                MANAGE INVENTORY
              </Button>
              {onItemAdd && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddItemDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Item Names, Types, Rarities, or Tags"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Inventory</SheetTitle>
              <SheetDescription>Filter items by various criteria</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Sort By</Label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="name">Name</option>
                  <option value="weight">Weight</option>
                  <option value="cost">Cost</option>
                  <option value="quantity">Quantity</option>
                </select>
              </div>
              <div>
                <Label>Order</Label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
              <div>
                <Label>Source</Label>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="all">All Sources</option>
                  <option value="srd">SRD (Legacy)</option>
                  <option value="homebrew">Homebrew</option>
                </select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Category Tabs */}
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="all" className="text-xs">ALL</TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs">EQUIPMENT</TabsTrigger>
          <TabsTrigger value="attunement" className="text-xs">ATTUNEMENT</TabsTrigger>
          <TabsTrigger value="other-possessions" className="text-xs">OTHER POSSESSIONS</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-4">
          <Card>
            <CardContent className="p-4">
              {activeFilter === "all" ? (
                <div className="space-y-4">
                  {renderCategorySection("EQUIPMENT", equipmentItems, "equipment", equipmentWeight)}
                  {renderCategorySection("ATTUNEMENT", attunedItems, "attunement", attunedWeight)}
                  {renderCategorySection("OTHER POSSESSIONS", otherItems, "other", otherWeight)}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">ACTIVE</TableHead>
                      <TableHead>NAME</TableHead>
                      <TableHead className="text-right">WEIGHT</TableHead>
                      <TableHead className="text-right">QTY</TableHead>
                      <TableHead className="text-right">COST (GP)</TableHead>
                      <TableHead>NOTES</TableHead>
                      {editable && <TableHead className="w-20"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={editable ? 7 : 6} className="text-center py-8 text-muted-foreground">
                          No items found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map(item => renderItemRow(item))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Attunement Slots Section */}
      {editable && (
        <Card>
          <CardHeader>
            <CardTitle>Attunement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold mb-2">ATTUNED ITEMS</div>
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map(slotIndex => {
                    const attunedItem = attunedItems[slotIndex];
                    return (
                      <div
                        key={slotIndex}
                        className="border-2 border-dashed rounded-lg p-4 min-h-[100px] flex flex-col items-center justify-center text-center text-sm text-muted-foreground"
                      >
                        {attunedItem ? (
                          <div className="space-y-2">
                            <div className="font-medium text-foreground">{attunedItem.name}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onItemToggle?.(attunedItem.id, "attuned", false)}
                              className="h-6 text-xs"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span>Choose an Item from the Right</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">ITEMS REQUIRING ATTUNEMENT</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {attunableItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Items that you can attune to will display here as you make them active.
                    </p>
                  ) : (
                    attunableItems.map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50"
                      >
                        <span className="text-sm">{item.name}</span>
                        {!item.attuned && item.equipped && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (attunedItems.length < 3) {
                                onItemToggle?.(item.id, "attuned", true);
                              }
                            }}
                            disabled={attunedItems.length >= 3}
                            className="h-6 text-xs"
                          >
                            Attune
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {partyInventory.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold mb-2">PARTY ITEMS REQUIRING ATTUNEMENT</div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {partyInventory.flatMap(party => 
                        party.items
                          .filter(item => item.equipped && !item.attuned)
                          .map(item => (
                            <div
                              key={`${party.characterId}-${item.id}`}
                              className="flex items-center justify-between p-2 border rounded-md"
                            >
                              <div className="text-sm">
                                <span className="font-medium">{item.name}</span>
                                <span className="text-muted-foreground ml-2">({party.characterName})</span>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Party Inventory Section */}
      {partyInventory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Party Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPartyInventory ? (
              <div className="text-center py-4 text-muted-foreground">Loading party inventory...</div>
            ) : (
              <div className="space-y-4">
                {partyInventory.map(party => (
                  <div key={party.characterId} className="border rounded-md p-3">
                    <div className="font-semibold mb-2">{party.characterName}</div>
                    <div className="text-sm text-muted-foreground">
                      {party.items.length} items • {calculateInventoryWeight(party.items).toFixed(1)} lb.
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {editable && onItemAdd && (
        <AddItemDialog
          open={addItemDialogOpen}
          onOpenChange={setAddItemDialogOpen}
          campaignId={campaignId}
          onAddItem={onItemAdd}
        />
      )}

      {editable && money && onMoneyUpdate && (
        <MoneyDialog
          open={moneyDialogOpen}
          onOpenChange={setMoneyDialogOpen}
          money={money}
          onUpdate={onMoneyUpdate}
          editable={editable}
        />
      )}

      {editable && (
        <ManageInventoryDialog
          open={manageDialogOpen}
          onOpenChange={setManageDialogOpen}
          items={items}
          onItemDelete={onItemDelete}
          onItemToggle={onItemToggle}
        />
      )}
    </div>
  );
}
