"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Settings, Plus, X } from "lucide-react";
import { CampaignCalendar } from "@/hooks/useForgeContent";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface CalendarMonthSettingsProps {
  calendar: CampaignCalendar;
  onUpdate: (monthNames: string[], seasonMonths?: Record<'spring' | 'summer' | 'autumn' | 'winter', number[]>) => Promise<void>;
  isDm: boolean;
}

const DEFAULT_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DEFAULT_SEASON_MONTHS: Record<'spring' | 'summer' | 'autumn' | 'winter', number[]> = {
  spring: [4, 5, 6],
  summer: [7, 8, 9],
  autumn: [10, 11, 12],
  winter: [1, 2, 3],
};

export function CalendarMonthSettings({ calendar, onUpdate, isDm }: CalendarMonthSettingsProps) {
  const [open, setOpen] = useState(false);
  const [monthNames, setMonthNames] = useState<string[]>([]);
  const [seasonMonths, setSeasonMonths] = useState<Record<'spring' | 'summer' | 'autumn' | 'winter', number[]>>(DEFAULT_SEASON_MONTHS);

  useEffect(() => {
    if (calendar.custom_month_names && calendar.custom_month_names.length > 0) {
      setMonthNames([...calendar.custom_month_names]);
    } else {
      setMonthNames([...DEFAULT_MONTH_NAMES]);
    }
    
    if (calendar.custom_season_months) {
      setSeasonMonths({ ...calendar.custom_season_months });
    } else {
      setSeasonMonths({ ...DEFAULT_SEASON_MONTHS });
    }
  }, [calendar]);

  const handleSave = async () => {
    if (monthNames.length < 1) {
      toast.error("At least one month is required");
      return;
    }
    
    // Validate that all months are assigned to exactly one season
    const allAssignedMonths = new Set<number>();
    Object.values(seasonMonths).forEach(months => {
      months.forEach(month => allAssignedMonths.add(month));
    });
    
    const totalMonths = monthNames.length;
    const missingMonths: number[] = [];
    for (let i = 1; i <= totalMonths; i++) {
      if (!allAssignedMonths.has(i)) {
        missingMonths.push(i);
      }
    }
    
    if (missingMonths.length > 0) {
      toast.error(`Months ${missingMonths.join(', ')} are not assigned to any season`);
      return;
    }
    
    await onUpdate(monthNames, seasonMonths);
    setOpen(false);
    toast.success("Month and season settings updated");
  };

  const handleAddMonth = () => {
    setMonthNames([...monthNames, `Month ${monthNames.length + 1}`]);
  };

  const handleRemoveMonth = (index: number) => {
    if (monthNames.length <= 1) {
      toast.error("At least one month is required");
      return;
    }
    setMonthNames(monthNames.filter((_, i) => i !== index));
  };

  const handleMonthNameChange = (index: number, value: string) => {
    const newNames = [...monthNames];
    newNames[index] = value;
    setMonthNames(newNames);
  };

  // Get which season a month belongs to
  const getMonthSeason = (monthNum: number): 'spring' | 'summer' | 'autumn' | 'winter' | null => {
    for (const [season, months] of Object.entries(seasonMonths)) {
      if (months.includes(monthNum)) {
        return season as 'spring' | 'summer' | 'autumn' | 'winter';
      }
    }
    return null;
  };

  // Handle season assignment for a month
  const handleMonthSeasonChange = (monthNum: number, season: 'spring' | 'summer' | 'autumn' | 'winter') => {
    const newSeasonMonths = { ...seasonMonths };
    
    // Remove month from all seasons first
    Object.keys(newSeasonMonths).forEach(s => {
      newSeasonMonths[s as keyof typeof newSeasonMonths] = newSeasonMonths[s as keyof typeof newSeasonMonths].filter(m => m !== monthNum);
    });
    
    // Add month to the selected season
    newSeasonMonths[season] = [...newSeasonMonths[season], monthNum].sort((a, b) => a - b);
    
    setSeasonMonths(newSeasonMonths);
  };

  if (!isDm) return null;

  const seasonLabels: Record<'spring' | 'summer' | 'autumn' | 'winter', string> = {
    spring: 'Spring',
    summer: 'Summer',
    autumn: 'Autumn',
    winter: 'Winter',
  };

  const seasonColors: Record<'spring' | 'summer' | 'autumn' | 'winter', string> = {
    spring: 'bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400',
    summer: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-600 dark:text-yellow-400',
    autumn: 'bg-orange-500/20 border-orange-500/50 text-orange-600 dark:text-orange-400',
    winter: 'bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400',
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Month Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Customize Months & Seasons</DialogTitle>
          <DialogDescription>
            Configure month names and assign months to seasons
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="months" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="months">Months</TabsTrigger>
            <TabsTrigger value="seasons">Seasons</TabsTrigger>
          </TabsList>
          
          <TabsContent value="months" className="space-y-4 mt-4">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {monthNames.map((name, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-8">{index + 1}.</span>
                  <Input
                    value={name}
                    onChange={(e) => handleMonthNameChange(index, e.target.value)}
                    placeholder={`Month ${index + 1}`}
                    className="flex-1"
                  />
                  {monthNames.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMonth(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={handleAddMonth}
              className="w-full flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Month
            </Button>
          </TabsContent>
          
          <TabsContent value="seasons" className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Assign each month to a season by selecting it below
              </p>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {monthNames.map((name, monthIndex) => {
                  const monthNum = monthIndex + 1;
                  const currentSeason = getMonthSeason(monthNum);
                  
                  return (
                    <div key={monthIndex} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2 sm:gap-3 sm:min-w-[120px] flex-shrink-0">
                        <span className="text-sm font-medium text-muted-foreground w-5 sm:w-6">
                          {monthNum}.
                        </span>
                        <span className="text-sm font-medium truncate">{name || `Month ${monthNum}`}</span>
                      </div>
                      
                      <RadioGroup
                        value={currentSeason || undefined}
                        onValueChange={(value) => handleMonthSeasonChange(monthNum, value as 'spring' | 'summer' | 'autumn' | 'winter')}
                        className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1"
                      >
                        {(['spring', 'summer', 'autumn', 'winter'] as const).map((season) => (
                          <div key={season} className="flex items-center gap-1.5 sm:gap-2">
                            <RadioGroupItem
                              value={season}
                              id={`month-${monthNum}-${season}`}
                              className="peer flex-shrink-0"
                            />
                            <Label
                              htmlFor={`month-${monthNum}-${season}`}
                              className={cn(
                                "cursor-pointer px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap",
                                "hover:bg-accent w-16 sm:w-20 flex items-center justify-center",
                                currentSeason === season 
                                  ? seasonColors[season]
                                  : "bg-background border-border text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {seasonLabels[season]}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  );
                })}
              </div>
              
              {/* Preview: Show seasons with their months */}
              <div className="mt-6 pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Season Summary</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['spring', 'summer', 'autumn', 'winter'] as const).map((season) => (
                    <div
                      key={season}
                      className={cn(
                        "p-3 rounded-lg border",
                        seasonColors[season]
                      )}
                    >
                      <div className="text-sm font-semibold mb-1">{seasonLabels[season]}</div>
                      <div className="text-xs text-muted-foreground break-words">
                        {seasonMonths[season].length > 0 ? (
                          seasonMonths[season]
                            .map(m => monthNames[m - 1] || `Month ${m}`)
                            .join(', ')
                        ) : (
                          <span className="italic">No months assigned</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

