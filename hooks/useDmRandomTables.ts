"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uniqueChannelTopic } from "@/lib/supabase/realtime-topic";
import { toast } from "sonner";
import type {
  DmRandomTable,
  DmRandomTableEntry,
} from "@/types/dm-random-tables";

/**
 * Realtime subscription + CRUD for DM-authored random tables on a
 * campaign. Loads tables and their entries; everything is filtered
 * server-side by RLS so members see only what they're allowed to.
 *
 * The shape returned from `roll()` is a small bundle: the table that
 * was rolled on plus the array of entries chosen (length =
 * `table.rolls_per_use`). Weighted by `entry.weight`.
 */
export function useDmRandomTables(campaignId: string | null) {
  const [tables, setTables] = useState<DmRandomTable[]>([]);
  const [entriesByTable, setEntriesByTable] = useState<
    Record<string, DmRandomTableEntry[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setTables([]);
      setEntriesByTable({});
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);

    const fetchAll = async () => {
      const [tablesRes, entriesRes] = await Promise.all([
        supabase
          .from("dm_random_tables")
          .select("*")
          .eq("campaign_id", campaignId)
          .order("created_at", { ascending: true }),
        supabase
          .from("dm_random_table_entries")
          .select("*, dm_random_tables!inner(campaign_id)")
          .eq("dm_random_tables.campaign_id", campaignId)
          .order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (tablesRes.error) {
        console.error("Failed to load DM tables:", tablesRes.error);
        setLoading(false);
        return;
      }
      setTables((tablesRes.data ?? []) as unknown as DmRandomTable[]);
      const grouped: Record<string, DmRandomTableEntry[]> = {};
      for (const e of (entriesRes.data ?? []) as unknown as Array<
        DmRandomTableEntry & { dm_random_tables?: unknown }
      >) {
        // Strip the join column before exposing the row.
        const { dm_random_tables: _ignore, ...rest } = e;
        void _ignore;
        (grouped[rest.table_id] ??= []).push(rest as DmRandomTableEntry);
      }
      setEntriesByTable(grouped);
      setLoading(false);
    };
    void fetchAll();

    // Tables channel.
    const tablesChannel = supabase
      .channel(uniqueChannelTopic(`dm_random_tables:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_random_tables",
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as DmRandomTable;
            setTables((prev) =>
              prev.some((t) => t.id === row.id) ? prev : [...prev, row]
            );
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as DmRandomTable;
            setTables((prev) =>
              prev.map((t) => (t.id === row.id ? row : t))
            );
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as DmRandomTable;
            setTables((prev) => prev.filter((t) => t.id !== row.id));
            setEntriesByTable((prev) => {
              const next = { ...prev };
              delete next[row.id];
              return next;
            });
          }
        }
      )
      .subscribe();

    // Entries channel — no filter on table/campaign because RLS does
    // the gate; we just keep `entriesByTable` aligned to whatever rows
    // RLS actually delivers.
    const entriesChannel = supabase
      .channel(uniqueChannelTopic(`dm_random_table_entries:${campaignId}`))
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dm_random_table_entries",
        },
        (payload) => {
          if (cancelled) return;
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as DmRandomTableEntry;
            setEntriesByTable((prev) => {
              const list = prev[row.table_id] ?? [];
              if (list.some((e) => e.id === row.id)) return prev;
              return { ...prev, [row.table_id]: [...list, row] };
            });
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as DmRandomTableEntry;
            setEntriesByTable((prev) => ({
              ...prev,
              [row.table_id]: (prev[row.table_id] ?? []).map((e) =>
                e.id === row.id ? row : e
              ),
            }));
          } else if (payload.eventType === "DELETE") {
            const row = payload.old as unknown as DmRandomTableEntry;
            setEntriesByTable((prev) => ({
              ...prev,
              [row.table_id]: (prev[row.table_id] ?? []).filter(
                (e) => e.id !== row.id
              ),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(entriesChannel);
    };
  }, [campaignId]);

  // ─── Mutations ──────────────────────────────────────────────────────

  const createTable = useCallback(
    async (input: {
      name: string;
      description?: string | null;
      category?: string | null;
      rolls_per_use?: number;
    }): Promise<DmRandomTable | null> => {
      if (!campaignId) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("dm_random_tables")
        .insert({
          campaign_id: campaignId,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
          rolls_per_use: input.rolls_per_use ?? 1,
          created_by: user.id,
        } as never)
        .select("*")
        .single();
      if (error) {
        console.error("Failed to create DM table:", error);
        toast.error("Couldn't create table");
        return null;
      }
      return data as unknown as DmRandomTable;
    },
    [campaignId]
  );

  const updateTable = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          DmRandomTable,
          "name" | "description" | "category" | "rolls_per_use"
        >
      >
    ) => {
      const supabase = createClient();
      setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      const { error } = await supabase
        .from("dm_random_tables")
        .update(patch as never)
        .eq("id", id);
      if (error) {
        console.error("Failed to update DM table:", error);
        toast.error("Couldn't save table");
      }
    },
    []
  );

  const deleteTable = useCallback(async (id: string) => {
    const supabase = createClient();
    setTables((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase
      .from("dm_random_tables")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Failed to delete DM table:", error);
      toast.error("Couldn't delete table");
    }
  }, []);

  const addEntry = useCallback(
    async (
      tableId: string,
      input: { value: string; weight?: number; metadata?: Record<string, unknown> }
    ): Promise<DmRandomTableEntry | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("dm_random_table_entries")
        .insert({
          table_id: tableId,
          value: input.value,
          weight: input.weight ?? 1,
          metadata: input.metadata ?? {},
        } as never)
        .select("*")
        .single();
      if (error) {
        console.error("Failed to add entry:", error);
        toast.error("Couldn't add entry");
        return null;
      }
      return data as unknown as DmRandomTableEntry;
    },
    []
  );

  const updateEntry = useCallback(
    async (
      id: string,
      patch: Partial<Pick<DmRandomTableEntry, "value" | "weight" | "metadata">>
    ) => {
      const supabase = createClient();
      setEntriesByTable((prev) => {
        const next: typeof prev = {};
        for (const [tid, list] of Object.entries(prev)) {
          next[tid] = list.map((e) => (e.id === id ? { ...e, ...patch } : e));
        }
        return next;
      });
      const { error } = await supabase
        .from("dm_random_table_entries")
        .update(patch as never)
        .eq("id", id);
      if (error) {
        console.error("Failed to update entry:", error);
        toast.error("Couldn't save entry");
      }
    },
    []
  );

  const deleteEntry = useCallback(async (id: string) => {
    const supabase = createClient();
    setEntriesByTable((prev) => {
      const next: typeof prev = {};
      for (const [tid, list] of Object.entries(prev)) {
        next[tid] = list.filter((e) => e.id !== id);
      }
      return next;
    });
    const { error } = await supabase
      .from("dm_random_table_entries")
      .delete()
      .eq("id", id);
    if (error) {
      console.error("Failed to delete entry:", error);
      toast.error("Couldn't delete entry");
    }
  }, []);

  // ─── Roll ───────────────────────────────────────────────────────────

  /**
   * Pick `count` weighted entries from a table — WITHOUT replacement
   * within the same roll, so "roll 5 items" on a shop table never
   * returns the same row twice (no double Dice Set in a single
   * draw). If `count` exceeds the number of unique entries, the
   * remainder is sampled with replacement from the full pool again.
   * Returns null if the table has no entries.
   */
  const roll = useCallback(
    (tableId: string, count?: number): DmRandomTableEntry[] | null => {
      const entries = entriesByTable[tableId] ?? [];
      if (entries.length === 0) return null;
      const table = tables.find((t) => t.id === tableId);
      const n = Math.max(1, count ?? table?.rolls_per_use ?? 1);
      const chosen: DmRandomTableEntry[] = [];
      let pool = [...entries];
      for (let i = 0; i < n; i++) {
        if (pool.length === 0) pool = [...entries]; // ran out, restart
        const totalWeight = pool.reduce((s, e) => s + e.weight, 0);
        let pick = Math.random() * totalWeight;
        let idx = pool.length - 1;
        for (let j = 0; j < pool.length; j++) {
          pick -= pool[j].weight;
          if (pick <= 0) {
            idx = j;
            break;
          }
        }
        chosen.push(pool[idx]);
        pool.splice(idx, 1);
      }
      return chosen;
    },
    [entriesByTable, tables]
  );

  /**
   * Create a fresh editable copy of a table — name, description,
   * category, rolls_per_use, and all entries (value / weight /
   * metadata). Works for both DB-backed tables and built-in tables
   * since both expose the same input shape.
   *
   * The new table gets a "(copy)" suffix so the user can find it.
   * Returns the new table on success, or null on failure.
   */
  const cloneAsTemplate = useCallback(
    async (input: {
      name: string;
      description?: string | null;
      category?: string | null;
      rolls_per_use?: number;
      entries: ReadonlyArray<{
        value: string;
        weight: number;
        metadata?: Record<string, unknown>;
      }>;
    }) => {
      const t = await createTable({
        name: `${input.name} (copy)`,
        description: input.description ?? null,
        category: input.category ?? null,
        rolls_per_use: input.rolls_per_use ?? 1,
      });
      if (!t) return null;
      // Insert entries serially so weight order is preserved.
      for (const e of input.entries) {
        await addEntry(t.id, {
          value: e.value,
          weight: e.weight,
          metadata: e.metadata ?? {},
        });
      }
      return t;
    },
    [createTable, addEntry]
  );

  return {
    tables,
    entriesByTable,
    loading,
    createTable,
    updateTable,
    deleteTable,
    addEntry,
    updateEntry,
    deleteEntry,
    roll,
    cloneAsTemplate,
  };
}
