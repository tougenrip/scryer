"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { RolledLoot, RolledItem, RolledCoins } from "@/lib/loot/roll-loot";

export interface CustomLootTable {
  id: string;
  campaign_id: string;
  name: string;
  description: string | null;
  rolls_per_use: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CustomLootTableEntry {
  id: string;
  table_id: string;
  weight: number;
  label: string | null;
  item_source: "srd" | "homebrew" | null;
  item_kind: "equipment" | "magic" | null;
  item_index: string | null;
  item_name: string | null;
  item_rarity: string | null;
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
  created_at: string;
}

export function useCustomLootTables(campaignId: string | null) {
  const [tables, setTables] = useState<CustomLootTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) {
      setTables([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    const fetchAll = async () => {
      const { data } = await supabase
        .from("custom_loot_tables")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("name", { ascending: true });
      if (cancelled) return;
      setTables((data ?? []) as CustomLootTable[]);
      setLoading(false);
    };
    void fetchAll();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  const refetch = useCallback(async () => {
    if (!campaignId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("custom_loot_tables")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("name", { ascending: true });
    setTables((data ?? []) as CustomLootTable[]);
  }, [campaignId]);

  const createTable = useCallback(
    async (input: { name: string; description?: string; rolls_per_use?: number }) => {
      if (!campaignId) return null;
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("custom_loot_tables")
        .insert({
          campaign_id: campaignId,
          name: input.name,
          description: input.description ?? null,
          rolls_per_use: input.rolls_per_use ?? 1,
          created_by: user.id,
        } as never)
        .select("*")
        .single();
      if (error) {
        toast.error("Couldn't create loot table");
        return null;
      }
      const row = data as CustomLootTable;
      setTables((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
      return row;
    },
    [campaignId]
  );

  const updateTable = useCallback(
    async (id: string, updates: Partial<Pick<CustomLootTable, "name" | "description" | "rolls_per_use">>) => {
      const supabase = createClient();
      setTables((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      const { error } = await supabase
        .from("custom_loot_tables")
        .update(updates as never)
        .eq("id", id);
      if (error) {
        toast.error("Couldn't update table");
      }
    },
    []
  );

  const deleteTable = useCallback(async (id: string) => {
    const supabase = createClient();
    setTables((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase
      .from("custom_loot_tables")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Couldn't delete table");
      void refetch();
    }
  }, [refetch]);

  return { tables, loading, createTable, updateTable, deleteTable, refetch };
}

/** Fetch all entries for a single table. Used by the editor + by the roller. */
export async function fetchEntries(
  tableId: string
): Promise<CustomLootTableEntry[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("custom_loot_table_entries")
    .select("*")
    .eq("table_id", tableId)
    .order("created_at", { ascending: true });
  return (data ?? []) as CustomLootTableEntry[];
}

export async function insertEntry(entry: Omit<CustomLootTableEntry, "id" | "created_at">) {
  const supabase = createClient();
  const { error } = await supabase
    .from("custom_loot_table_entries")
    .insert(entry as never);
  if (error) toast.error("Couldn't add row");
}

export async function deleteEntry(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("custom_loot_table_entries")
    .delete()
    .eq("id", id);
  if (error) toast.error("Couldn't delete row");
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Roll on a custom table. Picks `rolls_per_use` rows with weighted random
 * selection (with replacement) and merges their item/coin payloads into a
 * RolledLoot the End-with-Loot dialog can ingest directly.
 */
export async function rollCustomTable(
  table: CustomLootTable
): Promise<RolledLoot> {
  const entries = await fetchEntries(table.id);
  if (entries.length === 0) {
    return {
      coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      items: [],
      trace: { tier: "0-4", individualPercentiles: [], hoardPercentile: 0 },
    };
  }
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  const coins: RolledCoins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const items: RolledItem[] = [];
  for (let i = 0; i < table.rolls_per_use; i++) {
    let r = Math.random() * totalWeight;
    let pick = entries[0];
    for (const e of entries) {
      r -= e.weight;
      if (r <= 0) {
        pick = e;
        break;
      }
    }
    coins.cp += pick.cp;
    coins.sp += pick.sp;
    coins.ep += pick.ep;
    coins.gp += pick.gp;
    coins.pp += pick.pp;
    if (pick.item_index && pick.item_kind && pick.item_source && pick.item_name) {
      items.push({
        uid: uid(),
        source: pick.item_source as "srd",
        kind: pick.item_kind,
        index: pick.item_index,
        name: pick.item_name,
        rarity: pick.item_rarity,
      });
    }
  }
  return {
    coins,
    items,
    trace: { tier: "0-4", individualPercentiles: [], hoardPercentile: 0 },
  };
}
