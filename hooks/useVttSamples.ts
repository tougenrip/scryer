import { useEffect, useState } from "react";
import type { VttSampleCatalogResponse } from "@/lib/vtt/sample-catalog";

export function useVttSamples() {
  const [data, setData] = useState<VttSampleCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchSamples() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/vtt/samples");
        if (!res.ok) {
          throw new Error("Failed to load VTT samples");
        }
        const json = await res.json();
        if (mounted) {
          setData(json);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    fetchSamples();
    return () => {
      mounted = false;
    };
  }, []);

  return { data, isLoading, error };
}
