import { OpenSkyResponseSchema, parseAircraft } from "@/types/opensky";
import type { Aircraft } from "@/types/opensky";
import { API, LIMITS } from "@/lib/constants";

interface BBox {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
}

export async function fetchFlights(bbox?: BBox): Promise<Aircraft[]> {
  try {
    const params = new URLSearchParams();
    if (bbox) {
      params.set("lamin", String(bbox.lamin));
      params.set("lomin", String(bbox.lomin));
      params.set("lamax", String(bbox.lamax));
      params.set("lomax", String(bbox.lomax));
    }

    const url = bbox
      ? `${API.OPENSKY_STATES}?${params.toString()}`
      : API.OPENSKY_STATES;

    const headers: Record<string, string> = {};
    const username = import.meta.env.VITE_OPENSKY_USERNAME as
      | string
      | undefined;
    const password = import.meta.env.VITE_OPENSKY_PASSWORD as
      | string
      | undefined;
    if (username && password) {
      headers["Authorization"] =
        "Basic " + btoa(`${username}:${password}`);
    }

    const res = await fetch(url, { headers });
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
  } catch (err) {
    console.warn("OpenSky fetch failed:", err);
    return [];
  }
}
