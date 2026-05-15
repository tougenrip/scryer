"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, X } from "lucide-react";

interface Props {
  isConcentrating: boolean;
  concentratingOn: string | null;
  editable?: boolean;
  onChange?: (next: {
    isConcentrating: boolean;
    concentratingOn: string | null;
  }) => void;
  /** Compact: combat rail badge. Full: editable widget on the sheet. */
  compact?: boolean;
}

/**
 * Concentration tracker — a small purple badge with the spell label.
 * In compact mode it's display-only with a tooltip; in full mode it
 * renders an inline editor (toggle + label input) for the owning
 * player to set / clear concentration.
 */
export function ConcentrationBadge({
  isConcentrating,
  concentratingOn,
  editable = false,
  onChange,
  compact = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(concentratingOn ?? "");

  if (compact) {
    if (!isConcentrating) return null;
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-400/40"
        title={concentratingOn ? `Concentrating on ${concentratingOn}` : "Concentrating"}
      >
        <Sparkles className="h-2.5 w-2.5" />
        {concentratingOn || "Conc."}
      </span>
    );
  }

  // Full / editable.
  const startEdit = () => {
    setDraftLabel(concentratingOn ?? "");
    setEditing(true);
  };

  const save = () => {
    const label = draftLabel.trim();
    onChange?.({
      isConcentrating: true,
      concentratingOn: label.length > 0 ? label : null,
    });
    setEditing(false);
  };

  const drop = () => {
    onChange?.({ isConcentrating: false, concentratingOn: null });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          autoFocus
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="Spell name"
          className="flex-1 h-7 rounded border border-violet-500/40 bg-violet-500/10 px-2 text-xs text-violet-100 placeholder:text-violet-300/40 focus:outline-none focus:border-violet-400"
        />
        <button
          type="button"
          onClick={save}
          className="h-7 px-2 rounded bg-violet-500/30 text-violet-200 text-[11px] font-semibold uppercase tracking-wider hover:bg-violet-500/40"
        >
          Set
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="h-7 w-7 rounded text-neutral-500 hover:text-neutral-300 flex items-center justify-center"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={!editable}
        onClick={isConcentrating ? drop : startEdit}
        className={cn(
          "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wider border transition-colors",
          isConcentrating
            ? "bg-violet-500/20 text-violet-300 border-violet-400/40 hover:bg-violet-500/30"
            : "border-neutral-700 bg-neutral-800/40 text-neutral-400 hover:text-neutral-200",
          !editable && "cursor-default"
        )}
      >
        <Sparkles className="h-3 w-3" />
        {isConcentrating
          ? concentratingOn
            ? `Conc: ${concentratingOn}`
            : "Concentrating"
          : "Concentration"}
        {isConcentrating && editable && (
          <X className="h-3 w-3 ml-0.5 opacity-70" />
        )}
      </button>
      {isConcentrating && editable && (
        <button
          type="button"
          onClick={startEdit}
          className="text-[10px] text-neutral-500 hover:text-neutral-300 underline"
        >
          edit
        </button>
      )}
    </div>
  );
}
