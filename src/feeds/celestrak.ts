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
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const text = await res.text();
    return parseTLE(text);
  } catch (err) {
    console.warn("CelesTrak fetch failed:", err);
    return [];
  }
}

interface TLEApiResponse {
  member?: { name: string; line1: string; line2: string }[];
}

async function fetchTLEPage(
  search: string,
  page: number,
): Promise<TLERecord[]> {
  try {
    const url = `https://tle.ivanstanojevic.me/api/tle/?search=${encodeURIComponent(search)}&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = (await res.json()) as TLEApiResponse;
    if (!json.member) return [];

    return json.member
      .filter((s) => s.line1?.startsWith("1 ") && s.line2?.startsWith("2 "))
      .map((s) => ({ name: s.name, line1: s.line1, line2: s.line2 }));
  } catch {
    return [];
  }
}

async function fetchTLEFallback(): Promise<TLERecord[]> {
  // Fetch diverse active satellite groups in parallel (all have fresh TLEs)
  const queries: [string, number][] = [
    ["STARLINK", 1], ["STARLINK", 2], ["STARLINK", 3], ["STARLINK", 4],
    ["ISS", 1],
    ["GPS", 1],
    ["NOAA", 1],
    ["GOES", 1],
    ["IRIDIUM", 1],
    ["ONEWEB", 1],
  ];

  const pages = await Promise.all(
    queries.map(([search, page]) => fetchTLEPage(search, page)),
  );

  const seen = new Set<string>();
  const records: TLERecord[] = [];

  for (const page of pages) {
    for (const rec of page) {
      if (records.length >= LIMITS.MAX_SATELLITES) return records;
      // Deduplicate by TLE line 1 (contains NORAD ID)
      const id = rec.line1.substring(2, 7).trim();
      if (seen.has(id)) continue;
      seen.add(id);
      records.push(rec);
    }
  }

  return records;
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
