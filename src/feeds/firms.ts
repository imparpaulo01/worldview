import type { FireHotspot } from "@/types/firms";
import { API, LIMITS } from "@/lib/constants";

/** Parse FIRMS CSV response into FireHotspot array */
function parseCSV(csv: string): FireHotspot[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0]!.split(",");
  const latIdx = header.indexOf("latitude");
  const lonIdx = header.indexOf("longitude");
  const briIdx = header.indexOf("bright_ti4");
  const confIdx = header.indexOf("confidence");
  const frpIdx = header.indexOf("frp");
  const satIdx = header.indexOf("satellite");
  const dateIdx = header.indexOf("acq_date");
  const timeIdx = header.indexOf("acq_time");

  if (latIdx === -1 || lonIdx === -1) return [];

  const hotspots: FireHotspot[] = [];
  for (let i = 1; i < lines.length && hotspots.length < LIMITS.MAX_FIRES; i++) {
    const cols = lines[i]!.split(",");
    const lat = parseFloat(cols[latIdx] ?? "");
    const lon = parseFloat(cols[lonIdx] ?? "");
    if (isNaN(lat) || isNaN(lon)) continue;

    hotspots.push({
      latitude: lat,
      longitude: lon,
      brightness: parseFloat(cols[briIdx] ?? "0") || 0,
      confidence: cols[confIdx] ?? "nominal",
      frp: parseFloat(cols[frpIdx] ?? "0") || 0,
      satellite: cols[satIdx] ?? "VIIRS",
      acqDate: cols[dateIdx] ?? "",
      acqTime: cols[timeIdx] ?? "",
    });
  }
  return hotspots;
}

export async function fetchFires(): Promise<FireHotspot[]> {
  try {
    const res = await fetch(API.FIRES);
    if (!res.ok) return [];

    const text = await res.text();
    return parseCSV(text);
  } catch (err) {
    console.warn("FIRMS fetch failed:", err);
    return [];
  }
}
