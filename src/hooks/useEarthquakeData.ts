import { useState, useEffect, useCallback, useRef } from "react";
import type { Earthquake } from "@/types/usgs";
import { fetchEarthquakes } from "@/feeds/usgs";
import { INTERVALS } from "@/lib/constants";

interface EarthquakeDataState {
  earthquakes: Earthquake[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useEarthquakeData(enabled = true) {
  const [state, setState] = useState<EarthquakeDataState>({
    earthquakes: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const quakes = await fetchEarthquakes();
    setState({
      earthquakes: quakes,
      count: quakes.length,
      loading: false,
      error: quakes.length === 0 ? "No data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.EARTHQUAKES);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
