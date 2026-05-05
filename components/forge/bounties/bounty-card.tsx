"use client";

import { Edit, Trash2, EyeOff } from "lucide-react";
import { Bounty } from "@/hooks/useCampaignContent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BountyCardProps {
  bounty: Bounty;
  isDm: boolean;
  onEdit?: (bounty: Bounty) => void;
  onDelete?: (bountyId: string) => void;
  onStatusChange?: (bountyId: string, status: "available" | "claimed" | "completed") => void;
}

const parchment = "#d6a85a";

export function BountyCard({ bounty, isDm, onEdit, onDelete, onStatusChange }: BountyCardProps) {
  const closed = bounty.status === "completed";

  return (
    <div
      className="sc-card relative flex h-full flex-col overflow-hidden"
      style={{
        background: `color-mix(in srgb, ${parchment} 6%, var(--card))`,
        borderColor: `color-mix(in srgb, ${parchment} 25%, var(--border))`,
        opacity: closed ? 0.55 : 1,
        padding: 16,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -6,
          left: 10,
          right: 10,
          height: 12,
          borderTop: `2px dashed color-mix(in srgb, ${parchment} 40%, transparent)`,
        }}
      />

      <div className="mb-2.5 text-center">
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: 11,
            letterSpacing: "0.3em",
            color: parchment,
          }}
        >
          WANTED
        </div>
        <div
          className="font-serif"
          style={{
            fontSize: 13,
            letterSpacing: "0.15em",
            color: "var(--muted-foreground)",
          }}
        >
          — {bounty.status === "available" ? "ALIVE PREFERRED" : bounty.status.toUpperCase()} —
        </div>
      </div>

      <div
        style={{
          height: 80,
          marginBottom: 10,
          borderRadius: 6,
          background: `repeating-linear-gradient(135deg, color-mix(in srgb, var(--foreground) 7%, transparent) 0 8px, transparent 8px 16px)`,
          border: "1px solid var(--border)",
          display: "grid",
          placeItems: "center",
          fontSize: 10,
          color: "var(--muted-foreground)",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        portrait
      </div>

      <div className="font-serif text-center text-base mb-1.5 leading-tight">{bounty.target_name}</div>
      {bounty.title && (
        <div className="text-center text-[11px] text-muted-foreground mb-1 line-clamp-2">{bounty.title}</div>
      )}

      {bounty.description && (
        <p
          className="mb-3 text-center text-[11px] leading-relaxed text-muted-foreground line-clamp-4"
          style={{ minHeight: 0 }}
        >
          {bounty.description}
        </p>
      )}

      <div
        className="mt-auto flex items-center justify-between gap-2 border-t border-dashed pt-2.5"
        style={{ borderColor: `color-mix(in srgb, ${parchment} 30%, transparent)` }}
      >
        <span className="text-[10px] text-muted-foreground">
          {bounty.posted_by ? `Posted by ${bounty.posted_by}` : "—"}
        </span>
        {bounty.reward && (
          <span className="font-serif text-sm" style={{ color: parchment }}>
            {bounty.reward}
          </span>
        )}
      </div>

      {isDm && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
          <div className="flex items-center gap-1">
            {bounty.hidden_from_players && (
              <EyeOff className="h-3.5 w-3.5 text-amber-600" title="Hidden from players" />
            )}
            {onStatusChange && (
              <Select
                value={bounty.status}
                onValueChange={(value: "available" | "claimed" | "completed") => {
                  onStatusChange(bounty.id, value);
                }}
              >
                <SelectTrigger className="sc-input h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="claimed">Claimed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <button
                type="button"
                className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon"
                onClick={() => onEdit(bounty)}
                aria-label="Edit bounty"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon"
                style={{ color: "var(--destructive)" }}
                onClick={() => onDelete(bounty.id)}
                aria-label="Delete bounty"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
