import { useState, useEffect, useCallback, useRef } from "react";
import type { FireHotspot } from "@/types/firms";
import { fetchFires } from "@/feeds/firms";
import { INTERVALS } from "@/lib/constants";

interface FireDataState {
  fires: FireHotspot[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useFireData(enabled = true) {
  const [state, setState] = useState<FireDataState>({
    fires: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const fires = await fetchFires();
    setState({
      fires,
      count: fires.length,
      loading: false,
      error: fires.length === 0 ? "No data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.FIRES);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
