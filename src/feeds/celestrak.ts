import { LIMITS } from "@/lib/constants";

export interface TLERecord {
  name: string;
  line1: string;
  line2: string;
}

const CELESTRAK_BASE = "https://celestrak.org/NORAD/elements/gp.php";

export async function fetchTLEData(
  group: string = "stations",
): Promise<TLERecord[]> {
  try {
    const url = `${CELESTRAK_BASE}?GROUP=${group}&FORMAT=TLE`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const text = await res.text();
    return parseTLE(text);
  } catch (err) {
    console.warn("CelesTrak fetch failed:", err);
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

    // Validate: line1 starts with "1 ", line2 starts with "2 "
    if (line1.startsWith("1 ") && line2.startsWith("2 ")) {
      records.push({ name, line1, line2 });
    }
  }

  return records;
}
