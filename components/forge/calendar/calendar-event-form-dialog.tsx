"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarEvent, CampaignCalendar } from "@/hooks/useForgeContent";

interface CalendarEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  calendar: CampaignCalendar;
  initialYear: number;
  initialMonth: number;
  initialDay: number;
  onSave: (eventData: {
    title: string;
    description: string | null;
    event_year: number;
    event_month: number;
    event_day: number;
    is_repeatable: boolean;
    repeat_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    repeat_interval: number;
    repeat_end_year: number | null;
    repeat_end_month: number | null;
    repeat_end_day: number | null;
    color: string;
  }) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

const DEFAULT_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function CalendarEventFormDialog({
  open,
  onOpenChange,
  event,
  calendar,
  initialYear,
  initialMonth,
  initialDay,
  onSave,
  onDelete,
}: CalendarEventFormDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventYear, setEventYear] = useState(initialYear.toString());
  const [eventMonth, setEventMonth] = useState(initialMonth.toString());
  const [eventDay, setEventDay] = useState(initialDay.toString());
  const [isRepeatable, setIsRepeatable] = useState(false);
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | null>(null);
  const [repeatInterval, setRepeatInterval] = useState("1");
  const [repeatEndYear, setRepeatEndYear] = useState("");
  const [repeatEndMonth, setRepeatEndMonth] = useState("");
  const [repeatEndDay, setRepeatEndDay] = useState("");
  const [color, setColor] = useState("#c9b882");
  const [saving, setSaving] = useState(false);

  const monthNames = calendar.custom_month_names && calendar.custom_month_names.length > 0
    ? calendar.custom_month_names
    : DEFAULT_MONTH_NAMES;

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setEventYear(event.event_year.toString());
      setEventMonth(event.event_month.toString());
      setEventDay(event.event_day.toString());
      setIsRepeatable(event.is_repeatable);
      setRepeatType(event.repeat_type);
      setRepeatInterval(event.repeat_interval.toString());
      setRepeatEndYear(event.repeat_end_year?.toString() || "");
      setRepeatEndMonth(event.repeat_end_month?.toString() || "");
      setRepeatEndDay(event.repeat_end_day?.toString() || "");
      setColor(event.color);
    } else {
      setTitle("");
      setDescription("");
      setEventYear(initialYear.toString());
      setEventMonth(initialMonth.toString());
      setEventDay(initialDay.toString());
      setIsRepeatable(false);
      setRepeatType(null);
      setRepeatInterval("1");
      setRepeatEndYear("");
      setRepeatEndMonth("");
      setRepeatEndDay("");
      setColor("#c9b882");
    }
  }, [event, initialYear, initialMonth, initialDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        event_year: parseInt(eventYear),
        event_month: parseInt(eventMonth),
        event_day: parseInt(eventDay),
        is_repeatable: isRepeatable,
        repeat_type: isRepeatable ? repeatType : null,
        repeat_interval: isRepeatable ? parseInt(repeatInterval) || 1 : 1,
        repeat_end_year: isRepeatable && repeatEndYear ? parseInt(repeatEndYear) : null,
        repeat_end_month: isRepeatable && repeatEndMonth ? parseInt(repeatEndMonth) : null,
        repeat_end_day: isRepeatable && repeatEndDay ? parseInt(repeatEndDay) : null,
        color,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) return;
    if (confirm("Are you sure you want to delete this event?")) {
      await onDelete(event.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "Create Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={eventMonth} onValueChange={setEventMonth}>
                <SelectTrigger id="month">
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
              <Label htmlFor="day">Day</Label>
              <Input
                id="day"
                type="number"
                value={eventDay}
                onChange={(e) => setEventDay(e.target.value)}
                min="1"
                max="30"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={eventYear}
                onChange={(e) => setEventYear(e.target.value)}
                min="1"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#c9b882"
                className="flex-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="repeatable">Repeatable Event</Label>
            <Switch
              id="repeatable"
              checked={isRepeatable}
              onCheckedChange={setIsRepeatable}
            />
          </div>

          {isRepeatable && (
            <div className="space-y-4 pl-4 border-l-2">
              <div className="space-y-2">
                <Label htmlFor="repeat-type">Repeat Type</Label>
                <Select value={repeatType || ""} onValueChange={(v) => setRepeatType(v as any)}>
                  <SelectTrigger id="repeat-type">
                    <SelectValue placeholder="Select repeat type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repeat-interval">Repeat Every (N)</Label>
                <Input
                  id="repeat-interval"
                  type="number"
                  value={repeatInterval}
                  onChange={(e) => setRepeatInterval(e.target.value)}
                  min="1"
                  placeholder="1"
                />
              </div>

              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={repeatEndMonth} onValueChange={setRepeatEndMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={repeatEndDay}
                    onChange={(e) => setRepeatEndDay(e.target.value)}
                    placeholder="Day"
                    min="1"
                    max="30"
                  />
                  <Input
                    type="number"
                    value={repeatEndYear}
                    onChange={(e) => setRepeatEndYear(e.target.value)}
                    placeholder="Year"
                    min="1"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            {event && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                Delete
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : event ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

