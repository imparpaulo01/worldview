import { ADSBv2ResponseSchema } from "@/types/adsb";
import type { Aircraft } from "@/types/opensky";
import { API, LIMITS } from "@/lib/constants";

export interface FlightFetchResult {
  aircraft: Aircraft[];
  error: string | null;
}

/** Fetch flights from adsb.lol via our proxy, queried by camera center */
export async function fetchADSBFlights(
  lat: number,
  lon: number,
  radiusNm = 250,
): Promise<FlightFetchResult> {
  try {
    const url = `${API.FLIGHTS}/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radiusNm}`;
    const res = await fetch(url);

    if (!res.ok) {
      return { aircraft: [], error: `HTTP ${res.status}` };
    }

    const json: unknown = await res.json();
    const parsed = ADSBv2ResponseSchema.safeParse(json);
    if (!parsed.success || !parsed.data.ac) {
      return { aircraft: [], error: null };
    }

    const aircraft: Aircraft[] = [];
    for (const ac of parsed.data.ac) {
      if (aircraft.length >= LIMITS.MAX_FLIGHTS) break;
      if (ac.lat == null || ac.lon == null) continue;
      if (ac.alt_baro === "ground") continue;

      aircraft.push({
        icao24: ac.hex,
        callsign: ac.flight?.trim() || ac.hex,
        country: "",
        longitude: ac.lon,
        latitude: ac.lat,
        altitude: (typeof ac.alt_baro === "number" ? ac.alt_baro : ac.alt_geom ?? 0) * 0.3048, // ft -> m
        velocity: (ac.gs ?? 0) * 0.514444, // knots -> m/s
        heading: ac.track ?? ac.true_heading ?? 0,
        verticalRate: (ac.baro_rate ?? 0) * 0.00508, // ft/min -> m/s
        onGround: false, // ground aircraft filtered above
      });
    }

    return { aircraft, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { aircraft: [], error: msg };
  }
}
