"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignCalendar } from "@/hooks/useForgeContent";
import { toast } from "sonner";

interface CalendarWeatherManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendar: CampaignCalendar;
  onConfirm: (weatherData: Record<string, any>) => Promise<void>;
}

const WEATHER_TYPES = [
  { value: "clear", label: "Clear/Sunny", icon: "☀️" },
  { value: "partly_cloudy", label: "Partly Cloudy", icon: "⛅" },
  { value: "cloudy", label: "Cloudy", icon: "☁️" },
  { value: "rainy", label: "Rainy", icon: "🌧️" },
  { value: "stormy", label: "Stormy", icon: "⛈️" },
  { value: "snowy", label: "Snowy", icon: "❄️" },
  { value: "foggy", label: "Foggy", icon: "🌫️" },
  { value: "windy", label: "Windy", icon: "💨" },
];

const TEMPERATURE_RANGES = [
  { label: "Freezing", min: -10, max: 0 },
  { label: "Cold", min: 0, max: 10 },
  { label: "Cool", min: 10, max: 20 },
  { label: "Mild", min: 20, max: 25 },
  { label: "Warm", min: 25, max: 30 },
  { label: "Hot", min: 30, max: 40 },
];

const DEFAULT_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getSeasonFromMonth(
  month: number,
  customSeasonMonths?: Record<'spring' | 'summer' | 'autumn' | 'winter', number[]>
): string {
  if (customSeasonMonths) {
    for (const [season, months] of Object.entries(customSeasonMonths)) {
      if (months.includes(month)) {
        return season;
      }
    }
  }
  
  // Default fallback (12 months, 3 months per season)
  if (month >= 1 && month <= 3) return "winter";
  if (month >= 4 && month <= 6) return "spring";
  if (month >= 7 && month <= 9) return "summer";
  return "autumn";
}

// Weather weights by season (higher = more likely)
const WEATHER_WEIGHTS: Record<string, Record<string, number>> = {
  spring: {
    clear: 3,
    partly_cloudy: 4,
    cloudy: 4,
    rainy: 3,
    windy: 2,
    stormy: 1,
    snowy: 0,
    foggy: 1,
  },
  summer: {
    clear: 5,
    partly_cloudy: 4,
    cloudy: 2,
    stormy: 2,
    windy: 1,
    rainy: 1,
    snowy: 0,
    foggy: 0,
  },
  autumn: {
    clear: 2,
    partly_cloudy: 3,
    cloudy: 4,
    rainy: 3,
    foggy: 2,
    windy: 1,
    stormy: 1,
    snowy: 0,
  },
  winter: {
    cloudy: 4,
    rainy: 2,
    snowy: 2, // Less frequent but will last longer
    foggy: 2,
    windy: 2,
    clear: 1,
    partly_cloudy: 1,
    stormy: 1,
  },
};

// Weather duration ranges (min and max days this weather type typically lasts)
const WEATHER_DURATIONS: Record<string, { min: number; max: number }> = {
  clear: { min: 2, max: 5 },
  partly_cloudy: { min: 1, max: 3 },
  cloudy: { min: 1, max: 4 },
  rainy: { min: 1, max: 4 },
  stormy: { min: 1, max: 2 },
  snowy: { min: 3, max: 7 }, // Snow lasts longer when it occurs
  foggy: { min: 1, max: 3 },
  windy: { min: 1, max: 3 },
};

function getRandomWeatherForSeason(season: string): string {
  const weights = WEATHER_WEIGHTS[season] || WEATHER_WEIGHTS.spring;
  
  // Calculate total weight
  const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  
  // Generate random number between 0 and totalWeight
  let random = Math.random() * totalWeight;
  
  // Select weather based on weighted probability
  for (const [weatherType, weight] of Object.entries(weights)) {
    if (weight === 0) continue; // Skip impossible weather
    random -= weight;
    if (random <= 0) {
      return weatherType;
    }
  }
  
  // Fallback (shouldn't reach here)
  return "cloudy";
}

function getTemperatureForSeason(season: string): number {
  const baseTemps: Record<string, { min: number; max: number }> = {
    spring: { min: 10, max: 20 },
    summer: { min: 20, max: 35 },
    autumn: { min: 5, max: 20 },
    winter: { min: -5, max: 10 },
  };
  const range = baseTemps[season] || { min: 10, max: 20 };
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

export function CalendarWeatherManager({
  open,
  onOpenChange,
  calendar,
  onConfirm,
}: CalendarWeatherManagerProps) {
  const [daysToGenerate, setDaysToGenerate] = useState(30);
  const [startingDay, setStartingDay] = useState(calendar.current_day);
  const [startingMonth, setStartingMonth] = useState(calendar.current_month);
  const [startingYear, setStartingYear] = useState(calendar.current_year);

  const monthNames = calendar.custom_month_names && calendar.custom_month_names.length > 0
    ? calendar.custom_month_names
    : DEFAULT_MONTH_NAMES;

  const generateWeather = () => {
    const weatherData: Record<string, any> = { ...(calendar.weather || {}) };
    const DAYS_PER_MONTH = 30;

    let currentDay = startingDay;
    let currentMonth = startingMonth;
    let currentYear = startingYear;
    
    let currentWeatherType: string | null = null;
    let currentWeatherDuration = 0;
    let currentSeason: string | null = null;

    for (let i = 0; i < daysToGenerate; i++) {
      const dateKey = `${currentYear}-${currentMonth}-${currentDay}`;
      const season = getSeasonFromMonth(currentMonth, calendar.custom_season_months);
      
      // Check if we need new weather (duration expired or season changed)
      if (
        currentWeatherDuration <= 0 ||
        currentWeatherType === null ||
        currentSeason !== season
      ) {
        // Generate new weather type based on season using weighted system
        currentWeatherType = getRandomWeatherForSeason(season);
        currentSeason = season;
        
        // Determine how long this weather will last
        const durationRange = WEATHER_DURATIONS[currentWeatherType] || { min: 1, max: 3 };
        currentWeatherDuration = Math.floor(
          Math.random() * (durationRange.max - durationRange.min + 1) + durationRange.min
        );
      }
      
      const temperature = getTemperatureForSeason(season);

      weatherData[dateKey] = {
        type: currentWeatherType,
        temperature: temperature,
        description: "",
      };

      currentWeatherDuration--;
      currentDay++;
      if (currentDay > DAYS_PER_MONTH) {
        currentDay = 1;
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      }
    }

    return weatherData;
  };

  const handleGenerate = async () => {
    const weatherData = generateWeather();
    await onConfirm(weatherData);
    onOpenChange(false);
    toast.success(`Generated weather for ${daysToGenerate} days`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Auto-Generate Weather</DialogTitle>
          <DialogDescription>
            Generate random weather based on seasons for a range of days.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Starting Date</label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Day</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={startingDay}
                  onChange={(e) => setStartingDay(parseInt(e.target.value) || 1)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Month</label>
                <Select
                  value={startingMonth.toString()}
                  onValueChange={(value) => setStartingMonth(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((monthName, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>
                        {monthName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Year</label>
                <input
                  type="number"
                  min="1"
                  value={startingYear}
                  onChange={(e) => setStartingYear(parseInt(e.target.value) || 1)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Days to Generate</label>
            <input
              type="number"
              min="1"
              max="365"
              value={daysToGenerate}
              onChange={(e) => setDaysToGenerate(parseInt(e.target.value) || 30)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Weather will be generated based on the season of each month.
            </p>
          </div>

          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-xs font-medium mb-2">Weather Types by Season:</p>
            <div className="text-xs space-y-1">
              <div>Spring: Clear, Partly Cloudy, Cloudy, Rainy, Windy</div>
              <div>Summer: Clear, Partly Cloudy, Cloudy, Stormy, Windy</div>
              <div>Autumn: Clear, Partly Cloudy, Cloudy, Rainy, Foggy</div>
              <div>Winter: Cloudy, Rainy, Snowy, Foggy, Windy</div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate}>Generate Weather</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

