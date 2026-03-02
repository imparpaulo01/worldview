import { GPResponseSchema } from "@/types/celestrak";
import type { GPElement } from "@/types/celestrak";
import { API, LIMITS } from "@/lib/constants";

const GROUPS = ["stations", "starlink", "active"] as const;

export async function fetchTLEData(
  group: (typeof GROUPS)[number] = "stations",
): Promise<GPElement[]> {
  try {
    const url = `${API.CELESTRAK_GP}?GROUP=${group}&FORMAT=JSON`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = GPResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    return parsed.data.slice(0, LIMITS.MAX_SATELLITES);
  } catch (err) {
    console.warn("CelesTrak fetch failed:", err);
    return [];
  }
}
