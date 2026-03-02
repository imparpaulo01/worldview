import { OpenSkyResponseSchema, parseAircraft } from "@/types/opensky";
import type { Aircraft } from "@/types/opensky";
import { API, LIMITS } from "@/lib/constants";

/** OpenSky fallback — only used when adsb.lol is unreachable */
export async function fetchOpenSkyFlights(): Promise<Aircraft[]> {
  try {
    const headers: Record<string, string> = {};
    const username = import.meta.env.VITE_OPENSKY_USERNAME as string | undefined;
    const password = import.meta.env.VITE_OPENSKY_PASSWORD as string | undefined;
    if (username && password) {
      headers["Authorization"] = "Basic " + btoa(`${username}:${password}`);
    }

    const res = await fetch(API.OPENSKY_STATES, { headers });
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = OpenSkyResponseSchema.safeParse(json);
    if (!parsed.success || !parsed.data.states) return [];

    const aircraft: Aircraft[] = [];
    for (const state of parsed.data.states) {
      if (aircraft.length >= LIMITS.MAX_FLIGHTS) break;
      const a = parseAircraft(state);
      if (a && !a.onGround) aircraft.push(a);
    }
    return aircraft;
  } catch {
    return [];
  }
}
