"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface CharacterMoney {
  cp: number; // Copper
  sp: number; // Silver
  ep: number; // Electrum
  gp: number; // Gold
  pp: number; // Platinum
}

interface MoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  money: CharacterMoney;
  onUpdate: (money: CharacterMoney) => Promise<void>;
  editable?: boolean;
}

const CURRENCY_ORDER: Array<{ key: keyof CharacterMoney; label: string; abbreviation: string; color: string; conversionInfo: string }> = [
  { key: "pp", label: "Platinum", abbreviation: "PP", color: "text-slate-400", conversionInfo: "1 PP = 10 GP = 20 EP = 100 SP = 1000 CP" },
  { key: "gp", label: "Gold", abbreviation: "GP", color: "text-yellow-500", conversionInfo: "1 GP = 2 EP = 10 SP = 100 CP" },
  { key: "ep", label: "Electrum", abbreviation: "EP", color: "text-amber-400", conversionInfo: "1 EP = 5 SP = 50 CP" },
  { key: "sp", label: "Silver", abbreviation: "SP", color: "text-gray-300", conversionInfo: "1 SP = 10 CP" },
  { key: "cp", label: "Copper", abbreviation: "CP", color: "text-orange-600", conversionInfo: "Base currency (lowest value)" },
];


export function MoneyDialog({
  open,
  onOpenChange,
  money: initialMoney,
  onUpdate,
  editable = true,
}: MoneyDialogProps) {
  const [money, setMoney] = useState<CharacterMoney>(initialMoney);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMoney(initialMoney);
  }, [initialMoney, open]);

  const handleIncrement = (currency: keyof CharacterMoney) => {
    setMoney((prev) => ({
      ...prev,
      [currency]: (prev[currency] || 0) + 1,
    }));
  };

  const handleDecrement = (currency: keyof CharacterMoney) => {
    setMoney((prev) => {
      const currentValue = prev[currency] || 0;
      
      // If the currency is already 0, try to convert from higher denominations
      if (currentValue === 0) {
        const newMoney = { ...prev };
        
        // Conversion hierarchy: PP > GP > EP > SP > CP
        // Try to convert from the next higher currency
        switch (currency) {
          case 'cp': // CP needs SP
            if ((newMoney.sp || 0) > 0) {
              newMoney.sp = (newMoney.sp || 0) - 1;
              newMoney.cp = 10; // 1 SP = 10 CP
            } else if ((newMoney.ep || 0) > 0) {
              // EP can convert to SP (1 EP = 5 SP = 50 CP)
              newMoney.ep = (newMoney.ep || 0) - 1;
              newMoney.sp = 4; // 5 SP - 1 SP used for conversion
              newMoney.cp = 10;
            } else if ((newMoney.gp || 0) > 0) {
              // GP can convert to SP (1 GP = 10 SP = 100 CP)
              newMoney.gp = (newMoney.gp || 0) - 1;
              newMoney.sp = 9; // 10 SP - 1 SP used for conversion
              newMoney.cp = 10;
            } else if ((newMoney.pp || 0) > 0) {
              // PP can convert to GP (1 PP = 10 GP)
              newMoney.pp = (newMoney.pp || 0) - 1;
              newMoney.gp = 9; // 10 GP - 1 GP used for conversion
              newMoney.sp = 9;
              newMoney.cp = 10;
            } else {
              return prev; // No currency to convert from
            }
            return newMoney;
            
          case 'sp': // SP needs GP or EP
            if ((newMoney.ep || 0) > 0) {
              // 1 EP = 5 SP
              newMoney.ep = (newMoney.ep || 0) - 1;
              newMoney.sp = 4; // 5 SP - 1 SP
            } else if ((newMoney.gp || 0) > 0) {
              // 1 GP = 10 SP
              newMoney.gp = (newMoney.gp || 0) - 1;
              newMoney.sp = 9; // 10 SP - 1 SP
            } else if ((newMoney.pp || 0) > 0) {
              // 1 PP = 10 GP = 100 SP
              newMoney.pp = (newMoney.pp || 0) - 1;
              newMoney.gp = 9;
              newMoney.sp = 9;
            } else {
              return prev;
            }
            return newMoney;
            
          case 'ep': // EP needs GP
            if ((newMoney.gp || 0) > 0) {
              // 1 GP = 2 EP
              newMoney.gp = (newMoney.gp || 0) - 1;
              newMoney.ep = 1; // 2 EP - 1 EP
            } else if ((newMoney.pp || 0) > 0) {
              // 1 PP = 10 GP = 20 EP
              newMoney.pp = (newMoney.pp || 0) - 1;
              newMoney.gp = 9;
              newMoney.ep = 1;
            } else {
              return prev;
            }
            return newMoney;
            
          case 'gp': // GP needs PP
            if ((newMoney.pp || 0) > 0) {
              // 1 PP = 10 GP
              newMoney.pp = (newMoney.pp || 0) - 1;
              newMoney.gp = 9; // 10 GP - 1 GP
            } else {
              return prev;
            }
            return newMoney;
            
          case 'pp':
            // PP is the highest, can't convert from anything
            return prev;
        }
      }
      
      // Normal decrement
      return {
        ...prev,
        [currency]: Math.max(0, currentValue - 1),
      };
    });
  };

  const handleSetValue = (currency: keyof CharacterMoney, value: string) => {
    const numValue = parseInt(value) || 0;
    setMoney((prev) => ({
      ...prev,
      [currency]: Math.max(0, numValue),
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdate(money);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update money:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (currency: keyof CharacterMoney): string => {
    const value = money[currency] || 0;
    if (value === 0) return "0";
    return value.toLocaleString();
  };

  const getTotalGoldValue = (): number => {
    // Convert all currencies to gold pieces for display
    const ppToGp = (money.pp || 0) * 10;
    const epToGp = (money.ep || 0) * 0.5;
    const spToGp = (money.sp || 0) * 0.1;
    const cpToGp = (money.cp || 0) * 0.01;
    return ppToGp + (money.gp || 0) + epToGp + spToGp + cpToGp;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Currency</DialogTitle>
          <DialogDescription>
            Manage your character's money and currency
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {CURRENCY_ORDER.map(({ key, label, abbreviation, color, conversionInfo }) => {
            // Get the shape color class and shape type based on currency
            const shapeConfig = {
              pp: { color: 'bg-slate-400', shape: 'diamond' },
              gp: { color: 'bg-yellow-500', shape: 'square' },
              ep: { color: 'bg-amber-400', shape: 'pentagon' },
              sp: { color: 'bg-gray-300', shape: 'triangle' },
              cp: { color: 'bg-orange-600', shape: 'circle' },
            }[key];

            const renderShape = (shape: string, colorClass: string) => {
              const baseSize = 'w-4 h-4';
              switch (shape) {
                case 'diamond':
                  return <div className={`${baseSize} ${colorClass} rotate-45`} />;
                case 'square':
                  return <div className={`${baseSize} ${colorClass}`} />;
                case 'pentagon':
                  return (
                    <div 
                      className={`${baseSize} ${colorClass}`}
                      style={{
                        clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                      }}
                    />
                  );
                case 'triangle':
                  return (
                    <div 
                      className={`${baseSize} ${colorClass}`}
                      style={{
                        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                      }}
                    />
                  );
                case 'circle':
                default:
                  return <div className={`${baseSize} ${colorClass} rounded-full`} />;
              }
            };

            return (
              <div key={key} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {renderShape(shapeConfig.shape, shapeConfig.color)}
                    <Label htmlFor={key} className="text-sm font-medium">
                      {label}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{conversionInfo}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editable && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDecrement(key)}
                      disabled={loading}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                  )}
                  <Input
                    id={key}
                    type="number"
                    min="0"
                    value={money[key] || 0}
                    onChange={(e) => handleSetValue(key, e.target.value)}
                    disabled={!editable || loading}
                    className={`w-24 text-right font-mono ${color}`}
                  />
                  {editable && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleIncrement(key)}
                      disabled={loading}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="pt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Total Value (in Gold):
              </span>
              <span className="text-lg font-semibold text-yellow-500">
                {getTotalGoldValue().toFixed(2)} GP
              </span>
            </div>
          </div>

          {editable && (
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setMoney(initialMoney)}
                disabled={loading}
                className="flex-1"
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
