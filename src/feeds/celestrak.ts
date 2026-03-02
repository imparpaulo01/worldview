import { LIMITS } from "@/lib/constants";

export interface TLERecord {
  name: string;
  line1: string;
  line2: string;
}

/**
 * Fetch TLE data, trying CelesTrak (via proxy) first,
 * then falling back to tle.ivanstanojevic.me (free, CORS-friendly).
 */
export async function fetchTLEData(
  group: string = "stations",
): Promise<TLERecord[]> {
  // Try CelesTrak via Vite proxy (avoids CORS)
  const celestrak = await fetchCelesTrak(group);
  if (celestrak.length > 0) return celestrak;

  // Fallback: free TLE API (CORS-enabled, JSON format)
  return fetchTLEFallback();
}

async function fetchCelesTrak(group: string): Promise<TLERecord[]> {
  try {
    const url = `/api/celestrak?GROUP=${group}&FORMAT=TLE`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const text = await res.text();
    return parseTLE(text);
  } catch (err) {
    console.warn("CelesTrak fetch failed:", err);
    return [];
  }
}

async function fetchTLEFallback(): Promise<TLERecord[]> {
  try {
    const url = `https://tle.ivanstanojevic.me/api/tle?page_size=${LIMITS.MAX_SATELLITES}&sort=popularity&sort_dir=desc`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json() as {
      member?: { name: string; line1: string; line2: string }[];
    };
    if (!json.member) return [];

    const records: TLERecord[] = [];
    for (const sat of json.member) {
      if (records.length >= LIMITS.MAX_SATELLITES) break;
      if (sat.line1?.startsWith("1 ") && sat.line2?.startsWith("2 ")) {
        records.push({ name: sat.name, line1: sat.line1, line2: sat.line2 });
      }
    }
    return records;
  } catch (err) {
    console.warn("TLE fallback fetch failed:", err);
    return [];
  }
}

function parseTLE(text: string): TLERecord[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const records: TLERecord[] = [];

  for (let i = 0; i + 2 < lines.length && records.length < LIMITS.MAX_SATELLITES; i += 3) {
    const name = lines[i]!;
    const line1 = lines[i + 1]!;
    const line2 = lines[i + 2]!;

    if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
      records.push({ name, line1, line2 });
    }
  }

  return records;
}
