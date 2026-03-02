import { USGSResponseSchema } from "@/types/usgs";
import type { Earthquake } from "@/types/usgs";
import { API, LIMITS } from "@/lib/constants";

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  try {
    const res = await fetch(API.EARTHQUAKES);
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = USGSResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    const quakes: Earthquake[] = [];
    for (const f of parsed.data.features) {
      if (quakes.length >= LIMITS.MAX_QUAKES) break;
      const [lon, lat, depth] = f.geometry.coordinates;
      quakes.push({
        id: f.id,
        magnitude: f.properties.mag ?? 0,
        place: f.properties.place ?? "Unknown",
        time: f.properties.time,
        longitude: lon,
        latitude: lat,
        depth,
        tsunami: f.properties.tsunami === 1,
        significance: f.properties.sig ?? 0,
        title: f.properties.title,
      });
    }
    return quakes;
  } catch (err) {
    console.warn("USGS fetch failed:", err);
    return [];
  }
}
