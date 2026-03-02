import { useState, useEffect, useCallback, useRef } from "react";
import type { WeatherAlert } from "@/types/nws";
import { fetchWeatherAlerts } from "@/feeds/nws";
import { INTERVALS } from "@/lib/constants";

interface WeatherDataState {
  alerts: WeatherAlert[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useWeatherData(enabled = true) {
  const [state, setState] = useState<WeatherDataState>({
    alerts: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const alerts = await fetchWeatherAlerts();
    setState({
      alerts,
      count: alerts.length,
      loading: false,
      error: null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.WEATHER);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
