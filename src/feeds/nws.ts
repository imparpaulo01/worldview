import { NWSResponseSchema } from "@/types/nws";
import type { WeatherAlert } from "@/types/nws";
import { API } from "@/lib/constants";

/** US state/territory/marine zone centroids for UGC fallback */
const UGC_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  AL: { lat: 32.8, lon: -86.8 }, AK: { lat: 64.2, lon: -152.5 },
  AZ: { lat: 34.3, lon: -111.7 }, AR: { lat: 34.8, lon: -92.2 },
  CA: { lat: 37.2, lon: -119.5 }, CO: { lat: 39.0, lon: -105.5 },
  CT: { lat: 41.6, lon: -72.7 }, DE: { lat: 39.0, lon: -75.5 },
  DC: { lat: 38.9, lon: -77.0 }, FL: { lat: 28.6, lon: -82.5 },
  GA: { lat: 33.0, lon: -83.5 }, HI: { lat: 20.8, lon: -156.3 },
  ID: { lat: 44.4, lon: -114.6 }, IL: { lat: 40.0, lon: -89.2 },
  IN: { lat: 39.8, lon: -86.3 }, IA: { lat: 42.0, lon: -93.5 },
  KS: { lat: 38.5, lon: -98.3 }, KY: { lat: 37.8, lon: -85.3 },
  LA: { lat: 31.0, lon: -92.0 }, ME: { lat: 45.4, lon: -69.2 },
  MD: { lat: 39.0, lon: -76.8 }, MA: { lat: 42.2, lon: -71.8 },
  MI: { lat: 44.3, lon: -84.5 }, MN: { lat: 46.3, lon: -94.3 },
  MS: { lat: 32.7, lon: -89.7 }, MO: { lat: 38.4, lon: -92.5 },
  MT: { lat: 47.1, lon: -109.6 }, NE: { lat: 41.5, lon: -99.8 },
  NV: { lat: 39.9, lon: -116.8 }, NH: { lat: 43.7, lon: -71.6 },
  NJ: { lat: 40.2, lon: -74.7 }, NM: { lat: 34.5, lon: -106.0 },
  NY: { lat: 42.9, lon: -75.5 }, NC: { lat: 35.6, lon: -79.8 },
  ND: { lat: 47.4, lon: -100.5 }, OH: { lat: 40.4, lon: -82.8 },
  OK: { lat: 35.6, lon: -97.5 }, OR: { lat: 44.0, lon: -120.5 },
  PA: { lat: 40.9, lon: -77.8 }, RI: { lat: 41.7, lon: -71.5 },
  SC: { lat: 34.0, lon: -81.0 }, SD: { lat: 44.4, lon: -100.2 },
  TN: { lat: 35.9, lon: -86.4 }, TX: { lat: 31.5, lon: -99.3 },
  UT: { lat: 39.3, lon: -111.7 }, VT: { lat: 44.1, lon: -72.6 },
  VA: { lat: 37.5, lon: -78.9 }, WA: { lat: 47.4, lon: -120.7 },
  WV: { lat: 38.6, lon: -80.6 }, WI: { lat: 44.6, lon: -89.8 },
  WY: { lat: 43.0, lon: -107.6 },
  // Territories
  GU: { lat: 13.4, lon: 144.8 }, PR: { lat: 18.2, lon: -66.5 },
  VI: { lat: 18.3, lon: -64.9 }, AS: { lat: -14.3, lon: -170.7 },
  MP: { lat: 15.2, lon: 145.7 },
  // Marine zones (approximate ocean regions)
  AM: { lat: 38.0, lon: -74.0 },   // Atlantic coastal
  AN: { lat: 30.0, lon: -78.0 },   // Atlantic offshore
  GM: { lat: 27.0, lon: -90.0 },   // Gulf of Mexico
  PH: { lat: 20.0, lon: -158.0 },  // Hawaii waters
  PK: { lat: 55.0, lon: -165.0 },  // Alaska Pacific
  PZ: { lat: 35.0, lon: -130.0 },  // Pacific offshore
  PM: { lat: 45.0, lon: -125.0 },  // Pacific NW coastal
  LM: { lat: 43.5, lon: -87.0 },   // Lake Michigan
  LE: { lat: 42.2, lon: -81.0 },   // Lake Erie
  LH: { lat: 47.5, lon: -87.5 },   // Lake Huron
  LO: { lat: 43.5, lon: -77.5 },   // Lake Ontario
  LS: { lat: 47.5, lon: -88.0 },   // Lake Superior
  LC: { lat: 45.0, lon: -84.0 },   // St. Clair
  SL: { lat: 46.5, lon: -84.5 },   // St. Lawrence
};

/** Extract center from GeoJSON geometry, or fall back to UGC state centroid */
function centroid(
  geometry: { type: string; coordinates?: unknown } | null,
  ugcCodes?: string[],
): { lat: number; lon: number } | null {
  if (geometry?.coordinates) {
    try {
      if (geometry.type === "Polygon") {
        const ring = (geometry.coordinates as number[][][])[0];
        if (ring && ring.length > 0) {
          let latSum = 0, lonSum = 0;
          for (const [lon, lat] of ring) { latSum += lat!; lonSum += lon!; }
          return { lat: latSum / ring.length, lon: lonSum / ring.length };
        }
      }
      if (geometry.type === "MultiPolygon") {
        const ring = (geometry.coordinates as number[][][][])[0]?.[0];
        if (ring && ring.length > 0) {
          let latSum = 0, lonSum = 0;
          for (const [lon, lat] of ring) { latSum += lat!; lonSum += lon!; }
          return { lat: latSum / ring.length, lon: lonSum / ring.length };
        }
      }
    } catch { /* fall through to UGC fallback */ }
  }

  // Fallback: derive approximate position from UGC zone code (e.g., "AKZ326" → AK)
  if (ugcCodes && ugcCodes.length > 0 && ugcCodes[0]) {
    const stateCode = ugcCodes[0].substring(0, 2);
    const entry = UGC_CENTROIDS[stateCode];
    if (entry) return entry;
  }

  return null;
}

/** Fetch NWS alerts (US) */
async function fetchNWSAlerts(): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(API.WEATHER);
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = NWSResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    return parsed.data.features.map((f) => {
      const ugcCodes = f.properties.geocode?.UGC;
      const center = centroid(f.geometry, ugcCodes);
      return {
        id: f.id,
        event: f.properties.event,
        severity: f.properties.severity,
        headline: f.properties.headline ?? f.properties.event,
        description: f.properties.description,
        areaDesc: f.properties.areaDesc,
        effective: f.properties.effective,
        expires: f.properties.expires,
        latitude: center?.lat ?? null,
        longitude: center?.lon ?? null,
      };
    });
  } catch (err) {
    console.warn("NWS fetch failed:", err);
    return [];
  }
}

/** Fetch MeteoAlarm alerts (Europe) from server-side collector */
async function fetchMeteoAlarmAlerts(): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(API.WEATHER_EU);
    if (!res.ok) return [];
    const data: WeatherAlert[] = await res.json();
    return data;
  } catch (err) {
    console.warn("MeteoAlarm fetch failed:", err);
    return [];
  }
}

/** Fetch all weather alerts: NWS (US) + MeteoAlarm (Europe) */
export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  const [nws, eu] = await Promise.all([fetchNWSAlerts(), fetchMeteoAlarmAlerts()]);
  return [...nws, ...eu];
}
