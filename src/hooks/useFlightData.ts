import { useState, useEffect, useCallback, useRef } from "react";
import type { Aircraft } from "@/types/opensky";
import { fetchFlights } from "@/feeds/opensky";
import { INTERVALS } from "@/lib/constants";

interface FlightDataState {
  aircraft: Map<string, Aircraft>;
  count: number;
  lastUpdate: number | null;
  loading: boolean;
  error: string | null;
}

export function useFlightData(enabled = true) {
  const [state, setState] = useState<FlightDataState>({
    aircraft: new Map(),
    count: 0,
    lastUpdate: null,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const flights = await fetchFlights();
    const map = new Map<string, Aircraft>();
    for (const a of flights) {
      map.set(a.icao24, a);
    }

    setState({
      aircraft: map,
      count: map.size,
      lastUpdate: Date.now(),
      loading: false,
      error: flights.length === 0 ? "No data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.FLIGHTS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return {
    ...state,
    aircraftList: Array.from(state.aircraft.values()),
    refresh,
  };
}
