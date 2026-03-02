import { useState, useEffect, useCallback, useRef } from "react";
import * as satellite from "satellite.js";
import type { GPElement, Satellite } from "@/types/celestrak";
import { fetchTLEData } from "@/feeds/celestrak";
import { radToDeg } from "@/lib/utils";
import { INTERVALS } from "@/lib/constants";

interface SatelliteDataState {
  satellites: Satellite[];
  count: number;
  loading: boolean;
  error: string | null;
}

function gpToTLE(gp: GPElement): { line1: string; line2: string } | null {
  try {
    const epoch = new Date(gp.EPOCH);
    const year = epoch.getUTCFullYear() % 100;
    const start = new Date(Date.UTC(epoch.getUTCFullYear(), 0, 1));
    const dayOfYear =
      (epoch.getTime() - start.getTime()) / 86400000 + 1;

    const noradStr = String(gp.NORAD_CAT_ID).padStart(5, "0");
    const classif = gp.CLASSIFICATION_TYPE || "U";
    const intlDesig = gp.OBJECT_ID.padEnd(8);
    const epochStr = `${String(year).padStart(2, "0")}${dayOfYear.toFixed(8).padStart(12, "0")}`;
    const meanMotionDot =
      gp.MEAN_MOTION_DOT >= 0
        ? ` .${Math.abs(gp.MEAN_MOTION_DOT).toExponential(4).replace("e", "").replace(".", "").replace("+", "").replace("-", "-")}`.slice(0, 10)
        : `-.${Math.abs(gp.MEAN_MOTION_DOT).toExponential(4).replace("e", "").replace(".", "").replace("+", "").replace("-", "-")}`.slice(0, 10);

    const line1 = `1 ${noradStr}${classif} ${intlDesig} ${epochStr} ${meanMotionDot}  00000-0  00000-0 0  999`;
    const line2 = `2 ${noradStr} ${gp.INCLINATION.toFixed(4).padStart(8)} ${gp.RA_OF_ASC_NODE.toFixed(4).padStart(8)} ${String(gp.ECCENTRICITY).replace("0.", "").padEnd(7, "0").slice(0, 7)} ${gp.ARG_OF_PERICENTER.toFixed(4).padStart(8)} ${gp.MEAN_ANOMALY.toFixed(4).padStart(8)} ${gp.MEAN_MOTION.toFixed(8).padStart(11)}${String(gp.REV_AT_EPOCH).padStart(5)}`;

    return { line1, line2 };
  } catch {
    return null;
  }
}

function propagateSatellite(
  gp: GPElement,
  date: Date,
): Satellite | null {
  try {
    const tle = gpToTLE(gp);
    if (!tle) return null;

    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    const positionAndVelocity = satellite.propagate(satrec, date);

    if (
      typeof positionAndVelocity.position === "boolean" ||
      !positionAndVelocity.position
    )
      return null;

    const gmst = satellite.gstime(date);
    const geo = satellite.eciToGeodetic(
      positionAndVelocity.position,
      gmst,
    );

    const vel = positionAndVelocity.velocity;
    let speed = 0;
    if (typeof vel !== "boolean" && vel) {
      speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
    }

    return {
      name: gp.OBJECT_NAME,
      noradId: gp.NORAD_CAT_ID,
      longitude: radToDeg(geo.longitude),
      latitude: radToDeg(geo.latitude),
      altitude: geo.height,
      velocity: speed,
      inclination: gp.INCLINATION,
    };
  } catch {
    return null;
  }
}

export function useSatelliteData(enabled = true) {
  const [gpData, setGpData] = useState<GPElement[]>([]);
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

    const data = await fetchTLEData("stations");
    setGpData(data);

    setState((prev) => ({
      ...prev,
      loading: false,
      error: data.length === 0 ? "No satellite data" : null,
    }));
  }, [enabled]);

  // Propagate positions at 1Hz
  useEffect(() => {
    if (!enabled || gpData.length === 0) return;

    const propagate = () => {
      const now = new Date();
      const sats: Satellite[] = [];
      for (const gp of gpData) {
        const sat = propagateSatellite(gp, now);
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
  }, [enabled, gpData]);

  useEffect(() => {
    loadTLEs();
  }, [loadTLEs]);

  return { ...state, refresh: loadTLEs };
}
