import { NWSResponseSchema } from "@/types/nws";
import type { WeatherAlert } from "@/types/nws";
import { API } from "@/lib/constants";

/** Extract a rough center point from GeoJSON geometry */
function centroid(geometry: { type: string; coordinates?: unknown } | null): { lat: number; lon: number } | null {
  if (!geometry || !geometry.coordinates) return null;

  try {
    // For Polygon: coordinates is [[[lon,lat],...]]
    if (geometry.type === "Polygon") {
      const ring = (geometry.coordinates as number[][][])[0];
      if (!ring || ring.length === 0) return null;
      let latSum = 0, lonSum = 0;
      for (const [lon, lat] of ring) {
        latSum += lat!;
        lonSum += lon!;
      }
      return { lat: latSum / ring.length, lon: lonSum / ring.length };
    }
    // For MultiPolygon: take first polygon
    if (geometry.type === "MultiPolygon") {
      const poly = (geometry.coordinates as number[][][][])[0];
      if (!poly) return null;
      const ring = poly[0];
      if (!ring || ring.length === 0) return null;
      let latSum = 0, lonSum = 0;
      for (const [lon, lat] of ring) {
        latSum += lat!;
        lonSum += lon!;
      }
      return { lat: latSum / ring.length, lon: lonSum / ring.length };
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(API.WEATHER);
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = NWSResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    return parsed.data.features.map((f) => {
      const center = centroid(f.geometry);
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
