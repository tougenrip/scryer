import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type SrdMonster = {
  id: string;
  index: string;
  name: string;
  challenge_rating: number | null;
  size: string | null;
  type: string | null;
  image_urls: string[] | null;
};

export function useSrdMonsters() {
  const [monsters, setMonsters] = useState<SrdMonster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchMonsters() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("srd_monsters")
        .select("id, index, name, challenge_rating, size, type, image_urls")
        .order("name");

      if (error) {
        console.error("Failed to fetch srd_monsters:", error);
      } else if (mounted && data) {
        setMonsters(data);
      }
      if (mounted) setLoading(false);
    }
    fetchMonsters();
    return () => {
      mounted = false;
    };
  }, []);

  return { monsters, loading };
}
