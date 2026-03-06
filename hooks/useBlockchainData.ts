"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getBlockchainData, type BlockchainData } from "@/lib/blockchain";

const POLL_INTERVAL = 10_000; // 10 seconds

export function useBlockchainData() {
  const [data, setData] = useState<BlockchainData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await getBlockchainData();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  return { data, error };
}
