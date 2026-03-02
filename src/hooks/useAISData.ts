import { useState, useEffect, useCallback, useRef } from "react";
import type { Vessel } from "@/types/ais";
import { fetchVessels } from "@/feeds/ais";
import { INTERVALS } from "@/lib/constants";

interface AISDataState {
  vessels: Vessel[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useAISData(enabled = true) {
  const [state, setState] = useState<AISDataState>({
    vessels: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const vessels = await fetchVessels();
    setState({
      vessels,
      count: vessels.length,
      loading: false,
      error: vessels.length === 0 ? "No AIS data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.AIS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
