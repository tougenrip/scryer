"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon } from "lucide-react";
import { CampaignCalendar } from "@/hooks/useForgeContent";

interface CalendarDatePickerProps {
  calendar: CampaignCalendar;
  onDateSelect: (month: number, year: number) => void;
  currentMonth: number;
  currentYear: number;
}

const DEFAULT_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function CalendarDatePicker({
  calendar,
  onDateSelect,
  currentMonth,
  currentYear,
}: CalendarDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  const monthNames = calendar.custom_month_names && calendar.custom_month_names.length > 0
    ? calendar.custom_month_names
    : DEFAULT_MONTH_NAMES;

  const handleGo = () => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    if (month >= 1 && month <= 12 && year > 0) {
      onDateSelect(month, year);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Go to Date
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Month</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthNames.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Year</label>
            <Input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              min="1"
              placeholder="Year"
            />
          </div>
          <Button onClick={handleGo} className="w-full">
            Go
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

