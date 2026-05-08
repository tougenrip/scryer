"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";

export type NoteVisibility = "dm" | "owner" | "shared";

export interface Note {
  id: string;
  campaign_id: string;
  author_user_id: string;
  visibility: NoteVisibility;
  title: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export function useVttNotes(campaignId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from("vtt_notes")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        console.error("Failed to load notes:", error);
        setLoading(false);
        return;
      }
      setNotes((data ?? []) as unknown as Note[]);
      setLoading(false);
    };
    void fetchAll();

    const channel = supabase
      .channel(uniqueChannelTopic(`vtt_notes:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vtt_notes",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as Note;
            setNotes((prev) =>
              prev.some((n) => n.id === row.id) ? prev : [row, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as Note;
            setNotes((prev) =>
              prev.map((n) => (n.id === row.id ? row : n))
                .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as { id: string };
            setNotes((prev) => prev.filter((n) => n.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const createNote = useCallback(
    async (input: {
      visibility: NoteVisibility;
      title?: string;
      body?: string;
      authorUserId: string;
    }): Promise<Note | null> => {
      if (!campaignId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vtt_notes")
        .insert({
          campaign_id: campaignId,
          author_user_id: input.authorUserId,
          visibility: input.visibility,
          title: input.title ?? "",
          body: input.body ?? "",
        } as never)
        .select("*")
        .single();
      if (error) {
        console.error("Failed to create note:", error);
        toast.error("Couldn't create note");
        return null;
      }
      return data as unknown as Note;
    },
    [campaignId]
  );

  const updateNote = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Note, "title" | "body" | "visibility">>
    ): Promise<boolean> => {
      const supabase = createClient();
      // Optimistic
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                ...patch,
                updated_at: new Date().toISOString(),
              }
            : n
        )
      );
      const { error } = await supabase
        .from("vtt_notes")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", id);
      if (error) {
        console.error("Failed to update note:", error);
        toast.error("Couldn't save note");
        return false;
      }
      return true;
    },
    []
  );

  const deleteNote = useCallback(async (id: string): Promise<boolean> => {
    const supabase = createClient();
    setNotes((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase.from("vtt_notes").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete note:", error);
      toast.error("Couldn't delete note");
      return false;
    }
    return true;
  }, []);

  return { notes, loading, createNote, updateNote, deleteNote };
}
