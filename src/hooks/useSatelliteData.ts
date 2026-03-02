import { useState, useEffect, useCallback, useRef } from "react";
import * as satellite from "satellite.js";
import type { Satellite } from "@/types/celestrak";
import { fetchTLEData } from "@/feeds/celestrak";
import type { TLERecord } from "@/feeds/celestrak";
import { radToDeg } from "@/lib/utils";
import { INTERVALS } from "@/lib/constants";

interface SatelliteDataState {
  satellites: Satellite[];
  count: number;
  loading: boolean;
  error: string | null;
}

function propagateSatellite(
  tle: TLERecord,
  date: Date,
): Satellite | null {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const posVel = satellite.propagate(satrec, date);

    if (typeof posVel.position === "boolean" || !posVel.position)
      return null;

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(posVel.position, gmst);

    const vel = posVel.velocity;
    let speed = 0;
    if (typeof vel !== "boolean" && vel) {
      speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
    }

    // Extract NORAD ID from TLE line 2 (columns 2-6)
    const noradId = parseInt(tle.line2.substring(2, 7).trim(), 10);

    return {
      name: tle.name,
      noradId: isNaN(noradId) ? 0 : noradId,
      longitude: radToDeg(geo.longitude),
      latitude: radToDeg(geo.latitude),
      altitude: geo.height, // km
      velocity: speed, // km/s
      inclination: parseFloat(tle.line2.substring(8, 16).trim()) || 0,
    };
  } catch {
    return null;
  }
}

export function useSatelliteData(enabled = true) {
  const [tleData, setTleData] = useState<TLERecord[]>([]);
  const [state, setState] = useState<SatelliteDataState>({
    satellites: [],
    count: 0,
    loading: false,
    error: null,
  });
  const animRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const loadTLEs = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const data = await fetchTLEData("visual");
    setTleData(data);

    setState((prev) => ({
      ...prev,
      loading: false,
      error: data.length === 0 ? "No satellite data" : null,
    }));
  }, [enabled]);

  // Propagate positions at 1Hz
  useEffect(() => {
    if (!enabled || tleData.length === 0) return;

    const propagate = () => {
      const now = new Date();
      const sats: Satellite[] = [];
      for (const tle of tleData) {
        const sat = propagateSatellite(tle, now);
        if (sat) sats.push(sat);
      }
      setState({
        satellites: sats,
        count: sats.length,
        loading: false,
        error: null,
      });
    };

    propagate();
    animRef.current = setInterval(propagate, INTERVALS.SATELLITES);

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [enabled, tleData]);

  useEffect(() => {
    loadTLEs();
  }, [loadTLEs]);

  return { ...state, refresh: loadTLEs };
}
