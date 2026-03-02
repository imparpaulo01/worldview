import { useState, useEffect, useCallback, useRef } from "react";
import type { Aircraft } from "@/types/opensky";
import { fetchADSBFlights } from "@/feeds/adsb";
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
  const cameraRef = useRef({ lat: 38.7223, lon: -9.1393 });

  /** Update camera center for location-based queries */
  const updateCamera = useCallback((lat: number, lon: number) => {
    cameraRef.current = { lat, lon };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const { lat, lon } = cameraRef.current;
    const result = await fetchADSBFlights(lat, lon);

    const map = new Map<string, Aircraft>();
    for (const a of result.aircraft) {
      map.set(a.icao24, a);
    }

    setState({
      aircraft: map,
      count: map.size,
      lastUpdate: Date.now(),
      loading: false,
      error: result.error,
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
    updateCamera,
  };
}
