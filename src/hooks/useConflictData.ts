import { useState, useEffect, useCallback, useRef } from "react";
import type { ConflictEvent } from "@/types/gdelt";
import { fetchConflicts } from "@/feeds/conflicts";
import { INTERVALS } from "@/lib/constants";

interface ConflictDataState {
  conflicts: ConflictEvent[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useConflictData(enabled = true) {
  const [state, setState] = useState<ConflictDataState>({
    conflicts: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const conflicts = await fetchConflicts();
    setState({
      conflicts,
      count: conflicts.length,
      loading: false,
      error: conflicts.length === 0 ? "No data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.CONFLICTS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
