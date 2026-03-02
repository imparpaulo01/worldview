import type { Vessel } from "@/types/ais";
import { API, LIMITS } from "@/lib/constants";

export async function fetchVessels(): Promise<Vessel[]> {
  try {
    const res = await fetch(API.AIS);
    if (!res.ok) return [];

    const json = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(json)) return [];

    const vessels: Vessel[] = [];
    for (const v of json) {
      if (vessels.length >= LIMITS.MAX_SHIPS) break;
      const lat = Number(v.latitude);
      const lon = Number(v.longitude);
      if (isNaN(lat) || isNaN(lon)) continue;

      vessels.push({
        mmsi: Number(v.mmsi) || 0,
        name: String(v.name || "UNKNOWN"),
        latitude: lat,
        longitude: lon,
        cog: Number(v.cog) || 0,
        sog: Number(v.sog) || 0,
        heading: Number(v.heading) || Number(v.cog) || 0,
        shipType: Number(v.shipType) || 0,
        destination: String(v.destination || ""),
      });
    }
    return vessels;
  } catch (err) {
    console.warn("AIS fetch failed:", err);
    return [];
  }
}
