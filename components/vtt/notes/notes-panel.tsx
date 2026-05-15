"use client";

import { useEffect, useMemo, useState } from "react";
import { useVttNotes, type Note, type NoteVisibility } from "@/hooks/useVttNotes";
import { useCampaignCalendarLive } from "@/hooks/useCampaignCalendarLive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Save,
  Lock,
  User,
  Users,
  Eye,
  Calendar as CalendarIcon,
  CalendarOff,
} from "lucide-react";

const DEFAULT_MONTHS = [
  "First-Month",
  "Second-Month",
  "Third-Month",
  "Fourth-Month",
  "Fifth-Month",
  "Sixth-Month",
  "Seventh-Month",
  "Eighth-Month",
  "Ninth-Month",
  "Tenth-Month",
  "Eleventh-Month",
  "Twelfth-Month",
];

function isDated(n: Note): boolean {
  return (
    n.in_world_year != null &&
    n.in_world_month != null &&
    n.in_world_day != null
  );
}

function dateKey(n: Note): number {
  if (!isDated(n)) return -Infinity;
  return (
    (n.in_world_year as number) * 10000 +
    (n.in_world_month as number) * 100 +
    (n.in_world_day as number)
  );
}

function formatInWorldDate(n: Note, monthNames: string[]): string {
  if (!isDated(n)) return "";
  const m =
    monthNames[
      ((n.in_world_month as number) - 1 + monthNames.length) % monthNames.length
    ];
  return `${n.in_world_day} ${m} ${n.in_world_year}`;
}

interface Props {
  campaignId: string | null;
  userId: string | null;
  isDm: boolean;
}

const VISIBILITY_TABS: Array<{
  id: NoteVisibility;
  label: string;
  icon: typeof Lock;
  hint: string;
}> = [
  { id: "owner", label: "Mine", icon: User, hint: "Private to you" },
  { id: "shared", label: "Shared", icon: Users, hint: "Visible to everyone in the campaign" },
  { id: "dm", label: "DM", icon: Lock, hint: "DM-only scratchpad" },
];

export function NotesPanel({ campaignId, userId, isDm }: Props) {
  const { notes, createNote, updateNote, deleteNote } = useVttNotes(campaignId);
  const { calendar } = useCampaignCalendarLive(campaignId);
  const monthNames = useMemo(
    () =>
      calendar?.custom_month_names && calendar.custom_month_names.length > 0
        ? calendar.custom_month_names
        : DEFAULT_MONTHS,
    [calendar]
  );
  const [tab, setTab] = useState<NoteVisibility>("owner");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [dirty, setDirty] = useState(false);

  const tabs = useMemo(
    () => (isDm ? VISIBILITY_TABS : VISIBILITY_TABS.filter((t) => t.id !== "dm")),
    [isDm]
  );

  const filtered = useMemo(() => {
    const list = notes.filter((n) => n.visibility === tab);
    // Dated entries first (newest in-world date), then undated ones by
    // updated_at — the dated rows feel like a journal log; the undated
    // rows are quick reference notes.
    return list.sort((a, b) => {
      const aDated = isDated(a);
      const bDated = isDated(b);
      if (aDated && bDated) return dateKey(b) - dateKey(a);
      if (aDated) return -1;
      if (bDated) return 1;
      return b.updated_at.localeCompare(a.updated_at);
    });
  }, [notes, tab]);

  const selected = useMemo(
    () => filtered.find((n) => n.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  // Pull selected note's content into the editor when selection changes.
  useEffect(() => {
    if (selected) {
      setDraftTitle(selected.title);
      setDraftBody(selected.body);
      setDirty(false);
    } else {
      setDraftTitle("");
      setDraftBody("");
      setDirty(false);
    }
  }, [selected]);

  // Auto-default to first note in the tab whenever tab changes.
  useEffect(() => {
    setSelectedId((cur) => {
      if (cur && filtered.some((n) => n.id === cur)) return cur;
      return filtered[0]?.id ?? null;
    });
  }, [filtered]);

  const handleCreate = async () => {
    if (!userId) return;
    const created = await createNote({
      visibility: tab,
      title: "Untitled",
      body: "",
      authorUserId: userId,
    });
    if (created) setSelectedId(created.id);
  };

  /** Toggle the in-world date stamp on the selected note. Stamps with
   *  the current calendar date when adding; clears all three columns
   *  when removing. */
  const handleToggleDate = async () => {
    if (!selected || !calendar) return;
    if (isDated(selected)) {
      await updateNote(selected.id, {
        in_world_year: null,
        in_world_month: null,
        in_world_day: null,
      });
    } else {
      await updateNote(selected.id, {
        in_world_year: calendar.current_year,
        in_world_month: calendar.current_month,
        in_world_day: calendar.current_day,
      });
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    await updateNote(selected.id, { title: draftTitle, body: draftBody });
    setDirty(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await deleteNote(id);
    if (selectedId === id) setSelectedId(null);
  };

  // Auto-save on body/title change after a debounce.
  useEffect(() => {
    if (!selected || !dirty) return;
    const t = window.setTimeout(() => {
      void updateNote(selected.id, { title: draftTitle, body: draftBody });
      setDirty(false);
    }, 700);
    return () => window.clearTimeout(t);
  }, [dirty, draftTitle, draftBody, selected, updateNote]);

  const isAuthor = selected?.author_user_id === userId;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-card">
      {/* Visibility tabs */}
      <div className="flex border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              title={t.hint}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium transition-colors",
                active
                  ? "text-amber-400 border-b-2 border-amber-400 -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Note list */}
        <div className="w-32 shrink-0 border-r border-border flex flex-col">
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center justify-center gap-1 px-2 py-2 text-xs text-amber-400 hover:bg-amber-500/10 border-b border-border"
            title="New note — toggle the calendar icon in the editor to date it"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-[10px] text-muted-foreground text-center">
                No notes yet.
              </p>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setSelectedId(n.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 border-b border-border/40 hover:bg-muted/40 transition-colors",
                    selectedId === n.id && "bg-amber-500/10"
                  )}
                  title={n.title || "Untitled"}
                >
                  <div className="flex items-center gap-1">
                    {isDated(n) && (
                      <CalendarIcon className="h-3 w-3 text-amber-400 shrink-0" />
                    )}
                    <p className="truncate text-xs font-medium">
                      {n.title || "Untitled"}
                    </p>
                  </div>
                  <p className="truncate text-[9px] text-muted-foreground mt-0.5">
                    {isDated(n)
                      ? formatInWorldDate(n, monthNames)
                      : relativeTime(n.updated_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 flex flex-col">
          {selected ? (
            <>
              <div className="flex items-center gap-2 border-b border-border px-2 py-1">
                <Input
                  value={draftTitle}
                  onChange={(e) => {
                    setDraftTitle(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="Untitled"
                  disabled={!isAuthor}
                  className="h-7 text-sm border-none focus-visible:ring-0 bg-transparent"
                />
                {!isAuthor && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                    title="Read-only — only the author can edit"
                  >
                    <Eye className="h-3 w-3" />
                    Read-only
                  </span>
                )}
                {/* Date chip — visible when the note is dated; clicking
                    on it (DM/author only) clears the stamp. Always
                    visible to readers as context. */}
                {isDated(selected) && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] text-amber-400/90 tabular-nums"
                    title="In-world date"
                  >
                    <CalendarIcon className="h-3 w-3" />
                    {formatInWorldDate(selected, monthNames)}
                  </span>
                )}
                {isAuthor && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-muted-foreground hover:text-amber-400"
                      onClick={handleToggleDate}
                      disabled={!calendar}
                      title={
                        isDated(selected)
                          ? "Remove in-world date"
                          : "Stamp with current in-world date"
                      }
                    >
                      {isDated(selected) ? (
                        <CalendarOff className="h-3.5 w-3.5" />
                      ) : (
                        <CalendarIcon className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {dirty && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 text-amber-400"
                        onClick={handleSave}
                        title="Save now (auto-saves anyway)"
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-rose-400 hover:text-rose-300"
                      onClick={() => handleDelete(selected.id)}
                      title="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
              <textarea
                value={draftBody}
                onChange={(e) => {
                  setDraftBody(e.target.value);
                  setDirty(true);
                }}
                disabled={!isAuthor}
                placeholder="Type your note…"
                className="flex-1 min-h-0 resize-none bg-transparent border-none px-3 py-2 text-sm leading-relaxed focus:outline-none disabled:cursor-not-allowed"
              />
              {dirty && isAuthor && (
                <div className="border-t border-border px-3 py-1 text-[9px] text-muted-foreground">
                  Unsaved changes — auto-saves shortly
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
              {filtered.length === 0
                ? `No ${tab === "owner" ? "personal" : tab === "shared" ? "shared" : "DM"} notes yet — click New to start.`
                : "Pick a note from the list."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - d) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}
