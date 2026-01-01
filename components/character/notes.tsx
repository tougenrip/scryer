"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface NotesProps {
  notes: string;
  onNotesChange?: (notes: string) => void;
  editable?: boolean;
}

export function Notes({ notes, onNotesChange, editable = false }: NotesProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent>
        {editable ? (
          <div className="space-y-2">
            <Label htmlFor="notes">Character Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => onNotesChange?.(e.target.value)}
              placeholder="Add notes about your character..."
              className="min-h-32"
            />
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap">
            {notes || <span className="text-muted-foreground">No notes.</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

