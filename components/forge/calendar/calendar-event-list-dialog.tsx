"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarEvent } from "@/hooks/useForgeContent";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { CalendarEventFormDialog } from "./calendar-event-form-dialog";
import { CampaignCalendar } from "@/hooks/useForgeContent";

interface CalendarEventListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  events: CalendarEvent[];
  calendar: CampaignCalendar;
  day: number;
  month: number;
  year: number;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => Promise<void>;
  onAddNew: () => void;
}

export function CalendarEventListDialog({
  open,
  onOpenChange,
  events,
  calendar,
  day,
  month,
  year,
  onEdit,
  onDelete,
  onAddNew,
}: CalendarEventListDialogProps) {
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    setIsDeleting(true);
    try {
      await onDelete(eventId);
    } finally {
      setIsDeleting(false);
      setEventToDelete(null);
    }
  };

  const DEFAULT_MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const monthName = calendar.custom_month_names && calendar.custom_month_names.length > 0
    ? calendar.custom_month_names[month - 1] || DEFAULT_MONTH_NAMES[month - 1] || `Month ${month}`
    : DEFAULT_MONTH_NAMES[month - 1] || `Month ${month}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Events on {monthName} {day}, Year {year}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Events List */}
            {events.length > 0 ? (
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{
                      borderLeftColor: event.color,
                      borderLeftWidth: "4px",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm" style={{ color: event.color }}>
                        {event.title}
                      </div>
                      {event.description && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </div>
                      )}
                      {event.is_repeatable && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Repeats {event.repeat_type}ly
                          {event.repeat_interval > 1 && ` (every ${event.repeat_interval})`}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onEdit(event);
                          onOpenChange(false);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(event.id)}
                        disabled={isDeleting && eventToDelete === event.id}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No events on this day
              </div>
            )}

            {/* Add New Event Button */}
            <Button
              onClick={() => {
                onAddNew();
                onOpenChange(false);
              }}
              className="w-full"
              variant="outline"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

